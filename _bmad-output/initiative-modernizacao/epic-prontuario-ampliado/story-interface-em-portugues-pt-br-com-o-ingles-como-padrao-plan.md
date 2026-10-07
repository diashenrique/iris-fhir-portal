---
title: 'Interface em português (pt-BR), com o inglês como padrão'
type: 'feature'
ticket: '5'
created: '2026-10-07'
status: done
baseline_revision: 'bc19f1ed8b36d1cdf85b4b509d1081a2c8dfd641'
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

**Problem:** A interface só existe em inglês.

**Approach:**
- **Dicionário:** `fhirUI/resources/js/i18n.js` traz os textos em inglês e pt-BR, mais `t()`, `plural()`, `readableDate()` e `formatNumber()` por idioma, e o `apply()`, que preenche os `data-i18n` e `data-i18n-attr` do HTML.
- **Escolha:** o seletor do cabeçalho guarda o idioma no `localStorage` e recarrega no mesmo paciente. O `<html lang>` acompanha o idioma, e o padrão é o inglês.
- **Código:** o `myFHIR.js` usa `t()` em todos os textos. Os erros passam uma chave (`what.*`) no lugar de uma frase em inglês.
- **Bibliotecas:** o Chart.js segue o idioma, e o flatpickr usa o locale pt, que entrou no manifesto do vendor.
- **Dados clínicos:** não são traduzidos.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o tema não mostra texto próprio. O `flatpickr/dist/l10n/pt.js` entrou no manifesto, e o `i18n.js` chama `flatpickr.localize` antes de o tema iniciar o calendário. A troca de idioma recarrega a página justamente para que o tema, o flatpickr e o Chart.js iniciem no idioma escolhido.
- Achados nas capturas:
  - O `.pace-activity` (o indicador que gira) não sumia desde a 8.7, porque o `theme.min.css` carrega depois do `custom.css`. Agora a regra é `html .pace .pace-activity`.
  - O `.custom-select` do tema esticava o seletor; ele passou a usar `.app-header .lang-select`, com 7,5rem.
  - No celular, "Log out" fica só com o ícone (o texto continua acessível) e não quebra mais.
- O `console.error` registra a mesma mensagem traduzida do toast; o `search-errors.spec` confere isso em inglês.
- Verificado: e2e 45/45. O novo `i18n.spec.js` cobre a troca no mesmo paciente, o `lang`, os títulos, o sexo, a data de nascimento e a de início em pt-BR, o selo "1 condição ativa", o vazio, o placeholder, um toast em português e a escolha mantida depois de recarregar. Capturas em pt-BR a 1440px e a 390px.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
