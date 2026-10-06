---
title: 'Dispatch com esquema do endpoint, status HTTP corretos e consultas do spike'
type: 'refactor'
ticket: '7'
created: '2026-10-05'
status: done
baseline_revision: 'e2d0bb819fce6aec981eac6f1ec583660ec2e06b'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/epic-robustez-fhir/spike-spike-consultas-do-dispatch-e-esquema-do-endpoint-plan.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O `Dispatch` fixa o esquema `HSFHIR_X0001`, varre todas as Observations a cada chamada, devolve `[]` com HTTP 200 quando o SQL falha (o que esconde quebras e tira o sentido das sondas de injeção do smoke), aceita qualquer texto como id ou código, quebra num Patient sem `name` e tem uma rota `/` para um método que não existe. O `iris.script` ainda fixa o esquema num GRANT que, como o spike mediu, não restringe nada.

**Approach:** Aplicar a recomendação do spike 3.6: as tabelas vêm da estratégia do endpoint `/fhir/r4` em cada requisição; as funções do artigo 4 continuam extraindo os campos, com o filtro por paciente na tabela de busca. Ids e códigos inválidos respondem 400; falhas de SQL respondem 500 com um JSON `{"error": ...}` genérico e a exceção vai para o log de erros do IRIS; a rota `/` sai; um Patient sem `name` devolve `name` vazio. No `iris.script`, sai o GRANT de SELECT redundante, fica o GRANT EXECUTE, e o comentário passa a descrever o acesso real. O smoke passa a aceitar nas sondas de injeção só 400 ou 200 com `[]` e ganha uma checagem de 400 para id inválido.

## Boundaries & Constraints

**Always:** manter o formato das respostas de sucesso (`[{name, birthdate}]`, `[{code, name}]`, `[{testName, date, value}]`), porque o `labresult.js` as consome; manter as consultas parametrizadas; manter `User.SQLvar` e o `GRANT EXECUTE`.

**Never:** mudar o `labresult.js` (entrada 8); endurecer o acesso SQL além do que o spike decidiu (registrado em `deferred-work.md`); `module.xml` (epic-ipm-paridade).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paciente com exames | `GET /patient/:id`, `/laboptions/:id`, `/patient/:id/lab/:code` | 200 com os mesmos dados de hoje | — |
| Patient sem `name` | `GET /patient/:id` de um Patient mínimo | 200 `[{"name":"","birthdate":...}]` | — |
| Id ou código inválido | id ou código fora de `[A-Za-z0-9.-]{1,64}` (ex.: `1 OR 1=1`, `x' OR '1'='1`) | 400 `{"error":"invalid ..."}` | — |
| Paciente sem exames | id válido sem Observations de laboratório | 200 `[]` | — |
| Falha de SQL | tabela inexistente (mutação) | 500 `{"error":"query failed"}` | exceção logada com `Log()` |
| Rota `/` | `GET /fhir/api/` | 404 da camada REST | — |

</frozen-after-approval>

## Code Map

- `src/diashenrique/fhir/portal/Dispatch.cls` -- 3 métodos com `Try/Catch` que escrevem `[]` e sempre retornam `$$$OK`; SQL com `HSFHIR_X0001_R.Rsrc` nas linhas 28, 76 e 128; `getPatient` lê `patient.name.%Get(0)` sem checar; a rota `/` vai para `Test`, que não existe.
- Spike (context) -- seções "Esquema do endpoint" (`GetStrategyForEndpoint("/fhir/r4")`, `GetResourceTable`, `GetSearchTable`), "Consultas" (consulta recomendada e `spike-consultas/queries.script`, variantes `functions+search`) e "Privilégios".
- `iris.script` -- linhas 32–37: comentário "read the FHIR resource table ... nothing else", `GRANT SELECT ON HSFHIR_X0001_R.Rsrc` (sai) e `GRANT EXECUTE` (fica).
- `scripts/smoke.sh` -- sondas de injeção num laço que exige `[]`; `session`, `session_code` e `non_empty_array` para reusar.
- `fhirUI/resources/js/labresult.js` -- consome as três rotas com `$.getJSON`; não muda aqui.

## Tasks & Acceptance

