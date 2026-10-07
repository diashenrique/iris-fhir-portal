---
type: epic
title: "Layout de prontuário, legível e mobile-first"
parent: initiative-modernizacao
covers: [R8]
after: []
assignee: ""
risk: medium
status: done
---

# Layout de prontuário, legível e mobile-first

## Description

O portal parece um formulário de cadastro, não um prontuário (avaliação, §4 Layout e UX):
- **Tela inicial:** abre num formulário vazio.
- **Dados clínicos:** ficam escondidos em quatro blocos de acordeão fechados.
- **Tabelas:** mostram datas ISO com fuso e valores sem arredondar.
- **Gráfico:** abre noutra aba.
- **Celular:** a 390px a tela estoura na horizontal.

Este épico implementa o `DESIGN.md` e o `EXPERIENCE.md` do `ux-layout-prontuario/`:
- **Telas:** lista e prontuário lado a lado, um de cada vez abaixo de 992px.
- **Prontuário:** resumo do paciente no topo, cards clínicos sempre abertos e exames legíveis.
- **Gráfico:** dentro do card de laboratório.
- **Camada técnica:** a origem dos dados e o JSON bruto à vista, para o público desenvolvedor.

## Outcome

Quem abre o portal vê uma lista legível, escolhe um paciente e lê o prontuário sem cliques extras: resumo, alergias, sinais vitais, exames agrupados e o gráfico do exame escolhido. Em 390px nada rola na horizontal. Cada card diz de onde vêm os dados, e o JSON e a edição continuam a um clique.

## Requirements

A fonte é o par de documentos de UX; os ids abaixo cobrem a R8.

- L1 (R8): **Casca do app.**
  - Um cabeçalho com "FHIR Patient Portal · InterSystems IRIS for Health", o usuário logado e "Log out".
  - Uma barra de carregamento fina no lugar do Pace girando.
  - Lista e prontuário lado a lado a partir de 992px; abaixo disso, uma tela por vez, com "Back to patients".
  - Nenhuma rolagem horizontal a 390px.
  - Fonte: EXPERIENCE.md, Information Architecture e Responsive & Platform.
- L2 (R8): **Estado vazio e resumo do paciente.**
  - Sem paciente, "Select a patient to see their chart.".
  - Com paciente, o resumo traz nome, idade, sexo, data de nascimento, ID FHIR, SSN mascarado com "Reveal" e o selo de alergias.
  - A edição sai da tela principal para o modal "Edit".
  - O JSON bruto fica no painel "FHIR JSON".
  - Fonte: EXPERIENCE.md, Component Patterns e State Patterns.
- L3 (R8): **Lista de pacientes.**
  - Nomes sem os sufixos do Synthea (o original fica no `title`), mais idade, sexo e ID.
  - A busca por nome e ID avisa quando nenhum paciente bate.
  - Fonte: EXPERIENCE.md, Patient list item e Patient search.
- L4 (R8): **Cards clínicos.**
  - Allergies, Vital signs, Laboratory e Immunizations sempre abertos, cada um com contador, selo de origem e estados próprios (carregando, vazio, erro com "Try again").
  - Datas legíveis, com o ISO no `title`.
  - Sinais vitais: o último valor de cada tipo, com unidade e arredondado.
  - Fonte: EXPERIENCE.md, Clinical card, Vital signs card e State Patterns.
- L5 (R8): **Card de laboratório.**
  - Exames agrupados por data, com valor arredondado e unidade.
  - A faixa de referência aparece quando o FHIR traz `referenceRange`.
  - O valor fora da faixa, ou com `interpretation` alta ou baixa, é destacado com cor, seta e o texto "High" ou "Low".
  - Fonte: EXPERIENCE.md, Laboratory card.
- L6 (R8): **Gráfico de laboratório dentro do card.**
  - Ele desenha ao trocar o exame, sem botão, com a unidade e a faixa de referência quando existe.
  - Mantém a tabela alternativa (5.5).
  - O `labresult.html` redireciona para o prontuário do mesmo paciente.
  - Fonte: EXPERIENCE.md, Lab chart.
- L7 (R8): **Acessibilidade.**
  - O foco vai para o nome do paciente ao abri-lo, e cada card é uma `section` com título e contador no nome.
  - O modal prende e devolve o foco, e os erros entram também num `aria-live`.
  - Os alvos de toque têm pelo menos 44px.
  - Fonte: EXPERIENCE.md, Accessibility Floor e Interaction Primitives.

## Done when

1. Um e2e a 390×844 confirma que a lista e o prontuário não rolam na horizontal (`scrollWidth <= clientWidth`), e que "Back to patients" volta à lista.
2. Um e2e confirma o estado vazio sem paciente, e depois o resumo com idade, sexo e o selo de alergias de um paciente com alergia.
3. Um e2e confirma que os quatro cards aparecem sem nenhum clique, cada um com o selo de origem. Os exames aparecem agrupados por data, e um valor fora da faixa de uma Observation criada pelo teste aparece destacado como "High" ou "Low".
4. Um e2e confirma que escolher um exame no card desenha o gráfico sem clicar em "Search", e que o `labresult.html?id=X` leva ao prontuário de X.
5. Os e2e de antes, adaptados ao novo layout, e o smoke passam; CI verde em `master`.

