---
title: 'Smoke test HTTP do portal'
type: 'chore'
ticket: '2'
created: '2026-10-05'
status: done
baseline_revision: '35812f42c906edef2622de284b055eac7ae57333'
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

**Problem:** O CI da story 1.1 só prova que o FHIR subiu com pacientes. Ele não detecta quando o `/fhir/api` ou as páginas quebram, e o `Dispatch` engole erros devolvendo `[]` com HTTP 200, o que um teste só de status não percebe.

**Approach:** Adicionar `scripts/smoke.sh`, que lê `BASE_URL` (padrão `http://localhost:32783`) e checa: `metadata` 200; `/fhir/r4/Patient` com 401 sem credencial e `total > 0` com `fhirportal`; o primeiro paciente cujo `/fhir/api/laboptions/:id` não vem vazio (os ids mudam a cada build); `/fhir/api/patient/:id`, `laboptions` e `/patient/:id/lab/:code` (code tirado de laboptions) devolvendo arrays não vazios; e as duas páginas com 200. O `/fhir/api` é anônimo e não recebe credencial. O script roda como passo do `ci.yml` depois da checagem de dados.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: um script de cerca de 80 linhas e um passo no `ci.yml`. Risco baixo: só adiciona verificação, sem mudar código da aplicação.

- Arquivos: `scripts/smoke.sh` (novo) e `.github/workflows/ci.yml` (passo "Smoke test" depois da checagem de dados, roda com `bash scripts/smoke.sh` para não depender do bit de execução vindo do Windows).
- Decisão: só `curl`, `grep` e `sed`, para rodar igual no runner e no Git Bash local, que não tem `jq`.
- Decisão: todas as checagens rodam e cada uma imprime PASS ou FAIL; a saída é diferente de 0 se qualquer uma falhar, para o log mostrar tudo o que quebrou de uma vez.
- Verificado localmente: 8 PASS, exit 0 (paciente 4, exame 49765-1). Com `HSFHIR_I0001` no `Dispatch.cls` recompilado no container, a checagem de laboptions falhou e o exit foi 1; depois de restaurar e recompilar, tudo voltou a passar.
- Após a revisão: a checagem de `/fhir/api/patient` roda sempre sobre o primeiro paciente, independente de laboptions; sem paciente com exames, a checagem de lab vira um FAIL explícito; o loop para no primeiro timeout ou recusa de conexão (`--max-time 10`); o arquivo tem bit de execução (100755) e o comentário de uso indica `bash scripts/smoke.sh`.
- Reverificado: 8 PASS no container; com a mutação, 3 FAIL (patient, laboptions, lab) e exit 1; com `BASE_URL=http://localhost:1`, 8 FAIL e exit 1 em segundos.
- Verificado no GitHub: PR #9, run 37299800134 verde, com o passo "Smoke test" e as 8 checagens PASS no runner.

## Verification

**Commands:**
- `bash scripts/smoke.sh` contra o container local -- expected: todas as checagens PASS, exit 0.
- Trocar `HSFHIR_X0001` por `HSFHIR_I0001` no `Dispatch.cls`, recompilar no container e rodar o smoke -- expected: checagens do `/fhir/api` FAIL, exit diferente de 0.
- Run do CI no PR -- expected: passo "Smoke test" verde.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 2 medium, 1 low, 1 false, 1 sem veredito (verificação pendente).

- medium → patch — laboptions vazio escondia as checagens de patient e lab: patient roda sobre o primeiro id, lab vira FAIL explícito.
- medium → patch — o loop podia levar 100 × 30 s com a API travada, além do timeout do job: `--max-time 10` e `|| break` no primeiro erro de curl.
- low → patch — o comentário de uso pedia execução direta sem bit de execução: modo 100755 e comentário com `bash`.
- false — arquivos só com intent-to-add: o commit usa `git add -A`.
- verificação concluída — passo "Smoke test" verde no PR #9 (run 37299800134).
