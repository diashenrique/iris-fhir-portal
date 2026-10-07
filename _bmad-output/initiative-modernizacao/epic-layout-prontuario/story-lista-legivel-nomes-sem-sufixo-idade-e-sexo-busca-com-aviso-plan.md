---
title: 'Lista legível: nomes sem sufixo, idade e sexo, busca com aviso'
type: 'feature'
ticket: '3'
created: '2026-10-06'
status: 'built'
baseline_revision: 'f6c55add929a514fc313ab337a199506b65a3850'
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

**Problem:** A lista mostra os nomes Synthea com sufixos numéricos ("Jorge203 Rosado690") e o ID como informação secundária. A busca não diz quando nada bate, e o recarregar recarrega a página inteira.

**Approach:**
- **Nome:** `displayName` tira os dígitos colados ao fim de cada parte do nome, na lista e no resumo, com o original no `title`. Embaixo do nome vêm idade, sexo e ID.
- **Carregamento:** a lista vira `loadList()`. Enquanto carrega, quatro itens esqueleto e `aria-busy`, com a busca e o recarregar desabilitados.
- **Busca:** é própria, no lugar do `data-filter` do tema, e procura pelo nome limpo, o original e o ID. Sem resultado, mostra 'No patients match "termo".' com "Clear search".
- **Recarregar:** chama `loadList()` de novo e aplica o termo à lista nova.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: a limpeza só tira dígitos que têm outro caractere antes (`/^(.*\D)\d+$/`). Um nome que é só dígitos fica como está, e o dado FHIR não muda.
- A busca do tema (`filterList`, no document) rodava depois do handler do campo, então não dava para contar os resultados; por isso ela foi trocada pela busca própria. O "x" do `has-clearable` do tema continua funcionando, porque dispara `keyup`.
- Os itens esqueleto não usam `list-group-item`, porque o helper de login e os testes esperam por essa classe para achar os pacientes.
- Verificado: e2e 33/33. O novo `list.spec.js` cobre o nome limpo e o `title` na lista e no resumo, idade, sexo e ID, a busca pelo nome original e pelo ID, o aviso e "Clear search", e o termo mantido no recarregar.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
