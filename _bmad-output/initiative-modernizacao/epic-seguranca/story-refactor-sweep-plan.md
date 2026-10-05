---
title: 'Refactor sweep'
type: 'refactor'
ticket: '7'
created: '2026-10-05'
status: 'built'
baseline_revision: '52c92185aa121b70876b657d6be7833a6e90b725'
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

**Problem:** Das notas e revisões das entradas 2.1 a 2.6 e do bug 2.8 sobraram três limpezas no código deste épico. O `iris.script` cria o `/fhir/api` anônimo (`AutheEnabled=64`) e só depois o ajusta para login e sessão. O `FHIR_JSON` está duplicado em dois testes e2e. E os artefatos do spike (`spike-sessao/`) ainda descrevem o `/fhir/r4` com 8224, que o bug 2.8 trocou para 8288.

**Approach:** Só limpeza, sem mudar comportamento. Criar o `/fhir/api` já com `AutheEnabled=32`, `GroupById`, `CookiePath` e `UseCookies`, removendo o `Modify` posterior; mover o `FHIR_JSON` para `e2e/tests/helpers.js`; anotar no `setup.script` e no plano do spike que o `/fhir/r4` ficou em 8288 (bug 2.8). Os itens do `deferred-work.md` são de outros épicos e ficam lá.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: cerca de 25 linhas. Risco baixo, com rebuild, smoke e e2e como prova.

- Arquivos: `iris.script` (o `/fhir/api` nasce com `AutheEnabled=32`, `GroupById`, `CookiePath` e `UseCookies`; saiu o `Modify` posterior), `e2e/tests/helpers.js` (exporta `FHIR_JSON`), `e2e/tests/ssn.spec.js` e `xss.spec.js` (importam `FHIR_JSON`), `spike-sessao/setup.script` e o plano do spike (nota de que o bug 2.8 trocou para 8288).
- Verificado com rebuild do zero: `/fhir/api` com `32 fhirportal /fhir/ :%HS_DB_FHIRSERVER:FHIRPortalAPI`; smoke PASS; e2e com 6 testes passando; 0 alertas no `messages.log`.

## Verification

**Commands:**
- Rebuild do zero, `bash scripts/smoke.sh` e `npx playwright test` -- expected: tudo passa, sem alertas no `messages.log`.
- CI do PR -- expected: verde.

- Verificado no GitHub: PR #14, run 37348509388 verde em 6min06s.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 0 medium, 3 low, 0 false.

- low → patch — o `verify.sh` do spike ainda descrevia 8224 sem aviso: comentário de que o bug 2.8 manteve 8288.
- low → patch — o achado 7 do plano do spike instruía aceitar 404 sem apontar para a atualização: marcado como superado pelo bug 2.8.
- low → patch — linha em branco dupla no `xss.spec.js` depois de remover o `FHIR_JSON`: removida; o teste de XSS passa.
