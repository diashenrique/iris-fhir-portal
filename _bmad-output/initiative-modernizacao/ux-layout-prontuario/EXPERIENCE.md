---
name: FHIR Patient Portal
status: final
sources:
  - ../initiative-modernizacao.md
  - ../avaliacao-do-projeto.md
updated: 2026-10-06
---

# FHIR Patient Portal — Experience Spine

## Foundation

O portal é uma web responsiva de duas páginas estáticas, servidas pelo IRIS em `/fhir/portal` depois do login do IRIS. Usa jQuery 3.7 com Bootstrap 4.6 e o tema Looper (epic-frontend-deps). `DESIGN.md` é a referência visual, e este documento descreve o comportamento.

**Público principal:** o desenvolvedor que lê os artigos da Developer Community ou instala o portal pelo IPM para ver o FHIR do IRIS for Health funcionando (decisão do usuário, 2026-10-06). O prontuário se comporta como um prontuário clínico real. A camada técnica fica sempre à vista, mas nunca na frente: o selo de origem em cada card, o JSON bruto a um clique e a edição que demonstra o `update` do fhir.js do artigo 3.

**Idioma:** a interface é em inglês, como hoje e como nos artigos. O pt-BR fica para o i18n do epic-prontuario-ampliado (decisão do usuário, 2026-10-06).

## Information Architecture

| Superfície | Chega-se por | Propósito |
|---|---|---|
| Login | Qualquer URL do portal sem sessão | A tela de login do IRIS (epic-seguranca); não muda |
| Patient list | Entrada depois do login; "Back to patients" no mobile | Encontrar e escolher um paciente |
| Patient chart | Clique, ou Enter, num paciente da lista | O prontuário: resumo e cards clínicos |
| Edit patient (modal) | "Edit" no resumo | Alterar os dados demográficos pelo `update` do fhir.js (artigo 3) |
| FHIR JSON (painel) | "FHIR JSON" no resumo | O recurso Patient bruto, para o desenvolvedor |
| Lab chart (dentro do card Laboratory) | Escolher um exame no card | A evolução de um exame pelo `/fhir/api` (artigo 4) |

- **Desktop (≥ 992px):** a lista e o prontuário dividem a tela, e a seleção na lista troca o prontuário sem recarregar.
- **Abaixo de 992px:** uma superfície de cada vez. Escolher um paciente abre o prontuário; "Back to patients" volta para a lista, mantendo a busca e a posição.
- A página `labresult.html` deixa de ser destino, porque o gráfico vai para dentro do prontuário. `[ASSUMPTION]` A URL antiga redireciona para o prontuário do mesmo paciente, para não quebrar links dos artigos.
- O modal fica num nível só: nada abre por cima do Edit.

## Voice and Tone

Microcopy curta e clínica; a voz da marca está em `DESIGN.md`.

| Do | Don't |
|---|---|
| "Select a patient to see their chart." | "No data" |
| "No patients match "smith"." | Lista vazia sem explicação |
| "No allergies recorded." | Tabela vazia |
| "2 allergies" | "Allergies: 2 items found" |
| "Saved." / "Couldn't save the patient. Try again." | "Success!" / "Error 500" |
| "Source: FHIR · fhir.js" e "Source: SQL · /fhir/api" | Esconder a origem dos dados |

## Component Patterns

Comportamento; o visual está em `DESIGN.md.Components`.

