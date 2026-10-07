// @ts-check
const { test, expect } = require('@playwright/test');
const { fixtures, login, logout, watchErrorToasts } = require('./helpers');

// End the session after each test: every login holds an IRIS license until its session ends
test.afterEach(async ({ page }) => {
  await logout(page);
});

const CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category';

/** An Observation of the patient in the category, with the extra fields given */
function observation(patientId, category, effectiveDateTime, fields) {
  return {
    resourceType: 'Observation',
    status: 'final',
    category: [{ coding: [{ system: CATEGORY, code: category }] }],
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime,
    ...fields,
  };
}

test('observations without valueQuantity show their value, one row per component, or an empty value', async ({ page }) => {
  // Any uncaught error on the page fails the test
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const errorToasts = await watchErrorToasts(page);

  await login(page);
  const { create, cleanup } = fixtures(page);

  let failed = false;
  try {
    const patientId = await create({ resourceType: 'Patient', name: [{ given: ['Obs'], family: 'Values' }] });

    // Laboratory: a valueCodeableConcept with text, then one without any value[x] or component
    await create(observation(patientId, 'laboratory', '2020-01-01T10:00:00Z', {
      code: { coding: [{ system: 'http://loinc.org', code: '94500-6', display: 'SARS-CoV-2 RNA' }] },
      valueCodeableConcept: {
        text: 'Positive',
        coding: [{ system: 'http://snomed.info/sct', code: '10828004', display: 'Positive (qualifier value)' }],
      },
    }));
    await create(observation(patientId, 'laboratory', '2020-01-03T10:00:00Z', {
      code: { text: 'Pending test', coding: [{ system: 'http://loinc.org', code: '0000-0', display: 'Ignored display' }] },
    }));

    // Laboratory: a valueQuantity with a comparator and only the UCUM code as unit
    await create(observation(patientId, 'laboratory', '2020-01-02T10:00:00Z', {
      code: { text: 'Glucose' },
      valueQuantity: { comparator: '<', value: 0.5, code: 'mg/dL', system: 'http://unitsofmeasure.org' },
    }));

    // Vital signs: a valueString, then two components without a value[x] on the Observation
    await create(observation(patientId, 'vital-signs', '2020-01-01T10:00:00Z', {
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      valueString: 'normal',
    }));
    await create(observation(patientId, 'vital-signs', '2020-01-02T10:00:00Z', {
      code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
      component: [
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic Blood Pressure' }] },
          valueQuantity: { value: 120, unit: 'mm[Hg]', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
        },
        {
          code: { text: 'Body position' },
          valueCodeableConcept: { coding: [{ system: 'http://snomed.info/sct', code: '33586001', display: 'Sitting' }] },
        },
      ],
    }));

    await page.reload();
    await page.locator(`[id="${patientId}"]`).click();
    await expect(page.locator('#fhirId')).toHaveValue(String(patientId));

    const cells = (table) =>
      page.locator(`${table} tbody tr`).evaluateAll((rows) =>
        rows.map((row) => Array.from(row.querySelectorAll('td'), (td) => td.textContent)));

    await expect(page.locator('#laboratoryTable tbody tr')).toHaveCount(3);
    expect(await cells('#laboratoryTable')).toEqual([
      ['SARS-CoV-2 RNA', 'Positive', '', 'Jan 1, 2020'],
      ['Glucose', '< 0.5', 'mg/dL', 'Jan 2, 2020'],
      ['Pending test', '', '', 'Jan 3, 2020'],
    ]);

    await expect(page.locator('#vitalSignsTable tbody tr')).toHaveCount(3);
    expect(await cells('#vitalSignsTable')).toEqual([
      ['Heart rate', 'normal', '', 'Jan 1, 2020'],
      ['Systolic Blood Pressure', '120', 'mm[Hg]', 'Jan 2, 2020'],
      ['Body position', 'Sitting', '', 'Jan 2, 2020'],
    ]);

    expect(pageErrors, 'errors on the page').toEqual([]);
    // Every search has finished once its badge is filled: only then can no error toast be late
    for (const badge of ['#badgeAllergy', '#badgeVitalSigns', '#badgeLaboratory', '#badgeImmunization']) {
      await expect(page.locator(badge), badge).toHaveText(/^\d+$/);
    }
    // A toast on screen is in the DOM right away; the recorder reports through an async binding
    await expect(page.locator('.toast-error'), 'error toasts on screen').toHaveCount(0);
    await expect.poll(() => errorToasts, { message: 'error toasts' }).toEqual([]);
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    // Report a failed cleanup only when it is not hiding the test's own error
    const notDeleted = await cleanup();
    if (!failed) expect(notDeleted, 'resources left behind').toEqual([]);
  }
});
