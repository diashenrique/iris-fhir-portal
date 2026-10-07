// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

const rows = (page) => page.locator('#medicationTable tbody tr:visible').evaluateAll((trs) =>
  trs.map((tr) => Array.from(tr.querySelectorAll('td'), (td) => td.textContent)));

test('the Medications card shows the active prescriptions, the rest behind Show all, with names from included Medications', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Medi'], family: 'Cations' }] });
    const subject = { reference: `Patient/${id}` };
    // A Medication resource, named only through a reference
    const medId = await data.create({ resourceType: 'Medication', code: { text: 'Lisinopril 10 MG Oral Tablet' } });
    await data.create({
      resourceType: 'MedicationRequest', status: 'active', intent: 'order', subject,
      medicationReference: { reference: `Medication/${medId}` }, authoredOn: '2022-04-01T09:00:00Z',
      dosageInstruction: [{ timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } }, asNeededBoolean: false,
        doseAndRate: [{ doseQuantity: { value: 1 } }] }],
    });
    await data.create({
      resourceType: 'MedicationRequest', status: 'stopped', intent: 'order', subject,
      medicationCodeableConcept: { text: 'Naproxen sodium 220 MG Oral Tablet' }, authoredOn: '2019-08-11T09:00:00Z',
      dosageInstruction: [{ asNeededBoolean: true }],
    });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();

    await expect(page.locator('#badgeMedication')).toHaveText('2');
    await expect(page.locator('#cardMedications .card-header .source-badge')).toHaveText('FHIR · fhir.js');
    await expect.poll(() => rows(page)).toEqual([
      ['Lisinopril 10 MG Oral Tablet', 'Active', '1 · 1× every 1 d', 'Apr 1, 2022'],
    ]);

    const showAll = page.locator('#medicationsShowAll');
    await expect(showAll).toHaveText('Show all (2)');
    await showAll.click();
    expect(await rows(page)).toEqual([
      ['Lisinopril 10 MG Oral Tablet', 'Active', '1 · 1× every 1 d', 'Apr 1, 2022'],
      ['Naproxen sodium 220 MG Oral Tablet', 'Stopped', 'as needed', 'Aug 11, 2019'],
    ]);
    await expect(showAll).toHaveText('Show latest');
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('without active prescriptions the card says so, and without any it says there are none', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const withStopped = await data.create({ resourceType: 'Patient', name: [{ given: ['Only'], family: 'Stopped' }] });
    await data.create({ resourceType: 'MedicationRequest', status: 'stopped', intent: 'order', subject: { reference: `Patient/${withStopped}` },
      medicationCodeableConcept: { text: 'Amoxicillin 250 MG' }, authoredOn: '2018-01-01T09:00:00Z' });
    const without = await data.create({ resourceType: 'Patient', name: [{ given: ['No'], family: 'Meds' }] });
    await page.reload();

    await page.locator(`[id="${withStopped}"]`).click();
    await expect(page.locator('#badgeMedication')).toHaveText('1');
    await expect.poll(() => rows(page)).toEqual([['No active medications.']]);
    await expect(page.locator('#medicationsShowAll')).toHaveText('Show all (1)');

    await page.locator(`[id="${without}"]`).click();
    await expect(page.locator('#medicationTable tbody')).toHaveText('No medications recorded.');
    await expect(page.locator('#medicationsShowAll')).toBeHidden();
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});
