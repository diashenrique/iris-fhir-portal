---
title: 'Refactor sweep'
type: 'refactor'
ticket: '6'
created: '2026-10-07'
status: 'built'
baseline_revision: 'a97758e432bf4798050b2583ba9baa05f79cc46c'
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

**Approach:** Varrer os planos da 5.1 a 5.5; resolver ou adiar explicitamente cada item, só com limpeza.

</frozen-after-approval>

## Itens

| Item | Origem | Destino |
|---|---|---|
| O tema aplica padrões do Chart.js 2 (`Chart.defaults.global`), que o 4 ignora. O gráfico ganhou uma legenda que repete o título acima dele e perdeu a fonte do tema. | 5.2 (achado na varredura) | **resolvido**: `plugins.legend.display: false` no config e `Chart.defaults.font.family` com a fonte do tema; conferido no navegador (legenda desligada, ticks com Fira Sans) |
| O README não falava do vendor | 5.1 a 5.4 | **resolvido**: um parágrafo em "Checking your Docker installation", com links para `vendor/README.md` e `INVENTORY.md` e o check local |
| 404 do ícone da página de login do IRIS (`/fhir/portal/portal/ISC_IRIS_prod_icon.svg`) | 5.2 | **adiado** para o epic-layout-prontuario: a página é do IRIS, não do `fhirUI` |
| Licença do tema Looper | 5.3 | **adiado** para o usuário (decisão dele); registrado em `vendor/INVENTORY.md` |
| Font Awesome 6 | 5.4 | **adiado** para o epic-layout-prontuario, que redesenha os ícones |

## Verification

- e2e 27/27; legenda e fonte do gráfico conferidas no navegador.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
