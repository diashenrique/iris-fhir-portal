---
title: 'Tracer: módulo 1.1.0 instala o portal completo e o CI prova pelo IPM'
type: 'feature'
ticket: '2'
created: '2026-10-06'
status: done
baseline_revision: '0a29e9a00d22091ee7d2be67949c27b0ef08d56d'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/epic-ipm-paridade/spike-spike-ipm-no-iris-2026-2-pacote-fhir-server-e-instalacao-do-plan.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O `module.xml` 1.0.3 não empacota o `User.SQLvar`, publica as páginas sem login e não cria o papel, o GRANT, o grupo de sessão nem o ajuste do `/fhir/r4`; nada no CI prova a instalação por IPM.

**Approach:** `module.xml` 1.1.0 empacota `diashenrique.fhir.portal`, `User.SQLvar` e `fhirUI` (`<FileCopy>` para `${cspdir}fhir/portal/`) e chama, na ativação, a classe `diashenrique.fhir.portal.Installer`, que cria ou atualiza os web apps, o papel `FHIRPortalAPI`, o GRANT EXECUTE, o grupo de sessão (com o `/fhir/r4` em 8288) e, com `-DDemoUser=1`, o usuário `fhirportal`, com os mesmos valores do `iris.script`. Fora do namespace do `/fhir/r4`, só avisa. `scripts/ipm-install.sh` reproduz a instalação de um usuário de IPM num container limpo (IPM do registro, contorno do spike para o `fhir-server`, `zpm load` do checkout no FHIRSERVER), e o job do CI ganha uma perna `ipm` que roda o mesmo smoke, e2e e checagem de alertas.

## Boundaries & Constraints

**Always:** a classe instaladora é a única fonte da configuração do portal no módulo (a entrada 3 passa o Docker para ela); rodar de novo atualiza, não duplica; o check `Build image and check FHIR data` mantém o nome.

**Never:** mudar o `iris.script` ou o Dockerfile (entrada 3); trocar o `%HS_DB_FHIRSERVER` do `/fhir/api` (entrada 4); mudar o `iris-fhir-template`.

</frozen-after-approval>

## Design Notes

- Decision (autonomia): os web apps são criados pela classe instaladora, não por `<WebApplication>`. Assim, num namespace sem o `/fhir/r4` (o USER do template), o módulo só avisa e não cria apps apontando para o lugar errado, e o reload não sobrescreve `MatchRoles` com valores diferentes dos da classe.
- As classes `Security.*` só existem no %SYS, onde a classe instaladora não existe: tudo o que roda lá fica dentro do `Setup`, sem chamar outros métodos da classe (achado na implementação: `<CLASS DOES NOT EXIST>`).
- O IPM 0.10.9 só passa o parâmetro do módulo com `-DDemoUser=1`; `-Dzpm.DemoUser=1` (a forma do AfterInstallMessage do template) não chega ao `${DemoUser}` num `zpm load`.
- O `zpm "install"` a partir do %SYS não instala o `fhir-server` e não mostra erro; o script instala a partir do USER, como o template.
- `Dispatch.Strategy()` passou a declarar `%RegisteredObject` como retorno: com o tipo `HS.FHIRServer...`, a classe não compilava no USER, e a instalação na ordem do template falhava em vez de avisar.

## Verification

- `bash scripts/ipm-install.sh` do zero (5,5 min), depois `BASE_URL=http://localhost:42783 bash scripts/smoke.sh` → todas as checagens PASS; `npx playwright test` com `BASE_URL` → 25 passed; `messages.log` sem "Error displaying login page".
- `zpm "load"` no USER → aviso "nothing was configured", sem erro; recarga no FHIRSERVER → smoke PASS de novo.
- CI do PR: as duas pernas verdes.

## Implementation Notes

- Checkpoint 1 aprovado sob a autonomia total (2026-10-05, reafirmada em 2026-10-06).

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 1 medium, 4 low.

- medium, patch: `ipm-install.sh` perdia o log quando o `iris session` saía com erro (o `set -e` encerrava antes de mostrá-lo); agora `fail` mostra o log.
- low, patch: o laço de espera não falhava se o IRIS não subisse; agora falha com `docker logs`.
- low, patch: um endpoint com outra estratégia de armazenamento era configurado e quebrava em runtime; o `Setup` agora exige a JsonAdvSQL.
- low, patch: o log temporário fica apagado (`trap`), e a checagem procura `ERROR!` e `ERROR #` em vez de qualquer "ERROR".
- low, deferred: desinstalar o módulo não remove o que a classe instaladora criou (`deferred-work.md`, para o sweep).
- Reverificado: `ipm-install.sh` do zero e smoke todo PASS.
