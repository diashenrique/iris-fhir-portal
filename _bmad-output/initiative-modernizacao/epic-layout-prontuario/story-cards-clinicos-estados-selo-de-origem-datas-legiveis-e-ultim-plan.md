---
title: 'Cards clínicos: estados, selo de origem, datas legíveis e últimos sinais vitais'
type: 'feature'
ticket: '4'
created: '2026-10-06'
status: done
baseline_revision: '06959d7bd601e2bae5bf370cb6c11b96e5a43a1c'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/ux-layout-prontuario/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Os cards mostram "No records" para tudo, nada enquanto carregam e só um toast quando falham. As datas são ISO com fuso, os valores não são arredondados, e os sinais vitais vêm como um histórico de dezenas de linhas.

**Approach:**
- **Estados por card:** o objeto `CARDS` e as funções `cardLoading`, `cardLoaded` e `cardError` dão a cada card o esqueleto ao carregar, a linha de vazio própria ("No allergies recorded." e as outras) e, em erro, "Couldn't load …" com "Try again" no próprio card, além do toast da 3.5.
- **Selo de origem:** "FHIR · fhir.js" em cada card.
- **Datas:** `readableDate` lê os próprios dígitos do valor ("Jan 1, 2020", sem conversão de fuso) e guarda o ISO no `title`.
- **Valores:** `roundValue` arredonda para no máximo duas casas.
- **Sinais vitais:** mostram o último valor de cada medida. O histórico fica na tabela, escondido, atrás de "Show all (N)" e "Show latest".

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: os sinais vitais são agrupados pelo nome da medida que `observationRows` já devolve, e não pelo LOINC. Assim cada componente da pressão (sistólica e diastólica) vira uma medida própria. Como a busca vem ordenada por data, a última linha de cada nome é a mais recente.
- O histórico fica no DOM (`.vital-history.d-none`), então os testes de paginação, que contam as linhas contra o contador, continuam valendo.
- Ajustes nas tabelas: as colunas de data passam a se chamar "Date" e as datas não quebram linha.
- Testes adaptados: o texto de vazio no `edge-cases` e as datas legíveis no `observation-values`.
- Verificado:
  - e2e 35/35. O novo `cards.spec.js` cobre o selo em cada card, o erro com "Try again" (a primeira busca de Immunization falha, a segunda passa) e o último valor de cada medida (78.4567 vira 78.46, com unidade, data legível e o ISO no `title`), mais "Show all" e "Show latest".
  - Capturas a 1440px e a 390px.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
