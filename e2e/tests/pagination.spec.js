// @ts-check
const { test, expect } = require('@playwright/test');
const { FHIR_JSON, fixtures, login, logout } = require('./helpers');

const CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category';
const PAGE_SIZE = 5;
// Page size of the server when the search does not ask for one
const SERVER_PAGE_SIZE = 100;

/**
 * Rewrite the first request of the Patient and Observation searches to _count=5, so that
 * the server answers in several pages. The pages that follow (link[next], with queryId)
 * are left as the server wrote them. Returns every FHIR search URL the page requested.
 * @param {import('@playwright/test').Page} page
 */
async function smallPages(page) {
  /** @type {string[]} */
  const requested = [];
  await page.route(/\/fhir\/r4\/(Patient|Observation)\?/, (route) => {
    const url = new URL(route.request().url());
    if (!url.searchParams.has('queryId')) {
      url.searchParams.set('_count', String(PAGE_SIZE));
    }
    route.continue({ url: url.toString() });
  });
  recordSearches(page, requested);
  return requested;
}

/** Record every FHIR search URL the page requests into the list, until the test ends */
function recordSearches(page, requested) {
  const listener = (request) => {
    if (/\/fhir\/r4\/[A-Za-z]+\?/.test(request.url())) requested.push(request.url());
  };
  page.on('request', listener);
  listeners.push(() => page.off('request', listener));
}

/** @type {Array<() => void>} */
const listeners = [];

/** The URLs of next pages (they carry the queryId of the server) */
const nextPages = (urls) => urls.filter((u) => new URL(u).searchParams.has('queryId'));

/** Every next page goes to the host of the page itself, where the session cookie applies */
function expectSameHost(page, urls) {
  const host = new URL(page.url()).host;
  for (const u of nextPages(urls)) expect(new URL(u).host, u).toBe(host);
}

/** An Observation of the patient in the category, on the given day of January 2020 */
function observation(patientId, category, day, text, value) {
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [{ coding: [{ system: CATEGORY, code: category }] }],
    subject: { reference: `Patient/${patientId}` },
    code: { text },
    effectiveDateTime: `2020-01-${String(day).padStart(2, '0')}T10:00:00Z`,
    valueQuantity: { value, unit: 'mg/dL' },
  };
}

/** Ids of the patients the server has, in the order of the list, following link[next] here in the test */
async function serverPatientIds(page) {
  /** @type {string[]} */
  const ids = [];
  let total;
  let url = '/fhir/r4/Patient?_sort=-_lastUpdated';
  while (url) {
    const res = await page.request.get(url, { headers: FHIR_JSON });
    expect(res.ok(), url).toBe(true);
    const bundle = await res.json();
    if (total === undefined) total = bundle.total;
    ids.push(...(bundle.entry || []).map((e) => e.resource.id));
    const next = (bundle.link || []).find((l) => l.relation === 'next');
    url = next ? next.url : null;
  }
  expect(ids.length, 'every patient of the server').toBe(total);
  return ids;
}

// One login for the whole file: every login holds an IRIS license until its session ends,
// and the community license is small. The tests share the page and run in order.
test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */
let page;
/** @type {string[]} */
let pageErrors = [];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await login(page);
});

test.beforeEach(() => {
  pageErrors = [];
});

// Each test starts with no rewritten request and no recording left by the one before
test.afterEach(async () => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  listeners.splice(0).forEach((off) => off());
});

test.afterAll(async () => {
  // End the session: every login holds an IRIS license until its session ends
  await logout(page);
  await page.close();
});

const listIds = (page) =>
  page.locator('#listgroup .list-group-item').evaluateAll((items) => items.map((i) => i.id));

test('the patient list follows link[next] and shows every patient, in order', async () => {
  const expected = await serverPatientIds(page);
  expect(expected.length, 'more patients than one page').toBeGreaterThan(PAGE_SIZE);

  const requested = await smallPages(page);
  await page.reload();
  await expect(page.locator('#listgroup .list-group-item')).toHaveCount(expected.length);
  expect(await listIds(page)).toEqual(expected);

  expect(nextPages(requested).length, 'next pages requested').toBeGreaterThan(0);
  expectSameHost(page, requested);
  expect(pageErrors, 'errors on the page').toEqual([]);
});

