---
title: '/fhir/api com papel mínimo, sem CORS aberto'
type: 'feature'
ticket: '3'
created: '2026-10-05'
status: 'built'
baseline_revision: 'bf21310afcb487038c7ee9f4fc9c3cb1d6935cf2'
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

**Problem:** O `/fhir/api` concede `%All` a quem passa pelo login (`MatchRoles=":%All"` no `iris.script`): qualquer falha futura no `Dispatch` rodaria como superusuário. As rotas ainda declaram `Cors="true"`.

**Approach:** Criar no `iris.script` o papel `FHIRPortalAPI` com só `SELECT` em `HSFHIR_X0001_R.Rsrc` e `EXECUTE` em `SQLUser.GetJSON`, `GetProp` e `GetAtJSON`, e usar `MatchRoles=":%HS_DB_FHIRSERVER:FHIRPortalAPI"` no `/fhir/api`. Remover `Cors="true"` das rotas do `Dispatch.cls`. O smoke ganha as sondas de SQL injection e a checagem de que uma origem estranha não recebe `Access-Control-Allow-Origin`.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: cerca de 25 linhas em 3 arquivos. Risco médio: um privilégio a menos devolve `[]` com 200, o que o smoke detecta.

- Medido no container antes de codar: com `:%HS_DB_FHIRSERVER:FHIRPortalAPI` o smoke passa inteiro. Sem o `EXECUTE` nos procedimentos, as duas rotas de laboratório devolvem `[]` (o smoke falha). Sem `%HS_DB_FHIRSERVER`, as três rotas falham. Então os dois papéis são o mínimo.
- O GRANT de procedimento no IRIS é `GRANT EXECUTE ON SQLUser.GetJSON, ... TO`; a forma `ON PROCEDURE` dá SQLCODE -1.
- CORS medido antes da mudança: mesmo com `Cors="true"`, o `/fhir/api` não envia `Access-Control-Allow-Origin` para `Origin: https://evil.example` (o `CorsAllowlist` do web app está vazio). A remoção é defesa em profundidade, e o smoke vigia a regressão.

## Verification

**Commands:**
- Rebuild do zero e `bash scripts/smoke.sh` -- expected: tudo PASS, incluindo as sondas de injeção e o CORS.
- `Security.Applications.Get("/fhir/api")` -- expected: `MatchRoles` sem `%All`.
- CI do PR -- expected: verde.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 0 medium, 4 low, 1 false.

- low → patch — a checagem de CORS passava sem sessão, não testava o preflight e não pegaria a volta do `Cors="true"`: exige 200 no GET, testa `OPTIONS`, e o comentário diz que ela vigia a allowlist vazia do web app.
- low → defer — as sondas de injeção passam com `[]` também quando o SQL falha, porque o `Dispatch` engole erros: registrado em `deferred-work.md` para o epic-robustez-fhir.
- low → rejeitado — GRANT com falha não derruba o build: é o padrão do `iris.script` (o `iris session` sai com 0), e o smoke detecta o efeito (`[]` nas rotas de laboratório), como medido antes de codar.
- low → defer — a rota `/` aponta para `Test`, que não existe: anterior a esta story e já atribuída ao epic-robustez-fhir; registrada em `deferred-work.md`.
- false — `status: done` sem aspas nos planos 2.1 e 2.2: é como o `tickets.py mark` grava; o fechamento seguiu o merge do PR #12.
