// @ts-check
const { expect } = require('@playwright/test');

const ENTRY_PAGE = '/fhir/portal/diashenrique.fhir.portal.Home.cls';

/**
 * Log in through the IRIS login page of the portal. The session cookie then authenticates
 * the pages, /fhir/r4 and /fhir/api; page.request shares it.
 * @param {import('@playwright/test').Page} page
 */
async function login(page, user = 'fhirportal', password = 'fhirportal') {
  await page.goto(ENTRY_PAGE);
  await page.fill('input[name=IRISUsername]', user);
  await page.fill('input[name=IRISPassword]', password);
  await Promise.all([
    page.waitForURL('**/fhir/portal/patientlist.html'),
    page.click('input[name=IRISLogin]'),
  ]);
  await expect(page.locator('#listgroup .list-group-item').first()).toBeVisible();
}

module.exports = { ENTRY_PAGE, login };
