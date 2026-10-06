---
title: 'SSN pelo system us-ssn, não por posição'
type: 'bugfix'
ticket: '2'
created: '2026-10-05'
status: 'built'
baseline_revision: 'e60888e0c2f7f5c772ea7df6aaaf989f818ab8d5'
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

**Problem:** O SSN é lido, mascarado no modal e gravado em `identifier[2]`, a posição que ele tem nos dados Synthea. Num Patient com os identifiers em outra ordem, o portal mostra e grava o identifier errado; num Patient sem SSN, não há como cadastrar um (a story 3.1 só evita o erro).

**Approach:** Encontrar o SSN pelo identifier com `system` `http://hl7.org/fhir/sid/us-ssn` na leitura, na máscara do modal e no update. Quando o paciente não tem SSN e o usuário revela, digita e salva, o update acrescenta `{system, value}` ao fim de `identifier` (criando a lista se faltar). Os outros identifiers nunca mudam. A máscara, o "Show" e a regra de não gravar string vazia (stories 2.6 e 3.1) continuam iguais.

## Boundaries & Constraints

**Always:** comparar o `system` exatamente; manter a ordem e o conteúdo dos outros identifiers; usar o helper `fixtures` do e2e (3.1) para os pacientes de teste.

**Never:** validar o formato do SSN; mudar a tela além do comportamento do campo; mexer em `Dispatch.cls`, `labresult.js`, `iris.script` ou `smoke.sh` (a story 3.7 está nesses arquivos).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SSN fora da posição 2 | `identifier` = [SSN, MR, DL] | Campo e modal mostram `***-**-` com os 4 últimos dígitos do SSN; salvar sem revelar não muda nenhum identifier | — |
| Editar SSN fora da posição 2 | Revelar, trocar o valor, salvar | Só o identifier us-ssn muda | — |
| Paciente sem SSN | Sem identifier us-ssn | Campo vazio; revelar, digitar e salvar acrescenta `{system: us-ssn, value}` | — |
| Paciente sem SSN, salvar sem digitar | Campo vazio | Nenhum identifier é criado | — |
| Synthea | SSN em `identifier[2]` | O `ssn.spec.js` continua passando | — |

</frozen-after-approval>

## Code Map

- `fhirUI/resources/js/myFHIR.js` -- `ssnValue`, `maskSSN`, `showMaskedSSN` (linhas 69–90); `loadForm` lê `r.identifier[2]` (por volta das linhas 123–127) e o modal mascara `shownPatient.identifier[2]` (140–141); `updatePatient` grava com `setOrRemove(r.identifier[2], 'value', ssnValue)` só se `identifier[2]` existe (449–451).
- `e2e/tests/helpers.js` -- `fixtures(page)` com `create` e `cleanup`.
- `e2e/tests/ssn.spec.js` -- lê `original.identifier[2].value` como SSN real; nos dados Synthea a posição 2 é a us-ssn, então segue válido.
- `e2e/tests/ssn-system.spec.js` -- novo.

## Tasks & Acceptance

**Execution:**
- [x] `fhirUI/resources/js/myFHIR.js` -- constante do system e um helper que encontra o identifier us-ssn; usar na leitura, no modal e no update (atualiza o encontrado; senão, acrescenta um só se houver valor).
- [x] `e2e/tests/ssn-system.spec.js` -- cobre as linhas da matriz com pacientes criados pelo `fixtures`.

**Acceptance Criteria:**
- Given a suíte inteira, when roda contra o container, then todos os testes passam e nenhum recurso de teste fica no servidor.
- Given a leitura voltando a usar `identifier[2]` (mutação), when o `ssn-system.spec.js` roda, then falha.

## Verification

**Commands:**
- `docker compose restart` e `cd e2e && npx playwright test` -- expected: todos passam.
- Mutação de volta para `identifier[2]` -- expected: o teste novo falha.
- CI do PR -- expected: verde.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total concedida pelo usuário (2026-10-05).
- Implementado pelo subagente: `myFHIR.js` com `SSN_SYSTEM` e `findSSN(resource)` na leitura, no modal (que mascara só quando há valor) e no update (atualiza o encontrado; senão acrescenta `{system, value}` ao fim, só com valor); `e2e/tests/ssn-system.spec.js` novo.
- Verificado pelo implementador: 9 testes passando; mutação (leitura de volta em `identifier[2]`) falha o teste novo (`***-**-4321` esperado, `***-**-2345` recebido); nenhum paciente de teste sobrou.
- Limite conhecido: com mais de um identifier us-ssn, só o primeiro é lido e gravado.

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: nenhum achado. O revisor confirmou que a mutação para `identifier[2]` é pega pelo teste novo (no campo, no modal e no update), que todos os 18 SSN do Synthea usam o system exato e que nenhum outro código lê `identifier` por posição.
