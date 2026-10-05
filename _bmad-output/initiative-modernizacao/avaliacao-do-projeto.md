# Avaliação do iris-fhir-portal

Data: 2026-10-05 · Base: commit `43635b7` (master) + upgrade para IRIS for Health 2026.2 feito nesta sessão.

Fontes: o código do repositório, os quatro artigos na Developer Community (*My experience working with FHIR*, *Overview of iris-fhir-portal*, *Updating Patient resource using fhir.js*, *Getting FHIR information using SQL*), o `musketeers-br/sentai-task` (referência de versão), o `intersystems-community/iris-fhir-template` e o registro IPM. O build, a carga de dados, as rotas e as duas páginas foram executados de fato (Docker + Chrome headless).

## 1. O que o projeto é

Um prontuário de paciente (Patient Chart) feito para o concurso FHIR de 2020. É uma SPA em jQuery que lê e grava no FHIR R4 do IRIS for Health:

| Página | Fonte dos dados | Recursos FHIR |
|---|---|---|
| `patientlist.html`: lista, detalhes e edição do paciente, acordeão clínico, modal com o JSON bruto | fhir.js → `/fhir/r4` | Patient, AllergyIntolerance, Observation (`vital-signs`, `laboratory`), Immunization |
| `labresult.html`: gráfico de evolução de exames | jQuery → REST `/fhir/api` (`diashenrique.fhir.portal.Dispatch`) → SQL sobre as tabelas FHIR + funções `GetJSON`, `GetProp` e `GetAtJSON` (`User.SQLvar`) | Observation (laboratory) |

Cada artigo corresponde a uma parte do código: o 1 e o 2 à leitura com fhir.js, o 3 ao `updatePatient` e o 4 ao `Dispatch` e ao `SQLvar`.

Histórico: 34 commits. O desenvolvimento ativo foi de agosto a setembro de 2020. Depois disso só entraram PRs da comunidade (licença, imagem, `--check-caps`), e o último é de outubro de 2023. O pacote IPM `fhir-portal` 1.0.3 continua publicado e é **instalado pelo `iris-fhir-template` oficial** (`zpm "install fhir-portal"`), então o alcance do projeto vai além do próprio repositório.

## 2. Estado antes do upgrade

| Área | Situação |
|---|---|
| Imagem | `intersystemsdc/irishealth-community` sem tag, ou seja, o que houver no dia. O Dockerfile não roda `iris stop`, então a imagem era gravada com a instância ainda em execução. |
| FHIR | Estratégia `HS.FHIRServer.Storage.Json`, que é legada, e esquemas SQL `HSFHIR_I0001_*`. |
| `/fhir/api` | O `iris.script` criava o web app com `DispatchClass = "User.Dispatch"`, **uma classe que não existe**. O módulo foi renomeado para `diashenrique.fhir.portal` em setembro de 2020. Por isso a página de gráficos estava quebrada na instalação via Docker. |
| Docs/IDE | `.vscode/settings.json` aponta para `FHIRAppDemo.html`, que não existe. O `dev.md` usa caminhos antigos. |

## 3. Upgrade realizado: IRIS for Health 2026.2

O sentai-task usa `intersystems/iris-community:latest-cd` (a última `ARG IMAGE` do Dockerfile, IRIS 2026.2). O portal precisa das bibliotecas HealthShare, então adotei o mesmo canal na variante Health: `intersystems/irishealth-community:latest-cd`, que resolve para **2026.2.0.221.0**.

| Arquivo | Mudança | Por quê |
|---|---|---|
| `Dockerfile` | Nova `ARG IMAGE`, que mantém o histórico das anteriores como no sentai. `WORKDIR /home/irisowner/dev`, bind mount do BuildKit em vez de `COPY`, `iris stop IRIS quietly` | Mesmo padrão do sentai-task; a imagem deixa de ser gravada com o IRIS rodando. |
| `docker-compose.yml` | Sem `version:` (obsoleto), `working_dir: /home/irisowner`, checkout montado em `/home/irisowner/dev`, porta 53773 removida | Padrão do sentai. A porta 53773 não tem uso e cai na faixa reservada do Hyper-V no Windows. |
| `iris.script` | `HS.Util.Installer.Foundation`, estratégia **JsonAdvSQL** e pacote `hl7.fhir.r4.core@4.0.1` no lugar de `HL7v40`. `/fhir/api` aponta para `diashenrique.fhir.portal.Dispatch`. Novo usuário `fhirportal` sem papéis | APIs atuais do instalador. A estratégia Json é legada. Ver a nota abaixo sobre autenticação. |
| `Dispatch.cls` | Consultas em `HSFHIR_X0001_R.Rsrc` com `ResourceType`/`Deleted` e **parâmetros `?`** | Os esquemas mudaram e a coluna `S.Patient.name` não existe mais. A concatenação permitia SQL injection num endpoint anônimo com `%All`. |
| `myFHIR.js` | `auth: {user, pass}` no client fhir.js | O FHIR server 2026 rejeita o `UnknownUser` com um 401 sem `WWW-Authenticate`, então o navegador nem pede a senha. |
| `misc/sql/example.sql`, `README.md` | Esquemas novos e nota sobre versão e credencial | Documentação do artigo 4. |

