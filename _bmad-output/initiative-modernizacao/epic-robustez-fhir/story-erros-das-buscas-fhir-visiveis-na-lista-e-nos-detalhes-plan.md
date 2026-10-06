---
title: 'Erros das buscas FHIR visíveis na lista e nos detalhes'
type: 'bugfix'
ticket: '5'
created: '2026-10-05'
status: done
baseline_revision: 'a2d2424ece8d01b200e27eb119cf5150a45842c8'
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

**Problem:** Os `.catch` das buscas do paciente e das quatro buscas clínicas testam `err.status`, que nunca existe (o adapter jQuery do fhir.js rejeita com `{ error: jqXHR }`), e só fazem `console.log`. Um erro do servidor deixa a tela parada, sem aviso.

**Approach:** Um helper `showError(what, err)` lê `err.error.status` e mostra o toast "Could not load <what> (HTTP <status>)" (o contrato com a entrada 8); quando o erro não tem status HTTP (uma exceção de JavaScript no `.then`), mostra "Could not load <what>" e registra o erro com `console.error`. As buscas do paciente, de imunização, alergia, sinais vitais e laboratório usam o helper; a lista mantém o redirect de sessão para 401/404 e usa o helper nos outros casos (no lugar da mensagem atual, menos o caso do laço da story 2.2, que continua com a mensagem própria). O e2e força 500 com `page.route` e confere o toast. Depois disso, os testes das stories 3.1 e 3.3 também devem falhar se aparecer um toast de erro: a revisão da 3.3 mostrou que, sem isso, uma exceção dentro de um `.then` é engolida pelo `.catch` e não chega ao `pageerror`.

</frozen-after-approval>

## Implementation Notes

- Checkpoint aprovado sob a autonomia total concedida pelo usuário (2026-10-05). Rota oneshot: um helper e a troca dos `.catch`, mais um teste.
- Implementado pelo subagente: `httpStatus(err)` e `showError(what, err)` no `myFHIR.js` (paciente, imunização, alergia, sinais vitais, laboratório e a lista fora do redirect de sessão; buscas de um paciente que não está mais selecionado não mostram toast); `watchErrorToasts(page)` no `helpers.js`, usado por `edge-cases` e `observation-values`; `search-errors.spec.js` novo (500 na lista, nos detalhes e na imunização, e uma exceção ao desenhar uma linha); `pagination.spec.js` passa a esperar o toast.
- Verificado pelo implementador: 19 testes, duas rodadas; mutação (`httpStatus` lendo `err.status`) falha os três testes de 500.
- Observação: a primeira rodada logo depois de `docker compose restart` às vezes estoura tempo enquanto o servidor aquece; repetir passa.

## Verification

**Commands:**
- `docker compose restart` e `cd e2e && npx playwright test` -- expected: todos passam, inclusive o teste novo com 500 na busca de imunização e na busca de paciente.
- Mutação: o helper volta a ler `err.status` -- expected: o teste novo falha.
- Depois da revisão: status 0 (requisição abortada ou sem resposta) mostra "Could not load <what> (no response from the server)" sem `console.error`, e nada aparece enquanto a página está saindo (`beforeunload`/`pagehide`); o teste da 3.3 espera os quatro badges e verifica os toasts com `expect.poll`. Os caminhos de status 0 não têm teste próprio.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 0 medium, 2 low, 0 false.

- low → patch — status 0 era tratado como exceção de código e podia piscar toasts ao recarregar: flag de saída da página e mensagem própria para "sem resposta".
- low → patch — o teste da 3.3 podia afirmar antes de imunização e alergia terminarem: espera os quatro badges e usa `expect.poll`.
