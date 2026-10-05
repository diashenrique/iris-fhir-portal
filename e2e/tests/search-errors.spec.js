// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, watchErrorToasts } = require('./helpers');

// End the session after each test: every login holds an IRIS license until its session ends
test.afterEach(async ({ page }) => {
  await logout(page);
});

const LIST_PAGE = /\/fhir\/portal\/patientlist\.html/;

/** Answer the FHIR searches matching the pattern with an HTTP 500 */
async function fail500(page, pattern) {
  await page.route(pattern, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/fhir+json',
      body: JSON.stringify({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'exception', diagnostics: 'forced by the e2e test' }],
      }),
    }));
}

/** Open the details of the first patient of the list */
async function openFirstPatient(page) {
  const item = page.locator('#listgroup .list-group-item').first();
  const id = await item.getAttribute('id');
  await item.click();
  return id;
}

test('a failed patient list search shows an error toast, without redirecting', async ({ page }) => {
  const errorToasts = await watchErrorToasts(page);
  await login(page);

  await fail500(page, /\/fhir\/r4\/Patient\?.*_sort=/);
  await page.reload();

  await expect(page.locator('.toast-error')).toHaveText('Could not load the patient list (HTTP 500)');
  await expect(page).toHaveURL(LIST_PAGE);
  await expect(page.locator('#listgroup .list-group-item')).toHaveCount(0);
  expect(errorToasts).toEqual(['Could not load the patient list (HTTP 500)']);
});

test('a failed patient search shows an error toast, without redirecting', async ({ page }) => {
  const errorToasts = await watchErrorToasts(page);
  await login(page);

  await fail500(page, /\/fhir\/r4\/Patient\?.*_id=/);
  await openFirstPatient(page);

  await expect(page.locator('.toast-error')).toHaveText('Could not load patient (HTTP 500)');
  await expect(page).toHaveURL(LIST_PAGE);
  await expect(page.locator('#fhirId')).toHaveValue('');
  expect(errorToasts).toEqual(['Could not load patient (HTTP 500)']);
});

test('a failed immunization search shows an error toast and leaves the other searches alone', async ({ page }) => {
  const errorToasts = await watchErrorToasts(page);
  await login(page);

  await fail500(page, /\/fhir\/r4\/Immunization\?/);
  const id = await openFirstPatient(page);

  await expect(page.locator('#fhirId')).toHaveValue(String(id));
  await expect(page.locator('.toast-error')).toHaveText('Could not load immunizations (HTTP 500)');
  await expect(page).toHaveURL(LIST_PAGE);
  // The other clinical searches still fill their badges
  for (const badge of ['#badgeAllergy', '#badgeVitalSigns', '#badgeLaboratory']) {
    await expect(page.locator(badge), badge).toHaveText(/^\d+$/);
  }
  expect(errorToasts).toEqual(['Could not load immunizations (HTTP 500)']);
});

test('an exception while showing a search result shows an error toast without HTTP status', async ({ page }) => {
  const errorToasts = await watchErrorToasts(page);
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await login(page);

  // A 200 whose Immunization has no vaccineCode: rendering the row throws inside the .then
  await page.route(/\/fhir\/r4\/Immunization\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/fhir+json',
      body: JSON.stringify({
        resourceType: 'Bundle',
        type: 'searchset',
        total: 1,
        entry: [{ resource: { resourceType: 'Immunization', id: 'broken', status: 'completed' } }],
      }),
    }));
  await openFirstPatient(page);

  await expect(page.locator('.toast-error')).toHaveText('Could not load immunizations');
  expect(errorToasts).toEqual(['Could not load immunizations']);
  expect(consoleErrors.some((t) => t.startsWith('Could not load immunizations')), 'logged with console.error').toBe(true);
});
