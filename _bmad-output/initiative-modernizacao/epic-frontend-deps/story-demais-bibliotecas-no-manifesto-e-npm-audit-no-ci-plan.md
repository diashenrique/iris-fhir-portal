---
title: 'Demais bibliotecas no manifesto e npm audit no CI'
type: 'chore'
ticket: '4'
created: '2026-10-06'
status: done
baseline_revision: '5504994fa525e5a9941ce03b1b149cb064609c60'
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

**Problem:** flatpickr, toastr, perfect-scrollbar, PACE, Font Awesome e Open Iconic ainda são cópias de 2020, algumas fora do `assets/vendor`, e nada no CI acusa um advisory conhecido.

**Approach:**
- Todas entram pelo manifesto com versão exata: flatpickr 4.6.13, toastr 2.1.4, perfect-scrollbar 1.5.6, pace-js 1.2.4, Font Awesome Free 5.15.4 e Open Iconic 1.1.1.
- O toastr e o `jqFhir.js` vão para o `assets/vendor`, e as tags e o inventário são atualizados.
- O job `vendor` do CI passa a rodar `npm ci --ignore-scripts` e `npm audit --audit-level=moderate`.

</frozen-after-approval>

## Implementation Notes

- Decision (autonomia): o Font Awesome fica na 5.x (5.15.4). A 6.x muda nomes de ícones e as webfonts, e o redesenho é do epic-layout-prontuario. Só as webfonts woff2, woff e ttf são copiadas.
- Resposta à incógnita da entrada: o pacote npm `fhir.js` 0.0.22 traz só o código-fonte, sem o build jQuery. O `jqFhir.js` vai para `assets/vendor/fhir.js/` e fica no inventário como arquivo fora do npm.
- O `resources/fonts` (Font Awesome 4 e Google Sans, 1,9 MB) saiu: nenhum CSS, HTML ou JS o referencia.
- O `@fortawesome/fontawesome-free` tem um postinstall que só imprime a atribuição. Como o vendor só copia arquivos, o CI e o README usam `--ignore-scripts`.
- Resultado: o `fhirUI` caiu de 14 MB para 2,2 MB.
- Verificado:
  - `sync.mjs --check` passa com 29 arquivos em 10 pastas, e `npm audit --audit-level=moderate` encontra 0 vulnerabilidades.
  - Smoke inteiro e e2e 25/25.
  - Na verificação da interface, os ícones aparecem, o acordeão e o modal funcionam e não há erro de script. O único 404 é o ícone da página de login do IRIS, já registrado.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
