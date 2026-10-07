---
title: 'Chart.js 4 no gráfico de exames'
type: 'chore'
ticket: '2'
created: '2026-10-07'
status: 'built'
baseline_revision: '701739d983504551eaec9a1d86fb246ed507133e'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O gráfico usa o Chart.js 2.8 (prototype pollution corrigida só na 2.9.4, três versões major atrás), além de um `utils.js` de exemplo que o código não usa.

**Approach:** `chart.js` 4.5.1 e `chartjs-adapter-date-fns` 3.0.0 (build UMD que já traz o date-fns) entram pelo manifesto. O `labresult.js` passa à API 4: pontos `{x, y}`, `scales.x` do tipo `time` e `fill: true`, para manter a área preenchida da 2.x. Saem o `Chart.bundle*`, o `Chart.js`, o `Chart.min.js` e o `utils.js`.

</frozen-after-approval>

## Implementation Notes

- Decision (autonomia): versões exatas no `package.json`, como o jQuery. O `date-fns` fica no lockfile só como peer dependency do adaptador; o bundle UMD já traz o date-fns.
- Verificado:
  - `sync.mjs --check` passa.
  - O e2e passa com 25/25, incluindo o lab-chart, que lê `Chart.instances`.
  - Captura de tela do paciente 3: área preenchida e ticks do eixo x em datas (2011-08-01, 2011-10-01, ...).
- Achado sem relação com a mudança: um 404 em `/fhir/portal/portal/ISC_IRIS_prod_icon.svg`, pedido pela página de login do próprio IRIS (caminho relativo). Não está no `fhirUI` e já existia; fica para o epic-layout-prontuario avaliar.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
