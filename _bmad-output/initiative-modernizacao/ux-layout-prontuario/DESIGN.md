---
name: FHIR Patient Portal
description: Prontuário de demonstração do FHIR no InterSystems IRIS for Health, sobre o tema Looper (Bootstrap 4); este DESIGN.md fixa os tokens do tema que o portal usa e o pouco que acrescenta.
status: final
updated: 2026-10-06
colors:
  # Herdadas do theme.min.css (Looper). O portal não redefine nenhuma.
  primary: '#346CB0'
  info: '#0179A8'
  success: '#00A28A'
  warning: '#F7C46C'
  danger: '#B76BA3'
  red: '#EA6759'
  text: '#363642'
  text-muted: '#888C9B'
  surface: '#FFFFFF'
  background: '#F6F7F9'
  border-input: '#C6C9D5'
  dark: '#222230'
  # Acréscimo do portal: o selo de origem dos dados, para o público desenvolvedor.
  source-fhir: '#0179A8'
  source-sql: '#5F4B8B'
typography:
  # Fira Sans com a pilha do tema; tamanhos do Bootstrap 4 (1rem = 16px).
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Fira Sans", "Helvetica Neue", sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  patient-name:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  card-title:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.3'
  value:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.2'
  meta:
    fontFamily: '{typography.body.fontFamily}'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  code:
    fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  DEFAULT: 4px
  pill: 9999px
spacing:
  # A escala do Bootstrap 4 (spacer = 16px).
  '1': 4px
  '2': 8px
  '3': 16px
  '4': 24px
  '5': 48px
  gutter: 20px
  margin-mobile: 16px
components:
  app-header:
    background: '{colors.surface}'
    foreground: '{colors.text}'
  patient-summary:
    background: '{colors.surface}'
    name: '{typography.patient-name}'
    meta: '{typography.meta}'
  clinical-card:
    background: '{colors.surface}'
    radius: '{rounded.DEFAULT}'
    shadow: '0 0 0 1px rgba(20,20,31,.05), 0 1px 3px 0 rgba(20,20,31,.15)'
  condition-pill:
    background: '{colors.primary}'
    foreground: '{colors.surface}'
    radius: '{rounded.pill}'
  allergy-alert:
    background: '{colors.red}'
    foreground: '{colors.surface}'
    radius: '{rounded.pill}'
  value-abnormal:
    foreground: '{colors.red}'
  source-badge-fhir:
    background: '{colors.source-fhir}'
    foreground: '{colors.surface}'
    radius: '{rounded.pill}'
  source-badge-sql:
    background: '{colors.source-sql}'
    foreground: '{colors.surface}'
    radius: '{rounded.pill}'
  focus-ring:
    color: '{colors.primary}'
    width: 2px
---

## Brand & Style

O FHIR Patient Portal é uma demonstração para desenvolvedores: mostra o que o IRIS for Health entrega por FHIR e por SQL, com a cara de um prontuário de verdade. A postura é a de uma ferramenta clínica sóbria, com uma camada técnica à vista: cada dado diz de onde veio, e o JSON bruto está a um clique.

O visual é o do tema Looper (Bootstrap 4), refinado, sem redesenho (decisão do usuário, 2026-10-06). Os componentes do Bootstrap e do tema (cards, botões, badges, modal, list-group) ficam como são; este documento fixa os tokens que o portal usa e os poucos componentes próprios.

## Colors

- **Primary (`#346CB0`)**: botões de ação, link ativo, paciente selecionado na lista, anel de foco. É o azul do tema.
- **Red (`#EA6759`)**: só alerta clínico. Marca o selo de alergias no resumo e o valor de exame fora da faixa de referência. Nunca em botão ou decoração.
- **Danger (`#B76BA3`)**: o "danger" do tema é rosa-arroxeado. O portal não o usa para dado clínico. Os erros do sistema saem nos toasts do toastr, com o estilo próprio dele, para não confundir erro do sistema com alerta do paciente.
- **Source FHIR (`#0179A8`) e Source SQL (`#5F4B8B`)**: os selos de origem ("FHIR · fhir.js" e "SQL · /fhir/api"), o acréscimo para o público desenvolvedor. São o `info` e o `purple` do tema.
- **Text, text-muted, background, surface**: os do tema.

Não usar: cores fora do tema, gradientes, verde para "normal" (a ausência de destaque já diz "normal").

## Typography

