---
title: '/fhir/api só com leitura nas tabelas FHIR'
type: 'feature'
ticket: '4'
created: '2026-10-06'
status: done
baseline_revision: 'ca3027b65c12695db0707b71e1e98ac08d20261d'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/epic-ipm-paridade/spike-spike-ipm-no-iris-2026-2-pacote-fhir-server-e-instalacao-do-plan.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O `/fhir/api` recebe o `%HS_DB_FHIRSERVER`, que dá leitura e escrita nas tabelas FHIR (spike 3.6, `deferred-work.md`).

**Approach:** A receita do spike 4.1, item 5, na classe instaladora. O papel `FHIRPortalRead` recebe os bancos do papel de banco do namespace, cada um só em R (derivados do `%HS_DB_<ns>`, sem nomes fixos). O `FHIRPortalAPI` ganha `GRANT SELECT ON SCHEMA` nos esquemas de recursos e de busca, resolvidos pela estratégia do endpoint, além do EXECUTE. O `/fhir/api` passa a `:FHIRPortalRead:FHIRPortalAPI`. `scripts/check-readonly.sh` prova no CI, nas duas pernas, que o SELECT funciona e que UPDATE e DELETE dão -99.

## Boundaries & Constraints

**Never:** mudar o `Dispatch`; mudar os papéis do `/fhir/portal` (a página de entrada só roda código, não lê tabelas FHIR).

</frozen-after-approval>

## Implementation Notes

- O teste usa um usuário temporário com os papéis do `/fhir/api` e `$System.Security.Login`. Achado: depois do login, o terminal recusa o próximo comando ("Access Denied"), então o login, as consultas e o `halt` ficam numa linha só, e o usuário é removido numa segunda sessão.
- No IPM, o `docker exec` do `IRIS_EXEC` ganhou `-i`, porque os scripts mandam o ObjectScript pelo stdin.
- Verificado no container Docker com o módulo recarregado: `check-readonly.sh` → SELECT 0, UPDATE e DELETE -99 nas tabelas R e S; smoke com todas as checagens passando; e2e 25/25. Mutação (`%HS_DB_FHIRSERVER` de volta no `/fhir/api`): o check falha (UPDATE e DELETE dão 100), e a recarga do módulo restaura.

## Plan Change Log

## Review Triage Log

Revisão `quick` (do próprio implementador, 3 arquivos), passada 1: 0 high, 0 medium, 0 low. O teste de mutação cobre o caminho de falha.
