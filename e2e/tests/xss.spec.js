// @ts-check
const { test, expect } = require('@playwright/test');
const { fixtures, login, logout } = require('./helpers');

// End the session after each test: every login holds an IRIS license until its session ends
test.afterEach(async ({ page }) => {
  await logout(page);
});

// Each payload runs script if the page inserts it as HTML
const NAME_PAYLOAD = '<img src=x onerror=window.__xss=1>';
const LAB_PAYLOAD = '<img src=x onerror=alert(document.domain)>';
const ALLERGY_PAYLOAD = '<img src=x onerror=window.__xss=2>';
const IMMUNIZATION_PAYLOAD = '<img src=x onerror=window.__xss=3>';
const VITAL_PAYLOAD = '<img src=x onerror=window.__xss=4>';

test('FHIR data is shown as text in the list, details, tables, modal and chart options', async ({ page, context }) => {
  const dialogs = [];
  context.on('page', (p) => p.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); }));
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

  await login(page);

  // Create the resources through FHIR with the session of the login
  const { create, cleanup } = fixtures(page);

  let failed = false;
  try {
    const patientId = await create({
      resourceType: 'Patient',
      identifier: [
        { system: 'https://example.org/e2e', value: 'xss-e2e-0' },
        { system: 'https://example.org/e2e', value: 'xss-e2e-1' },
        { system: 'http://hl7.org/fhir/sid/us-ssn', value: '999-00-0000' },
      ],
      name: [{ use: 'official', given: [NAME_PAYLOAD], family: 'Xss' }],
      gender: 'female',
      birthDate: '1980-01-01',
      address: [{ line: ['1 Test Street'], city: 'Testville', state: 'TS', country: 'US' }],
    });
    await create({
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory',
          display: 'laboratory',
        }],
      }],
      code: { coding: [{ system: 'http://loinc.org', code: '2093-3', display: LAB_PAYLOAD }], text: LAB_PAYLOAD },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: '2020-01-01T08:00:00+00:00',
      valueQuantity: { value: 123.4, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
    });
    await create({
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'vital-signs',
        }],
      }],
      code: { coding: [{ system: 'http://loinc.org', code: '8302-2', display: VITAL_PAYLOAD }], text: VITAL_PAYLOAD },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: '2020-01-01T08:00:00+00:00',
      valueQuantity: { value: 170.2, unit: 'cm', system: 'http://unitsofmeasure.org', code: 'cm' },
    });
    await create({
      resourceType: 'AllergyIntolerance',
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }],
      },
      type: 'allergy',
      category: ['food'],
      criticality: 'low',
      code: { coding: [{ system: 'http://snomed.info/sct', code: '91935009', display: ALLERGY_PAYLOAD }], text: ALLERGY_PAYLOAD },
      patient: { reference: `Patient/${patientId}` },
    });
    await create({
      resourceType: 'Immunization',
      status: 'completed',
      vaccineCode: { coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: IMMUNIZATION_PAYLOAD }], text: IMMUNIZATION_PAYLOAD },
      patient: { reference: `Patient/${patientId}` },
      occurrenceDateTime: '2020-01-01T08:00:00+00:00',
    });

    // List: the newest patient comes first
    await page.reload();
    const item = page.locator(`[id="${patientId}"]`);
    await expect(item.locator('.list-group-item-title')).toHaveText(`${NAME_PAYLOAD} Xss`);
    await expect(item.locator('.tile')).toHaveText('<');

    // Details
    await item.click();
    await expect(page.locator('#fhirId')).toHaveValue(String(patientId));
    await expect(page.locator('#firstName')).toHaveValue(NAME_PAYLOAD);

    // Laboratory table and the FHIR Data Source modal
    await expect(page.locator('#badgeLaboratory')).toHaveText('1');
    await expect(page.locator('#laboratoryTable tbody tr td').first()).toHaveText(LAB_PAYLOAD);
    // The other tables: each payload is the literal text of one cell
    for (const [table, payload] of [
      ['#allergyTable', ALLERGY_PAYLOAD],
      ['#immunizationTable', IMMUNIZATION_PAYLOAD],
      ['#vitalSignsTable', VITAL_PAYLOAD],
    ]) {
      await expect(page.locator(`${table} tbody td`, { hasText: payload }), table).toHaveCount(1);
    }
    const source = page.locator('#fhirdatasource');
    await expect(source).toHaveValue(new RegExp(escapeRegExp(LAB_PAYLOAD)));
    await expect(source).toHaveValue(new RegExp(escapeRegExp(NAME_PAYLOAD)));
    // The laboratory bundle reached the modal as JSON text, not as parsed HTML
    await expect(source).toHaveValue(new RegExp(escapeRegExp(`"display": "${LAB_PAYLOAD}"`)));

    // Chart options of the lab result page
    const [labPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('#iconChart a').click(),
    ]);
    await expect(labPage.locator('#fullName')).toHaveValue(`${NAME_PAYLOAD} Xss`);
    const option = labPage.locator('#labtest option', { hasText: LAB_PAYLOAD });
    await expect(option).toHaveCount(1);
    await expect(option).toHaveAttribute('value', '2093-3');

    // Nothing ran: no image from a payload, no flag, no dialog
    for (const p of [page, labPage]) {
      await expect(p.locator('img[src="x"]')).toHaveCount(0);
      expect(await p.evaluate(() => /** @type {any} */ (window).__xss)).toBeUndefined();
    }
    expect(dialogs).toEqual([]);
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    // Report a failed cleanup only when it is not hiding the test's own error
    const notDeleted = await cleanup();
    if (!failed) expect(notDeleted, 'resources left behind').toEqual([]);
  }
});

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