Fira Sans com a pilha do tema, carregada do Google Fonts, como hoje. A hierarquia:
- `patient-name` (28px, 600) só no resumo do paciente.
- `card-title` (18px) no título de cada card clínico.
- `value` (20px) para o último valor de um sinal vital ou exame.
- `meta` (14px) para datas, unidades, faixas e o ID FHIR.
- `code` (13px, monoespaçada) só no JSON bruto.

## Layout & Spacing

A escala do Bootstrap 4 (`{spacing.1}` a `{spacing.5}`), com `{spacing.gutter}` de 20px entre cards, como o tema.

- **Desktop (≥ 992px):** lista de pacientes à esquerda (largura fixa de cerca de 320px) e prontuário à direita.
- **Prontuário:** o resumo do paciente no topo, e embaixo os cards clínicos numa grade de duas colunas (≥ 1200px) ou uma coluna.
- **Abaixo de 992px:** uma tela de cada vez (lista ou prontuário), com margem de `{spacing.margin-mobile}`.
- Nada rola na horizontal a 390px; as tabelas largas viram listas empilhadas.

## Elevation & Depth

A sombra do card do tema (`{components.clinical-card.shadow}`) é o único nível. O modal de edição e o painel do JSON usam a sombra do Bootstrap. Não há outros níveis.

## Shapes

O `{rounded.DEFAULT}` (4px) do tema em cards, botões e campos. O `{rounded.pill}` só nos selos: alerta de alergia, origem dos dados e contadores.

## Components

Do Bootstrap e do tema, sem mudança: card, button, badge, list-group, modal, toastr.

Próprios do portal:
- **App header:** o nome "FHIR Patient Portal", o subtítulo "InterSystems IRIS for Health", o usuário logado e "Log out". Fundo `{colors.surface}`.
- **Patient summary:** o nome em `{typography.patient-name}`. Numa linha `{typography.meta}`: idade, sexo, data de nascimento, ID FHIR e SSN mascarado com o botão de revelar. As ações "Edit" e "FHIR JSON" ficam à direita. O selo de alergias fica à direita do nome quando há alergias.
- **Clinical card:** título, contador e selo de origem no cabeçalho; o corpo sempre visível, sem acordeão.
- **Allergy alert:** pill `{colors.red}` com o número de alergias ("2 allergies").
- **Condition pill:** pill `{colors.primary}` com o número de condições ativas ("2 active conditions"), ao lado do selo de alergias. É azul porque não é alerta: o vermelho fica só para alergia e valor alterado. As condições resolvidas aparecem no card em `{colors.text-muted}`.
- **Value abnormal:** o valor em `{colors.red}` com uma seta (↑ ou ↓) e o texto "High" ou "Low" para leitores de tela. A cor nunca carrega a informação sozinha.
- **Source badge:** pill pequeno no cabeçalho do card; FHIR em `{colors.source-fhir}`, SQL em `{colors.source-sql}`.
- **Language select:** `custom-select-sm` de 7,5rem no cabeçalho, antes de "Log out", com "English" e "Português". No celular, "Log out" fica só com o ícone (o texto continua para leitores de tela), para o cabeçalho caber numa linha.
- **Chart and Timeline tabs:** abas no pé do resumo, sem caixa: a ativa é sublinhada em `{colors.primary}` (2px) e em negrito, a outra em `{colors.text-muted}`. O contorno de foco aparece só pelo teclado.
- **Timeline:** card com o selo `source-fhir` "FHIR · $everything", os filtros como botões `btn-outline-primary` pequenos (pressionados ficam cheios) e, por ano, um título com uma linha fina embaixo, seguido dos eventos em três colunas: data em `{colors.text-muted}`, tipo em peso 500 e o texto. No celular, as colunas quebram em linhas.
- **Focus ring:** 2px `{colors.primary}`, já usado na lista (5.5); vale para todo item clicável sem contorno próprio.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Herdar o Looper e o Bootstrap 4 em tudo que não está acima | Trocar cores, raios ou sombras do tema |
| Vermelho só para alerta clínico (alergia, valor fora da faixa) | Usar o "danger" rosa do tema para dado clínico |
| Seta e texto junto com a cor do valor alterado | Indicar valor alterado só com cor |
| Selo de origem em todo card | Esconder de onde o dado veio (o público é desenvolvedor) |
| Datas legíveis ("Sep 3, 2014", ou "3 de set. de 2014" em pt-BR) com o ISO no `title` | ISO com fuso na tabela |
