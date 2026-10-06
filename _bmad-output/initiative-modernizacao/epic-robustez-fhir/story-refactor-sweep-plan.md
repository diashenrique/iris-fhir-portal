---
title: 'Refactor sweep'
type: 'refactor'
ticket: '9'
created: '2026-10-05'
status: done
baseline_revision: '19ab175f86afbf4a2ad7356e83b5dc5d422fb04d'
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

**Problem:** Das notas e revisões das entradas 3.1 a 3.8 sobrou pouca limpeza: o `myFHIR.js` ainda declara `divPlist`, que nunca é usada, e tem um `console.log` comentado no `loadForm`. O item do `deferred-work.md` sobre licenças do IRIS Community foi resolvido na 3.4 (logout depois de cada teste), mas o registro não diz isso.

**Approach:** Só limpeza: remover a variável e o comentário mortos e registrar neste plano que o item de licenças está resolvido (o `deferred-work.md` é só de acréscimo). Os outros itens do `deferred-work.md` são de outros épicos (cache gzip → epic-docs-demo; acesso SQL do `%HS_DB_FHIRSERVER` → epic-ipm-paridade). O fechamento do épico exige o CI verde em `master` depois do merge (Done when 5).

</frozen-after-approval>

## Implementation Notes

Rota oneshot: duas linhas. Risco baixo.

- O item "teste da troca de paciente durante a carga" (3.4) não é limpeza: fica como está, protegido pelo código (`selectedPatientId`/`isSelected`).
- Item do `deferred-work.md` "Os testes e2e que fazem login e não fazem logout..." (origem: plano da 3.7): **resolvido na 3.4**. As specs fazem `logout(page)` no `afterEach`; a `pagination.spec.js` faz um login só para o arquivo e o logout no `afterAll`. A suíte passa duas vezes seguidas sem reiniciar o container.
- Decision (autonomia): o Timeout da sessão (900 s), a segunda sugestão desse item, não muda. Com o logout nos testes, ele não é mais o gargalo, e encurtá-lo afetaria quem usa o portal.
- Itens 2 a 4 do `deferred-work.md` (do próprio épico, B7): **resolvidos**. Os `.catch` passaram a ler `err.error.status` na 3.5 (`httpStatus`/`showError`); o `Dispatch` responde 500 em falha de SQL, inclusive durante a leitura das linhas, na 3.7; a rota `/` sem método saiu na 3.7.
- Os outros itens do `deferred-work.md` são de outros épicos: o cache gzip (epic-docs-demo) e o acesso SQL do `%HS_DB_FHIRSERVER` (epic-ipm-paridade).
- Verificado localmente: `docker compose restart`, suíte e2e com 25 testes passando e smoke PASS. Faltam o CI do PR e o run de `master` depois do merge.

## Verification

**Commands:**
- `docker compose restart`, `cd e2e && npx playwright test` e `bash scripts/smoke.sh` -- expected: tudo passa.
- CI do PR e run de `master` depois do merge -- expected: verdes.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 0 medium, 4 low (todos no plano), 0 false. O código foi confirmado correto: nada mais referencia `divPlist` ou `#patientlist`.

- low → patch — a nota dizia logout "depois de cada teste em todas as specs": corrigida (a `pagination.spec.js` usa `afterAll`).
- low → patch — a sugestão de reduzir o Timeout da sessão não tinha decisão: decidido manter 900 s.
- low → patch — os itens 2 a 4 do `deferred-work.md`, deste épico, não tinham registro de resolução: registrados (3.5 e 3.7).
- low → patch — a verificação não tinha resultados: os locais estão registrados; CI e `master` ficam para o merge.
