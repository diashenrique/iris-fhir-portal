// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

/**
 * A Condition of the patient with a clinical status.
 * @param {string} patientId
 */
function condition(patientId, text, status, onset, abatement) {
  return {
    resourceType: 'Condition',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: status }] },
    code: { text },
    subject: { reference: `Patient/${patientId}` },
    onsetDateTime: onset,
    ...(abatement ? { abatementDateTime: abatement } : {}),
  };
}

test('the Conditions card lists the active ones first and the summary counts them', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Cond'], family: 'Itions' }] });
    await data.create(condition(id, 'Acute bronchitis', 'resolved', '2019-02-01T10:00:00Z', '2019-02-20T10:00:00Z'));
    await data.create(condition(id, 'Hypertension', 'active', '2015-06-10T10:00:00Z'));
    await data.create(condition(id, 'Prediabetes', 'active', '2018-03-05T10:00:00Z'));
    await page.reload();
    await page.locator(`[id="${id}"]`).click();

    await expect(page.locator('#badgeCondition')).toHaveText('3');
    const rows = () => page.locator('#conditionTable tbody tr').evaluateAll((trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll('td'), (td) => td.textContent)));
    // Active first, latest onset first; then the resolved one, with its resolution date
    await expect.poll(rows).toEqual([
      ['Prediabetes', 'Active', 'Mar 5, 2018', ''],
      ['Hypertension', 'Active', 'Jun 10, 2015', ''],
      ['Acute bronchitis', 'Resolved', 'Feb 1, 2019', 'Feb 20, 2019'],
    ]);
    await expect(page.locator('#conditionTable tbody tr.condition-inactive')).toHaveCount(1);

    const pill = page.locator('#conditionAlert');
    await expect(pill).toHaveText('2 active conditions');
    await expect(pill).toHaveAttribute('href', '#cardConditions');
    await expect(page.locator('#cardConditions .card-header .source-badge')).toHaveText('FHIR · fhir.js');
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});

test('a patient without conditions says so and shows no count in the summary', async ({ page }) => {
  await login(page);
  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['No'], family: 'Conditions' }] });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#conditionTable tbody')).toHaveText('No conditions recorded.');
    await expect(page.locator('#badgeCondition')).toHaveText('0');
    await expect(page.locator('#conditionAlert')).toBeHidden();
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});
