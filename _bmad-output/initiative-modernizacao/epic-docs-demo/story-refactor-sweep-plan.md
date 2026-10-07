---
title: 'Refactor sweep'
type: 'refactor'
ticket: '5'
created: '2026-10-07'
status: 'built'
baseline_revision: '79adb49218ee973092a96faaecc6670598ad7ef1'
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

**Problem:** Itens deixados para depois pelas entradas 1 a 4.

**Approach:** Varrer os planos da 7.1 a 7.4 e a documentação que eles mudaram; resolver ou adiar explicitamente cada item, só com limpeza.

</frozen-after-approval>

## Itens

| Item | Origem | Destino |
|---|---|---|
| `vendor/INVENTORY.md` dizia que o `labresult.html` carrega bibliotecas, mas desde a 8.6 ele só redireciona | 7.2 (varredura) | **resolvido** |
| No celular, o botão "Reveal" do SSN encosta no campo | 7.2 (captura) | **adiado** (`deferred-work.md`): é interface, não documentação |
| Publicar o rascunho do artigo | 7.4 | **com o usuário** (hitl) |

## Verification

- `check-readme-sql` passa com 10 exemplos, e os links e as imagens do README, do README-JP e do `dev.md` existem.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
