---
title: 'Cards Encounters e Care plans'
type: 'feature'
ticket: '4'
created: '2026-10-07'
status: done
baseline_revision: '5d10ece65a3451a8f6c5333b30a04ecf4a507589'
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

**Problem:** O prontuário não mostra os encontros (601 nos dados Synthea) nem os planos de cuidado (58).

**Approach:**
- **Encounters:** os cinco mais recentes à vista, com tipo, classe e período; o resto vai para o "Show all" compartilhado da 6.3.
- **Care plans:** os ativos primeiro, com categoria, status, período e atividades.
- **Funções novas:** `periodText()` escreve o período ("Mar 1, 2021 – Mar 3, 2021" quando os dias diferem), e `codeText()` traduz um código pelo dicionário.
- **Tradução e documentação:** os textos estão nos dois dicionários, e o `EXPERIENCE.md` registra os dois cards.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: a classe do encontro Synthea vem só com o código (`AMB`), sem `display`. `codeText('class.', code, display)` traduz os códigos do v3-ActCode, como "Ambulatory" e "Emergency". Um código desconhecido usa o `display` e, na falta dele, o próprio código.
- Achado para o sweep (6.6): com os cards novos, o de laboratório, que mostra todos os resultados, deixa a página muito longa num paciente com muitos exames.
- Verificado:
  - e2e 49/49. O novo `encounters.spec.js` cobre seis encontros (cinco à vista e um no "Show all"), a classe traduzida, o período de vários dias, o plano com status e atividades, os selos e os vazios.
  - Captura a 1440px.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
