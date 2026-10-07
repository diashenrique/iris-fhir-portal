// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures, openEdit, save } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Edit saves in a modal, then the summary and the FHIR JSON show the new data', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Modal'], family: 'Before' }], gender: 'male' });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#patientName')).toHaveText('Modal Before');

    // The form is not on the page: it opens in the modal
    await expect(page.locator('#lastName')).toBeHidden();
    await openEdit(page);
    await page.locator('#lastName').fill('After');
    await save(page);

    await expect(page.locator('#patientName')).toHaveText('Modal After');
    const json = JSON.parse(await page.locator('#fhirdatasource').inputValue());
    expect(json.name[0].family).toBe('After');
    // The server's copy: the update created version 2
    expect(json.meta.versionId).toBe('2');
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('a failed save keeps the modal open with what was typed and says so', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Modal'], family: 'Error' }] });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#patientName')).toHaveText('Modal Error');

    await page.route(`**/fhir/r4/Patient/${id}`, (route) =>
      route.request().method() === 'PUT' ? route.fulfill({ status: 500, body: '' }) : route.continue());
    await openEdit(page);
    await page.locator('#city').fill('Nowhere');
    await page.locator('#updateData').click();

    await expect(page.locator('#editError')).toHaveText("Couldn't save the patient. Try again.");
    await expect(page.locator('#editModal')).toBeVisible();
    await expect(page.locator('#city')).toHaveValue('Nowhere');
    await expect(page.locator('#updateData')).toBeEnabled();
  } finally {
    await page.unroute('**/fhir/r4/Patient/**');
    expect(await data.cleanup()).toEqual([]);
  }
});

test('Esc closes the Edit modal and the FHIR JSON panel and gives the focus back', async ({ page }) => {
  await login(page);
  await page.locator('#listgroup .list-group-item').first().click();
  await expect(page.locator('#editPatient')).toBeEnabled();

  for (const [button, dialog] of [['#editPatient', '#editModal'], ['#showJSON', '#exampleModalDocked']]) {
    await page.locator(button).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(dialog), dialog).toBeVisible();
    // Bootstrap moves the focus into the dialog when its fade ends; Esc acts from there
    await expect.poll(() => page.evaluate((d) => document.querySelector(d).contains(document.activeElement), dialog)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator(dialog), dialog).toBeHidden();
    await expect(page.locator(button), `focus back on ${button}`).toBeFocused();
  }
});