**Execution:**
- [x] `src/diashenrique/fhir/portal/Dispatch.cls` -- helper que resolve as tabelas pela estratégia; helpers de resposta de erro (400 e 500 com JSON); validação de id e código; as três consultas no formato do spike (`functions+search` para opções e laboratório, `GetResourceTable("Patient")` para o paciente); `name` vazio quando falta; sem a rota `/`.
- [x] `iris.script` -- remover o GRANT de SELECT, manter o EXECUTE e reescrever o comentário: o acesso às tabelas vem do `%HS_DB_FHIRSERVER` (inclusive escrita, ver `deferred-work.md`), e o `FHIRPortalAPI` só acrescenta o EXECUTE das funções.
- [x] `scripts/smoke.sh` -- sondas de injeção aceitam 400 ou 200 com `[]`, e falham em 5xx ou linhas; checagem de 400 para `/fhir/api/patient/1'x`; checagem de 404 para `/fhir/api/`.

**Acceptance Criteria:**
- Given o container recém-construído, when o smoke e o e2e rodam, then passam, e `git grep HSFHIR_X0001 -- src iris.script` não encontra nada.
- Given o nome da tabela trocado por um inexistente no `Dispatch` (mutação), when o smoke roda, then as rotas respondem 500 e o smoke falha.

## Design Notes

As respostas de erro saem por `%response.Status` mais um JSON curto; os detalhes ficam no log de erros do IRIS (`oException.Log()`), para não expor SQL ao cliente. A validação de id segue o padrão de id do FHIR (`[A-Za-z0-9\-\.]{1,64}`); a de código usa o mesmo conjunto, que cobre os códigos LOINC.

## Verification

**Commands:**
- Rebuild do zero, `bash scripts/smoke.sh` e `cd e2e && npx playwright test` -- expected: tudo passa.
- `git grep HSFHIR_X0001 -- src iris.script` -- expected: nada.
- Mutação (tabela inexistente) -- expected: smoke falha com 500.
- CI do PR -- expected: verde.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total concedida pelo usuário (2026-10-05).
- Implementado: `Dispatch` com `Strategy()` (endpoint no parâmetro `FHIRENDPOINT`), `IsValidId`, `BadRequest`, `ServerError` (`Log()` + 500) e `Execute` (lança em erro de prepare ou SQLCODE < 0); o comentário de estratégia do `iris.script` também deixou de citar o esquema.
- Verificado: as três rotas devolvem o mesmo JSON (md5) que o `Dispatch` anterior para os pacientes 4, 5 e 10; Patient sem `name` → `[{"name":"","birthdate":"2000-01-01"}]`; mutação `NoSuch.Rsrc` nas três consultas → 500 `{"error":"query failed"}`, o smoke falha em 4 checagens e o `^ERRORS` do FHIRSERVER registra o SQLCODE -30; rebuild com `--no-cache`, smoke 22/22 e e2e 8/8; `git grep HSFHIR_X0001 -- src iris.script` vazio. CI do PR ainda não rodou (sem commit).

- Depois da revisão (patches do mesmo implementador): `CheckFetch` depois de cada laço (um erro no `%Next` vira 500); `GetAtJSON` devolve `""` quando a posição não existe; o código de exame é validado como texto de 1 a 64 caracteres sem caracteres de controle (o id continua no padrão FHIR); `Strategy()` exige a JsonAdvSQL e falha com mensagem clara; no smoke, as sondas de id esperam 400, e a de código e `patient/does-not-exist` esperam 200 com `[]`.
- Reverificado do meu lado com rebuild do zero: smoke todo PASS, e2e com 8 testes passando, 0 alertas, `git grep HSFHIR_X0001 -- src iris.script` vazio.
- Achado do implementador: `<LICENSE LIMIT EXCEEDED>` depois de muitas rodadas, porque as sessões de login dos testes ficam abertas; registrado em `deferred-work.md` para o sweep (3.9).

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 2 medium, 2 low, 0 false, 1 verificação pendente.

- medium → patch — erro durante o `%Next` (funções SQL por linha) respondia 200 com dados parciais: `CheckFetch` lança e cai no 500; o `GetAtJSON` deixava `result` indefinido em array vazio: corrigido.
- medium → patch — a validação de código rejeitava códigos que o próprio `getOptions` oferece: código validado como texto de 1 a 64 caracteres sem controle.
- low → patch — `Strategy()` declarava a classe base, mas só a JsonAdvSQL tem os métodos: retorno JsonAdvSQL e erro claro.
- low → patch — o ramo 200 com `[]` ficou sem teste: `patient/does-not-exist` e a sonda de código esperam 200 com `[]`.
- verificação pendente — CI do PR.
