// @ts-check
const { expect } = require('@playwright/test');

const ENTRY_PAGE = '/fhir/portal/diashenrique.fhir.portal.Home.cls';

// Headers for FHIR REST calls made with page.request
const FHIR_JSON = { Accept: 'application/fhir+json', 'Content-Type': 'application/fhir+json' };

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

/**
 * Test data created through FHIR with the session of the login, and removed afterwards.
 * Call cleanup() in a finally: it tries every delete, newest first, and returns what it could not delete.
 * @param {import('@playwright/test').Page} page
 */
function fixtures(page) {
  /** @type {string[]} */
  const created = [];
  return {
    /**
     * POST a resource and return its id, taken from the Location header.
     * @param {{ resourceType: string, [key: string]: any }} resource
     */
    async create(resource) {
      const res = await page.request.post(`/fhir/r4/${resource.resourceType}`, {
        headers: FHIR_JSON,
        data: JSON.stringify(resource),
      });
      expect(res.status(), `create ${resource.resourceType}`).toBe(201);
      // Location: <base>/fhir/r4/<type>/<id>/_history/<version>
      const id = new RegExp(`/${resource.resourceType}/([^/]+)`).exec(res.headers()['location'])[1];
      created.unshift(`/fhir/r4/${resource.resourceType}/${id}`);
      return id;
    },
    /** DELETE everything created, newest first; never throws, returns the URLs left behind. */
    async cleanup() {
      const notDeleted = [];
      for (const url of created.splice(0)) {
        const res = await page.request.delete(url, { headers: FHIR_JSON }).catch(() => null);
        if (!res || !res.ok()) notDeleted.push(url);
      }
      return notDeleted;
    },
  };
}

module.exports = { ENTRY_PAGE, FHIR_JSON, fixtures, login };
