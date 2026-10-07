---
title: 'Linha do tempo do paciente com Patient/$everything'
type: 'feature'
ticket: '2'
created: '2026-10-07'
status: 'built'
baseline_revision: '40875ef58df4573c10a4cdb36954131480235ade'
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

**Problem:** Não há como ver a história do paciente em ordem, e o portal não mostra a operação `$everything` do FHIR.

**Approach:**
- **Abas:** "Chart" e "Timeline" no resumo (o padrão de abas, com setas). A Timeline carrega na primeira vez que é aberta, uma vez por paciente.
- **Dados:** `everything()` busca `/fhir/r4/Patient/:id/$everything` e segue `link[next]`, se houver. `TIMELINE_TYPES` define a data e o texto de cada tipo: Encounter, Condition, Procedure, Immunization, MedicationRequest e DiagnosticReport.
- **Exibição:** eventos do mais recente para o mais antigo, agrupados por ano, com botões de filtro por tipo e contagem, e o selo "FHIR · $everything".
- **Estados:** esqueleto ao carregar, "No events recorded." e "Couldn't load the timeline." com "Try again", mais o toast.
- **Documentação:** `EXPERIENCE.md` e `DESIGN.md` registram a vista.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o `$everything` do IRIS devolve todos os recursos numa página só, inclusive com `_count=10` (171 recursos no paciente 3, sem `link[next]`). O código segue o `next` mesmo assim.
- As datas por tipo seguem a tabela da incógnita, mais o `recordedDate` para condições sem início e o `issued` para laudos sem `effective`.
- O `custom.css` carrega antes do `theme.min.css`, então as regras das abas usam `.chart-tabs.nav-tabs` para ganhar do tema.
- Verificado:
  - e2e 44/44. O novo `timeline.spec.js` cobre a ordem, os grupos por ano, os filtros com contagem, o ano que some, o selo, a troca de aba pelas setas e o erro com "Try again".
  - Capturas a 1440px e a 390px com o paciente 3.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