| Componente | Onde | Regras |
|---|---|---|
| Patient list item | Patient list | Mostra o nome sem os sufixos numéricos do Synthea ("Jorge Rosado" em vez de "Jorge203 Rosado690"), com o nome original no `title`, e embaixo idade, sexo e ID FHIR. Clique ou Enter abre o prontuário; as setas, Home e End movem o foco (5.5). O selecionado tem `aria-current`. |
| Patient search | Patient list | Filtra enquanto se digita, por nome e ID. Sem resultado, mostra "No patients match "{termo}"." O recarregar mantém o termo. |
| Patient summary | Patient chart | Nome, idade, sexo, data de nascimento, ID FHIR e SSN mascarado com "Reveal" (epic-seguranca). O selo de alergias aparece quando há alergias e leva ao card Allergies. Tem as ações "Edit" e "FHIR JSON". |
| Clinical card | Patient chart | Allergies, Vital signs, Laboratory e Immunizations, sempre abertos, sem acordeão. Cada um tem título, contador e selo de origem, e carrega e falha sozinho, sem bloquear os outros. |
| Vital signs card | Patient chart | Mostra o último valor de cada sinal (pressão, frequência cardíaca, peso, altura, IMC...), com unidade, valor arredondado e data. "Show all" expande o histórico. |
| Laboratory card | Patient chart | Exames agrupados por data, do mais recente ao mais antigo. Valor arredondado com unidade e faixa de referência quando o FHIR traz `referenceRange`. O valor fora da faixa (ou com `interpretation` alta ou baixa) é destacado. O seletor de exame desenha o gráfico logo abaixo. |
| Lab chart | Laboratory card | Desenha ao trocar o exame, sem botão "Search". O eixo x mostra datas e o y a unidade; a faixa de referência aparece como banda quando existe. Mantém a tabela alternativa para leitores de tela (5.5). |
| Edit patient | Modal | É o formulário de hoje (nome, nascimento, sexo, endereço). "Save" faz o `update` e fecha com "Saved."; em erro, o modal continua aberto com a mensagem. O SSN nunca é gravado mascarado (epic-seguranca). |
| FHIR JSON | Painel lateral (o modal docked de hoje) | Mostra o Patient bruto, só leitura, com "Copy". O SSN aparece mascarado, como hoje. |
| App header | Todas as superfícies | "FHIR Patient Portal · InterSystems IRIS for Health", o usuário logado e "Log out". |
| Loader | Global | Uma barra fina no topo enquanto há requisições, em vez do Pace girando no canto. `[ASSUMPTION]` Pode ser o próprio pace-js com o tema "minimal". |

## State Patterns

| Estado | Superfície | Tratamento |
|---|---|---|
| Nenhum paciente selecionado | Patient chart (desktop) | Área vazia com "Select a patient to see their chart.", sem o formulário vazio de hoje |
| Lista carregando | Patient list | Três ou quatro itens esqueleto; a busca fica desabilitada até a primeira página chegar |
| Busca sem resultado | Patient list | "No patients match "{termo}"." e um link "Clear search" |
| Card carregando | Cada card clínico | Esqueleto no corpo; o título e o selo já aparecem |
| Card sem registros | Cada card clínico | Uma linha: "No allergies recorded.", "No vital signs recorded.", "No lab results recorded." ou "No immunizations recorded." |
| Card com erro | Cada card clínico | "Couldn't load {seção}." com "Try again" no próprio card, mais o toast de erro de hoje (epic-robustez-fhir) |
| Exame sem valor numérico | Lab chart | Sem gráfico: "{exame} has no numeric results to chart." A tabela mostra os valores em texto |
| Sessão expirada | Qualquer superfície | Volta à tela de login uma vez (epic-seguranca); o comportamento de hoje não muda |
| Salvando | Edit patient | "Save" desabilitado com "Saving…"; o modal não fecha durante o envio |

## Interaction Primitives

- **Mouse e toque:** clique ou toque em qualquer parte do item ou do card.
- **Teclado:**
  - Tab segue a ordem de leitura.
  - Na lista, setas, Home e End movem o foco, e Enter abre o paciente.
  - Esc fecha o modal e o painel do JSON e devolve o foco ao botão que os abriu.
  - `/` leva o foco à busca de pacientes. `[ASSUMPTION]`
- **Nada depende só de hover;** a 390px tudo é tocável, com alvo de pelo menos 44px.
- **Banido:** rolagem horizontal a 390px, modal sobre modal, nova aba para o gráfico, conteúdo clínico escondido atrás de acordeão fechado.

## Accessibility Floor

O contraste visual está no `DESIGN.md`. O piso é WCAG 2.2 AA.

