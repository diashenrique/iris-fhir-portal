---
title: 'Página do gráfico: um gráfico por vez, erros visíveis e sem código morto'
type: 'bugfix'
ticket: '8'
created: '2026-10-05'
status: 'built'
baseline_revision: 'c10c740dea6c9525dbf366618daf46b65248749a'
route: 'full'
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

**Problem:** No `labresult.js`, cada clique em Search cria um `new Chart` sobre o mesmo canvas sem destruir o anterior, e os gráficos se sobrepõem. As três chamadas `$.getJSON` não têm tratamento de erro, então um 400 ou 500 do `/fhir/api` (que a story 3.7 passou a devolver) deixa a página parada. Valores não numéricos entrariam no gráfico, e o arquivo ainda carrega o `jsonfile` de exemplo com um `console.log`.

**Approach:** Guardar a instância do gráfico e destruí-la antes de criar a próxima. Tratar falhas das três chamadas: 401 leva à página de entrada (sessão encerrada, como na lista), e qualquer outro erro mostra o toast "Could not load <what> (HTTP <status>)", o contrato com a entrada 5. Plotar só os pontos com valor numérico (decisão do épico). Remover o `jsonfile`, o `console.log` dele e o `console.log(responseData)`.

## Boundaries & Constraints

**Always:** manter o formato e a aparência atuais do gráfico; usar o toastr, que já está na página.

**Never:** mudar o `Dispatch.cls`; trocar o Chart.js (epic-frontend-deps); formatar datas (epic-layout-prontuario).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dois exames seguidos | escolher um exame, Search, escolher outro, Search | uma única instância em `Chart.instances`, com os dados do segundo | — |
| Erro na rota de laboratório | `page.route` devolve 500 em `/fhir/api/patient/:id/lab/:code` | toast "Could not load lab results (HTTP 500)"; nenhum gráfico novo | — |
| Erro nas opções | `page.route` devolve 500 em `/fhir/api/laboptions/:id` | toast "Could not load lab tests (HTTP 500)" | — |
| Sessão encerrada | 401 em qualquer chamada | navegador vai para a página de entrada | — |
| Valor não numérico | ponto com `value` nulo | ponto fora do gráfico | — |

</frozen-after-approval>

## Code Map

- `fhirUI/resources/js/labresult.js` -- `getPatient`, `getOptions` e `getResults` com `$.getJSON` sem tratamento de falha; `new Chart(ctx, config)` no fim de `getResults`; `jsonfile` e `console.log` no meio do arquivo.
- `fhirUI/labresult.html` -- já carrega `toastr.min.js` e `toastr.min.css`.
- Página de entrada: `diashenrique.fhir.portal.Home.cls` (mesmo diretório).
- `e2e/tests/helpers.js` -- `login(page)`.
- `e2e/tests/lab-chart.spec.js` -- novo; abre o `labresult.html?id=<paciente com exames>` depois do login.

## Tasks & Acceptance

**Execution:**
- [x] `fhirUI/resources/js/labresult.js` -- variável do gráfico com `destroy()` antes de recriar; um helper de falha (401 → entrada, outros → toast) nas três chamadas; filtro de pontos numéricos; sem o código morto.
- [x] `e2e/tests/lab-chart.spec.js` -- cobre a matriz.

**Acceptance Criteria:**
- Given a suíte inteira, when roda, then todos os testes passam.
- Given o `destroy()` removido (mutação), when o teste roda, then falha por haver duas instâncias.

## Verification

**Commands:**
- `docker compose restart` e `cd e2e && npx playwright test` -- expected: todos passam.
- Mutação sem `destroy()` -- expected: falha.
- CI do PR -- expected: verde.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total concedida pelo usuário (2026-10-05).
- Implementado direto: o subagente parou por limite de sessão da API antes de mexer em qualquer arquivo. `labresult.js` reescrito (helper `failed(what)` com o mesmo contrato do `myFHIR.js`, 401 → entrada, nada durante a saída da página; `chart.destroy()` antes de recriar; só pontos numéricos; ids e códigos com `encodeURIComponent`; sem `jsonfile` e sem os `console.log`); `e2e/tests/lab-chart.spec.js` novo (5 testes).
- Desvio do teste: o 401 é provado encerrando a sessão por trás da página aberta (um 401 falso com a sessão válida faria a entrada devolver o navegador à lista).
- Verificado: 5 testes passando; com a mutação (sem `destroy()`), o teste dos dois exames falha; suíte completa com 24 testes passando e smoke PASS.

- Depois da revisão: só a resposta da busca mais recente desenha (rótulo capturado no envio); o título muda junto com o gráfico; o 401 tem a mesma trava de redirect único da lista; os testes desenham um gráfico antes da falha, escolhem dois exames de nomes diferentes e conferem os pontos, e cobrem um 401 no carregamento das opções. Suíte completa passando.

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 1 medium, 5 low, 0 false.

- medium → patch — uma resposta atrasada podia desenhar o exame errado com o rótulo do novo: só a requisição mais recente desenha.
- low → patch — o título mudava antes do sucesso: muda junto com o gráfico.
- low → patch — o 401 só era testado no Search: teste de 401 nas opções.
- low → patch — o teste "nenhum gráfico novo" começava sem gráfico: desenha um antes e confere que fica.
- low → patch — dois exames podiam ter o mesmo nome: escolhe nomes diferentes e confere os pontos.
- low → patch — o 401 redirecionava sempre: trava de redirect único, compartilhada com a lista.
