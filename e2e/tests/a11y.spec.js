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

test('opening a patient moves the focus to its name, and the cards are named with their count', async ({ page }) => {
  await login(page);
  await page.locator('#listgroup .list-group-item').first().click();
  await expect(page.locator('#patientName')).toBeFocused();
  await expect(page.locator('#badgeAllergy')).toHaveText(/^\d+$/);
  const count = await page.locator('#badgeAllergy').textContent();
  await expect(page.getByRole('region', { name: `Allergies ${count}` })).toBeVisible();
  for (const name of [/^Vital signs \d+$/, /^Laboratory \d+$/, /^Immunizations \d+$/]) {
    await expect(page.getByRole('region', { name }), String(name)).toBeVisible();
  }
});

test('errors are also said in a live region, and / goes to the patient search', async ({ page }) => {
  await login(page);
  await page.route('**/fhir/r4/Immunization?**', (route) => route.fulfill({ status: 500, body: '' }));
  await page.locator('#listgroup .list-group-item').first().click();
  await expect(page.locator('#liveStatus')).toHaveText('Could not load immunizations (HTTP 500)');
  await expect(page.locator('#liveStatus')).toHaveAttribute('aria-live', 'polite');

  await page.locator('#patientName').focus();
  await page.keyboard.press('/');
  await expect(page.locator('#searchClients')).toBeFocused();
  // Typed in the search box, "/" is just a character
  await page.keyboard.type('a/b');
  await expect(page.locator('#searchClients')).toHaveValue('a/b');
});

test('on a phone every control is at least 44px high', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  // A patient with lab results, so the chart controls are there too
  const ids = await page.locator('#listgroup .list-group-item').evaluateAll((els) => els.map((el) => el.id));
  for (const id of ids) {
    if ((await (await page.request.get(`/fhir/api/laboptions/${id}`)).json()).length) {
      await page.locator(`[id="${id}"]`).click();
      break;
    }
  }
  await expect(page.locator('#labChartSection')).toBeVisible();
  const small = await page.evaluate(() => [...document.querySelectorAll('.app button, .app a, .app select, .app input')]
    .filter((el) => !el.matches('.stretched-link, [disabled]') && el.offsetParent !== null && el.getBoundingClientRect().height > 0)
    .map((el) => ({ el: el.id || el.className || el.tagName, h: Math.round(el.getBoundingClientRect().height) }))
    .filter((t) => t.h < 44));
  expect(small).toEqual([]);
});
