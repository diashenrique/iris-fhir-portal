---
title: 'Refactor sweep'
type: 'refactor'
ticket: '5'
created: '2026-10-06'
status: done
baseline_revision: '9604a211b2ea11749aeadfd61961212ca6439a45'
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

**Approach:** Varrer os planos da 4.1 a 4.4 e o `deferred-work.md`; resolver ou adiar explicitamente cada item, só com limpeza.

</frozen-after-approval>

## Itens

| Item | Origem | Destino |
|---|---|---|
| Desinstalar o módulo não remove o que a classe instaladora criou | revisão da 4.2 (`deferred-work.md`) | **resolvido**: `Installer.Remove`, no `<Invoke>` da fase Unconfigure, remove `/fhir/portal`, `/fhir/api`, os dois papéis e o usuário de demo (só se os apps são deste namespace); o `/fhir/r4` fica como está |
| `%HS_DB_FHIRSERVER` dá escrita ao `/fhir/api` | spike 3.6 (`deferred-work.md`) | **resolvido** na 4.4 |
| Bug do `fhir-server` 1.3.7 no 2026.2 (template quebrado) | spike 4.1 | **adiado**: aviso ao mantenedor do `iris-fhir-template` é ação externa; fica para o usuário decidir (epic-docs-demo) |
| `-Dzpm.X` não chega ao módulo num `zpm load` (IPM 0.10.9) | 4.2 | **documentar** na 4.6 (README usa `-DDemoUser=1`) |
| Roteiros do spike (`spike-ipm/`) usam o módulo de prova antigo | spike 4.1 | **mantido**: registro histórico, reproduz as respostas do spike |

## Verification

- `bash scripts/ipm-install.sh` do zero, smoke inteiro PASS, `check-readonly.sh` PASS; `zpm "uninstall fhir-portal"` → "Unconfigure SUCCESS", sem `/fhir/portal`, `/fhir/api`, papéis e usuário de demo; `/fhir/r4` continua.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
