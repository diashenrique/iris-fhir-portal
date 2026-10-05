---
title: 'Tratamento do SSN na tela'
type: 'feature'
ticket: '6'
created: '2026-10-05'
status: 'built'
baseline_revision: '46a3fb5d867335542a133dbb82f03435c1ca9a4a'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O SSN, um dado de saúde protegido (PHI), aparece inteiro e editável na tela de detalhes assim que o paciente é aberto.

**Approach:** Mostrar o SSN mascarado (`***-**-1234`) e só leitura, com um botão "Show" que revela o valor real para ler ou editar (decisão do usuário, 2026-10-05). O update grava o valor editado quando o campo foi revelado e o valor original quando não foi, nunca a máscara; depois de salvar, o campo volta a mascarar. O modal "FHIR Data Source" mostra o mesmo recurso com o valor do SSN mascarado (decisão do usuário, 2026-10-05, na revisão). O SSN continua vindo de `identifier[2]`, porque buscar por `system` é do epic-robustez-fhir. O e2e cobre máscara, revelar e salvar.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: cerca de 70 linhas em `patientlist.html`, `myFHIR.js` e num teste e2e novo. Risco baixo.

- Arquivos: `fhirUI/patientlist.html` (o `#SSN` fica readonly num input-group com o botão `#revealSSN` "Show"), `fhirUI/resources/js/myFHIR.js` (`ssnValue`/`ssnRevealed`, `maskSSN`, `showMaskedSSN`; o `loadForm` mascara; o update usa o valor do campo só se foi revelado; depois de salvar, volta a mascarar), `e2e/tests/ssn.spec.js` (novo).
- Verificado: 6 testes passando. Mutação (o update voltando a ler `$("#SSN").val()`): o teste do SSN falha com `Received: "***-**-8969"`, e o `finally` devolve o SSN real ao paciente.
- Depois da revisão: o modal "FHIR Data Source" mostra o recurso com o SSN mascarado (decisão do usuário); o botão Show fica sempre habilitado (um paciente sem SSN pode receber um); valores com 4 caracteres ou menos são mascarados por inteiro. O teste checa que o modal tem a máscara e não tem o SSN real. Reverificado: 6 testes passando.

## Verification

**Commands:**
- `docker compose restart` e `npx playwright test` -- expected: os testes antigos e o novo passam.
- CI do PR -- expected: verde.

- Verificado no GitHub: PR #14, run 37348509388 verde em 6min06s.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 1 medium (intent gap), 2 low, 1 rejeitado.

- medium → intent gap resolvido com o usuário — o modal "FHIR Data Source" mostrava o SSN inteiro: o usuário escolheu mascarar no modal; Intent atualizada (renegociada pelo usuário) e implementado.
- low → patch — paciente sem SSN não conseguia cadastrar um (Show desabilitado): o botão fica sempre habilitado.
- low → patch — valores curtos apareciam inteiros na máscara: até 4 caracteres, tudo é mascarado.
- low → rejeitado — numa falha de gravação, o campo fica revelado com o valor recusado: comportamento razoável para tentar de novo, e o toast de erro avisa.
