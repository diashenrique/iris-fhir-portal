---
title: 'Rascunho do artigo de atualização com a errata dos artigos 1 a 4'
type: 'docs'
ticket: '4'
created: '2026-10-07'
status: done
baseline_revision: '52d898bfb2a79a2878971c1fc841c451aefd455b'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Os quatro artigos da Developer Community descrevem o portal de 2020: esquemas `I0001`, sem login, a página separada do gráfico. Quem chega por eles encontra outra coisa.

**Approach:** `docs/article-2026-update.md` é o rascunho de um artigo em inglês, com:
- o que mudou: IRIS 2026.2 e JsonAdvSQL, sessão única, `/fhir/api` só leitura, módulo IPM, layout, Timeline, pt-BR e CI;
- uma errata para cada um dos quatro artigos;
- como experimentar.

A instalação pelo registro fica condicional à publicação da 1.1.0 (4.6). A publicação do artigo é do usuário.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: a errata parte do `avaliacao-do-projeto.md`, que leu os artigos, e dos planos dos épicos.
- Os links do rascunho são absolutos para o GitHub (`master`), porque o artigo é lido fora do repositório. As imagens resolvem depois do merge.
- O artigo cita a issue #6 sem número: a página de exames vazia.
- Verificado: há quatro seções de errata, e cada arquivo citado pelos links (`iris.script`, `misc/sql/example.sql`, `img/portal-chart.png` e `img/portal-timeline.png`) existe, assim como a âncora do README.
- **Fica com o usuário:** publicar o artigo na Developer Community.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
