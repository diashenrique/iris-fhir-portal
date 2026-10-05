// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

const FHIR_JSON = { Accept: 'application/fhir+json', 'Content-Type': 'application/fhir+json' };

test('the SSN is masked, revealed on request, and the mask is never saved', async ({ page }) => {
  await login(page);

  const item = page.locator('#listgroup .list-group-item').first();
  const patientId = await item.getAttribute('id');
  const url = `/fhir/r4/Patient/${patientId}`;
  const readPatient = async () => (await page.request.get(url, { headers: FHIR_JSON })).json();
  const original = await readPatient();
  const realSSN = original.identifier[2].value;
  const masked = `***-**-${realSSN.slice(-4)}`;

  const ssn = page.locator('#SSN');
  const reveal = page.locator('#revealSSN');
  const save = async () => {
    await page.locator('#updateData').click();
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('.toast-success')).toHaveCount(0);
  };

  try {
    // Opens masked and read-only
    await item.click();
    await expect(page.locator('#fhirId')).toHaveValue(String(patientId));
    await expect(ssn).toHaveValue(masked);
    await expect(ssn).toHaveAttribute('readonly', '');
    await expect(reveal).toBeEnabled();
    // The FHIR Data Source modal masks it too
    await expect.poll(() => page.locator('#fhirdatasource').inputValue()).toContain(`"value": "${masked}"`);
    expect(await page.locator('#fhirdatasource').inputValue()).not.toContain(realSSN);

    // Saving without revealing keeps the real SSN, not the mask
    await page.locator('#city').fill(`${original.address[0].city} ssn`);
    await save();
    expect((await readPatient()).identifier[2].value).toBe(realSSN);

    // Show reveals the real value and allows editing
    await reveal.click();
    await expect(ssn).toHaveValue(realSSN);
    await expect(ssn).not.toHaveAttribute('readonly', '');
    await expect(reveal).toBeDisabled();

    // A revealed edit is saved, and the field goes back to the mask
    await ssn.fill('999-00-1234');
    await save();
    expect((await readPatient()).identifier[2].value).toBe('999-00-1234');
    await expect(ssn).toHaveValue('***-**-1234');
    await expect(ssn).toHaveAttribute('readonly', '');
  } finally {
    // Put the patient back as it was, whatever happened above
    const current = await readPatient();
    current.identifier = original.identifier;
    current.address = original.address;
    const restored = await page.request.put(url, { headers: FHIR_JSON, data: JSON.stringify(current) });
    expect(restored.ok(), 'restore the patient').toBeTruthy();
  }
});
