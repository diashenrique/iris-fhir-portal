// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

/** The events shown, as [date, type, text], by year */
const shown = (page) => page.locator('#timelineBody .timeline-year:visible').evaluateAll((years) => years.map((y) => ({
  year: y.querySelector('.timeline-year-title').textContent,
  events: Array.from(y.querySelectorAll('.timeline-event:not(.d-none)'), (e) =>
    Array.from(e.children, (c) => c.textContent)),
})));

test('the Timeline lists the dated events of $everything by year, latest first, and filters them by type', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Time'], family: 'Line' }] });
    const subject = { reference: `Patient/${id}` };
    await data.create({ resourceType: 'Encounter', status: 'finished', class: { code: 'AMB', display: 'ambulatory' },
      type: [{ text: 'General examination' }], subject, period: { start: '2021-05-04T09:00:00Z' } });
    await data.create({ resourceType: 'Condition', code: { text: 'Hypertension' }, subject, onsetDateTime: '2019-08-01T10:00:00Z' });
    await data.create({ resourceType: 'Immunization', status: 'completed', vaccineCode: { text: 'Influenza vaccine' },
      patient: subject, occurrenceDateTime: '2021-10-12T10:00:00Z' });
    await data.create({ resourceType: 'Procedure', status: 'completed', code: { text: 'Blood test' }, subject, performedDateTime: '2019-08-01T11:00:00Z' });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#patientName')).toHaveText('Time Line');

    // The Chart tab is the default; the Timeline loads when it is opened
    await expect(page.locator('#chartView')).toBeVisible();
    await expect(page.locator('#timelineView')).toBeHidden();
    const [everything] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/Patient/${id}/$everything`)),
      page.locator('#tabTimeline').click(),
    ]);
    expect(everything.ok()).toBeTruthy();
    await expect(page.locator('#chartView')).toBeHidden();
    await expect(page.locator('#tabTimeline')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#timelineView .source-badge')).toHaveText('FHIR · $everything');

    await expect.poll(() => shown(page)).toEqual([
      { year: '2021', events: [
        ['Oct 12, 2021', 'Immunizations', 'Influenza vaccine'],
        ['May 4, 2021', 'Encounters', 'General examination'],
      ] },
      { year: '2019', events: [
        ['Aug 1, 2019', 'Procedures', 'Blood test'],
        ['Aug 1, 2019', 'Conditions', 'Hypertension'],
      ] },
    ]);

    // Filters: one per type present, with its count; a year with nothing left goes away
    await expect(page.locator('.timeline-filter')).toHaveText(['Encounters (1)', 'Conditions (1)', 'Procedures (1)', 'Immunizations (1)']);
    await page.locator('.timeline-filter', { hasText: 'Immunizations' }).click();
    await page.locator('.timeline-filter', { hasText: 'Encounters' }).click();
    await expect(page.locator('.timeline-filter', { hasText: 'Encounters' })).toHaveAttribute('aria-pressed', 'false');
    expect((await shown(page)).map((y) => y.year)).toEqual(['2019']);

    // Back to the chart, with the arrow keys of the tabs
    await page.locator('#tabTimeline').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tabChart')).toBeFocused();
    await expect(page.locator('#chartView')).toBeVisible();
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('a failed $everything says so in the Timeline, with Try again', async ({ page }) => {
  await login(page);
  let failures = 1;
  await page.route('**/$everything', (route) => failures-- > 0 ? route.fulfill({ status: 500, body: '' }) : route.continue());
  await page.locator('#listgroup .list-group-item').first().click();
  await page.locator('#tabTimeline').click();

  await expect(page.locator('#timelineBody')).toHaveText(/Couldn't load the timeline\./);
  await expect(page.locator('.toast-error')).toHaveText('Could not load the timeline (HTTP 500)');
  await page.locator('#timelineBody').getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('#timelineBody .timeline-event').first()).toBeVisible();
});
