// @ts-check
const { test, expect } = require('@playwright/test');
const { ENTRY_PAGE, login, logout } = require('./helpers');

// End the session after each test: every login holds an IRIS license until its session ends
test.afterEach(async ({ page }) => {
  await logout(page);
});

test('without login the portal shows the login page and no patient data', async ({ page }) => {
  await page.goto(ENTRY_PAGE);
  await expect(page.locator('input[name=IRISUsername]')).toBeVisible();

  const listPage = await page.request.get('/fhir/portal/patientlist.html');
  expect(listPage.status()).toBe(404);
  const fhir = await page.request.get('/fhir/r4/Patient', { headers: { Accept: 'application/fhir+json' } });
  expect(fhir.status()).toBe(401);
  const api = await page.request.get('/fhir/api/laboptions/1');
  expect(api.status()).toBe(401);
});

test('a wrong password stays on the login page', async ({ page }) => {
  await page.goto(ENTRY_PAGE);
  await page.fill('input[name=IRISUsername]', 'fhirportal');
  await page.fill('input[name=IRISPassword]', 'wrong-password');
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('diashenrique.fhir.portal.Home.cls')),
    page.click('input[name=IRISLogin]'),
  ]);
  await expect(page.getByText('Access Denied')).toBeVisible();
  await expect(page.locator('input[name=IRISUsername]')).toBeVisible();
  await expect(page).not.toHaveURL(/patientlist.html/);
});

test('a page kept open after the session ends sends the browser back to the login', async ({ page }) => {
  // The server sends the static files with a one-hour Expires, so a browser can show the list
  // from its cache after the session is gone. Keep what the logged-in session received and
  // serve it again after logout to reproduce that.
  const cached = new Map();
  page.on('response', async (r) => {
    const url = r.url();
    if (url.includes('/fhir/portal/') && !url.includes('.cls') && r.ok()) {
      cached.set(url, { body: await r.body(), headers: r.headers() });
    }
  });
  await login(page);

  await page.request.get(`${ENTRY_PAGE}?IRISLogout=end`);
  await page.route('**/fhir/portal/**', (route) => {
    const hit = cached.get(route.request().url());
    return hit ? route.fulfill({ body: hit.body, headers: hit.headers }) : route.continue();
  });

  await page.goto('/fhir/portal/patientlist.html');
  await expect(page.locator('input[name=IRISUsername]')).toBeVisible();
});

test('patient chart: login, list, details, update, lab chart and logout', async ({ page, context }) => {
  await login(page);

  const items = page.locator('#listgroup .list-group-item');

  // Ids change on every build: use the first patient that has laboratory results.
  // page.request carries the session cookie of the login.
  let patientId;
  for (const id of await items.evaluateAll((els) => els.map((el) => el.id))) {
    const options = await (await page.request.get(`/fhir/api/laboptions/${id}`)).json();
    if (options.length > 0) {
      patientId = id;
      break;
    }
  }
  expect(patientId, 'a patient with laboratory results').toBeTruthy();
  const patientItem = page.locator(`[id="${patientId}"]`);

  // Details
  await patientItem.click();
  await expect(page.locator('#fhirId')).toHaveValue(String(patientId));
  await expect(page.locator('#firstName')).not.toHaveValue('');
  await expect(page.locator('#badgeLaboratory')).toHaveText(/^[1-9]\d*$/);

  // Update: change the city, reload the patient to see it persisted, then put it back
  const city = page.locator('#city');
  // A previous run that failed before restoring may have left the suffix behind
  const originalCity = (await city.inputValue()).replace(/( e2e)+$/, '');
  const editedCity = `${originalCity} e2e`;

  const reloadPatient = async () => {
    await city.fill('');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/fhir/r4/Patient?') && r.ok()),
      patientItem.click(),
    ]);
  };
  const saveCity = async (value) => {
    await city.fill(value);
    await page.locator('#updateData').click();
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toHaveCount(0);
    await expect(page.locator('#updateData')).toBeEnabled();
  };

  try {
    await saveCity(editedCity);
    await reloadPatient();
    await expect(city).toHaveValue(editedCity);
  } finally {
    // Restore through the FHIR API so a failed assertion above cannot leave test data behind
    const url = `/fhir/r4/Patient/${patientId}`;
    const patient = await (await page.request.get(url, { headers: { Accept: 'application/fhir+json' } })).json();
    patient.address[0].city = originalCity;
    const restored = await page.request.put(url, {
      headers: { 'Content-Type': 'application/fhir+json' },
      data: JSON.stringify(patient),
    });
    expect(restored.ok(), 'restore the original city').toBeTruthy();
  }

  // Lab chart opens in a new tab of the same session
  const [labPage] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('#iconChart a').click(),
  ]);
  await expect(labPage.locator('#fullName')).not.toHaveValue('');
  const lastOption = labPage.locator('#labtest option').last();
  await expect(lastOption).toBeAttached();
  const testName = await lastOption.textContent();
  await labPage.locator('#labtest').selectOption({ label: testName });
  await labPage.locator('#labSearch').click();
  await expect(labPage.locator('#testName')).toHaveText(testName);

  await expect
    .poll(() => labPage.evaluate(() => {
      const chart = Object.values(window.Chart.instances)[0];
      return chart ? chart.data.datasets[0].data.length : 0;
    }))
    .toBeGreaterThan(0);

  // Logout ends the session for the pages and the APIs
  await page.locator('#logout').click();
  await expect(page.locator('input[name=IRISUsername]')).toBeVisible();
  const afterLogout = await page.request.get(`/fhir/api/laboptions/${patientId}`);
  expect(afterLogout.status()).toBe(401);
  const fhirAfterLogout = await page.request.get('/fhir/r4/Patient', { headers: { Accept: 'application/fhir+json' } });
  expect(fhirAfterLogout.status()).toBe(401);
});
