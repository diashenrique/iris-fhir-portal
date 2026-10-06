---
title: 'Spike: consultas do Dispatch e esquema do endpoint'
type: 'chore'
ticket: '6'
created: '2026-10-05'
status: done
baseline_revision: 'a4c48b2c0ceaa11c2ab856b26a1736827a621ed4'
route: 'oneshot'
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

**Problem:** O `Dispatch` fixa o esquema `HSFHIR_X0001` e extrai os dados do JSON com as funções do artigo 4 (`GetJSON`, `GetProp`, `GetAtJSON`). Não se sabe se `JSON_TABLE` ou o FHIR SQL Builder seriam melhores, nem como obter o esquema do endpoint `/fhir/r4` com os papéis mínimos do `/fhir/api`.

**Approach:** Medir no IRIS 2026.2 os três caminhos nas consultas do `Dispatch` (resultado, tempo, legibilidade como exemplo), descobrir a API que devolve as tabelas do endpoint e testá-la como `fhirportal` com os papéis do `/fhir/api`. A recomendação, com a evidência, fica neste plano para a entrada 7.

</frozen-after-approval>

## Resposta do spike

**Recomendação para a entrada 7:** manter as funções do artigo 4 para extrair os campos do JSON, filtrar antes pelo paciente na **tabela de busca** do FHIR (`patient_Reference`, indexada) e obter os nomes das tabelas da **estratégia do endpoint** em tempo de execução.

### Esquema do endpoint

```objectscript
Set strategy = ##class(HS.FHIRServer.API.InteractionsStrategy).GetStrategyForEndpoint("/fhir/r4")
Set resourceTable = strategy.GetResourceTable("Observation")   // HSFHIR_X0001_R.Rsrc
Set searchTable = strategy.GetSearchTable("Observation")       // HSFHIR_X0001_S.Observation
```

`GetResourceTable(type)`, `GetSearchTable(type)` e `GetResourceClassesPackage()` são métodos de instância da `HS.FHIRServer.Storage.JsonAdvSQL.InteractionsStrategy`. Testado num app REST temporário com `AutheEnabled=32` e `MatchRoles=":%HS_DB_FHIRSERVER:FHIRPortalAPI"`, chamado como `fhirportal` por Basic auth. O código e o setup estão em `spike-consultas/Rest.cls` e `spike-consultas/setup.script` (rota `/spike/schema`). Ele devolveu `user` = `fhirportal`, `roles` = `%HS_DB_FHIRSERVER,FHIRPortalAPI`, as duas tabelas e a contagem na tabela de busca (104 Observations do `Patient/4`, SQLCODE 0). O app e a classe foram removidos depois.

### Consultas (paciente `Patient/4`, exame `718-7`, 2.628 Observations, média de 5 execuções)

Script reproduzível com todas as consultas: `spike-consultas/queries.script` (rodar no FHIRSERVER). Cada caminho devolveu o mesmo resultado que o de hoje em cada rota (mesma soma de verificação das linhas).

| Caminho | patient/:id | laboptions | lab/:code | Observação |
|---|---|---|---|---|
| Funções do artigo 4 sobre `R.Rsrc` (hoje) | 0,012 s | 0,088 s | 0,091 s | varre todas as Observations |
| `JSON_TABLE` sobre `R.Rsrc` | — | 2,07 s | 2,06 s | cerca de 25 vezes mais lento; com `DISTINCT`/`ORDER BY` sobre colunas largas (`VARCHAR(500)`) dá SQLCODE -490 ("maximum subscript length"), e foi preciso usar colunas menores e `GROUP BY` |
| Funções + `S.Observation` (`patient_Reference = ?`, join por `Key`) | — | **0,017 s** | **0,003 s** | 5 a 30 vezes mais rápido que hoje; mostra os dois esquemas do FHIR (R = recursos, S = parâmetros de busca) |
| `JSON_TABLE` + `S.Observation` | — | 0,094 s | 0,096 s | mais lento que as funções com o mesmo filtro |
| FHIR SQL Builder | — | — | — | não medido: `SELECT COUNT(*) FROM %Dictionary.CompiledClass WHERE Name %STARTSWITH 'HS.FHIRSQL.'` devolve 0 na instância, e o recurso exige configurar análise, transformação e projeção fora do código |

A rota `patient/:id` não usa as funções nem a tabela de busca (lê o `ResourceString` pela chave), então só ganha a resolução do nome da tabela.

