---
title: 'Edição no modal Edit e JSON no painel FHIR JSON'
type: 'feature'
ticket: '2'
created: '2026-10-06'
status: 'built'
baseline_revision: '9b2def9697af258a42943baff742c35b5898fdd9'
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

**Problem:** O formulário de edição ocupa o prontuário, abaixo do resumo (casca da 8.1).

**Approach:**
- **Modal Edit:** o formulário vai para o modal `#editModal`, aberto pelo botão "Edit" do resumo, com "Save" e "Cancel".
- **Save:** mostra "Saving…". Em sucesso, sai o toast "Saved.", o modal fecha e o resumo e o JSON mostram a cópia do servidor (`meta.versionId` novo). Em erro, o modal fica aberto com o que foi digitado e a mensagem "Couldn't save the patient. Try again.".
- **Painel FHIR JSON:** ganha "Copy", com a Clipboard API e uma alternativa que seleciona e copia.
- **Teclado:** Esc fecha o modal e o painel e devolve o foco ao botão que os abriu, pelo data-api do Bootstrap.
- **Testes:** os e2e de update e de SSN passam pelos helpers `openEdit` e `save`.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o calendário do flatpickr abre por cima do modal (z-index 1055), sem ajuste.
- Achado que já existia: o calendário abria no mês atual, porque o campo era preenchido com `.val()`, que o flatpickr não vê. Agora o `setDate(r.birthDate, false)` faz o calendário abrir na data do paciente; conferido em captura (junho de 1954, dia 13 marcado).
- O primeiro campo do Edit tem `autofocus`, que o tema respeita ao abrir o modal.
- Na adaptação dos testes, os wrappers locais `const save = async () => save(page)` dos testes de SSN viraram recursão e foram removidos.
- Verificado: e2e 32/32. O novo `edit.spec.js` cobre o save pelo modal (resumo e JSON com `versionId` 2), o erro com o modal aberto (PUT forçado a 500) e o Esc com o foco devolvido, no modal e no painel.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
