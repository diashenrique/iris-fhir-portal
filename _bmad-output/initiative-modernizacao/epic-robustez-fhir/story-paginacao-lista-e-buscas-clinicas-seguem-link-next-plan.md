---
title: 'Paginação: lista e buscas clínicas seguem link[next]'
type: 'bugfix'
ticket: '4'
created: '2026-10-05'
status: 'built'
baseline_revision: 'ead7e8c73c76a435e6586ac699c7d6d79ee46a7d'
route: 'full'
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

**Problem:** A lista de pacientes e as quatro buscas clínicas usam só a primeira página do Bundle (100 por padrão no servidor) e ignoram `link[next]`. Com mais registros que isso, a lista e as tabelas ficam incompletas, e o filtro da lista age só sobre o que foi carregado.

**Approach:** Um helper busca todas as páginas: faz a busca e, enquanto o Bundle tiver `link` com `relation` `next`, segue esse link pelo fhir.js (`nextPage`, que já existe no `jqFhir.js`), acumulando as entradas. A lista e as quatro buscas clínicas passam a usar o helper. Badges e o ícone do gráfico continuam vindo do total da primeira página; o modal recebe o JSON de cada página. Os erros seguem como hoje (a entrada 5 cuida deles), incluindo o redirect de sessão da lista. No e2e, `page.route` reescreve as buscas para `_count=5` (decisão do épico).

## Boundaries & Constraints

**Always:** manter a ordem dos resultados (`_sort` atual); seguir só o link `next` que o servidor devolve; manter o formato das linhas e o "No records".

**Never:** paginação visual na tela; parâmetro novo no portal para o tamanho de página; mudar `Dispatch.cls` ou `labresult.js`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lista com várias páginas | busca de pacientes com `_count=5` (via `page.route`) | a lista mostra todos os pacientes do servidor (igual ao `total`) | — |
| Tabela clínica com várias páginas | paciente com mais de 5 exames, `_count=5` | o número de linhas da tabela de laboratório bate com o badge | — |
| Uma página só | dados atuais, sem reescrita | comportamento igual ao de hoje | — |
| Erro numa página seguinte | — | tratado como hoje (entrada 5 mostra o toast) | — |

</frozen-after-approval>

## Code Map

- `fhirUI/resources/js/myFHIR.js` -- `client.search` na lista (com o `.catch` do redirect de sessão) e em `window.immunization`, `window.allergy`, `window.vitalsigns` e `window.laboratory`; `entries(bundle)` já existe.
- `fhirUI/jqFhir.js` -- `nextPage` e `prevPage` (por volta da linha 176) seguem o link do Bundle com a mesma configuração do cliente.
- `e2e/tests/pagination.spec.js` -- novo.

## Tasks & Acceptance

**Execution:**
- [x] `fhirUI/resources/js/myFHIR.js` -- helper que acumula as páginas (lista e quatro buscas).
- [x] `e2e/tests/pagination.spec.js` -- reescreve com `page.route` as buscas de `Patient` e `Observation` para `_count=5` e cobre a matriz; confere que nenhuma URL de página seguinte sai do host da página.

**Acceptance Criteria:**
- Given a suíte inteira, when roda, then todos os testes passam.
- Given o helper voltando a usar só a primeira página (mutação), when o teste novo roda, then falha.

## Verification

**Commands:**
- `docker compose restart` e `cd e2e && npx playwright test` -- expected: todos passam.
- Mutação descrita acima -- expected: falha.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total concedida pelo usuário (2026-10-05).
- Ponto a conferir: o link `next` do servidor usa o host da requisição (`http://localhost:32783/fhir/r4/...?page=2&queryId=...`), então o cookie de sessão vale; se vier outro host, registrar e tratar.
- Conferido (2026-10-05): o `next` vem como `http://localhost:32783/fhir/r4/Patient?page=2&queryId=...`, mesmo host; o spec verifica isso.
- O spec faz um único login (describe serial, página compartilhada): cada login segura uma licença IRIS até a sessão expirar, e com 4 logins a mais a suíte estourava o limite (`License limit exceeded`). Rodadas seguidas sem `docker compose restart` ainda podem esgotar a licença.

- Depois da revisão (patches do mesmo implementador): falhas numa página seguinte saem marcadas (`nextPage: true`), e o redirect de sessão vale só para a primeira requisição; `loadForm` guarda o paciente selecionado, e as buscas descartam resultados de um paciente que não está mais selecionado; o teste conta só as páginas seguintes de `/Observation`, pula o caso de página única com mais de 100 pacientes, espera a resposta de erro antes de afirmar (500 e 404) e coleta os ids esperados seguindo `link[next]`.
- Licenças do IRIS Community: helper `logout(page)` e logout ao fim de cada teste em todas as specs (item do `deferred-work.md` resolvido aqui). A suíte passou duas vezes seguidas sem reiniciar o container (15 testes).

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 2 medium, 4 low, 0 false.

- medium → patch — página seguinte com 404 (queryId expirado) redirecionava ao login com sessão válida: redirect só na primeira requisição; com a marca desligada, o teste de 404 falha.
- medium → patch — resultados do paciente anterior podiam entrar na tela do novo (janela maior com várias páginas): `selectedPatientId` e `isSelected`. Sem teste e2e próprio (registrado).
- low → patch — a checagem de páginas seguintes contava as da lista: só `/Observation`.
- low → patch — o teste de página única dependia do número de pacientes: pula acima de 100.
- low → patch — o teste de falha afirmava antes do tratamento: espera a resposta e o log; caso 404 acrescentado.
- low → patch — a lista de referência dependia de `_count=10000`: segue `link[next]`.
