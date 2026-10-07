---
title: 'Gráfico do exame dentro do card de laboratório'
type: 'feature'
ticket: '6'
created: '2026-10-06'
status: 'built'
baseline_revision: '4c35d92528d80f74b0a7f1e6bd5c0a9eb3b917de'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/ux-layout-prontuario/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O gráfico abre noutra aba (`labresult.html`). Ele repete os dados do paciente em campos só de leitura, só desenha depois de "Search" e não mostra unidade nem faixa.

**Approach:**
- **No card:** o card Laboratory ganha "Chart a test", com as opções de `/fhir/api/laboptions` e o selo "SQL · /fhir/api". Escolher um exame desenha o gráfico (Chart.js 4, valores de `/fhir/api/patient/:id/lab/:code`).
- **Unidade e faixa:** a unidade vai no eixo y, e a faixa de referência vira uma banda (as bordas inferior e superior, com `fill: '-1'`). As duas vêm do `labTests` da 8.5.
- **Sem valor numérico:** o exame mostra "{exame} has no numeric results to chart.".
- **Tabela alternativa:** a da 5.5 continua.
- **Página antiga:** `patientlist.html?id=X` abre o paciente X, o `labresult.html` vira só um redirect para lá, e o `labresult.js` sai.
- **Erros da `/fhir/api`:** 401 leva ao login uma vez, com o mesmo guarda de redirect da 2.2; os outros erros viram toast.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o tratamento de 401 do `labresult.js` virou `apiFailed` no `myFHIR.js`, com o mesmo `redirectKey` da lista.
- O dataset do exame é sempre o primeiro (`datasets[0]`), e as bordas da faixa vêm depois, para que o estado do gráfico nos testes leia o exame.
- `Chart.defaults.locale = 'en-US'`: sem isso, o eixo seguia o idioma do navegador ("4,70"), e a interface é em inglês.
- No celular, a linha de data do grupo (`tbody th`) também vira bloco.
- Testes adaptados:
  - `lab-chart.spec.js` foi reescrito para o card.
  - `a11y`, `tracer` e `xss` passaram a usar o card.
  - `edge-cases` e `pagination` passaram a olhar o `#labChartSection`.
  - `cards` e `layout` ganharam seletores sem ambiguidade (agora há dois selos e duas tabelas no card).
- Verificado: e2e 37/37 e smoke inteiro. Os testes novos de `lab-chart` cobrem:
  - o desenho sem "Search" e o selo SQL;
  - o aviso de exame sem valor numérico;
  - a unidade no eixo e a banda (3 datasets);
  - o `labresult.html?id=X` abrindo o prontuário de X.

  As capturas a 1440px e a 390px confirmam que não há rolagem horizontal.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
