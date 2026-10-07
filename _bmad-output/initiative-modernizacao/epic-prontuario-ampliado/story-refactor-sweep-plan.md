---
title: 'Refactor sweep'
type: 'refactor'
ticket: '6'
created: '2026-10-07'
status: done
baseline_revision: '61d814437a4a7b76c6efb02706cce10a9822a40d'
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

**Problem:** Itens deixados para depois pelas entradas 1 a 5.

**Approach:** Varrer os planos da 6.1 a 6.5 e o código que eles mudaram; resolver ou adiar explicitamente cada item, só com limpeza.

</frozen-after-approval>

## Itens

| Item | Origem | Destino |
|---|---|---|
| `genderText`, `statusText` e `medicationStatusText` repetiam o `codeText` da 6.4 | 6.1, 6.3 e 6.5 | **resolvido**: tudo passa pelo `codeText(prefixo, código, fallback)` |
| O card de laboratório, com todos os resultados, domina a página agora que há oito cards | 6.4 | **adiado** (`deferred-work.md`): muda o que o card mostra, então não é limpeza |
| Procura por funções e constantes sem uso no `myFHIR.js` depois do i18n | 6.5 | **nada a fazer**: tudo em uso (o `MONTHS` antigo já tinha saído na 6.5) |

## Verification

- e2e 49/49 e smoke inteiro.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
