---
type: epic
title: "Prontuário que não quebra com dados FHIR reais"
parent: initiative-modernizacao
covers: [R3]
after: []
assignee: ""
risk: medium
status: in-progress
---

# Prontuário que não quebra com dados FHIR reais

## Description

O portal só funciona com o formato exato dos pacientes Synthea. Ele lê o SSN de `identifier[2]` e assume `name[0]`, `address[0]` e `valueQuantity`. Também quebra quando uma busca volta vazia, lê só a primeira página de resultados e empilha gráficos. Os erros não aparecem: o frontend lê `err.status`, que o adapter do fhir.js nunca preenche, e o `Dispatch` devolve `[]` com HTTP 200 quando o SQL falha. Este épico faz o portal aceitar recursos FHIR válidos mas diferentes do Synthea, mostra os erros ao usuário e faz o `Dispatch` responder com status HTTP corretos. O `Dispatch` também deixa de fixar o esquema físico `HSFHIR_X0001`, que é o que o epic-ipm-paridade espera daqui. Um spike decide entre manter as funções `GetJSON`, `GetProp` e `GetAtJSON` (o artigo 4) e adotar `JSON_TABLE` ou o FHIR SQL Builder.

## Outcome

Um paciente FHIR válido sem SSN, sem endereço, sem exames ou com mais de uma página de resultados aparece sem erro no portal, e um erro real chega ao usuário como mensagem. O sinal é o e2e de casos de borda verde no CI.

## Requirements

- B1 (R3): O SSN é lido e gravado pelo `identifier` com `system` `http://hl7.org/fhir/sid/us-ssn`, não por posição; sem SSN, o campo fica vazio, e salvar um valor cria o identifier. (avaliação §4 Correção funcional)
- B2 (R3): Um Patient sem `name`, `address`, `identifier`, `birthDate` ou `gender` abre nos detalhes sem erro, e salvar cria só as estruturas preenchidas. (avaliação §4 Correção funcional)
- B3 (R3): Uma busca sem resultados (nenhuma alergia, vacina, sinal vital ou exame) deixa a tabela com uma linha "No records", sem erro. (avaliação §4 Correção funcional)
- B4 (R3): A lista de pacientes e as buscas clínicas seguem `link[next]` e mostram todos os resultados. (avaliação §4 Correção funcional)
- B5 (R3): Observations sem `valueQuantity` (com `valueCodeableConcept`, `valueString` ou `component`) aparecem nas tabelas com o valor disponível, sem erro. (avaliação §4 Correção funcional)
- B6 (R3): O gráfico de laboratório destrói o anterior antes de desenhar outro, e o código morto `jsonfile` sai do `labresult.js`. (avaliação §4 Correção funcional)
- B7 (R3): Erros das buscas FHIR e do `/fhir/api` aparecem como mensagem (toast) nas duas páginas; o `Dispatch` responde 4xx a parâmetros inválidos e 5xx a falhas de SQL, e a rota `/` sem método sai. (avaliação §4; deferred-work.md, itens 2 a 4)
- B8 (R3): O `Dispatch` encontra o esquema SQL do endpoint `/fhir/r4` em vez de fixar `HSFHIR_X0001`, e as consultas seguem a abordagem escolhida no spike, sem perder o valor didático do artigo 4. (initiative tickets.toml, epic 4 `after`)

## Done when

1. O e2e de casos de borda (paciente mínimo, paciente sem registros clínicos, Observation sem `valueQuantity`, paciente com SSN fora da posição 2) passa no CI, e os testes do E1 e do E2 continuam verdes.
2. Com mais pacientes do que uma página (`_count` pequeno no teste), a lista mostra todos.
3. Um erro forçado na busca FHIR e no `/fhir/api` aparece como toast nas duas páginas; as sondas de SQL injection do smoke passam a distinguir `[]` de erro (5xx).
4. `git grep HSFHIR_X0001 -- src` não encontra nada, e o smoke passa.
5. CI verde em `master` com tudo isso.

## Boundaries

A lógica do portal: `fhirUI/resources/js/myFHIR.js`, `fhirUI/resources/js/labresult.js`, `src/diashenrique/fhir/portal/Dispatch.cls`, `src/User/SQLvar.cls` (se o spike mudar a abordagem) e os testes. Fora do escopo: layout, formatação de datas e a apresentação das tabelas (epic-layout-prontuario), troca de bibliotecas (epic-frontend-deps), `module.xml` e IPM (epic-ipm-paridade, que consome o B8), e a documentação e errata do artigo 4 (epic-docs-demo).

## References

- parent — `_bmad-output/initiative-modernizacao/initiative-modernizacao.md`, R3
- avaliação — `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`, §4 Correção funcional
- deferred — `_bmad-output/initiative-modernizacao/deferred-work.md` (catches do fhir.js, `[]` com 200 no `Dispatch`, rota `/` sem método; o cache gzip fica com o epic-docs-demo)
- épicos anteriores — `epic-plataforma-ci/` (CI, smoke, e2e) e `epic-seguranca/` (login, helpers `login` e `FHIR_JSON`, padrão de testes com criação e limpeza de recursos)

## Notes

- Decision (autonomia): o usuário concedeu autonomia total em 2026-10-05. A quebra e as escolhas deste épico são minhas e ficam registradas aqui.
- Unknown: se `JSON_TABLE` ou o FHIR SQL Builder do IRIS 2026.2 substituem bem as funções do artigo 4 e como descobrir o esquema do endpoint; o spike (entrada 6) responde antes da entrada 7.
