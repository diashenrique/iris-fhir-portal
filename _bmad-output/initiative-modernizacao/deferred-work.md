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
