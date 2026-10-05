---
title: 'Erros das buscas FHIR visíveis na lista e nos detalhes'
type: 'bugfix'
ticket: '5'
created: '2026-10-05'
status: 'ready-for-dev'
baseline_revision: ''
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: ''
review_source: ''
lenses_ran: []
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

## Verification

**Commands:**
- `docker compose restart` e `cd e2e && npx playwright test` -- expected: todos passam, inclusive o teste novo com 500 na busca de imunização e na busca de paciente.
- Mutação: o helper volta a ler `err.status` -- expected: o teste novo falha.
