// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

/**
 * A vital-signs Observation with a LOINC code and a quantity.
 * @param {string} patientId
 */
function vital(patientId, code, display, value, unit, date) {
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code, display }], text: display },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: date,
    valueQuantity: { value, unit, system: 'http://unitsofmeasure.org', code: unit },
  };
}

test('every card says where its data comes from, how many records it has, and recovers with Try again', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Card'], family: 'States' }] });
    await page.reload();

    // The first immunization search fails; Try again runs it once more
    let failures = 1;
    await page.route('**/fhir/r4/Immunization?**', (route) =>
      failures-- > 0 ? route.fulfill({ status: 500, body: '' }) : route.continue());
    await page.locator(`[id="${id}"]`).click();

    for (const card of ['#cardAllergies', '#cardConditions', '#cardVitalSigns', '#cardLaboratory', '#cardImmunizations']) {
      await expect(page.locator(`${card} .card-header .source-badge`), card).toHaveText('FHIR · fhir.js');
    }
    await expect(page.locator('#badgeAllergy')).toHaveText('0');

    const immunizations = page.locator('#immunizationTable tbody');
    await expect(immunizations).toHaveText(/Couldn't load immunizations\./);
    await expect(page.locator('.toast-error')).toHaveText('Could not load immunizations (HTTP 500)');
    await immunizations.getByRole('button', { name: 'Try again' }).click();
    await expect(immunizations).toHaveText('No immunizations recorded.');
    await expect(page.locator('#badgeImmunization')).toHaveText('0');

    // The Conditions card recovers the same way
    let conditionFailures = 1;
    await page.route('**/fhir/r4/Condition?**', (route) =>
      conditionFailures-- > 0 ? route.fulfill({ status: 500, body: '' }) : route.continue());
    await page.locator(`[id="${id}"]`).click();
    const conditions = page.locator('#conditionTable tbody');
    await expect(conditions).toHaveText(/Couldn't load conditions\./);
    await conditions.getByRole('button', { name: 'Try again' }).click();
    await expect(conditions).toHaveText('No conditions recorded.');
  } finally {
    await page.unroute('**/fhir/r4/Immunization?**');
    await page.unroute('**/fhir/r4/Condition?**');
    expect(await data.cleanup()).toEqual([]);
  }
});

test('vital signs show the latest value of each measure, rounded, with unit and date; Show all lists the history', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Vital'], family: 'Latest'}] });
    await data.create(vital(id, '29463-7', 'Body Weight', 80.12345, 'kg', '2020-01-01T10:00:00Z'));
    await data.create(vital(id, '29463-7', 'Body Weight', 78.4567, 'kg', '2021-06-15T10:00:00Z'));
    await data.create(vital(id, '8867-4', 'Heart rate', 72, '/min', '2021-06-15T10:00:00Z'));
    await page.reload();
    await page.locator(`[id="${id}"]`).click();

    const visibleRows = () => page.locator('#vitalSignsTable tbody tr:visible').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.querySelectorAll('td'), (td) => td.textContent)));
    await expect(page.locator('#badgeVitalSigns')).toHaveText('3');
    await expect.poll(visibleRows).toEqual([
      ['Body Weight', '78.46', 'kg', 'Jun 15, 2021'],
      ['Heart rate', '72', '/min', 'Jun 15, 2021'],
    ]);
    // The date as stored, for whoever needs it
    await expect(page.locator('#vitalSignsTable tbody tr:visible td').nth(3)).toHaveAttribute('title', '2021-06-15T10:00:00Z');

    const showAll = page.locator('#vitalsShowAll');
    await expect(showAll).toHaveText('Show all (3)');
    await showAll.click();
    await expect(showAll).toHaveAttribute('aria-expanded', 'true');
    expect(await visibleRows()).toEqual([
      ['Body Weight', '80.12', 'kg', 'Jan 1, 2020'],
      ['Body Weight', '78.46', 'kg', 'Jun 15, 2021'],
      ['Heart rate', '72', '/min', 'Jun 15, 2021'],
    ]);
    await showAll.click();
    await expect(page.locator('#vitalSignsTable tbody tr:visible')).toHaveCount(2);
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});
