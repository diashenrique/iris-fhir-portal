// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  // The test writes to the FHIR server and restores the value: no parallel or retried runs
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:32783',
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
});
