---
title: 'Portas em loopback e limpeza das sobras de template'
type: 'chore'
ticket: '5'
created: '2026-10-05'
status: 'built'
baseline_revision: '15c5d2325e3e6667bb9419bd89e967e93bf01fb5'
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

**Problem:** O `docker-compose.yml` publica as portas 32782/32783 em todas as interfaces, embora a instância use `_SYSTEM/SYS` e o usuário de demo. `src/PackageSample/` e `src/fhirtemplate/` são sobras de template, carregadas só pelo `LoadDir`. O `.vscode/launch.json` aponta para `PackageSample`, e o link "FHIR UI Demo" do `.vscode/settings.json` leva a uma página que não existe.

**Approach:** Ligar as portas a `127.0.0.1`; remover as duas pastas; tirar a configuração "ObjectScript Debug Class" do `launch.json` (o attach fica) e trocar o link do `settings.json` para `/csp/user/fhirUI/patientlist.html`. O README-JP fica para o epic-docs-demo, e o `_SYSTEM/SYS` do `.vscode` fica para o épico de segurança.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: cerca de 10 linhas alteradas e duas pastas removidas. Risco baixo, com o CI (build e smoke) como rede de segurança.

- Arquivos: `docker-compose.yml` (portas em `127.0.0.1`), `src/PackageSample/` e `src/fhirtemplate/` removidos, `.vscode/launch.json` só com o attach, `.vscode/settings.json` com o link "FHIR Portal" para `patientlist.html`.
- Verificado com rebuild do zero (`--no-cache`): build com exit 0; 0 ocorrências de PackageSample ou fhirtemplate no log (só `User.SQLvar` e `diashenrique.fhir.portal.Dispatch` compilados); `docker compose ps` mostra `127.0.0.1:32782->1972` e `127.0.0.1:32783->52773`; smoke com 8 PASS.

## Verification

**Commands:**
- `docker compose up -d` e `docker compose ps` -- expected: portas `127.0.0.1:32782` e `127.0.0.1:32783`.
- `docker compose build --progress=plain` -- expected: o log não lista `PackageSample` nem `fhirtemplate`.
- `bash scripts/smoke.sh` e o CI do PR -- expected: verdes.

## Review Triage Log

Revisão `quick`, passada 1: nenhum achado. O revisor confirmou que CI, smoke e SQLTools conectam via localhost; que só README-JP (adiado ao epic-docs-demo) cita as classes removidas; e que o `launch.json` é JSON válido.
