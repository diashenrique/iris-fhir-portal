// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('the list shows readable names with age, sex and id, and says when a search matches nobody', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    // A Synthea-style name: digits glued to each part
    const id = await data.create({
      resourceType: 'Patient',
      name: [{ given: ['Listy123'], family: 'Readable456' }],
      gender: 'female',
      birthDate: '1990-03-01',
    });
    await page.reload();
    const item = page.locator(`[id="${id}"]`);
    await expect(item.locator('.list-group-item-title')).toHaveText('Listy Readable');
    await expect(item.locator('.list-group-item-title')).toHaveAttribute('title', 'Listy123 Readable456');
    await expect(item.locator('.list-group-item-text')).toHaveText(new RegExp(`^\\d+ years · Female · ID ${id}$`));

    // The same clean name in the summary, the original in its title
    await item.click();
    await expect(page.locator('#patientName')).toHaveText('Listy Readable');
    await expect(page.locator('#patientName')).toHaveAttribute('title', 'Listy123 Readable456');

    // Search by the original name and by id
    const search = page.locator('#searchClients');
    await search.fill('readable456');
    await expect(item).toBeVisible();
    await search.fill(String(id));
    await expect(item).toBeVisible();

    // Nobody: a message with the term, and a way out
    await search.fill('zz-nobody-zz');
    await expect(page.locator('#listgroup .list-group-item:visible')).toHaveCount(0);
    await expect(page.locator('#noMatch')).toHaveText('No patients match "zz-nobody-zz". Clear search');
    await page.locator('#clearSearch').click();
    await expect(search).toHaveValue('');
    await expect(page.locator('#noMatch')).toBeHidden();
    await expect(item).toBeVisible();

    // Reload keeps the term and applies it to the new list
    await search.fill(String(id));
    await page.locator('#reloadList').click();
    await expect(search).toBeEnabled();
    await expect(search).toHaveValue(String(id));
    await expect(page.locator('#listgroup .list-group-item:visible')).toHaveCount(1);
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});
