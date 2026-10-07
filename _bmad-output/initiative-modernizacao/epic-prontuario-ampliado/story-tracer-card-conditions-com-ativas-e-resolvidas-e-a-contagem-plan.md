---
title: 'Tracer: card Conditions com ativas e resolvidas e a contagem no resumo'
type: 'feature'
ticket: '1'
created: '2026-10-07'
status: 'built'
baseline_revision: '6bc7d50d2f7f4a30bf6535d222f77b5bfc5df58e'
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

**Problem:** O prontuário não mostra as condições do paciente, embora os dados Synthea tragam 140.

**Approach:**
- **Card:** `CARDS.condition` e `window.condition` seguem o padrão da 8.4 (estados, selo, Try again). As ativas (active, recurrence, relapse, ou sem status) vêm primeiro e depois as resolvidas e inativas, em cinza, cada grupo do início mais recente para o mais antigo. As colunas são Condition, Status, Onset e Resolved, com as datas legíveis.
- **Resumo:** ganha o selo azul "N active conditions", que leva ao card.
- **Documentação:** `EXPERIENCE.md` e `DESIGN.md` registram o card e o selo.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o `clinicalStatus` decide pelo código, e uma condição sem status conta como ativa, a leitura mais segura num prontuário.
- Achado na captura de tela: o card de laboratório reservava a altura do gráfico antes de qualquer exame ser escolhido. Agora `#chartBox` começa escondido e só aparece com um gráfico.
- Verificado:
  - e2e 42/42. O novo `conditions.spec.js` cobre a ordem, as datas, o cinza das resolvidas, o selo "2 active conditions" e o vazio sem selo.
  - O `cards.spec.js` cobre o selo de origem e o "Try again" do card novo.
  - Captura a 1440px.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
