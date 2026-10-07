---
title: 'Tracer: manifesto npm, cópia para o fhirUI e check no CI, com o jQuery 3.7.1'
type: 'chore'
ticket: '1'
created: '2026-10-07'
status: done
baseline_revision: '89d487344e393a945f12b4f26c83d864491971e8'
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

**Problem:** As bibliotecas do `fhirUI` são cópias manuais sem versão registrada; o jQuery 3.4.1 tem a CVE-2020-11022 e a CVE-2020-11023.

**Approach:** `vendor/` na raiz com `package.json` (dependências e o mapa `vendorFiles`), lockfile e `sync.mjs`, que copia do `node_modules` byte a byte e, com `--check`, falha quando um arquivo difere ou quando uma pasta gerenciada tem arquivo fora do mapa. Um job `vendor` no CI roda `npm ci` e o check. O jQuery 3.7.1 é a primeira biblioteca.

</frozen-after-approval>

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total.
- `.gitattributes`: `fhirUI/assets/vendor/** -text`. Com `core.autocrlf=true` no Windows, o git reescreveria as quebras de linha, e a comparação byte a byte falharia.
- O sync apagou `jquery.js`, `jquery.slim.js` e `jquery.slim.min.js`, que nenhuma página carrega.
- Verificado:
  - O check falhava com os arquivos antigos e passa depois do sync.
  - Um `//x` acrescentado ao `jquery.min.js` faz o check falhar.
  - O container servindo o checkout (depois de `docker compose restart`, por causa do cache gzip) passa o smoke inteiro e os 25 testes e2e.

## Review Triage Log

Revisão `quick` do implementador: 0 achados. O check foi testado nos dois sentidos.
