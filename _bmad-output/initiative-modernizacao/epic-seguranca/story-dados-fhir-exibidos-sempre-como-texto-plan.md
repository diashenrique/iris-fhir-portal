---
title: 'Dados FHIR exibidos sempre como texto'
type: 'bugfix'
ticket: '4'
created: '2026-10-05'
status: 'draft'
baseline_revision: 'a9deef326e83b3778ae312fae665c3f2bde66019'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O portal monta HTML concatenando dados FHIR, então um nome de paciente ou um `display` de exame com `<img src=x onerror=...>` executa script no navegador. O próprio formulário de edição grava esse valor. O modal "FHIR Data Source" é um `<textarea>`, mas recebe o JSON por `.append()`, e o jQuery interpreta a string como HTML antes de inserir; o payload dispara mesmo ali.

**Approach:** Todo dado FHIR passa a entrar na página como texto: elementos criados com `.text()`/`.val()`/`.attr()` em vez de strings HTML, e um listener no lugar do `onclick` inline da lista. Um teste e2e cria por FHIR um paciente e um Observation com payloads, confere que eles aparecem literalmente na lista, nos detalhes, na tabela de laboratório, no modal e nas opções do gráfico, e que nenhum script executa, e apaga os dois recursos ao final.

## Boundaries & Constraints

**Always:** manter o visual e o comportamento atuais (mesmas classes, ids e textos); continuar usando jQuery; o JSON do modal fica igual (`JSON.stringify(..., 4)`), só que inserido com `.val()`.

**Never:** checagens de campos ausentes ou de buscas vazias (`identifier[2]`, `entry` indefinido, `valueQuantity` ausente) e formatação de datas, que são do epic-robustez-fhir; trocar ou atualizar bibliotecas (epic-frontend-deps); Content-Security-Policy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nome malicioso na lista | `name[0].given[0] = "<img src=x onerror=window.__xss=1>"` | O título do item mostra o texto literal; nenhuma imagem é criada | — |
| Nome malicioso nos detalhes | Mesmo paciente selecionado | `#firstName` contém o texto literal | — |
| Display malicioso no laboratório | Observation laboratory com `code.coding[0].display` igual ao payload | A célula mostra o texto literal; o modal contém o texto literal | — |
| Opções do gráfico | `labresult.html` do mesmo paciente | A opção do exame mostra o texto literal | — |
| Nenhum script executa | Todas as linhas acima | `window.__xss` continua indefinido e nenhum `dialog` abre | — |
| Dados normais | Pacientes do Synthea | O tracer da story 2.2 continua passando sem mudança | — |

</frozen-after-approval>

## Code Map

- `fhirUI/resources/js/myFHIR.js` -- sinks: o item da lista com `onclick` inline (linha 132, `megaDIV`) e o append na 133; os badges `.html(total)` nas linhas 172, 204, 240 e 280; o `#fhirdatasource` com `.text()` na 92 e `.append(JSON.stringify(...))` nas 175, 208, 243 e 288; as linhas de tabela concatenadas nas 178, 211, 247, 251 e 291; o link do gráfico na 283. `window.loadForm` (linha 69) continua global.
- `fhirUI/resources/js/labresult.js` -- linha 47: o `<option>` concatenado; `#fullName` e `#dateofbirth` já usam `.val()`, e `#testName` usa `.text()`.
- `fhirUI/patientlist.html` linha 207 -- `#fhirdatasource` é um `<textarea readonly>`.
- `e2e/tests/helpers.js` -- `login(page)` da story 2.2; `page.request` leva o cookie da sessão para `/fhir/r4` (POST/DELETE).
- `e2e/tests/tracer.spec.js` -- o padrão do teste (login, escolha por id, `finally` de limpeza) a ser seguido num arquivo novo.

## Tasks & Acceptance

**Execution:**
- [ ] `fhirUI/resources/js/myFHIR.js` -- um helper que monta uma linha `<tr>` com `<td>`s via `.text()`; usá-lo nas 5 tabelas; o item da lista criado como elementos (título e iniciais com `.text()`) e com `.on('click', () => loadForm(id))`; badges com `.text()`; modal com `.val()` (o primeiro valor em `loadForm`, depois concatenando); link do gráfico com `.attr('href', ...)` -- fecha todos os sinks.
- [ ] `fhirUI/resources/js/labresult.js` -- `<option>` com `$('<option>').val(code).text(name)`.
- [ ] `e2e/tests/xss.spec.js` (novo) -- cria o Patient (com os campos que o `loadForm` lê: `identifier[0..2]`, `name[0].given[0]`, `family`, `address[0].line[0]`, `city`, `state`, `country`) e o Observation laboratory (com `valueQuantity` e `effectiveDateTime`) pelo `page.request` logado; cobre as linhas da matriz; apaga os dois num `finally`.

**Acceptance Criteria:**
- Given o container no ar, when o e2e roda, then o teste de XSS e os 4 testes da story 2.2 passam.
- Given o arquivo antigo de um dos sinks (por exemplo a linha do laboratório concatenada), when o teste de XSS roda, then ele falha.

## Design Notes

O `onclick` inline vira listener porque o id do paciente vem do servidor; mesmo numérico hoje, o template não deve depender disso. O modal passa a usar `.val()` em vez de misturar `.text()` (que define o valor inicial do textarea) e `.append()`.

## Verification

**Commands:**
- `docker compose restart` (cache gzip do Web Gateway) e depois `cd e2e && npx playwright test` -- expected: 5 testes passando.
- Mutação: voltar a linha do laboratório para a concatenação, reiniciar e rodar só o `xss.spec.js` -- expected: falha.
- CI do PR -- expected: verde.

## Implementation Notes

## Plan Change Log

## Review Triage Log