**Verificado:** build do zero sem erros; 18 pacientes e 2.628 Observations carregados. Todas as buscas do portal retornam dados (lista, `_id`, `vital-signs`, `laboratory`, Immunization, AllergyIntolerance), e o `PUT Patient` funciona com 200. As três rotas de `/fhir/api` funcionam, e sondas de injeção (`6 OR 1=1`, `x' OR '1'='1`) retornam `[]`. No Chrome headless, a lista renderiza os 18 pacientes e a página de laboratório carrega as opções de exame.

**Atenção:**

- `latest-cd` acompanha o canal do sentai, mas não é reproduzível: o próximo CD muda a base sem aviso. Decisão do usuário (2026-10-05): manter `latest-cd`. O CI do E1 passa a ser o alarme de quebra.
- A credencial `fhirportal` fica no JS. É aceitável numa demo local, mas não para publicar. A substituição real é o E2.
- Os IDs dos recursos agora são atribuídos durante a carga e **não são estáveis entre builds**. Nada no código depende disso, mas screenshots e exemplos com `Patient/1` deixam de ser válidos.
- O **caminho IPM** (`module.xml`) não foi alterado. Ele continua quebrado no IRIS atual pelos mesmos motivos: o frontend chama sem credencial e o `Dispatch` usa um esquema fixo (E4).

## 4. Achados por área

Severidade: 🔴 alta · 🟠 média · 🟡 baixa.

### Segurança

- 🔴 **XSS armazenado.** Todo o HTML é montado por concatenação com dados FHIR: `myFHIR.js:127` (nome do paciente), as linhas das tabelas e `labresult.js:47` (`<option>`). Um nome de paciente gravado pelo próprio formulário de edição já é suficiente para executar script.
- 🔴 **`/fhir/api` anônimo com `MatchRoles=":%All"`.** O SQL injection foi corrigido, mas qualquer falha futura nessa classe roda como superusuário. É preciso um papel mínimo com SELECT em `HSFHIR_X0001_R`.
- 🟠 Credenciais de demo no frontend; `_SYSTEM/SYS` em `.vscode/settings.json`; portas publicadas em todas as interfaces, não só em loopback (o sentai usa `127.0.0.1`).
- 🟠 jQuery 3.4.1 tem CVE-2020-11022 e CVE-2020-11023, corrigidas na 3.5.0. Os vendors são copiados à mão e não têm inventário.
- 🟡 O SSN é exibido e editável sem nenhuma restrição. Num app que fala em "empoderar o paciente", o tratamento de PHI precisa ser explícito.

### Correção funcional

- 🔴 **Índices fixos no FHIR.** O SSN sai de `identifier[2]` (`myFHIR.js:77, 291`), e o código também usa `name[0].given[0]` e `address[0].line[0]`. Um paciente sem esses elementos quebra o formulário, e um identifier em outra ordem grava o SSN no identificador errado. O certo é buscar pelo `system` `http://hl7.org/fhir/sid/us-ssn`.
- 🟠 `bundle.entry.forEach` sem checar se existe: `total = 0` lança erro em Immunization, vital signs e laboratório. Só Allergy tem a checagem.
- 🟠 **Sem paginação.** A busca de pacientes traz uma página (100 por padrão) e ignora `link[next]`. O filtro da lista é feito no cliente, sobre essa página.
- 🟠 Lab sem `valueQuantity` quebra a tabela. O gráfico chama `new Chart` a cada busca sem `destroy()`, e os gráficos se sobrepõem.
- 🟠 Os erros são engolidos. O `Dispatch` captura a exceção e devolve `[]` com HTTP 200, e o frontend só usa `console.log`. A rota `/` aponta para `Test`, que não existe.
- 🟡 Código morto: `jsonfile` em `labresult.js`, `PackageSample.*`, `fhirtemplate.Setup` (sobra do template e fora do `module.xml`).

### Arquitetura e manutenção

