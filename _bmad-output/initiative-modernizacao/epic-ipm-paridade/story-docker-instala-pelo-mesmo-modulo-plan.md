---
title: 'Docker instala pelo mesmo módulo'
type: 'refactor'
ticket: '3'
created: '2026-10-06'
status: 'built'
baseline_revision: 'd609beeb646cbfa4c6778f9bebb832772a4c88d7'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/epic-ipm-paridade/story-tracer-modulo-1-1-0-instala-o-portal-completo-e-o-ci-prova-p-plan.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O Docker configura o portal pelo `iris.script` (web apps, papel, GRANT, grupo de sessão, usuário), um segundo caminho que pode divergir da classe instaladora do módulo.

**Approach:** O Dockerfile baixa o instalador do IPM; o `iris.script` instala o IPM (mapeado globalmente), mantém o servidor FHIR e a carga de dados e termina com `zpm "load /home/irisowner/dev -v -DDemoUser=1 -DPortalPath=/home/irisowner/dev/fhirUI/"`. O módulo ganha o parâmetro `PortalPath` (vazio: a cópia do `fhirUI` em `${cspdir}fhir/portal/`), para o Docker continuar servindo o checkout montado.

## Boundaries & Constraints

**Always:** os mesmos valores de configuração e a mesma URL; edições no `fhirUI` continuam valendo depois de um `docker compose restart`.

**Never:** mudar o acesso SQL do `/fhir/api` (entrada 4).

</frozen-after-approval>

## Verification

- `git grep -n "Security.Applications\|Security.Roles\|GRANT" -- iris.script` → nada.
- Rebuild do zero, smoke, e2e e checagem de alertas.
- CI: as duas pernas verdes.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total.
- O Dockerfile baixa o instalador do IPM no mesmo RUN do build. O `iris.script` instala o IPM, mantém o servidor FHIR e a carga de dados e termina com `zpm "enable -map -globally"` e `zpm load` do checkout.
- Achado: o `enable -map -globally` só alcança namespaces que já existem. Rodado antes de criar o FHIRSERVER, o `zpm load` não rodava (o IPM mostrava só a lista de namespaces), e o build ficava verde sem portal. Por isso o mapeamento roda depois do FHIRSERVER, e o build agora falha se o log do `iris.script` não tiver "fhir-portal: configured".
- Verificado: rebuild do zero com "fhir-portal: configured" no log do build; smoke com todas as checagens passando, e2e 25/25 e 0 alertas. `git grep -n "Security.Applications\|Security.Roles\|GRANT" -- iris.script` não encontra nada, e o `Path` do `/fhir/portal` é `/home/irisowner/dev/fhirUI/`.

## Plan Change Log

## Review Triage Log

Revisão `quick` (do próprio implementador, diff de 3 arquivos), passada 1: 0 high, 0 medium, 1 low.
- low, patch: o build não detectava um `zpm load` sem efeito; agora o RUN checa a linha de sucesso do instalador.
