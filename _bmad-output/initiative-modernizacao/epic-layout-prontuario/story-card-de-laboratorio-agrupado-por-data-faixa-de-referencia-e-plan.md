---
title: 'Card de laboratório: agrupado por data, faixa de referência e valor alterado'
type: 'feature'
ticket: '5'
created: '2026-10-06'
status: 'built'
baseline_revision: 'd24e3b968cc4ea379da99c245310d16c24310aa1'
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

**Problem:** Os exames são uma lista cronológica, com a data em cada linha. Não aparece a faixa de referência, e nenhum valor alterado é destacado.

**Approach:**
- **Agrupamento:** os exames saem agrupados por dia, do mais recente para o mais antigo. Cada grupo começa com a linha `tr.lab-date`, com a data legível e o ISO no `title`.
- **Colunas:** Test, Value, Unit e Reference range, esta pelo `rangeText`, no formato "70–99", "≥ 4", "≤ 10" ou o texto da faixa.
- **Destaque:** `abnormalFlag` lê a `interpretation` (H/HH/HU ou L/LL/LU) ou compara o número com a faixa. O valor alterado sai em vermelho, com uma seta decorativa (`aria-hidden`) e a palavra "High" ou "Low".
- **Handoff para a 8.6:** `labTests` guarda, por código, a unidade e a faixa do resultado mais recente.

</frozen-after-approval>

## Implementation Notes

- Source conflict (registrado no épico): os dados Synthea não têm `referenceRange` nem `interpretation`. O caminho é provado pelas Observations criadas no teste.
- Testes adaptados:
  - `pagination`: conta as linhas sem `.lab-date` e espera a ordem do mais recente para o mais antigo.
  - `observation-values`: lê as novas colunas e as linhas de dia.
- Verificado: e2e 36/36. O novo `lab-card.spec.js` cobre:
  - "182.46 ↑ High" com a faixa "70–99";
  - "3.1 ↓ Low" pela `interpretation`, sem faixa;
  - um valor dentro da faixa e outro sem faixa, sem destaque;
  - dois dias, do mais recente para o mais antigo.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
