---
title: 'Observations sem valueQuantity nas tabelas'
type: 'bugfix'
ticket: '3'
created: '2026-10-05'
status: 'built'
baseline_revision: 'cd0cb08f26a8cb171cd5c80d6886437ec75e561f'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** As tabelas de sinais vitais e de laboratório leem `valueQuantity.value` e `valueQuantity.unit` direto. Uma Observation com `valueCodeableConcept`, `valueString`, sem valor ou com `component` sem `valueQuantity` lança erro e interrompe a tabela. O texto do exame também sai só de `code.coding[0].display`.

**Approach:** Um helper devolve o valor e a unidade de uma Observation ou de um component, para qualquer `value[x]`: `valueQuantity` (valor e unidade), `valueCodeableConcept` (`text` ou o `display` do primeiro coding), `valueString`, os tipos simples (`valueBoolean`, `valueInteger`, `valueDateTime` e afins, como texto), ou vazio. O nome do exame vem de `code.text` ou do `display` do primeiro coding. Nas duas tabelas, uma Observation sem `value[x]` e com `component` vira uma linha por component; sem nenhum dos dois, uma linha com valor vazio.

## Boundaries & Constraints

**Always:** inserir com `textRow`/`.text()`; manter as colunas atuais; usar o `fixtures` do e2e.

**Never:** formatar números ou datas (epic-layout-prontuario); mudar o gráfico (entrada 8; a decisão do épico é plotar só valores numéricos).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `valueCodeableConcept` | laboratório com `text` "Positive" | linha com valor "Positive" e unidade vazia | — |
| `valueString` | sinal vital com "normal" | linha com "normal" | — |
| `component` sem `value[x]` no item | sinal vital com 2 components, um com `valueQuantity` e outro com `valueCodeableConcept` | duas linhas, uma por component, com os valores certos | — |
| Sem valor | laboratório sem `value[x]` e sem `component` | uma linha com valor e unidade vazios | — |
| Synthea | dados atuais | testes anteriores passam | — |

</frozen-after-approval>

## Code Map

- `fhirUI/resources/js/myFHIR.js` -- `window.vitalsigns` (usa `hasOwnProperty('valueQuantity')`, e o else percorre `component` lendo `bp.code.text` e `bp.valueQuantity`) e `window.laboratory` (lê `valueQuantity` direto); `textRow`, `noRecordsRow` e `entries(bundle)` já existem.
- `e2e/tests/helpers.js` -- `fixtures(page)`.
- `e2e/tests/observation-values.spec.js` -- novo.

## Tasks & Acceptance

**Execution:**
- [x] `fhirUI/resources/js/myFHIR.js` -- helper de valor e unidade e helper de nome do código; as duas tabelas usam os dois, com uma linha por component quando não há `value[x]`.
- [x] `e2e/tests/observation-values.spec.js` -- cobre a matriz, falhando em qualquer `pageerror`.

**Acceptance Criteria:**
- Given a suíte inteira, when roda, then todos os testes passam e nenhum recurso de teste sobra.
- Given a tabela de laboratório voltando a ler `valueQuantity` direto (mutação), when o teste novo roda, then falha.

## Verification

**Commands:**
- `docker compose restart` e `cd e2e && npx playwright test` -- expected: todos passam.
- Mutação descrita acima -- expected: falha.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total concedida pelo usuário (2026-10-05).
- Implementado pelo subagente: `valueKey`, `conceptText`, `observationValue` (qualquer `value[x]`; `valueQuantity` 0 preservado) e `observationRows` (uma linha por component quando não há `value[x]`) no `myFHIR.js`, usados nas tabelas de sinais vitais e de laboratório; `e2e/tests/observation-values.spec.js` novo.
- Verificado pelo implementador: 10 testes passando; a mutação (laboratório lendo `valueQuantity` direto) falha o teste novo, e a limpeza roda mesmo assim.
- Mudança aceita: o nome do exame vem de `code.text` e, na falta dele, do `display` do primeiro coding. Tipos complexos (`valuePeriod`, `valueRange`, `valueRatio`, `valueSampledData`, `valueAttachment`) ficam vazios.

- Depois da revisão: o `comparator` vai na frente do valor ("< 0.5") e a unidade usa `unit || code`; o teste ganhou o caso "Glucose < 0.5 mg/dL". Reverificado: suíte completa passando.

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 0 medium, 3 low, 0 false.

- low → adiado para a 3.5 (já planejada) — o `pageerror` do teste não pega exceções engolidas pelos `.catch`: a 3.5 faz os `.catch` mostrarem erro, e os testes passam a falhar diante de um toast de erro (Intent da 3.5 ajustada).
- low → patch — `comparator` ignorado e unidade só do `unit`: "< 0.5" e `unit || code`, com teste.
- low → patch — as notas não citavam o `valueAttachment` entre os tipos que ficam vazios: corrigido.
