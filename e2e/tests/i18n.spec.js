// @ts-check
const { test, expect } = require('@playwright/test');
const { login, logout, fixtures } = require('./helpers');

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('the interface switches to Portuguese, keeps the patient open and stays in Portuguese after a reload', async ({ page }) => {
  await login(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#listTitle')).toHaveText('Patients');

  const data = fixtures(page);
  try {
    const id = await data.create({ resourceType: 'Patient', name: [{ given: ['Idioma'], family: 'Teste' }], gender: 'female', birthDate: '1980-01-15' });
    await data.create({
      resourceType: 'Condition',
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
      code: { text: 'Hypertension' },
      subject: { reference: `Patient/${id}` },
      onsetDateTime: '2018-03-05T10:00:00Z',
    });
    await page.reload();
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('#patientName')).toHaveText('Idioma Teste');

    // Choosing Português reloads the page in Portuguese, on the same patient
    await Promise.all([
      page.waitForURL(`**/patientlist.html?id=${id}`),
      page.locator('#langSelect').selectOption('pt-BR'),
    ]);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('#langSelect')).toHaveValue('pt-BR');
    await expect(page.locator('#listTitle')).toHaveText('Pacientes');
    await expect(page.locator('#patientName')).toHaveText('Idioma Teste');

    // Interface texts, dates and states in Portuguese; clinical data as FHIR sends it
    await expect(page.locator('#patientGender')).toHaveText('Feminino');
    await expect(page.locator('#patientBirthDate')).toHaveText('Nascimento: 15 de jan. de 1980');
    await expect(page.locator('#conditionAlert')).toHaveText('1 condição ativa');
    await expect(page.locator('#cardConditionsTitle')).toHaveText('Condições');
    await expect(page.locator('#conditionTable tbody td')).toHaveText(['Hypertension', 'Ativa', '5 de mar. de 2018', '']);
    await expect(page.locator('#allergyTable tbody')).toHaveText('Nenhuma alergia registrada.');
    await expect(page.locator('#tabTimeline')).toHaveText('Linha do tempo');
    await expect(page.locator('#searchClients')).toHaveAttribute('placeholder', 'Buscar pacientes (tecle /)');

    // A toast in Portuguese
    await page.route('**/fhir/r4/Immunization?**', (route) => route.fulfill({ status: 500, body: '' }));
    await page.locator(`[id="${id}"]`).click();
    await expect(page.locator('.toast-error')).toHaveText('Não foi possível carregar vacinas (HTTP 500)');
    await page.unroute('**/fhir/r4/Immunization?**');

    // The choice is kept in this browser
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('#emptyState')).toHaveText('Selecione um paciente para ver o prontuário.');
  } finally {
    expect(await data.cleanup()).toEqual([]);
  }
});
