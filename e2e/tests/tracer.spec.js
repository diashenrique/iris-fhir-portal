// @ts-check
const { test, expect } = require('@playwright/test');

test('patient chart: list, details, update and lab chart', async ({ page, context, request }) => {
  await page.goto('/csp/user/fhirUI/patientlist.html');

  const items = page.locator('#listgroup .list-group-item');
  await expect(items.first()).toBeVisible();

  // Ids change on every build: use the first patient that has laboratory results
  let patientId;
  for (const id of await items.evaluateAll((els) => els.map((el) => el.id))) {
    const options = await (await request.get(`/fhir/api/laboptions/${id}`)).json();
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
    const auth = { Authorization: `Basic ${Buffer.from('fhirportal:fhirportal').toString('base64')}` };
    const url = `/fhir/r4/Patient/${patientId}`;
    const patient = await (await request.get(url, { headers: { ...auth, Accept: 'application/fhir+json' } })).json();
    patient.address[0].city = originalCity;
    const restored = await request.put(url, {
      headers: { ...auth, 'Content-Type': 'application/fhir+json' },
      data: JSON.stringify(patient),
    });
    expect(restored.ok(), 'restore the original city').toBeTruthy();
  }

  // Lab chart opens in a new tab
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
});