Fatos para a consulta nova: `R.Rsrc` tem 6.546 linhas e 6.546 `Key` distintos, e `S.Observation` tem 2.628 e 2.628, então o join por `Key` não duplica linhas. O `Key` já inclui o tipo (`Observation/94`), mas o filtro `r.ResourceType = 'Observation'` continua na consulta. O `patient_Reference` guarda `Patient/<id>` (amostra: `Patient/10`), o mesmo valor que o `Dispatch` já monta hoje.

Consulta recomendada para as opções (o `laboratory` continua vindo do JSON, porque a categoria é multivalorada na busca):

```sql
SELECT DISTINCT
  GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'code'),'code') AS testCode,
  GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'display'),'display') AS testName
FROM <searchTable> s JOIN <resourceTable> r ON r.Key = s.Key
WHERE s.patient_Reference = ? AND r.ResourceType = 'Observation' AND r.Deleted = 0
  AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'category'),'code'),0),'code'),'code') = 'laboratory'
ORDER BY testName
```

### Privilégios do papel `FHIRPortalAPI`

Medido com a rota `/spike/privileges` (`spike-consultas/Rest.cls`), como `fhirportal` com os papéis do `/fhir/api`:

| SQL dinâmico | SQLCODE |
|---|---|
| `SELECT ... FROM HSFHIR_X0001_R.Rsrc` | 0 |
| `SELECT ... FROM HSFHIR_X0001_S.Patient` | 0 |
| `UPDATE HSFHIR_X0001_R.Rsrc ... WHERE 1 = 0` | 100 (permitido) |
| `DELETE FROM HSFHIR_X0001_S.Patient WHERE 1 = 0` | 100 (permitido) |

- O acesso às tabelas FHIR, **inclusive escrita**, vem do `%HS_DB_FHIRSERVER`. O `GRANT SELECT ON HSFHIR_X0001_R.Rsrc` da story 2.3 não restringe nada (sem ele o smoke passa inteiro), e o comentário do `iris.script`, que diz "read ... nothing else", não descreve o acesso real.
- O `GRANT EXECUTE` nas funções `SQLUser.GetJSON`, `GetProp` e `GetAtJSON` é necessário: sem ele, o smoke falha nas rotas de laboratório.
- O que protege as tabelas é o código do `Dispatch`, que só lê e é parametrizado. Restringir de fato exigiria SQL com checagem de privilégio ou um papel de banco próprio; isso foi registrado em `deferred-work.md`.
- Decision (autonomia): a entrada 7 remove o GRANT de SELECT redundante (e com ele o último esquema fixo do `iris.script`), mantém o GRANT EXECUTE e corrige o comentário para descrever o acesso real.

### Para a entrada 7

- Resolver as tabelas uma vez por requisição com o código acima, para `Patient` e `Observation`.
- `getPatient` usa `GetResourceTable("Patient")` e aceita um Patient sem `name`.
- Deleted ficam com `ResourceString` nulo, e o filtro `Deleted = 0` continua necessário.

## Implementation Notes

Rota oneshot: investigação; o resultado é este plano. Os experimentos alteraram só o container (app `/spike`, classe `Spike.Rest` e GRANTs revogados e refeitos) e foram desfeitos; o smoke passa depois disso.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 3 medium, 4 low, 0 false.

- medium → patch — a rota `patient/:id` e a `lab/:code` nos caminhos com tabela de busca não tinham medição: medidas pelo `queries.script`.
- medium → patch — o SQL testado não estava registrado: `spike-consultas/queries.script` tem todas as consultas e o cronômetro.
- medium → patch — remover o GRANT apoiaria o acesso num privilégio não documentado: medido (o `%HS_DB_FHIRSERVER` dá leitura e escrita), documentado e registrado como endurecimento em `deferred-work.md`; a decisão de remover o GRANT redundante e corrigir o comentário ficou nas Notes acima.
- low → patch — o FHIR SQL Builder não tinha resultado nem método: a consulta ao dicionário (0 classes) está registrada.
- low → patch — a evidência do teste como `fhirportal` não era reproduzível: `Rest.cls` e `setup.script` versionados.
- low → patch — o formato do `patient_Reference` não estava dito: é `Patient/<id>`.
- low → patch — a consulta recomendada tirava o `ResourceType = 'Observation'`: o filtro voltou, e a unicidade de `Key` foi medida.
