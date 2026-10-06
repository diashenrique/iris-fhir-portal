// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

/**
 * Log in and open the lab chart page of the first patient with at least two lab tests.
 * @param {import('@playwright/test').Page} page
 */
async function openLabPage(page) {
  await login(page);
  const ids = await page.locator('#listgroup .list-group-item').evaluateAll((els) => els.map((el) => el.id));
  for (const id of ids) {
    const options = await (await page.request.get(`/fhir/api/laboptions/${id}`)).json();
    // Two tests with different names, so the chart label tells them apart
    if (new Set(options.map((o) => o.name)).size >= 2) {
      await page.goto(`/fhir/portal/labresult.html?id=${id}`);
      await expect(page.locator('#labtest option')).toHaveCount(options.length);
      return { id, options };
    }
  }
  throw new Error('no patient with two lab tests');
}

/**
 * Draw the chart of one lab test and return what the API answered for it.
 * @param {import('@playwright/test').Page} page
 * @param {{ code: string, name: string }} option
 */
async function drawChart(page, option) {
  await page.locator('#labtest').selectOption(option.code);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/lab/') && r.ok()),
    page.locator('#labSearch').click(),
  ]);
  return response.json();
}

/** @param {import('@playwright/test').Page} page */
const chartState = (page) => page.evaluate(() => {
  // @ts-ignore
  const charts = Object.values(window.Chart.instances);
  return {
    count: charts.length,
    // @ts-ignore
    label: charts.length ? charts[charts.length - 1].data.datasets[0].label : null,
    // @ts-ignore
    points: charts.length ? charts[charts.length - 1].data.datasets[0].data.length : 0,
  };
});

test('choosing two lab tests in a row keeps a single chart', async ({ page }) => {
  const { options } = await openLabPage(page);

  const [first, second] = [options[0], options.find((o) => o.name !== options[0].name)];
  for (const option of [first, second]) {
    const results = await drawChart(page, option);
    const numeric = results.filter((r) => r.value !== null && r.value !== '' && !isNaN(Number(r.value)));
    await expect.poll(() => chartState(page)).toMatchObject({ count: 1, label: option.name, points: numeric.length });
    await expect(page.locator('#testName')).toHaveText(option.name);
  }
});

test('a failing lab results call shows an error toast and keeps the chart and heading', async ({ page }) => {
  const { options } = await openLabPage(page);
  const first = options[0];
  const second = options.find((o) => o.name !== first.name);
  await drawChart(page, first);
  await expect.poll(() => chartState(page)).toMatchObject({ count: 1, label: first.name });

  await page.route('**/fhir/api/patient/*/lab/*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"query failed"}' }));
  await page.locator('#labtest').selectOption(second.code);
  await page.locator('#labSearch').click();
  await expect(page.locator('.toast-error')).toHaveText('Could not load lab results (HTTP 500)');
  expect(await chartState(page)).toMatchObject({ count: 1, label: first.name });
  await expect(page.locator('#testName')).toHaveText(first.name);
});

test('a failing lab tests call shows an error toast', async ({ page }) => {
  const { id } = await openLabPage(page);
  await page.route('**/fhir/api/laboptions/*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"query failed"}' }));

  await page.goto(`/fhir/portal/labresult.html?id=${id}`);
  await expect(page.locator('.toast-error')).toHaveText('Could not load lab tests (HTTP 500)');
});

test('a page kept open after the session ends sends the browser back to the login', async ({ page }) => {
  await openLabPage(page);
  // End the session behind the open page: the next /fhir/api call gets a real 401
  await logout(page);

  await page.locator('#labSearch').click();
  await expect(page.locator('input[name=IRISUsername]')).toBeVisible();
});

test('a 401 while the page loads leaves the lab chart page', async ({ page }) => {
  const { id } = await openLabPage(page);
  await page.route('**/fhir/api/laboptions/*', (route) => route.fulfill({ status: 401, body: '' }));

  await page.goto(`/fhir/portal/labresult.html?id=${id}`);
  // The session is still valid, so the entry page sends the browser on to the patient list
  await expect(page).not.toHaveURL(/labresult.html/);
});

test('only numeric results are plotted', async ({ page }) => {
  await openLabPage(page);
  await page.route('**/fhir/api/patient/*/lab/*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { testName: 'Test', date: '2020-01-01T00:00:00Z', value: 12.5 },
      { testName: 'Test', date: '2020-01-02T00:00:00Z', value: null },
      { testName: 'Test', date: '2020-01-03T00:00:00Z', value: '' },
      { testName: 'Test', date: '2020-01-04T00:00:00Z', value: 14 },
    ]),
  }));

  await page.locator('#labSearch').click();
  await expect.poll(() => chartState(page)).toMatchObject({ count: 1, points: 2 });
});
