// Screenshots of the README, taken from the running container with the Synthea data of the repository.
// Usage (container up, see the README): cd e2e && node screenshots.js
// Env: BASE_URL (default http://localhost:32783), PATIENT (part of the name to open, default "Carroll")
const path = require('path');
const { chromium } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:32783';
const PATIENT = process.env.PATIENT || 'Carroll';
const IMG = path.join(__dirname, '..', 'img');
const ENTRY = `${BASE_URL}/fhir/portal/diashenrique.fhir.portal.Home.cls`;

/** A page logged in as the demo user, in a language, with the patient open */
async function openChart(browser, { width, height, lang = 'en' }) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript((l) => { try { localStorage.setItem('fhirPortalLang', l); } catch (e) { /* no storage */ } }, lang);
  await page.goto(ENTRY);
  await page.fill('input[name=IRISUsername]', 'fhirportal');
  await page.fill('input[name=IRISPassword]', 'fhirportal');
  await Promise.all([page.waitForURL('**/patientlist.html'), page.click('input[name=IRISLogin]')]);
  await page.locator('#listgroup .list-group-item', { hasText: PATIENT }).first().click();
  // Every card has loaded once each badge has a count
  for (const badge of ['#badgeAllergy', '#badgeCondition', '#badgeVitalSigns', '#badgeLaboratory', '#badgeImmunization']) {
    await page.locator(badge).filter({ hasText: /^\d+$/ }).waitFor();
  }
  // No loading bar, no focus ring in the pictures
  await page.waitForFunction(() => !document.querySelector('.pace') || document.body.classList.contains('pace-done'), null, { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(500);
  await page.locator('#patientName').evaluate((el) => el.blur());
  return page;
}

async function logout(page) {
  await page.request.get(`${ENTRY}?IRISLogout=end`).catch(() => null);
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const shots = [];
  const shot = async (page, file, options = {}) => {
    await page.screenshot({ path: path.join(IMG, file), ...options });
    shots.push(file);
  };

  // The chart: list, summary and cards
  let page = await openChart(browser, { width: 1440, height: 900 });
  await shot(page, 'portal-chart.png');

  // The lab chart inside the Laboratory card
  await page.locator('#labtest').selectOption({ index: 1 });
  await page.locator('#chartBox').waitFor();
  await page.waitForTimeout(800);
  await page.locator('#labChartSection').screenshot({ path: path.join(IMG, 'portal-lab-chart.png') });
  shots.push('portal-lab-chart.png');
  await page.evaluate(() => window.scrollTo(0, 0));

  // The Timeline from $everything
  await page.locator('#tabTimeline').click();
  await page.locator('#timelineBody .timeline-event').first().waitFor();
  await page.locator('#tabTimeline').evaluate((el) => el.blur());
  await shot(page, 'portal-timeline.png');

  // Edit in a modal
  await page.locator('#tabChart').click();
  await page.locator('#editPatient').click();
  await page.locator('#editModal').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await shot(page, 'portal-edit.png');
  await logout(page);

  // A phone, 390px wide
  page = await openChart(browser, { width: 390, height: 844 });
  await shot(page, 'portal-mobile.png');
  await logout(page);

  // Portuguese
  page = await openChart(browser, { width: 1440, height: 900, lang: 'pt-BR' });
  await shot(page, 'portal-portuguese.png');
  await logout(page);

  await browser.close();
  console.log(`screenshots in img/: ${shots.join(', ')}`);
})();
