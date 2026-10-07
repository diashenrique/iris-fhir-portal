---
title: 'Acessibilidade e acabamento: foco no paciente, aria-live, toques de 44px e carregamento discreto'
type: 'feature'
ticket: '7'
created: '2026-10-06'
status: done
baseline_revision: '1a7bb8fe489be9744ad7d53c7576bc4914ffa13a'
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

**Problem:**
- Abrir um paciente não diz nada ao leitor de tela, e os cards não têm o contador no nome acessível.
- Os toasts de erro não são anunciados.
- No celular há controles com menos de 44px.
- O Pace gira no canto da tela.

**Approach:**
- **Foco:** ao abrir um paciente, ele vai para o `h1` do nome.
- **Cards:** `aria-labelledby` aponta para o título e o contador ("Allergies 2").
- **Erros:** `toastError` põe toda mensagem de erro também numa região `role="status" aria-live="polite"`.
- **Atalho:** `/` leva à busca, fora de campos e de modais; no celular, volta antes à lista.
- **Toque:** abaixo de 576px, botões, selects, campos, o selo de alergias e "Clear search" têm pelo menos 44px.
- **Carregamento:** sai o indicador que girava no canto (`.pace-activity`) e fica a barra fina do tema.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o tema Looper já desenha a barra fina do Pace sob o cabeçalho (`.pace-progress`). Bastou esconder o indicador que gira; o vendor não mudou.
- Verificado: e2e 40/40, com três testes novos no `a11y.spec.js`:
  - o foco no nome e os nomes dos cards pelo papel `region`;
  - o `aria-live` com o erro de imunizações, o `/` levando à busca e o "/" virando caractere quando digitado na busca;
  - nenhum controle visível com menos de 44px a 390px, com o gráfico aberto.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
