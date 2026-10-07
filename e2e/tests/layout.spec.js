// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

/** True when the page scrolls sideways */
const overflows = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

/**
 * A patient with one allergy, created through FHIR with the session of the login.
 * @param {ReturnType<typeof fixtures>} data
 */
async function patientWithAllergy(data) {
  const id = await data.create({
    resourceType: 'Patient',
    name: [{ given: ['Layout'], family: 'Tracer' }],
    gender: 'female',
    birthDate: '1980-01-15',
  });
  await data.create({
    resourceType: 'AllergyIntolerance',
    patient: { reference: `Patient/${id}` },
    type: 'allergy',
    category: ['food'],
    criticality: 'low',
    code: { coding: [{ system: 'http://snomed.info/sct', code: '91935009', display: 'Allergy to peanut' }], text: 'Allergy to peanut' },
  });
  return id;
}

test('the chart starts empty, then shows the summary and every card open', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await expect(page.locator('#currentUser')).toHaveText('fhirportal');
  await expect(page.locator('#emptyState')).toHaveText('Select a patient to see their chart.');
  await expect(page.locator('#patientChart')).toBeHidden();

  const data = fixtures(page);
  try {
    const id = await patientWithAllergy(data);
    await page.reload();
    await page.locator(`[id="${id}"]`).click();

    await expect(page.locator('#emptyState')).toBeHidden();
    await expect(page.locator('#patientName')).toHaveText('Layout Tracer');
    await expect(page.locator('#patientAge')).toHaveText(/^\d+ years$/);
    await expect(page.locator('#patientGender')).toHaveText('Female');
    await expect(page.locator('#patientFhirId')).toHaveText(`FHIR ID ${id}`);
    await expect(page.locator('#allergyAlert')).toHaveText('1 allergy');
    await expect(page.locator('#allergyAlert')).toHaveAttribute('href', '#cardAllergies');

    // No accordion: every card and its table are on screen without a click
    for (const card of ['#cardAllergies', '#cardVitalSigns', '#cardLaboratory', '#cardImmunizations']) {
      await expect(page.locator(`${card} table`), card).toBeVisible();
    }
    await expect(page.locator('#allergyTable tbody')).toContainText('Allergy to peanut');
    expect(await overflows(page)).toBe(false);
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('on a phone the list and the chart take turns, without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.locator('#chartPane')).toBeHidden();
  expect(await overflows(page)).toBe(false);

  const first = page.locator('#listgroup .list-group-item').first();
  const id = await first.getAttribute('id');
  await page.locator('#searchClients').fill(String(id));
  await page.locator(`[id="${id}"]`).click();

  await expect(page.locator('#listPane')).toBeHidden();
  await expect(page.locator('#patientName')).not.toBeEmpty();
  await expect(page.locator('#backToList')).toBeVisible();
  expect(await overflows(page)).toBe(false);

  await page.locator('#backToList').click();
  await expect(page.locator('#listPane')).toBeVisible();
  await expect(page.locator('#chartPane')).toBeHidden();
  // The search is kept
  await expect(page.locator('#searchClients')).toHaveValue(String(id));
});