- 🟠 Duas formas de acesso (fhir.js e SQL próprio) e **dois caminhos de instalação divergentes**. O Docker publica em `/csp/user/fhirUI` e cria o `/fhir/api` à mão; o IPM publica em `/fhir/portal` com outras regras de autenticação. Nenhum deles é testado.
- 🟠 O SQL depende do nome físico `HSFHIR_X0001_*`, que muda com a estratégia de armazenamento e com o número da instância do endpoint. Já quebrou uma vez nesta migração. O IRIS atual oferece o **FHIR SQL Builder** e `JSON_TABLE`, que tornam `GetJSON`, `GetProp` e `GetAtJSON` dispensáveis.
- 🟡 fhir.js está sem manutenção há anos, e Chart.js 2.8 está três versões major atrás. São 11 MB de vendor versionados, incluindo 60 locales do flatpickr e fontes completas.
- 🟡 Os 17 MB de dados Synthea vêm sem script de regeneração atualizado (`synthea-loader` usa uma imagem de 2020).

### Qualidade, testes e CI

- 🔴 Não há nenhum teste: nem `%UnitTest`, nem e2e, nem smoke test do build.
- 🟠 O único workflow de CI baixa e roda um shell script de terceiros a cada push (`objectscript-quality`), sem fixar a versão: é uma exposição na cadeia de suprimentos. Também não há CI que builde a imagem.

### Documentação e experiência

- 🟠 O README fala em `docker-compose` v1, o README-JP está desatualizado, o `dev.md` usa caminhos antigos e a demo pública citada no artigo está fora do ar desde 2022 (há um comentário de leitor pedindo a volta).
- 🟡 Sem acessibilidade básica: a lista usa `div` com `onclick` e o gráfico não tem alternativa textual. Interface só em inglês.

### Layout e UX

Avaliado em screenshots reais do container 2026.2 (Chrome, 1440×900 e 390×844) e nas imagens do README.

- 🔴 **Mobile estoura na horizontal a 390px.** A barra de busca, o botão de recarregar e os itens da lista ficam cortados na borda direita. Os detalhes do paciente só aparecem por um sidebar escondido, sem indicação visual.
- 🟠 **O prontuário parece um formulário de cadastro.** O conteúdo principal é um formulário editável e vazio ("Choose..."), mesmo antes de selecionar um paciente. Falta um estado vazio ("Selecione um paciente") e um cabeçalho de resumo (nome, idade, sexo, alertas de alergia), com a edição num modo ou modal separado.
- 🟠 **Os dados clínicos ficam escondidos.** Os quatro blocos começam recolhidos no acordeão, então o médico precisa de 4 cliques para ver o que importa. Seria melhor usar cards ou abas com os resultados mais recentes visíveis.
- 🟠 **As tabelas mostram os dados crus.** Datas em ISO com fuso (`2014-09-03T01:12:15+00:00`), valores sem arredondamento (`6.7188`), exames repetidos sem agrupamento por data, nomes LOINC longos e nenhuma faixa de referência ou destaque de valor alterado.
- 🟠 **O gráfico está desconectado do prontuário.** Ele abre em outra aba, mostra os dados do paciente em inputs readonly, começa com uma área vazia até clicar em "Search" (poderia renderizar ao trocar o exame), não tem link de volta e não mostra unidade nem faixa de referência. Ficaria melhor inline, dentro do bloco Laboratory.
- 🟡 **A lista ajuda pouco.** Ela mostra os nomes Synthea com sufixos numéricos (`Jorge203 Rosado690`) e o ID FHIR como informação secundária, onde idade e sexo seriam mais úteis. A busca não tem feedback de "nenhum resultado".
- 🟡 **Identidade visual datada.** O logo ainda é "IRIS Data Platform", e o loader do Pace fica girando no canto. Não há cabeçalho com o nome do app nem o usuário logado, que passa a ser necessário com a tela de login do E2. Também não há modo escuro.

## 5. O que está bom e vale preservar

- A proposta didática: cada artigo corresponde a um trecho pequeno e legível de código. As melhorias devem manter o projeto **fácil de ler como exemplo**, sem virar um framework.
- O modal "FHIR Data Source", que mostra o JSON bruto, é um ótimo recurso de transparência e de ensino.
- Os dados Synthea já incluem Condition, MedicationRequest, Encounter, CarePlan, Procedure e DiagnosticReport, que ainda não são exibidos. Dá para evoluir o produto sem nova carga.
- O pacote IPM tem distribuição real, via `iris-fhir-template`.

## 6. Plano

A iniciativa e os épicos estão em `initiative-modernizacao.md` e `tickets.toml`, nesta pasta, prontos para `bmad-ticket` (inception de cada épico em stories) e `bmad-build`.
