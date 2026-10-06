---
title: 'Tracer: paciente mínimo e paciente sem registros clínicos sem erro'
type: 'bugfix'
ticket: '1'
created: '2026-10-05'
status: done
baseline_revision: 'a4c48b2c0ceaa11c2ab856b26a1736827a621ed4'
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

**Problem:** O `myFHIR.js` assume o formato dos pacientes Synthea. Um Patient FHIR válido sem `name`, `address` ou `identifier` quebra os detalhes, e salvar falha. Uma busca clínica sem resultados lança erro em `bundle.entry.forEach` (só a alergia checa `total`), e a tabela fica vazia sem explicação.

**Approach:** Ler cada campo do Patient com acesso seguro (vazio quando falta), e no update criar só as estruturas que o usuário preencheu. Mostrar uma linha "No records" quando a busca não tem `entry`. Na lista, um paciente sem nome aparece como "(no name)". Um helper de fixtures no e2e (criar recursos FHIR e apagar tudo num `finally`, juntando as falhas) passa a ser o padrão que as entradas 2, 3 e 5 reaproveitam, e o `xss.spec.js` migra para ele. O SSN continua em `identifier[2]` (a entrada 2 troca para busca por `system`); aqui ele só não quebra quando falta, e não é criado nessa posição.

## Boundaries & Constraints

**Always:** manter o comportamento com os pacientes Synthea (os testes do E1 e do E2 continuam verdes); inserir dados só com `.text()`/`.val()` (E2); manter a máscara do SSN (2.6).

**Never:** SSN por `system` (entrada 2); valores sem `valueQuantity` (entrada 3); paginação (entrada 4); toasts de erro (entrada 5); mudanças em `Dispatch.cls` ou `labresult.js`; mudar o layout além da linha "No records".

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paciente mínimo na lista | Patient só com `active` e `gender` ausente | Item "(no name)" com inicial "?" | — |
| Paciente mínimo nos detalhes | Mesmo paciente selecionado | Campos vazios, SSN vazio, nenhum erro de página | — |
| Busca clínica vazia | Paciente sem alergias, vacinas, sinais vitais e exames | Cada uma das 4 tabelas com uma linha "No records" e badge 0 | — |
| Salvar só a cidade | Cidade preenchida no paciente mínimo | O FHIR passa a ter `address[0].city`; `name` e `identifier` continuam ausentes | — |
| Pacientes Synthea | Dados atuais | Tracer, XSS e SSN continuam passando | — |

</frozen-after-approval>

## Code Map

- `fhirUI/resources/js/myFHIR.js` -- `getName` (por volta da linha 55) já protege `name`; `loadForm` (por volta das linhas 100–140) lê `identifier[2]`, `name[0].given[0]`, `name[0].family` e `address[0].*` sem checar; as quatro buscas usam `bundle.entry.forEach` (só a alergia testa `res.data.total > 0`); `updatePatient` (por volta das linhas 375–395) grava em `identifier[2]`, `name[0]` e `address[0]` sem criar; `textRow` existe; o modal mascara `identifier[2]`.
- `fhirUI/patientlist.html` -- as quatro tabelas têm `<thead>` com 2 (imunização) ou 4 colunas; o "No records" usa `colspan` igual.
- `e2e/tests/helpers.js` -- `ENTRY_PAGE`, `FHIR_JSON`, `login`; ganha `fixtures(page)` com `create(resource)` (POST, id a partir do `Location`) e `cleanup()` (DELETE de tudo em ordem inversa, junta as falhas, sem lançar no meio).
- `e2e/tests/xss.spec.js` -- tem hoje a lógica de criar e apagar que vai para o helper.
- `e2e/tests/edge-cases.spec.js` -- novo.

## Tasks & Acceptance

**Execution:**
- [x] `fhirUI/resources/js/myFHIR.js` -- acesso seguro no `loadForm` e no modal; `noRecordsRow(colspan)` com `.text('No records')` nas quatro buscas quando não há `entry`; o item da lista usa "(no name)" e "?"; o `updatePatient` cria `name[0]` só se nome ou sobrenome foram preenchidos e `address[0]` só se algum campo de endereço foi, grava `birthDate` e `gender` só quando preenchidos, e só escreve o SSN se `identifier[2]` já existe.
- [x] `e2e/tests/helpers.js` -- `fixtures(page)`.
- [x] `e2e/tests/xss.spec.js` -- usar `fixtures`.
- [x] `e2e/tests/edge-cases.spec.js` -- cobre as linhas da matriz, falhando em qualquer `pageerror`.

**Acceptance Criteria:**
- Given um paciente mínimo criado pelo teste, when ele é aberto e salvo só com a cidade, then nenhum erro de página aparece e o recurso no FHIR ganha só `address[0].city`.
- Given a suíte completa, when roda contra o container, then todos os testes passam e nenhum recurso de teste fica no servidor.

## Design Notes

O "(no name)" e o "?" vêm do `getName`, que já devolve `''` sem nome; basta tratar a string vazia na montagem do item. Não criar o SSN em `identifier[2]` evita gravar um identifier numa posição que só faz sentido nos dados Synthea; a criação correta, por `system`, é da entrada 2.

## Verification

**Commands:**
- `docker compose restart` (cache gzip do Web Gateway) e `cd e2e && npx playwright test` -- expected: todos os testes passam.
- Busca no FHIR pelos recursos de teste depois da suíte -- expected: nenhum.
- CI do PR -- expected: verde.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total concedida pelo usuário (2026-10-05).
- Implementado pelo subagente: `myFHIR.js` (acesso seguro no `loadForm`, `noRecordsRow(colspan)`, "(no name)"/"?" na lista, badges com `bundle.total || 0`, update criando só o que foi preenchido), `e2e/tests/helpers.js` (`fixtures(page)` com `create` e `cleanup` que não lança), `xss.spec.js` migrado, `edge-cases.spec.js` novo.
- Decision (autonomia): quando o usuário esvazia um campo de nome ou endereço que existia, o update remove esse campo em vez de mandar `""` (o FHIR rejeita string vazia); `name[0]` ou `address[0]` sem nenhum campo saem. O `gender` vazio não sobrescreve o valor gravado, porque o select só tem male e female.
- Verificado pelo implementador: 7 testes passando duas vezes; o spec novo falha com o `myFHIR.js` anterior; nenhum recurso de teste sobra no servidor.

- Depois da revisão (patches do mesmo implementador): o SSN usa a regra de remover quando vazio (`setOrRemove`), e um segundo teste cobre limpar a cidade (o `address` sai) e o `identifier[2]` só com `system` (a gravação não manda `value: ""`).
- Reverificado do meu lado: com a mutação (`r.identifier[2].value = ssnValue`), o teste novo falha; restaurado, 8 testes passando, smoke PASS e 18 pacientes no servidor (nenhum resíduo).

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 1 medium, 3 low, 0 false.

- medium → patch — o SSN vazio era gravado como `""` (o FHIR rejeita): `setOrRemove` no `identifier[2]`; o teste cobre `identifier[2]` só com `system`.
- low → rejeitado — o `splice` ao esvaziar o primeiro nome ou a primeira linha faz o próximo item aparecer no formulário: é a semântica FHIR de remover o valor apagado, o formulário mostra o dado restante, e os pacientes Synthea têm um nome e uma linha só.
- low → patch — a remoção ao esvaziar não tinha teste: segundo teste no `edge-cases.spec.js`.
- low → patch — as tarefas do plano estavam desmarcadas: marcadas.
