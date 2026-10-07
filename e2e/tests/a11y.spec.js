// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('the patient list works with the keyboard alone', async ({ page }) => {
  await login(page);
  const items = page.locator('#listgroup .list-group-item');
  const [firstId, secondId] = await items.evaluateAll((els) => els.slice(0, 2).map((el) => el.id));

  // From the search box, Tab reaches the first patient of the list
  await page.getByPlaceholder('Find Patients').focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.matches('#listgroup .stretched-link'))) break;
  }
  const focusedId = () => page.evaluate(() => document.activeElement?.closest('.list-group-item')?.id);
  expect(await focusedId()).toBe(firstId);
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', new RegExp(`FHIR Patient ID ${firstId}$`));

  // The arrows move between patients, Enter opens the focused one
  await page.keyboard.press('ArrowDown');
  expect(await focusedId()).toBe(secondId);
  await page.keyboard.press('ArrowUp');
  expect(await focusedId()).toBe(firstId);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(page.locator('#fhirId')).toHaveValue(secondId);
  await expect(page.locator(`[id="${secondId}"] .stretched-link`)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#listgroup [aria-current]')).toHaveCount(1);
});

test('the lab chart has a text alternative with the plotted values', async ({ page }) => {
  await login(page);
  // The first patient with a lab test that has a numeric result
  const ids = await page.locator('#listgroup .list-group-item').evaluateAll((els) => els.map((el) => el.id));
  for (const id of ids) {
    const options = await (await page.request.get(`/fhir/api/laboptions/${id}`)).json();
    for (const option of options) {
      const results = await (await page.request.get(`/fhir/api/patient/${id}/lab/${encodeURIComponent(option.code)}`)).json();
      const numeric = results.filter((r) => r.value !== null && r.value !== '' && !isNaN(Number(r.value)));
      if (!numeric.length) continue;

      // The chart of the Laboratory card: choosing a test draws it
      await page.locator(`[id="${id}"]`).click();
      await expect(page.locator('#labtest option')).toHaveCount(options.length + 1);
      await page.locator('#labtest').selectOption(option.code);

      const table = page.locator('#labTable');
      await expect(table.locator('caption')).toHaveText(option.name);
      await expect(table.locator('tbody tr')).toHaveCount(numeric.length);
      const rows = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.cells].map((td) => td.textContent)));
      expect(rows).toEqual(numeric.map((r) => [r.date, String(r.value)]));
      await expect(page.locator('#myChart')).toHaveAttribute('aria-label', new RegExp(`${numeric.length} results`));
      // Visually hidden, but in the accessibility tree
      await expect(table).toHaveClass(/sr-only/);
      return;
    }
  }
  throw new Error('no patient with a numeric lab result');
});
