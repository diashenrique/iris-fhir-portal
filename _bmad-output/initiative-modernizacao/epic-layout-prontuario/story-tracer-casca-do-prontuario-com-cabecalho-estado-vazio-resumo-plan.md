---
title: 'Tracer: casca do prontuário com cabeçalho, estado vazio, resumo e cards abertos, sem rolagem a 390px'
type: 'feature'
ticket: '1'
created: '2026-10-06'
status: 'built'
baseline_revision: '944ae6e07bfbec9c7070a0be816fb621ccbb4627'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/ux-layout-prontuario/EXPERIENCE.md', '{project-root}/_bmad-output/initiative-modernizacao/ux-layout-prontuario/DESIGN.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O `patientlist.html` abre num formulário vazio, esconde os dados clínicos num acordeão fechado, usa o sidebar do tema (os detalhes só aparecem lado a lado a partir de 1200px) e estoura na horizontal a 390px.

**Approach:**
- **Grade própria:** lista em `col-lg-4` e prontuário em `col-lg-8`. Abaixo de 992px, a classe `.show-chart` no `#portal` alterna as duas telas, e "Back to patients" volta mantendo a busca e a rolagem.
- **Cabeçalho:** "FHIR Patient Portal · InterSystems IRIS for Health", com o usuário de `GET /fhir/api/session` (rota nova no `Dispatch`) e "Log out".
- **Prontuário:** o estado vazio; o resumo (nome, idade, sexo, nascimento, ID, SSN com "Reveal", "FHIR JSON" e o selo de alergias, que leva ao card); os quatro cards abertos, em duas colunas a partir de 1200px, com as tabelas empilhadas abaixo de 992px.
- **Formulário:** fica abaixo do resumo até a 8.2.
- Os ids que o JS e os e2e usam continuam os mesmos.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o layout de sidebar do Looper (`has-sidebar-expand-lg` e `page-sidebar`) só mostra os detalhes lado a lado a partir de `xl` e depende do `data-toggle="sidebar"` dos itens. Ele foi trocado pela grade do Bootstrap mais quatro regras de CSS, e os itens não usam mais o sidebar.
- No celular, o cabeçalho do tema tem altura fixa. Com o subtítulo, ele quebrava em duas linhas e cobria o "Back to patients". Abaixo de 576px, o `navbar` não quebra mais e o subtítulo e o usuário somem.
- O separador "·" do resumo usa `\00a0\00b7\00a0`, porque o CSS consome o espaço logo depois de um escape hexadecimal.
- Verificado:
  - Smoke inteiro, com as duas checagens novas da `/session` (401 sem login e o usuário com login).
  - e2e 29/29: os 27 de antes, sem mudança, e o novo `layout.spec.js`.
  - Capturas a 1440px e a 390px, com `scrollWidth == clientWidth` nas duas telas.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
