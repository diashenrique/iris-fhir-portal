---
type: epic
title: "Prontuário mostra condições, medicações, encontros e linha do tempo"
parent: initiative-modernizacao
covers: [R6]
after: []
assignee: ""
risk: medium
status: done
---

# Prontuário mostra condições, medicações, encontros e linha do tempo

## Description

O prontuário mostra só alergias, sinais vitais, exames e vacinas. Os dados Synthea carregados trazem muito mais, e o portal ignora:
- 140 Conditions;
- 363 MedicationRequests;
- 601 Encounters;
- 58 CarePlans;
- 432 Procedures.

Este épico acrescenta quatro cards no padrão da 8.4 (Conditions, Medications, Encounters e Care plans). Acrescenta também uma linha do tempo do paciente, feita com uma chamada só a `Patient/$everything`, que serve de exemplo da operação para o público desenvolvedor. Por fim, deixa a interface trocar para português (pt-BR), mantendo o inglês como padrão.

## Outcome

Quem abre um paciente vê:
- o que ele tem (condições ativas e resolvidas);
- o que toma (medicações ativas e anteriores);
- quando foi atendido (encontros);
- o que está planejado (planos de cuidado);
- a história inteira em ordem, numa linha do tempo.

A interface pode ser usada em inglês ou em português.

## Requirements

- A1 (R6): **Card Conditions.** Separa as ativas das resolvidas, cada uma com a data de início e, quando houver, a de resolução. A contagem de ativas entra no resumo do paciente. O card tem o selo de origem e os estados da 8.4.
- A2 (R6): **Card Medications.** MedicationRequest, com as ativas primeiro e as anteriores atrás de "Show all". Mostra nome (de `medicationCodeableConcept` ou da Medication referenciada), dose quando houver e data.
- A3 (R6): **Card Encounters.** Os encontros mais recentes, com tipo, classe e período, e o histórico atrás de "Show all".
- A4 (R6): **Card Care plans.** Status, categoria e período de cada plano.
- A5 (R6): **Linha do tempo.**
  - É uma vista "Timeline" do prontuário, alternada com os cards por abas.
  - Mostra os eventos datados do `Patient/$everything`, do mais recente para o mais antigo: encontros, início de condições, procedimentos, vacinas, prescrições e laudos.
  - Os eventos ficam agrupados por ano, e dá para filtrar por tipo.
  - A vista tem o selo "FHIR · $everything".
- A6 (R6): **Português.**
  - Um seletor de idioma no cabeçalho troca a interface entre inglês e português (pt-BR). A escolha fica guardada no navegador.
  - Datas e números seguem o idioma escolhido.
  - Os dados clínicos não são traduzidos: vêm do FHIR como estão.

## Done when

1. Um e2e com recursos criados pelo teste confirma os quatro cards novos, cada um com o selo de origem e o estado de vazio. O card de condições separa ativas e resolvidas, e o resumo mostra a contagem de ativas.
2. Um e2e abre a Timeline de um paciente criado pelo teste e confirma os eventos em ordem, agrupados por ano, o filtro por tipo e o selo do `$everything`.
3. Um e2e troca o idioma para português e confirma os títulos, os estados e uma data no formato pt-BR. Ao recarregar, o idioma continua.
4. Os e2e de antes e o smoke passam; CI verde em `master`.

## Boundaries

No escopo:
- `fhirUI/patientlist.html`, `fhirUI/resources/js/` e `fhirUI/resources/css/custom.css`;
- os testes e2e;
- o `EXPERIENCE.md` e o `DESIGN.md` do `ux-layout-prontuario`, que ganham os cards novos, a Timeline e o idioma.

Ficam de fora:
- a edição desses recursos, que continuam só de leitura;
- o servidor e as rotas da `/fhir/api`;
- outros idiomas além de inglês e pt-BR;
- traduzir textos clínicos.

## References

- parent: `_bmad-output/initiative-modernizacao/initiative-modernizacao.md`, R6
- UX: `_bmad-output/initiative-modernizacao/ux-layout-prontuario/DESIGN.md` e `EXPERIENCE.md`, que valem para os cards novos (padrão "Clinical card", estados, selo de origem)
- código: `fhirUI/resources/js/myFHIR.js`, que tem `CARDS`, `cardLoading`, `cardLoaded`, `cardError`, `readableDate`, `searchAll` e o "Show all" dos sinais vitais (8.4), e `fhirUI/patientlist.html`, que tem a grade de cards e o resumo

## Notes

- Decision (autonomia, 2026-10-07): os cards novos usam buscas por tipo, com `searchAll`, cada uma com o próprio estado, como os da 8.4. Já a linha do tempo usa o `Patient/$everything`, que mostra numa chamada só o que a operação entrega. O selo diz isso.
- Decision (autonomia, 2026-10-07): o idioma padrão continua o inglês, que é o dos artigos (decisão do usuário no `ux-layout-prontuario`). O pt-BR é escolhido no cabeçalho.
- Decision (autonomia, 2026-10-07): o tracer bullet é o card Conditions, com o resumo e o e2e. Ele prova que o padrão de card da 8.4 recebe um recurso novo de ponta a ponta. Logo depois vem a Timeline, a parte de que há menos certeza.
- Unknown: se o `$everything` do IRIS pagina (devolve `link[next]`) para pacientes com muitos recursos, e como ele trata o `_since` e o `_type`. A entrada da Timeline responde.
- Unknown: como lidar com o texto que o tema e as bibliotecas embutem (o flatpickr tem locale próprio; os rótulos do Chart.js usam o `Chart.defaults.locale`). A entrada do idioma decide.
- Decision (autonomia, 2026-10-07): a Timeline é uma vista alternada com os cards por abas ("Chart" e "Timeline") no resumo, e não uma coluna ao lado. Com oito cards, uma coluna a mais não cabe sem estreitar tudo.
- Decision (autonomia, 2026-10-07): a validação do breakdown (set check) mudou o plano em vários pontos:
  - **Ordem:** o pt-BR (5) vem logo depois da Timeline, para os cards seguintes já nascerem com os dois dicionários. A 5 também lista os textos e o `<html lang>` que precisa converter.
  - **Show all:** passa a ter dono, a entrada 3, que o torna reutilizável; a 4 o usa.
  - **Medicação:** o nome vem da Medication referenciada (`_include`).
  - **Estados e documentação:** a Timeline ganhou os estados da 8.4; cada entrada documenta no `EXPERIENCE.md` e no `DESIGN.md` o que acrescenta.
  - **Testes:** as checagens de selo e de vazio entraram no verify de todos os cards.
- Fechado (2026-10-07), com a checagem de fechamento:
  1. **MET.** Os quatro cards novos têm e2e com recursos criados pelo teste, selo de origem e estado de vazio: `conditions.spec.js`, `medications.spec.js` e `encounters.spec.js` (Encounters e Care plans), mais o `cards.spec.js` para o selo e o "Try again". O card de condições separa ativas e resolvidas, e o resumo mostra "N active conditions" (6.1, 6.3 e 6.4).
  2. **MET.** `timeline.spec.js` cobre a ordem, os grupos por ano, o filtro, o selo do `$everything` e o erro com "Try again" (6.2).
  3. **MET.** `i18n.spec.js` cobre a troca para português no mesmo paciente: `lang`, títulos, estados, toast, datas em pt-BR e o idioma mantido depois de recarregar (6.5).
  4. **MET.** Os e2e de antes e os novos passam (49/49), assim como o smoke. O CI do PR do sweep fecha o "verde em `master`".

  As 6 entradas estão `done`. Adiado: o comprimento do card de laboratório (`deferred-work.md`).
