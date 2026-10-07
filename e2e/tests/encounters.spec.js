// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

const rows = (page, table) => page.locator(`${table} tbody tr:visible`).evaluateAll((trs) =>
  trs.map((tr) => Array.from(tr.querySelectorAll('td'), (td) => td.textContent)));

test('the Encounters card shows the most recent five, the rest behind Show all, and Care plans their status and activities', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Enc'], family: 'Ounters' }] });
    const subject = { reference: `Patient/${id}` };
    // Six encounters, one per year; the oldest goes behind Show all
    for (const year of [2016, 2017, 2018, 2019, 2020, 2021]) {
      await data.create({
        resourceType: 'Encounter', status: 'finished', subject,
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: year === 2021 ? 'EMER' : 'AMB' },
        type: [{ text: `Visit ${year}` }],
        period: { start: `${year}-03-01T09:00:00Z`, end: year === 2021 ? `${year}-03-03T09:00:00Z` : `${year}-03-01T09:30:00Z` },
      });
    }
    await data.create({
      resourceType: 'CarePlan', status: 'active', intent: 'plan', subject,
      category: [{ text: 'Diabetes self management plan' }],
      period: { start: '2020-05-01T09:00:00Z' },
      activity: [{ detail: { status: 'in-progress', code: { text: 'Diabetic diet' } } }, { detail: { status: 'in-progress', code: { text: 'Exercise therapy' } } }],
    });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();

    await expect(page.locator('#badgeEncounter')).toHaveText('6');
    await expect(page.locator('#cardEncounters .card-header .source-badge')).toHaveText('FHIR · fhir.js');
    await expect.poll(() => rows(page, '#encounterTable')).toEqual([
      ['Visit 2021', 'Emergency', 'Mar 1, 2021 – Mar 3, 2021'],
      ['Visit 2020', 'Ambulatory', 'Mar 1, 2020'],
      ['Visit 2019', 'Ambulatory', 'Mar 1, 2019'],
      ['Visit 2018', 'Ambulatory', 'Mar 1, 2018'],
      ['Visit 2017', 'Ambulatory', 'Mar 1, 2017'],
    ]);
    await page.locator('#encountersShowAll').click();
    await expect(page.locator('#encounterTable tbody tr:visible')).toHaveCount(6);

    await expect(page.locator('#badgeCarePlan')).toHaveText('1');
    await expect(page.locator('#cardCarePlans .card-header .source-badge')).toHaveText('FHIR · fhir.js');
    await expect.poll(() => rows(page, '#carePlanTable')).toEqual([
      ['Diabetes self management plan', 'Active', 'May 1, 2020', 'Diabetic diet, Exercise therapy'],
    ]);
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('a patient without encounters or care plans says so in both cards', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['No'], family: 'Visits' }] });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#encounterTable tbody')).toHaveText('No encounters recorded.');
    await expect(page.locator('#carePlanTable tbody')).toHaveText('No care plans recorded.');
    await expect(page.locator('#encountersShowAll')).toBeHidden();
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});
