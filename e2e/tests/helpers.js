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
 * End the IRIS session of the page, so it stops holding a license (the community license is small).
 * Never throws: a page that never logged in or already logged out is fine.
 * @param {import('@playwright/test').Page} page
 */
async function logout(page) {
  await page.request.get(`${ENTRY_PAGE}?IRISLogout=end`).catch(() => null);
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

/**
 * Record the text of every error toast the page shows, across reloads. An exception inside a
 * .then is caught by the .catch of the search and becomes an error toast, never a pageerror:
 * a test that expects no errors checks this list too. Call before login (it registers an init script).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>} the list, filled while the test runs
 */
async function watchErrorToasts(page) {
  /** @type {string[]} */
  const toasts = [];
  await page.exposeFunction('__e2eErrorToast', (text) => { toasts.push(text); });
  await page.addInitScript(() => {
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof Element && node.matches('.toast-error')) {
            // @ts-ignore
            window.__e2eErrorToast(node.textContent);
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  return toasts;
}

/**
 * Open the Edit modal of the patient shown, unless it is open already.
 * @param {import('@playwright/test').Page} page
 */
async function openEdit(page) {
  if (await page.locator('#editModal').isVisible()) return;
  await page.locator('#editPatient').click();
  await expect(page.locator('#editModal')).toBeVisible();
}

/**
 * Save the Edit modal (opening it first if needed) and wait for the save to finish: the "Saved."
 * toast shows, the modal closes and the toast goes away.
 * @param {import('@playwright/test').Page} page
 */
async function save(page) {
  await openEdit(page);
  await page.locator('#updateData').click();
  await expect(page.locator('.toast-success')).toBeVisible();
  await expect(page.locator('#editModal')).toBeHidden();
  await expect(page.locator('.toast-success')).toHaveCount(0);
}

module.exports = { ENTRY_PAGE, FHIR_JSON, fixtures, login, logout, openEdit, save, watchErrorToasts };
