- source_plan: `_bmad-output/initiative-modernizacao/epic-plataforma-ci/story-e2e-playwright-do-tracer-lista-detalhe-edicao-e-grafico-plan.md`
  summary: O Web Gateway do container guarda em cache a versão gzip dos arquivos estáticos do fhirUI (Expires de 1 hora), então editar o JS ou o HTML com o container no ar não chega ao navegador até reiniciar o container ou o cache expirar.
  evidence: Com o myFHIR.js alterado no disco, `curl` sem compressão recebia a versão nova e `curl --compressed` a antiga; o Chromium seguia enviando Basic auth até `docker compose restart`. Não afeta o CI, que builda do zero. Candidato para o epic-docs-demo (nota no dev.md) ou para a configuração do web app em dev.
- source_plan: `_bmad-output/initiative-modernizacao/epic-seguranca/story-tracer-login-simples-sessao-e-logout-de-ponta-a-ponta-plan.md`
  summary: Os outros `.catch` do myFHIR.js (paciente, imunização, alergia, sinais vitais e laboratório) testam `err.status`, que nunca existe, porque o adapter jQuery do fhir.js rejeita com `{ error: jqXHR, data: jqXHR }`; os erros dessas buscas nunca são tratados nem mostrados.
  evidence: `fhirUI/jqFhir.js` linha 81 (`ret.reject({error: err, data: err, config: args})`); o redirect de sessão da story 2.2 só funcionou depois de ler `err.error.status`, o que o e2e "page kept open" provou. É do epic-robustez-fhir (erros visíveis).
- source_plan: `_bmad-output/initiative-modernizacao/epic-seguranca/story-fhir-api-com-papel-minimo-sem-cors-aberto-plan.md`
  summary: As sondas de SQL injection do smoke passam sempre que o `/fhir/api` responde `[]`, e o `Dispatch` responde `[]` com 200 também quando o SQL falha, então uma mudança que quebre a query em vez de vazar linhas não seria detectada.
  evidence: Os três métodos do `Dispatch.cls` capturam a exceção, escrevem o array vazio e retornam `$$OK`. Quando o epic-robustez-fhir fizer o `Dispatch` responder 4xx/5xx em erro, as sondas passam a distinguir "sem resultado" de "erro".
- source_plan: `_bmad-output/initiative-modernizacao/epic-seguranca/story-fhir-api-com-papel-minimo-sem-cors-aberto-plan.md`
  summary: A rota `<Route Url="/" Method="GET" Call="Test"/>` do `Dispatch.cls` aponta para um método que não existe, então `GET /fhir/api/` gera `<METHOD DOES NOT EXIST>`.
  evidence: Nenhum método `Test` na classe; a avaliação (§4 Correção funcional) já atribui isso ao epic-robustez-fhir.
- source_plan: `_bmad-output/initiative-modernizacao/epic-robustez-fhir/spike-spike-consultas-do-dispatch-e-esquema-do-endpoint-plan.md`
  summary: O papel `%HS_DB_FHIRSERVER`, que o `/fhir/api` recebe, permite SQL dinâmico de leitura e escrita nas tabelas FHIR (UPDATE e DELETE com SQLCODE 100); o papel mínimo só restringe de fato o EXECUTE das funções.
  evidence: Rota `/spike/privileges` do `spike-consultas/Rest.cls`, rodando como `fhirportal` com `%HS_DB_FHIRSERVER,FHIRPortalAPI`. Hoje o código do `Dispatch` só lê e é parametrizado; endurecer pede SQL com checagem de privilégio ou um papel de banco próprio. Candidato ao epic-ipm-paridade, que declara os papéis no `module.xml`.
- source_plan: `_bmad-output/initiative-modernizacao/epic-robustez-fhir/story-dispatch-com-esquema-do-endpoint-status-http-corretos-e-cons-plan.md`
  summary: Os testes e2e que fazem login e não fazem logout deixam sessões do IRIS abertas por 15 minutos (Timeout 900); com rodadas repetidas, a instância Community chega a `<LICENSE LIMIT EXCEEDED>`.
  evidence: Visto pelo implementador da 3.7 ao rodar smoke e e2e várias vezes (`iris session` falhou; `docker restart` liberou). Só o tracer faz logout. Para o sweep do epic-robustez-fhir (3.9): logout ao fim de cada teste (afterEach no helper) e Timeout menor no grupo de sessão, se fizer sentido.
- source_plan: `_bmad-output/initiative-modernizacao/epic-ipm-paridade/story-tracer-modulo-1-1-0-instala-o-portal-completo-e-o-ci-prova-p-plan.md`
  summary: O `zpm "uninstall fhir-portal"` não desfaz o que a classe instaladora criou: ficam `/fhir/portal` e `/fhir/api` (apontando para classes e arquivos removidos), o papel `FHIRPortalAPI`, o usuário de demo e o grupo de sessão e o 8288 no `/fhir/r4`.
  evidence: Revisão quick da 4.2 (achado 4). O `module.xml` só tem o `<Invoke>` de Activate. Para o sweep (4.5): um `<Invoke>` de desinstalação que remove os dois web apps, e o README dizendo o que fica no `/fhir/r4`.
  status: resolvido na 4.5 (`Installer.Remove`, fase Unconfigure).
- source_plan: `_bmad-output/initiative-modernizacao/epic-prontuario-ampliado/story-cards-encounters-e-care-plans-plan.md`
  summary: O card de laboratório mostra todos os resultados agrupados por dia; num paciente com muitos exames, ele domina a página, agora que há oito cards.
  evidence: Captura a 1440px na 6.4 (o paciente 3 tem 34 resultados). O comportamento caberia no "Show all" compartilhado da 6.3 (os dias mais recentes à vista, o resto no histórico), mas muda o que o card mostra, então não é limpeza: fica como uma story nova (6.7 ou backlog), não no sweep da 6.6.
- source_plan: `_bmad-output/initiative-modernizacao/epic-docs-demo/story-capturas-reproduziveis-e-o-readme-do-portal-atual-plan.md`
  summary: No celular (390px), o botão "Reveal" do SSN, no resumo do paciente, encosta no campo e o cobre em parte.
  evidence: Captura `img/portal-mobile.png` da 7.2. Já existia antes dos épicos 6 e 7; é interface, não documentação, então não entra no sweep do epic-docs-demo. Cabe numa story do backlog (o input-group a 100% da largura abaixo de 576px).
