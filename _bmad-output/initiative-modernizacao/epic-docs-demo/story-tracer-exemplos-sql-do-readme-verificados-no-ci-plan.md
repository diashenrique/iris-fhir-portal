---
title: 'Tracer: exemplos SQL do README verificados no CI'
type: 'chore'
ticket: '1'
created: '2026-10-07'
status: done
baseline_revision: '2012f9f8050662fe54b85fd1ceb4755f7ac3702f'
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

**Problem:** O README não mostra como o portal lê os dados nem as consultas SQL atuais. O `misc/sql/example.sql` usa ids fixos (Patient/1, Observation/16) que não existem num build novo. Nada garante que os exemplos rodam.

**Approach:**
- **README:** ganha "How the portal reads FHIR data", com as três formas (fhir.js, SQL da `/fhir/api`, `$everything`) e as duas consultas da `/fhir/api`, com uma subconsulta no lugar do `?`.
- **`example.sql`:** passa ao mesmo contrato (esquema X0001, subconsultas).
- **Script:** `scripts/check-readme-sql.sh` executa cada bloco sql do README e do README-JP e cada instrução do `example.sql` no FHIRSERVER, percorrendo as linhas, e falha com SQLCODE negativo ou erro de leitura.
- **CI:** o passo "Documentation SQL examples" roda nas duas pernas.

</frozen-after-approval>

## Implementation Notes

- Resposta à incógnita da entrada: o script segue o padrão do `check-readonly.sh`.
  - O Node extrai as instruções. Cada uma vira uma linha ObjectScript que faz `%ExecDirect`, percorre as linhas com `%Next(.sc)` (as funções JSON rodam na leitura) e imprime o SQLCODE e o erro de leitura.
  - O script confere que cada instrução produziu um resultado.
  - O esquema X0001 na perna IPM é provado pelo próprio CI.
- Verificado:
  - 8 exemplos (2 do README e 6 do `example.sql`) passam.
  - Trocar a tabela de um bloco do README por `HSFHIR_X0001_S.NoSuchTable` faz o script falhar (exit 1).

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
