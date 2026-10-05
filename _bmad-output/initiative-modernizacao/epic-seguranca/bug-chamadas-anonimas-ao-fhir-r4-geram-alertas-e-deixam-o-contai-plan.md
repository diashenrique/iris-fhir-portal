---
title: 'Chamadas anônimas ao /fhir/r4 geram alertas e deixam o container unhealthy'
type: 'bugfix'
ticket: '8'
created: '2026-10-05'
status: 'built'
baseline_revision: '14c80f78c19637d357f8a07c87abb9ad40886aa6'
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

**Problem:** Com `AutheEnabled=8224` no `/fhir/r4` (story 2.2), cada chamada anônima faz o IRIS tentar mostrar uma página de login num app REST. Ele grava "CSPServer Error displaying login page" como alerta de severidade 2 e responde 404; os alertas levam o estado a alert, e o healthcheck da imagem marca o container como unhealthy.

**Approach:** Voltar o `/fhir/r4` a `AutheEnabled=8288` (decisão do usuário, 2026-10-05): o servidor FHIR recusa o UnknownUser com 401, sem alerta. Smoke e e2e passam a exigir 401 no anônimo e no pós-logout, e o CI ganha um passo que falha se o `messages.log` tiver essa mensagem depois dos testes. Critérios completos no arquivo do bug.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: cerca de 25 linhas em 4 arquivos. Risco médio: a recusa do anônimo passa a depender do servidor FHIR, e os testes vigiam isso.

- Arquivos: `iris.script` (`/fhir/r4` com 8288 e o motivo em comentário), `scripts/smoke.sh` (`denied` exige 401), `e2e/tests/tracer.spec.js` (anônimo no `/fhir/r4` exige 401), `.github/workflows/ci.yml` (comentário da espera e o passo "No CSP login-page alerts" depois do E2E).
- O redirect do `myFHIR.js` continua aceitando 401 ou 404; não precisa mudar.
- Verificado com rebuild do zero: smoke todo PASS; e2e com 5 testes passando; 0 "Error displaying login page" no `messages.log` depois dos testes; container `healthy`.
- Depois da revisão: o passo de log confere o código de saída (0 = alerta, falha; 1 = nada, passa; outro = não leu o log, falha); o smoke também testa o anônimo sem `Accept`; o e2e exige 401 no `/fhir/r4` depois do logout; os comentários do `ci.yml` e do `myFHIR.js` foram corrigidos (com 8288, o `metadata` anônimo responde 200, e a espera usa a credencial para prová-la). Reverificado: smoke PASS, e2e com 5 testes passando, passo de log com status 1.

## Verification

**Commands:**
- Rebuild do zero, `bash scripts/smoke.sh` e `npx playwright test` -- expected: tudo passa, com 401 no `/fhir/r4` anônimo.
- `grep -c "Error displaying login page" /usr/irissys/mgr/messages.log` no container depois dos testes -- expected: 0.
- CI do PR -- expected: verde, com o passo de log.

- Verificado no GitHub: PR #13, run 37322708909 verde em 6min15s (smoke, E2E com 5 testes e o passo "No CSP login-page alerts").

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 1 medium, 4 low, 0 false.

- medium → patch — o passo de log passava verde quando o `grep` ou o `exec` falhavam: confere o código de saída e só aceita 1.
- low → patch — o comentário da espera dizia que o anônimo é recusado (o `metadata` anônimo responde 200 com 8288): o comentário agora diz que a espera prova a credencial.
- low → patch — o e2e não checava o `/fhir/r4` depois do logout: exige 401.
- low → patch — nenhum teste fazia a chamada anônima sem `Accept`: o smoke testa.
- low → patch — o comentário do `myFHIR.js` ainda falava em 401 ou 404 como resposta normal: atualizado.
