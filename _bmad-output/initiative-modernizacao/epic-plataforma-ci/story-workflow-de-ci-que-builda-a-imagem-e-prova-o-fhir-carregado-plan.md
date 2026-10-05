---
title: 'Workflow de CI que builda a imagem e prova o FHIR carregado'
type: 'chore'
ticket: '1'
created: '2026-10-05'
status: done
baseline_revision: '5b18e7ea1088a912565b9270116b9f0bd4c31de2'
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

**Problem:** O upgrade para IRIS for Health 2026.2 (`latest-cd`) foi verificado só à mão. Nenhum CI detecta quando um novo CD do IRIS ou uma mudança no repo quebra o build ou a carga FHIR, e o `iris session < iris.script` sai com 0 mesmo quando uma linha falha.

**Approach:** Criar `.github/workflows/ci.yml` (push e pull_request) que builda e sobe o container com `docker compose`, espera `/fhir/r4/metadata` responder 200 (anônimo) e exige que `/fhir/r4/Patient` com `fhirportal/fhirportal` retorne `total > 0`, falhando no build, no timeout ou na checagem de dados. O container fica no ar e `BASE_URL=http://localhost:32783` vai para `$GITHUB_ENV`, para os passos das entradas 2 e 3. O usuário autorizou o push do branch `modernizacao-iris-2026` e a abertura do PR.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: um arquivo novo de cerca de 60 linhas, sem mudança de código da aplicação. Risco médio: o runner `ubuntu-latest` tem disco limitado para a imagem de cerca de 6 GB mais as camadas do build, e o primeiro run real é o teste. Se faltar espaço, o workflow remove toolchains pré-instalados antes do build.

- Arquivo novo: `.github/workflows/ci.yml`.
- Decisão: o espaço em disco é liberado sempre, antes do build (remove dotnet, android, ghc e CodeQL, cerca de 20 GB). Isso evita descobrir a falta de disco só depois de um run de 15 minutos.
- Decisão: `BASE_URL` fica no `env` do job, então todos os passos seguintes (smoke da entrada 2, e2e da entrada 3) já o recebem; um export via `$GITHUB_ENV` seria redundante.
- Decisão: a checagem de dados usa `Patient?_summary=count` com `jq` (pré-instalado no runner). `curl -sf` faz um 401 ou 5xx falhar o passo.
- Os passos de espera e de checagem rodaram localmente contra o container 2026.2: servidor no ar e `total` 18. O teste negativo (carga vazia → `[ 0 -gt 0 ]` falha) e o run real no GitHub ficam para o PR.
- Em caso de falha, o passo final despeja `docker compose logs`.
- Verificado no GitHub: o PR #8 (run 37294703116) ficou verde em 4min13s (build 3min18s, servidor no ar em 11s). Com a limpeza, o disco do runner bastou.
- Verificado localmente o teste negativo: com `SubmitResourceFiles` apontando para uma pasta vazia, o `docker build` terminou com sucesso (confirma a premissa) e os mesmos passos do workflow falharam com `Patients loaded: 0` e exit 1. Foi feito localmente para não publicar um branch de teste.

## Verification

**Commands:**
- `docker compose build && docker compose up -d` localmente, e depois os mesmos passos de espera e checagem do workflow -- expected: saem com 0.
- Push do branch e PR aberto -- expected: workflow `CI` verde.
- Branch de teste com `SubmitResourceFiles` apontando para uma pasta vazia -- expected: workflow vermelho na checagem de Patient.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 2 medium, 1 low, 2 false, 1 sem veredito (verificação pendente).

- false — `BASE_URL` no `env` do job em vez de `$GITHUB_ENV`: os dois valem só para o job e entregam o mesmo valor aos passos seguintes, onde ficam as entradas 1.2 e 1.3; o handoff da Intent está cumprido.
- low → patch — sem `pipefail`, um 401 do `curl` virava `total` vazio e a falha aparecia como "integer expression expected": job com `defaults.run.shell: bash` (`-eo pipefail`) e `curl -sSf`.
- false (já planejado) — falhas de `LoadDir` ou da criação do `/fhir/api` passam nesta checagem: o smoke da entrada 1.2 exige arrays não vazios nas três rotas de `/fhir/api`, o que detecta as duas.
- medium → patch — `curl` sem limite de tempo podia travar o job até os 45 minutos: `--max-time 10` na espera e `--max-time 30` na checagem.
- medium → patch — `push` e `pull_request` buildavam duas vezes por push com PR aberto, e `cancel-in-progress` cancelava runs de `master`: `push` só em `master`, `pull_request` e `workflow_dispatch`, com cancelamento só em PRs.
- verificação pendente — run verde no GitHub e teste negativo: feitos no PR, ver Implementation Notes.
