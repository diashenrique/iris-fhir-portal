---
title: 'Refactor sweep'
type: 'refactor'
ticket: '8'
created: '2026-10-06'
status: done
baseline_revision: '0d37b493127c7c43afec7999c7b1af1f3cde6b74'
route: 'oneshot'
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

**Problem:** Itens deixados para depois pelas entradas 1 a 7.

**Approach:** Varrer os planos da 8.1 a 8.7 e o código que eles mudaram; resolver ou adiar explicitamente cada item, só com limpeza.

</frozen-after-approval>

## Itens

| Item | Origem | Destino |
|---|---|---|
| O construtor `Toast` e o array `toasts` com o `showToast(i)` trocavam a posição global do toastr. Depois do primeiro save, todos os toasts de erro iam para baixo. | 8.2 | **resolvido**: `saveToast(saved)` passa a posição só naquela chamada, e o erro de save também vai para o `aria-live` |
| Comentários e testes ainda chamavam o painel de "FHIR Data Source modal" | 8.1 a 8.2 | **resolvido**: "FHIR JSON panel" no `myFHIR.js` e nos testes |
| 404 do ícone da página de login do IRIS | 5.2 | **adiado**: a página é do IRIS, não do `fhirUI`, e fica fora do escopo do épico (Boundaries) |
| README e capturas de tela antigas (incluindo o `labresultChart.gif` da página separada) | 8.1 a 8.6 | **adiado** para o epic-docs-demo |

## Verification

- e2e 40/40, smoke inteiro e nenhum alerta "Error displaying login page".

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