- **Lista e foco:** o que já existe (5.5) continua: a lista navegável por teclado com nome acessível, `aria-current` e anel de foco visível.
- **Gráfico:** mantém a tabela alternativa em texto.
- **Navegação:** ao abrir um paciente, o foco vai para o nome no resumo (`h1`), e o leitor de tela anuncia o paciente.
- **Valor alterado:** "High" ou "Low" em texto, não só cor ou seta.
- **Cards:** cada card é uma `section` com título (`h2`), e o contador entra no nome acessível ("Allergies, 2").
- **Modal:** prende o foco enquanto está aberto e o devolve ao fechar.
- **Toasts:** os de erro ficam também num `aria-live="polite"`.

## Responsive & Platform

| Largura | Comportamento |
|---|---|
| ≥ 1200px | Lista à esquerda; prontuário com cards em duas colunas |
| 992–1199px | Lista à esquerda; cards em uma coluna |
| < 992px | Uma superfície por vez (lista ou prontuário), com "Back to patients"; o resumo fica em duas linhas; as tabelas viram listas empilhadas |
| 390px | Sem rolagem horizontal, conferido no e2e |

## Inspiration & Anti-patterns

- **Mantido do portal de 2020:** a lista à esquerda, o modal docked com o JSON, a edição pelo fhir.js e o gráfico de exames. São as partes que os artigos ensinam.
- **Rejeitado:** a página separada do gráfico, os quatro blocos recolhidos, o formulário vazio como tela inicial e as datas em ISO com fuso (avaliação, Layout e UX).
- **Rejeitado:** esconder a camada técnica num "modo desenvolvedor". O público é desenvolvedor; a origem e o JSON ficam sempre à vista, discretos (decisão do usuário, 2026-10-06).

## Key Flows

### Flow 1: Primeiro contato (Priya, desenvolvedora de integração num hospital, avaliando o IRIS for Health) `[ASSUMPTION]`

1. Priya instala o `iris-fhir-template` e o portal pelo IPM, como diz o README, e abre `/fhir/portal`.
2. Faz login com o usuário de demonstração e cai na lista, com nomes legíveis, idade e sexo.
3. Escolhe "Carroll O'Hara, 70, female". No desktop, o prontuário abre ao lado; o foco vai para o nome.
4. Vê o resumo com o selo "1 allergy" e, embaixo, os quatro cards abertos, cada um com o selo de origem.
5. No card Laboratory, escolhe "Hemoglobin A1c" e o gráfico aparece logo abaixo, com a unidade e a faixa de referência.
6. **Clímax:** ela abre "FHIR JSON", vê o recurso Patient bruto e o selo "SQL · /fhir/api" do card de exames. Em uma tela, entende que o mesmo dado sai pelo FHIR REST e pelo SQL do IRIS, que é o que os artigos ensinam.

Falha: um card não carrega e mostra "Couldn't load lab results." com "Try again"; os outros cards seguem normais.

### Flow 2: Demonstração do update (Marcos, evangelista, apresentando numa live) `[ASSUMPTION]`

1. Marcos abre o portal no notebook espelhado, com 1280px.
2. Busca "smith"; a lista filtra enquanto ele digita.
3. Abre o paciente e clica "Edit".
4. Troca a cidade e clica "Save"; o modal fecha com "Saved.", e o resumo e o JSON mostram a cidade nova.
5. **Clímax:** ele reabre "FHIR JSON" e mostra a `meta.versionId` incrementada, ou seja, o `update` do fhir.js do artigo 3 gravou no servidor FHIR.

Falha: a sessão expirou durante a live. O "Save" leva uma vez à tela de login, e depois do login ele volta ao portal.

### Flow 3: Conferência no celular (Priya, de novo, num iPhone, 390px) `[ASSUMPTION]`

1. Priya abre o portal no celular para mostrar a um colega.
2. A lista ocupa a tela, sem rolagem lateral.
3. Ela toca um paciente e o prontuário ocupa a tela, com "Back to patients" no topo.
4. **Clímax:** os cards empilham, as tabelas viram listas e o gráfico cabe na largura. Ela volta com "Back to patients" e a lista está na mesma posição.
