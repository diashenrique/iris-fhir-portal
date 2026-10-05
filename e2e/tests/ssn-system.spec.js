// @ts-check
const { test, expect } = require('@playwright/test');
const { FHIR_JSON, fixtures, login } = require('./helpers');

const US_SSN = 'http://hl7.org/fhir/sid/us-ssn';

test('the SSN is found by its us-ssn system, wherever it sits, and added when missing', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await login(page);
  const { create, cleanup } = fixtures(page);

  const ssn = page.locator('#SSN');
  const reveal = page.locator('#revealSSN');
  const readPatient = async (id) =>
    (await page.request.get(`/fhir/r4/Patient/${id}`, { headers: FHIR_JSON })).json();
  const open = async (id) => {
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#fhirId')).toHaveValue(String(id));
  };
  const save = async () => {
    await page.locator('#updateData').click();
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toHaveCount(0);
  };

  let failed = false;
  try {
    // SSN first, then two other identifiers: position 2 holds the driver's license
    const others = [
      { system: 'https://example.org/e2e-mr', value: 'mr-e2e-0001' },
      { system: 'urn:oid:2.16.840.1.113883.4.3.25', value: 'S99912345' },
    ];
    const ssnFirst = await create({
      resourceType: 'Patient',
      identifier: [{ system: US_SSN, value: '999-11-4321' }, ...others],
      name: [{ given: ['Ssn'], family: 'First' }],
      address: [{ city: 'Ssnville' }],
    });

    // Field and modal show the us-ssn value masked, not identifier[2]
    await open(ssnFirst);
    await expect(ssn).toHaveValue('***-**-4321');
    await expect.poll(() => page.locator('#fhirdatasource').inputValue()).toContain('"value": "***-**-4321"');
    const modal = await page.locator('#fhirdatasource').inputValue();
    expect(modal).not.toContain('999-11-4321');
    expect(modal).toContain('"value": "S99912345"');

    // Saving without revealing changes no identifier
    await page.locator('#city').fill('Ssnville 2');
    await save();
    expect((await readPatient(ssnFirst)).identifier).toEqual([{ system: US_SSN, value: '999-11-4321' }, ...others]);

    // A revealed edit changes only the us-ssn identifier
    await reveal.click();
    await expect(ssn).toHaveValue('999-11-4321');
    await ssn.fill('999-22-8765');
    await save();
    expect((await readPatient(ssnFirst)).identifier).toEqual([{ system: US_SSN, value: '999-22-8765' }, ...others]);
    await expect(ssn).toHaveValue('***-**-8765');

    // A patient without a us-ssn identifier: saving without typing creates none
    const noSSN = await create({
      resourceType: 'Patient',
      identifier: others,
      name: [{ given: ['Ssn'], family: 'Missing' }],
    });
    await open(noSSN);
    await expect(ssn).toHaveValue('');
    await page.locator('#city').fill('Nossnville');
    await save();
    expect((await readPatient(noSSN)).identifier).toEqual(others);

    // Revealing, typing and saving appends the us-ssn identifier at the end
    await reveal.click();
    await ssn.fill('999-33-1111');
    await save();
    expect((await readPatient(noSSN)).identifier).toEqual([...others, { system: US_SSN, value: '999-33-1111' }]);

    // A patient without any identifier gains the list with the SSN only
    const noIdentifier = await create({ resourceType: 'Patient', name: [{ given: ['Ssn'], family: 'Bare' }] });
    await open(noIdentifier);
    await expect(ssn).toHaveValue('');
    await reveal.click();
    await ssn.fill('999-44-2222');
    await save();
    expect((await readPatient(noIdentifier)).identifier).toEqual([{ system: US_SSN, value: '999-44-2222' }]);

    expect(pageErrors, 'errors on the page').toEqual([]);
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    const notDeleted = await cleanup();
    if (!failed) expect(notDeleted, 'resources left behind').toEqual([]);
  }
});