## Boundaries

No escopo: `fhirUI/patientlist.html`, `fhirUI/labresult.html`, `fhirUI/resources/js/`, `fhirUI/resources/css/custom.css` e os testes e2e. Ficam de fora:
- o tema Looper e a troca dele (decisão do usuário);
- novas seções clínicas, a linha do tempo e o i18n (epic-prontuario-ampliado);
- o servidor (`Dispatch`, rotas, papéis), exceto a rota `GET /fhir/api/session` (ver Notes);
- o Font Awesome 6;
- o 404 do ícone da página de login do IRIS, que é do próprio IRIS.

## References

- UX: `_bmad-output/initiative-modernizacao/ux-layout-prontuario/DESIGN.md` e `EXPERIENCE.md`, que prevalecem sobre qualquer outra descrição de layout
- avaliação: `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`, §4 Layout e UX
- código: `fhirUI/patientlist.html`, que hoje tem o formulário, o acordeão `#accordion` e o modal docked `#exampleModalDocked`; `fhirUI/resources/js/myFHIR.js`; `fhirUI/labresult.html` e `fhirUI/resources/js/labresult.js`
- testes que dependem do layout atual: `e2e/tests/tracer.spec.js`, `ssn.spec.js`, `ssn-system.spec.js`, `xss.spec.js`, `observation-values.spec.js`, `edge-cases.spec.js`, `lab-chart.spec.js` e `a11y.spec.js`

## Notes

- Decision (usuário, 2026-10-06): o público é o desenvolvedor (demo), o visual continua no tema Looper, refinado, e a interface fica em inglês (memlog do `ux-layout-prontuario`).
- Decision (autonomia, 2026-10-06): o tracer bullet é a casca do prontuário, com cabeçalho, as duas colunas ou uma tela por vez, o estado vazio, o resumo e os cards já abertos, provada a 390px. Ele toca todas as camadas da tela; o resto refina cada parte.
- Source conflict: L5 e L6 (EXPERIENCE.md, faixa de referência e valor alterado) contra os dados. Os 22 pacientes Synthea de `data/fhir` não têm `referenceRange` nem `interpretation`. O comportamento vale quando o FHIR traz esses campos, e o e2e o prova com uma Observation criada pelo teste; com os dados de exemplo, nenhum valor aparece destacado.
- Decision (autonomia, 2026-10-06): todas as entradas mexem no `patientlist.html` e no `myFHIR.js`, então formam uma raia só, em sequência; não há trabalho paralelo.
- Unknown: quantos e2e de antes dependem dos ids do formulário e do acordeão (`#firstName`, `#collapseThree2` e outros). A entrada que move cada parte adapta os testes daquela parte.
- Decision (autonomia, 2026-10-06): o cabeçalho mostra o usuário logado, mas as páginas são estáticas e nenhuma rota devolve o usuário. A fronteira abre só para uma rota nova `GET /fhir/api/session`, que devolve `{"user": $username}` da sessão e responde 401 sem login, como as outras. Ela entra na entrada 1, com checagem no smoke. Achado da validação do breakdown.
- Decision (autonomia, 2026-10-06): a validação do breakdown (set check) também mudou outras coisas:
  - pôs no tracer o selo de alergias e o "Back to patients" que mantém a busca;
  - mandou o selo SQL e o aviso de exame sem valor numérico para o gráfico (6);
  - fez da unidade e da faixa do gráfico um handoff das Observations do card de laboratório (5), porque a rota de resultados do `Dispatch` devolve só nome, data e valor;
  - pôs o deep-link `?id=X` do `patientlist.html` na entrada 6;
  - trocou o pré-requisito "5.6" pelas entradas que entregam cada coisa: 2.2, 2.6, 3.5, 5.2, 5.3 e 5.5.
- Fechado (2026-10-06), com a checagem de fechamento:
  1. **MET.** \`layout.spec.js\` a 390×844 confirma \`scrollWidth <= clientWidth\` na lista e no prontuário, e que "Back to patients" volta mantendo a busca (8.1).
  2. **MET.** \`layout.spec.js\` cobre o estado vazio e o resumo com idade, sexo e "1 allergy" de um paciente criado pelo teste (8.1).
  3. **MET.** \`layout.spec.js\` e \`cards.spec.js\` confirmam os quatro cards sem clique, com o selo de origem. \`lab-card.spec.js\` cobre o agrupamento por dia e os valores "High" e "Low" (8.4 e 8.5).
  4. **MET.** \`lab-chart.spec.js\` cobre o gráfico ao trocar o exame, sem "Search", e o \`labresult.html?id=X\` abrindo o prontuário de X (8.6).
  5. **MET.** Os e2e de antes, adaptados, passam junto com os novos (40/40), assim como o smoke. O CI do PR do sweep fecha o "verde em \`master\`".

  As 8 entradas estão \`done\`. Adiados: o 404 do ícone da página de login do IRIS, fora do escopo, e as capturas e o README, para o epic-docs-demo.
