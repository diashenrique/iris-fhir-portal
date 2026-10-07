---
title: 'Capturas reproduzíveis e o README do portal atual'
type: 'docs'
ticket: '2'
created: '2026-10-07'
status: 'built'
baseline_revision: '33cee1ff55ed1262d463ea2562b1847f922cb534'
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

**Problem:** O README mostra o portal de 2020 (formulário, acordeão, gráfico noutra aba), com imagens antigas em URLs absolutas.

**Approach:**
- **Capturas:** `e2e/screenshots.js` gera seis capturas do container com os dados Synthea: prontuário, gráfico no card, Timeline, Edit, celular e português.
- **README:** o texto de abertura, "Using the portal" e "Articles" (com os quatro links e o que mudou desde 2020) são reescritos com imagens em caminho relativo. A seção de checagens cita o `check-readme-sql` e os e2e atuais.
- **Imagens antigas:** saem as 13 que nada mais referencia.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: as capturas usam os pacientes Synthea do container (o padrão é "Carroll"), que mostram o portal como o usuário o vê.
- Antes de apagar as imagens antigas, conferi os quatro artigos publicados: todas as imagens deles ficam hospedadas em `community.intersystems.com`, nenhuma no GitHub, então apagá-las não quebra os artigos.
- O script espera o Pace terminar, porque a primeira captura saiu com a barra de carregamento. A captura do gráfico usa a tela do elemento, porque o recorte pela janela cortava o card.
- Achado para o sweep: no celular, o botão "Reveal" encosta no campo do SSN (já existia).
- Verificado: todo caminho `img/` do README existe, nenhum arquivo de `img/` fica sem referência, o README não fala de acordeão nem da página separada do gráfico, e o `check-readme-sql` passa com 8 exemplos.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
