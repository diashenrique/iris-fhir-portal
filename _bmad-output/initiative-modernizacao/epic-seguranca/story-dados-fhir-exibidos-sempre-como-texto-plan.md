---
title: 'Dados FHIR exibidos sempre como texto'
type: 'bugfix'
ticket: '4'
created: '2026-10-05'
status: 'built'
baseline_revision: 'a9deef326e83b3778ae312fae665c3f2bde66019'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
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
- [x] `fhirUI/resources/js/myFHIR.js` -- um helper que monta uma linha `<tr>` com `<td>`s via `.text()`; usá-lo nas 5 tabelas; o item da lista criado como elementos (título e iniciais com `.text()`) e com `.on('click', () => loadForm(id))`; badges com `.text()`; modal com `.val()` (o primeiro valor em `loadForm`, depois concatenando); link do gráfico com `.attr('href', ...)` -- fecha todos os sinks.
- [x] `fhirUI/resources/js/labresult.js` -- `<option>` com `$('<option>').val(code).text(name)`.
- [x] `e2e/tests/xss.spec.js` (novo) -- cria o Patient (com os campos que o `loadForm` lê: `identifier[0..2]`, `name[0].given[0]`, `family`, `address[0].line[0]`, `city`, `state`, `country`) e o Observation laboratory (com `valueQuantity` e `effectiveDateTime`) pelo `page.request` logado; cobre as linhas da matriz; apaga os dois num `finally`.

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

- `myFHIR.js`: helper `textRow(values)` monta `<tr>`/`<td>` com `.text()` e substitui as 5 linhas concatenadas; o item da lista é montado com elementos jQuery (`.attr('id')`, `.text()` no título e nas iniciais, `.on('click', () => loadForm(patientId))`), sem `onclick` inline; badges com `.text()`; `#fhirdatasource` recebe `.val()` em `loadForm` e depois `.val(atual + json)`; link do gráfico com `.attr('href', 'labresult.html?id=' + encodeURIComponent(patientId))`.
- `labresult.js`: `$('<option>').val(obj.code).text(obj.name)`.
- `e2e/tests/xss.spec.js`: payloads distintos para o nome (`window.__xss=1`) e para o `display` do exame (`alert(...)`), para que o flag e o `dialog` sejam ambos exercitados; os recursos criados são apagados no `finally` (Observation antes do Patient).
- Verificação local: `docker compose restart` + `npx playwright test` -> 5 passed. Mutação 1 (linha do laboratório concatenada) -> xss.spec falha na célula. Mutação 2 (modal com `.append()`) -> xss.spec falha no valor do modal. Após as mutações o arquivo foi restaurado e a suíte voltou a 5 passed; nenhum paciente `Xss` sobrou no servidor.
- Pendente: CI do PR (não houve push).

- Depois da revisão (patches aplicados pelo mesmo implementador): o `finally` tenta apagar todos os recursos, junta as falhas e só as afirma quando o `try` passou; o teste cria também alergia, imunização e sinal vital com payload e checa cada tabela.
- Reverificado do meu lado: mutação na linha de imunização (de volta à concatenação), o `xss.spec.js` falha em `#immunizationTable`; restaurado, 5 testes passam; a busca `family=Xss` volta `total 0`.
- Mudança de comportamento aceita: com `.text()`, um campo ausente vira célula vazia em vez do texto "undefined"; o tratamento de campos ausentes é do epic-robustez-fhir.

## Plan Change Log

- Verificado no GitHub: PR #13, run 37322708909 verde em 6min15s (smoke, E2E com 5 testes e o passo "No CSP login-page alerts").

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 1 medium, 2 low, 1 false, 1 verificação pendente.

- false — célula vazia em vez de "undefined" em campo ausente: não há resultado ruim (o texto "undefined" era o defeito antigo); registrado nas notas.
- medium → patch — o `finally` parava na primeira exclusão com falha e trocava o erro original: tenta todas, junta as falhas e só afirma quando o `try` passou.
- low → rejeitado — um `Location` ausente vazaria o recurso criado: raro, e a correção não evita o vazamento sem outra fonte de id.
- verificação pendente — CI do PR.
- low → patch — o teste só cobria a tabela de laboratório: alergia, imunização e sinal vital com payload; a mutação na imunização falha o teste.
