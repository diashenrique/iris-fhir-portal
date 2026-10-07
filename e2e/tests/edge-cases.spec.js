// @ts-check
const { test, expect } = require('@playwright/test');
const { FHIR_JSON, fixtures, login, logout, watchErrorToasts, openEdit, save } = require('./helpers');

// End the session after each test: every login holds an IRIS license until its session ends
test.afterEach(async ({ page }) => {
  await logout(page);
});

test('a minimal patient without clinical records opens, shows empty tables and saves only what was typed', async ({ page }) => {
  // Any uncaught error on the page fails the test
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const errorToasts = await watchErrorToasts(page);

  await login(page);
  const { create, cleanup } = fixtures(page);

  let failed = false;
  try {
    // A valid Patient with no name, address, identifier, gender or birth date
    const patientId = await create({ resourceType: 'Patient', active: true });
    const url = `/fhir/r4/Patient/${patientId}`;

    // List: the newest patient comes first, shown without a name
    await page.reload();
    const item = page.locator(`[id="${patientId}"]`);
    await expect(item.locator('.list-group-item-title')).toHaveText('(no name)');
    await expect(item.locator('.tile')).toHaveText('?');

    // Details: every field empty
    await item.click();
    await expect(page.locator('#fhirId')).toHaveValue(String(patientId));
    for (const field of ['#SSN', '#firstName', '#lastName', '#dateofbirth', '#gender', '#address', '#city', '#state', '#country']) {
      await expect(page.locator(field), field).toHaveValue('');
    }

    // Clinical cards: one line saying there is nothing, spanning the columns, and a zero badge
    for (const [table, badge, columns, empty] of [
      ['#allergyTable', '#badgeAllergy', 4, 'No allergies recorded.'],
      ['#vitalSignsTable', '#badgeVitalSigns', 4, 'No vital signs recorded.'],
      ['#laboratoryTable', '#badgeLaboratory', 4, 'No lab results recorded.'],
      ['#immunizationTable', '#badgeImmunization', 2, 'No immunizations recorded.'],
    ]) {
      await expect(page.locator(badge), badge).toHaveText('0');
      const rows = page.locator(`${table} tbody tr`);
      await expect(rows, table).toHaveCount(1);
      await expect(rows.locator('td'), table).toHaveText([empty]);
      await expect(rows.locator('td'), table).toHaveAttribute('colspan', String(columns));
    }
    await expect(page.locator('#iconChart a')).toHaveCount(0);

    // Save with only the city: the resource gains address[0].city and nothing else
    await openEdit(page);
    await page.locator('#city').fill('Edgeville');
    await save(page);

    const saved = await (await page.request.get(url, { headers: FHIR_JSON })).json();
    expect(saved.address).toEqual([{ city: 'Edgeville' }]);
    expect(saved.name).toBeUndefined();
    expect(saved.identifier).toBeUndefined();
    expect(saved.gender).toBeUndefined();
    expect(saved.birthDate).toBeUndefined();

    expect(pageErrors, 'errors on the page').toEqual([]);
    expect(errorToasts, 'error toasts').toEqual([]);
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    // Report a failed cleanup only when it is not hiding the test's own error
    const notDeleted = await cleanup();
    if (!failed) expect(notDeleted, 'resources left behind').toEqual([]);
  }
});

test('saving removes what the user cleared and never writes an empty SSN', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const errorToasts = await watchErrorToasts(page);

  await login(page);
  const { create, cleanup } = fixtures(page);

  const readPatient = async (id) =>
    (await page.request.get(`/fhir/r4/Patient/${id}`, { headers: FHIR_JSON })).json();
  const openAndSave = async (id, edit) => {
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#fhirId')).toHaveValue(String(id));
    await edit();
    await save(page);
  };

  let failed = false;
  try {
    // Clearing the only address field removes the address
    const cityOnly = await create({
      resourceType: 'Patient',
      name: [{ given: ['Edge'], family: 'Cleared' }],
      address: [{ city: 'Clearville' }],
    });
    await openAndSave(cityOnly, async () => {
      await expect(page.locator('#city')).toHaveValue('Clearville');
      await openEdit(page);
      await page.locator('#city').fill('');
    });
    const cleared = await readPatient(cityOnly);
    expect(cleared.address).toBeUndefined();
    expect(cleared.name).toEqual([{ given: ['Edge'], family: 'Cleared' }]);

    // An identifier[2] with only a system stays without a value
    const noSSN = await create({
      resourceType: 'Patient',
      identifier: [
        { system: 'https://example.org/e2e', value: 'edge-e2e-0' },
        { system: 'https://example.org/e2e', value: 'edge-e2e-1' },
        { system: 'http://hl7.org/fhir/sid/us-ssn' },
      ],
      name: [{ given: ['Edge'], family: 'NoSSN' }],
    });
    await openAndSave(noSSN, async () => {
      await expect(page.locator('#SSN')).toHaveValue('');
    });
    const saved = await readPatient(noSSN);
    expect(saved.identifier[2]).toEqual({ system: 'http://hl7.org/fhir/sid/us-ssn' });

    expect(pageErrors, 'errors on the page').toEqual([]);
    expect(errorToasts, 'error toasts').toEqual([]);
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    const notDeleted = await cleanup();
    if (!failed) expect(notDeleted, 'resources left behind').toEqual([]);
  }
});