test('the clinical tables follow link[next]: rows match the badge, in date order', async () => {
  const { create, cleanup } = fixtures(page);

  let failed = false;
  try {
    const patientId = await create({ resourceType: 'Patient', name: [{ given: ['Paged'], family: 'Results' }] });
    // Created out of order: the table follows the _sort=date of the search
    const labDays = [7, 3, 1, 6, 2, 5, 4];
    for (const day of labDays) {
      await create(observation(patientId, 'laboratory', day, `Lab ${day}`, day));
    }
    const vitalDays = [6, 1, 5, 2, 4, 3];
    for (const day of vitalDays) {
      await create(observation(patientId, 'vital-signs', day, `Vital ${day}`, day));
    }

    const requested = await smallPages(page);
    await page.reload();
    await page.locator(`[id="${patientId}"]`).click();
    await expect(page.locator('#fhirId')).toHaveValue(String(patientId));

    const names = (table) =>
      page.locator(`${table} tbody tr`).evaluateAll((rows) => rows.map((row) => row.querySelector('td').textContent));

    await expect(page.locator('#badgeLaboratory')).toHaveText(String(labDays.length));
    await expect(page.locator('#laboratoryTable tbody tr')).toHaveCount(labDays.length);
    expect(await names('#laboratoryTable')).toEqual([1, 2, 3, 4, 5, 6, 7].map((d) => `Lab ${d}`));
    await expect(page.locator('#iconChart a')).toHaveCount(1);

    await expect(page.locator('#badgeVitalSigns')).toHaveText(String(vitalDays.length));
    await expect(page.locator('#vitalSignsTable tbody tr')).toHaveCount(vitalDays.length);
    expect(await names('#vitalSignsTable')).toEqual([1, 2, 3, 4, 5, 6].map((d) => `Vital ${d}`));

    // The FHIR Data Source modal holds the JSON of every page: the patient and two pages of each
    const source = await page.locator('#fhirdatasource').inputValue();
    for (let day = 1; day <= 7; day++) expect(source, `Lab ${day} in the modal`).toContain(`"Lab ${day}"`);

    // Only the next pages of the Observation searches: the list makes its own
    const observationPages = nextPages(requested).filter((u) => new URL(u).pathname.endsWith('/Observation'));
    expect(observationPages.length, 'next pages of the Observation searches').toBeGreaterThanOrEqual(2);
    expectSameHost(page, observationPages);
    expect(pageErrors, 'errors on the page').toEqual([]);
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    const notDeleted = await cleanup();
    if (!failed) expect(notDeleted, 'resources left behind').toEqual([]);
  }
});

test('with a single page nothing changes: the whole list, no next page requested', async () => {
  const expected = await serverPatientIds(page);
  test.skip(expected.length > SERVER_PAGE_SIZE, 'the server has more patients than one default page');

  /** @type {string[]} */
  const requested = [];
  recordSearches(page, requested);

  await page.reload();
  await expect(page.locator('#listgroup .list-group-item')).toHaveCount(expected.length);
  expect(await listIds(page)).toEqual(expected);
  expect(nextPages(requested), 'next pages requested').toEqual([]);
  expect(pageErrors, 'errors on the page').toEqual([]);
});

for (const status of [500, 404]) {
  test(`a next page answering ${status} goes to the normal error handling, never to the login`, async () => {
    await smallPages(page);
    // Every next page of the list fails; a 404 is what an expired queryId answers
    await page.route(/\/fhir\/r4\/Patient\?.*queryId=/, (route) =>
      route.fulfill({ status, contentType: 'application/fhir+json', body: '{"resourceType":"OperationOutcome","issue":[]}' }));

    // The .catch of the list shows the error toast of a failed search with the status of the next page
    const failedPage = page.waitForResponse((r) => r.url().includes('queryId=') && r.status() === status);
    await page.reload();
    await failedPage;
    await expect(page.locator('.toast-error')).toHaveText(`Could not load the patient list (HTTP ${status})`);

    // As for a failed search: no list, and no redirect to the login page
    await expect(page.locator('#listgroup .list-group-item')).toHaveCount(0);
    expect(page.url()).toContain('patientlist.html');
    expect(pageErrors, 'errors on the page').toEqual([]);
  });
}
