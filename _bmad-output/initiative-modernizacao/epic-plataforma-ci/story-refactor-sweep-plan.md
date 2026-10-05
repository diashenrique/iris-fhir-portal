---
title: 'Refactor sweep'
type: 'refactor'
ticket: '6'
created: '2026-10-05'
status: 'built'
baseline_revision: '76c8fca3961013a6cba90f0dde3abaa6c7eb6a99'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** As stories 1.1 a 1.5 deixaram duas pendências, apontadas pelas anotações do CI do PR #10 (run 37303290055): `actions/checkout@v4` e `actions/setup-node@v4` rodam em Node.js 20, que está obsoleto e é forçado a rodar em Node 24; e o rótulo `ubuntu-latest` migra para Ubuntu 26 a partir de 2026-10-19, o que mudaria o runner sem aviso. Nas revisões e nos planos, não ficou nenhum outro item de limpeza (`deferred-work.md` só tem o cache gzip do Web Gateway, que é do epic-docs-demo).

**Approach:** Só limpeza. Atualizar `checkout`, `setup-node` e `upload-artifact` para a v7 (Node 24; os inputs usados não mudaram) e fixar o runner em `ubuntu-24.04`, para que a única variável proposital do CI continue sendo a imagem `latest-cd` do IRIS.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: 4 linhas no `ci.yml`. Risco baixo: o CI do PR prova a mudança.

- Arquivo: `.github/workflows/ci.yml` — `actions/checkout`, `actions/setup-node` e `actions/upload-artifact` de v4 para v7 (todas `using: node24`); `runs-on: ubuntu-24.04`.
- Conferido antes de subir duas versões major: os inputs usados (`node-version`, `cache`, `cache-dependency-path`; `name`, `path`, `if-no-files-found`) existem na v7. A quebra da v7 é interna (ESM), e a da v6 do setup-node é o cache automático quando há `packageManager` no package.json, que não usamos; o `cache: npm` explícito continua.
- Sem outros itens: as notas e revisões das stories 1.1 a 1.5 não deixaram limpeza pendente.

## Verification

**Commands:**
- CI do PR -- expected: verde e sem a anotação de Node.js 20 nem a de migração do `ubuntu-latest`.

## Review Triage Log

Revisão `quick`, passada 1: nenhum achado. O revisor confirmou as tags v7 (`git ls-remote`), `using: node24` e os inputs; e confirmou que `deferred-work.md` só tem o cache gzip, atribuído ao epic-docs-demo.
