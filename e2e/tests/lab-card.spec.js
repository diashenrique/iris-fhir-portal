// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

/**
 * A laboratory Observation of the patient.
 * @param {string} patientId
 * @param {object} fields code, effectiveDateTime, valueQuantity, referenceRange, interpretation...
 */
function lab(patientId, fields) {
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
    subject: { reference: `Patient/${patientId}` },
    ...fields,
  };
}

const glucose = { coding: [{ system: 'http://loinc.org', code: '2345-7', display: 'Glucose' }], text: 'Glucose' };
const potassium = { coding: [{ system: 'http://loinc.org', code: '2823-3', display: 'Potassium' }], text: 'Potassium' };

test('lab results are grouped by day, latest first, with their reference range and High or Low flagged', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Lab'], family: 'Ranges' }] });
    // Above its range: High
    await data.create(lab(id, {
      code: glucose, effectiveDateTime: '2021-03-02T08:00:00Z',
      valueQuantity: { value: 182.456, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 70, unit: 'mg/dL' }, high: { value: 99, unit: 'mg/dL' } }],
    }));
    // Low by its interpretation, no range
    await data.create(lab(id, {
      code: potassium, effectiveDateTime: '2021-03-02T08:00:00Z',
      valueQuantity: { value: 3.1, unit: 'mmol/L' },
      interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'L' }] }],
    }));
    // Inside its range, an older day: no flag
    await data.create(lab(id, {
      code: glucose, effectiveDateTime: '2020-11-20T08:00:00Z',
      valueQuantity: { value: 85, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 70 }, high: { value: 99 } }],
    }));
    // No range at all: no flag, no range text
    await data.create(lab(id, {
      code: potassium, effectiveDateTime: '2020-11-20T08:00:00Z',
      valueQuantity: { value: 2.0, unit: 'mmol/L' },
    }));

    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#badgeLaboratory')).toHaveText('4');

    const rows = () => page.locator('#laboratoryTable tbody tr').evaluateAll((trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll('th, td'), (cell) => cell.textContent)));
    await expect.poll(rows).toEqual([
      ['Mar 2, 2021'],
      ['Glucose', '182.46 ↑ High', 'mg/dL', '70–99'],
      ['Potassium', '3.1 ↓ Low', 'mmol/L', ''],
      ['Nov 20, 2020'],
      ['Glucose', '85', 'mg/dL', '70–99'],
      ['Potassium', '2', 'mmol/L', ''],
    ]);

    // Flagged values are styled, and the arrow is decoration: the word carries the meaning
    const flagged = page.locator('#laboratoryTable td.value-abnormal');
    await expect(flagged).toHaveCount(2);
    await expect(flagged.locator('[aria-hidden="true"]').first()).toHaveText(' ↑');
    await expect(page.locator('#laboratoryTable tr.lab-date th').first()).toHaveAttribute('title', '2021-03-02T08:00:00Z');
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('the lab card shows the latest three days, and Show all the older ones', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Lab'], family: 'Days' }] });
    for (const [date, value] of [['2021-01-10', 90], ['2021-02-10', 95], ['2021-03-10', 99], ['2021-04-10', 101]]) {
      await data.create(lab(id, { code: glucose, effectiveDateTime: `${date}T08:00:00Z`, valueQuantity: { value, unit: 'mg/dL' } }));
    }
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#badgeLaboratory')).toHaveText('4');

    const days = page.locator('#laboratoryTable tr.lab-date:visible th');
    await expect(days).toHaveText(['Apr 10, 2021', 'Mar 10, 2021', 'Feb 10, 2021']);
    const showAll = page.locator('#labShowAll');
    await expect(showAll).toHaveText('Show all (4)');
    await showAll.click();
    await expect(days).toHaveText(['Apr 10, 2021', 'Mar 10, 2021', 'Feb 10, 2021', 'Jan 10, 2021']);
    await expect(showAll).toHaveText('Show latest');
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});
