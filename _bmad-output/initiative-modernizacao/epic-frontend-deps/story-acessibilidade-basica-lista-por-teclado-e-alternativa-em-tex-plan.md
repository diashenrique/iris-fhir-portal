---
title: 'Acessibilidade básica: lista por teclado e alternativa em texto do gráfico'
type: 'feature'
ticket: '5'
created: '2026-10-07'
status: done
baseline_revision: 'b41fcf8eab5a7b5dccd8acff351ff69e396e1bd1'
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

**Problem:** Os itens da lista de pacientes têm um link vazio, sem nome, sem setas e sem foco visível. O gráfico de exames é só um `<canvas>`, que o leitor de tela não lê.

**Approach:**
- **Lista:** `role="list"` com o nome "Patients"; cada link ganha `aria-label` (nome e id). As setas, Home e End movem o foco, Enter abre o paciente, e o paciente aberto recebe `aria-current`. O item mostra um anel de foco quando seu link tem o foco (`:focus-within`).
- **Gráfico:** `role="img"` com um `aria-label` que diz o exame e quantos resultados há. Uma tabela `sr-only` traz o nome do exame e cada ponto (data e valor), preenchida com `text()`.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o tema não mostra foco no item, porque o link é vazio e o contorno dele tem tamanho zero. O `custom.css` ganhou o anel com a cor primária do tema (#346cb0), conferido em captura de tela.
- `e2e/tests/a11y.spec.js`:
  - Do campo de busca, o Tab chega ao primeiro paciente. As setas movem o foco, Enter abre o segundo paciente, e só ele fica com `aria-current`.
  - A tabela do gráfico tem o nome do exame e exatamente os pontos numéricos que a API devolve, na mesma ordem, com data e valor.
- Verificado: smoke inteiro e e2e 27/27.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
