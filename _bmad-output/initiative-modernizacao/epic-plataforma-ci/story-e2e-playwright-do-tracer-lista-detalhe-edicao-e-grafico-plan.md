---
title: 'E2E Playwright do tracer: lista, detalhe, edição e gráfico'
type: 'chore'
ticket: '3'
created: '2026-10-05'
status: 'built'
baseline_revision: '815d3dc4e26f5ce2e714b66cd406d4969d742121'
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

**Problem:** O smoke da story 1.2 prova as rotas HTTP, mas não o JavaScript das páginas. Uma quebra no fhir.js, na autenticação do `myFHIR.js` ou no gráfico passaria com o CI verde.

**Approach:** Criar `e2e/` (package.json com lockfile, Playwright, `BASE_URL` da story 1.1) com um teste em viewport desktop: abre `patientlist.html`; escolhe um paciente com exames (o primeiro com `/fhir/api/laboptions` não vazio, já que os ids mudam a cada build); confere os detalhes e o badge de laboratório; edita a cidade, salva, confere o toast de sucesso e restaura o valor; segue o link do gráfico (nova aba, `target=_blank`), escolhe um exame, clica em Search e confere que o gráfico renderiza. Adiciona `e2e/node_modules` ao `.gitignore` e ao `.dockerignore` e roda o teste no `ci.yml` depois do smoke.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: cerca de 100 linhas em 5 arquivos simples (teste, config, package.json, passo no ci.yml, ignores). Risco médio: os seletores dependem do markup legado (`onclick` inline, toastr) e o teste grava no FHIR. Por isso restaura o valor original.

- Arquivos: `e2e/package.json` + `package-lock.json` (@playwright/test 1.63.0, fixado), `e2e/playwright.config.js` (chromium, desktop 1440×900, 1 worker, `BASE_URL`), `e2e/tests/tracer.spec.js`, `.github/workflows/ci.yml` (setup-node 22 com cache, passo E2E, relatório como artifact em falha), `.gitignore` e `.dockerignore`.
- Decisão: o paciente é escolhido pelos ids da própria lista renderizada, via `/fhir/api/laboptions` (anônimo); o teste não carrega credenciais.
- Decisão: a edição é provada recarregando o paciente e vendo a cidade nova; só depois o valor original é restaurado. O gráfico é provado pelo número de pontos em `Chart.instances`, não só pela existência do canvas.
- Verificado localmente: passa em cerca de 11 s, e nenhuma cidade ficou com o sufixo "e2e" depois.
- Surpresa: a primeira mutação (sem o bloco auth no myFHIR.js) passou, porque o Web Gateway servia ao navegador a versão gzip do arquivo, que estava em cache. Depois de `docker compose restart`, a mutação falhou como esperado (a lista não renderiza) e o teste voltou a passar com o arquivo restaurado. O cache foi registrado em deferred-work.md.
- Após a revisão: o recarregamento do paciente limpa o campo e espera a resposta `Patient?` antes de checar; o restore vai para um `finally` pela API FHIR (o único lugar onde o teste usa a credencial de demo); um sufixo " e2e" deixado por run anterior é removido do valor original; o exame é escolhido com `selectOption`, e o teste confere `#testName`.
- `.dockerignore` exclui `e2e/` inteiro em vez de só `e2e/node_modules`: a imagem não usa nada da pasta, e o resultado do build é o mesmo.
- Reverificado: passa (cerca de 7 s); com o PUT interceptado e respondido 200 sem gravar, o teste falha na persistência (`Expected "Sudbury e2e"`, `Received "Sudbury"`) e o `finally` restaura, sem cidade com o sufixo depois.

## Verification

**Commands:**
- `cd e2e && npx playwright test` contra o container local -- expected: 1 teste passa.
- Remover o bloco `auth` do `myFHIR.js` e rodar de novo -- expected: o teste falha.
- CI do PR -- expected: passo "E2E" verde.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 3 medium, 2 low, 0 false, 1 sem veredito (verificação pendente).

- medium → patch — a checagem de persistência passava na primeira leitura, porque o `fill` já deixara o valor: o campo é limpo e o teste espera a resposta do reload. Provado com o PUT falso.
- medium → patch — corrida entre o `loadForm` pendente e o restore: resolvida pela mesma espera, e o restore saiu da UI para a API.
- medium → patch — sem limpeza em caso de falha: `try/finally` com restore pela API e remoção do sufixo herdado.
- low → patch — o teste não escolhia um exame: `selectOption` da última opção e checagem de `#testName`.
- low → mantido — `.dockerignore` exclui `e2e/` inteiro: registrado nas notas, sem efeito no build.
- verificação concluída — PR #10, run 37303290055 verde em 5min34s, com os passos Smoke test e E2E.
