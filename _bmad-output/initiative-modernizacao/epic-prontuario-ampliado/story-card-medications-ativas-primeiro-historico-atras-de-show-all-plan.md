---
title: 'Card Medications: ativas primeiro, histórico atrás de Show all'
type: 'feature'
ticket: '3'
created: '2026-10-07'
status: done
baseline_revision: 'a898275a1351ba27b2964e718b4acb24701c4f7f'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/ux-layout-prontuario/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O prontuário não mostra as prescrições do paciente (363 nos dados Synthea).

**Approach:**
- **Show all compartilhado:** o "Show all" vira `.card-show-all` mais `setShowAll()`, que mostra as linhas `.card-history` da tabela que o botão controla. Os sinais vitais passam a usá-lo.
- **Card Medications:** as ativas ficam à vista e as outras atrás do "Show all". Sem nenhuma ativa, aparece "No active medications.".
- **Nome:** vem do `medicationCodeableConcept` ou da Medication trazida por `_include=MedicationRequest:medication`; o `display` da referência é o último recurso.
- **Dose:** vem do texto da posologia ou de quantidade, frequência e "as needed".
- **Tradução e documentação:** os textos estão nos dois dicionários, e o `EXPERIENCE.md` registra o card.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: as 100 primeiras prescrições Synthea usam `medicationCodeableConcept` (nenhuma com referência), e 97 estão `stopped`. Por isso a linha "No active medications." é o caso comum nos dados de exemplo. O `_include` cobre a referência, e o teste prova esse caminho com uma Medication criada.
- O status da medicação tem chaves próprias (`medStatus.*`), porque o gênero e o vocabulário diferem dos da condição.
- Verificado:
  - e2e 47/47. O novo `medications.spec.js` cobre o nome pela Medication incluída, a dose "1 · 1× every 1 d" e "as needed", "Show all (2)" e "Show latest", o caso sem ativas e o vazio.
  - O `cards.spec` segue verde com o "Show all" dos sinais vitais.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
