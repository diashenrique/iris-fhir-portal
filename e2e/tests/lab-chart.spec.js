// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

/**
 * Log in and open the chart of the first patient with at least two lab tests; the Laboratory card
 * lists them in its chart picker.
 * @param {import('@playwright/test').Page} page
 */
async function openLabCard(page) {
  await login(page);
  const ids = await page.locator('#listgroup .list-group-item').evaluateAll((els) => els.map((el) => el.id));
  for (const id of ids) {
    const options = await (await page.request.get(`/fhir/api/laboptions/${id}`)).json();
    // Two tests with different names, so the chart label tells them apart
    if (new Set(options.map((o) => o.name)).size >= 2) {
      await page.locator(`[id="${id}"]`).click();
      // The options plus "Choose a test…"
      await expect(page.locator('#labtest option')).toHaveCount(options.length + 1);
      return { id, options };
    }
  }
  throw new Error('no patient with two lab tests');
}

/**
 * Choose a lab test in the card: the chart draws on change, no button. Returns what the API answered.
 * @param {import('@playwright/test').Page} page
 * @param {{ code: string, name: string }} option
 */
async function drawChart(page, option) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/lab/') && r.ok()),
    page.locator('#labtest').selectOption(option.code),
  ]);
  return response.json();
}

/** @param {import('@playwright/test').Page} page */
const chartState = (page) => page.evaluate(() => {
  // @ts-ignore
  const charts = Object.values(window.Chart.instances);
  const last = /** @type {any} */ (charts[charts.length - 1]);
  return {
    count: charts.length,
    label: last ? last.data.datasets[0].label : null,
    points: last ? last.data.datasets[0].data.length : 0,
    datasets: last ? last.data.datasets.length : 0,
    unit: last ? last.options.scales.y.title.text : null,
  };
});

test('choosing two lab tests in a row keeps a single chart, inside the Laboratory card', async ({ page }) => {
  const { options } = await openLabCard(page);
  await expect(page.locator('#labChartSection .source-badge')).toHaveText('SQL · /fhir/api');

  const [first, second] = [options[0], options.find((o) => o.name !== options[0].name)];
  for (const option of [first, second]) {
    const results = await drawChart(page, option);
    const numeric = results.filter((r) => r.value !== null && r.value !== '' && !isNaN(Number(r.value)));
    await expect.poll(() => chartState(page)).toMatchObject({ count: 1, label: option.name, points: numeric.length });
    await expect(page.locator('#testName')).toHaveText(option.name);
  }
});

test('a failing lab results call shows an error toast and keeps the chart and heading', async ({ page }) => {
  const { options } = await openLabCard(page);
  const first = options[0];
  const second = options.find((o) => o.name !== first.name);
  await drawChart(page, first);
  await expect.poll(() => chartState(page)).toMatchObject({ count: 1, label: first.name });

  await page.route('**/fhir/api/patient/*/lab/*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"query failed"}' }));
  await page.locator('#labtest').selectOption(second.code);
  await expect(page.locator('.toast-error')).toHaveText('Could not load lab results (HTTP 500)');
  expect(await chartState(page)).toMatchObject({ count: 1, label: first.name });
  await expect(page.locator('#testName')).toHaveText(first.name);
});

test('a failing lab tests call shows an error toast', async ({ page }) => {
  await login(page);
  await page.route('**/fhir/api/laboptions/*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"query failed"}' }));
  // The first patient with laboratory results asks /fhir/api for its tests
  const ids = await page.locator('#listgroup .list-group-item').evaluateAll((els) => els.map((el) => el.id));
  for (const id of ids) {
    const bundle = await (await page.request.get(`/fhir/r4/Observation?patient=${id}&category=laboratory&_summary=count`, { headers: { Accept: 'application/fhir+json' } })).json();
    if (bundle.total > 0) {
      await page.locator(`[id="${id}"]`).click();
      await expect(page.locator('.toast-error')).toHaveText('Could not load lab tests (HTTP 500)');
      return;
    }
  }
  throw new Error('no patient with lab results');
});

test('a page kept open after the session ends sends the browser back to the login', async ({ page }) => {
  const { options } = await openLabCard(page);
  // End the session behind the open page: the next /fhir/api call gets a real 401
  await logout(page);

  await page.locator('#labtest').selectOption(options[0].code);
  await expect(page.locator('input[name=IRISUsername]')).toBeVisible();
});

test('only numeric results are plotted, and a test without any says so', async ({ page }) => {
  const { options } = await openLabCard(page);
  let body = [
    { testName: 'Test', date: '2020-01-01T00:00:00Z', value: 12.5 },
    { testName: 'Test', date: '2020-01-02T00:00:00Z', value: null },
    { testName: 'Test', date: '2020-01-03T00:00:00Z', value: '' },
    { testName: 'Test', date: '2020-01-04T00:00:00Z', value: 14 },
  ];
  await page.route('**/fhir/api/patient/*/lab/*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));

  await page.locator('#labtest').selectOption(options[0].code);
  await expect.poll(() => chartState(page)).toMatchObject({ count: 1, points: 2 });

  body = [{ testName: 'Test', date: '2020-01-01T00:00:00Z', value: 'Positive' }];
  const other = options.find((o) => o.name !== options[0].name);
  await page.locator('#labtest').selectOption(other.code);
  await expect(page.locator('#chartEmpty')).toHaveText(`${other.name} has no numeric results to chart.`);
  await expect(page.locator('#chartBox')).toBeHidden();
  expect(await chartState(page)).toMatchObject({ count: 0 });
});

test('the chart shows the unit on its axis and the reference range as a band', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Chart'], family: 'Range' }] });
    const glucose = { coding: [{ system: 'http://loinc.org', code: '2345-7', display: 'Glucose' }], text: 'Glucose' };
    for (const [date, value] of [['2021-01-10T08:00:00Z', 90], ['2021-02-10T08:00:00Z', 130]]) {
      await data.create({
        resourceType: 'Observation',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
        subject: { reference: `Patient/${id}` },
        code: glucose,
        effectiveDateTime: date,
        valueQuantity: { value, unit: 'mg/dL' },
        referenceRange: [{ low: { value: 70 }, high: { value: 99 } }],
      });
    }
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#labtest option')).toHaveCount(2);
    await drawChart(page, { code: '2345-7', name: 'Glucose' });
    // The line, then the low and high edges of the band
    await expect.poll(() => chartState(page)).toMatchObject({ count: 1, label: 'Glucose', points: 2, datasets: 3, unit: 'mg/dL' });
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('the old lab result page opens the chart of the same patient', async ({ page }) => {
  await login(page);
  const id = await page.locator('#listgroup .list-group-item').first().getAttribute('id');
  await page.goto(`/fhir/portal/labresult.html?id=${id}`);
  await expect(page).toHaveURL(new RegExp(`patientlist\\.html\\?id=${id}$`));
  await expect(page.locator('#fhirId')).toHaveValue(String(id));
  await expect(page.locator('#patientName')).not.toBeEmpty();
});
