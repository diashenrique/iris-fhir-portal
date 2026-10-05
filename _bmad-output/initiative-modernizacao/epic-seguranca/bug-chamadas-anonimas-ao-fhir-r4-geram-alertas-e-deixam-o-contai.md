---
id: 8
type: bug
title: "Chamadas anônimas ao /fhir/r4 geram alertas e deixam o container unhealthy"
parent: epic-seguranca
covers: [S1]
after: [2]
refined: true
hitl: false
risk: medium
---

# Chamadas anônimas ao /fhir/r4 geram alertas e deixam o container unhealthy

## Description

Volta o AutheEnabled do /fhir/r4 de 8224 para 8288 no iris.script (decisão do usuário, 2026-10-05): com 8224, cada chamada anônima faz o IRIS tentar mostrar uma página de login num app REST, grava um alerta de severidade 2 e responde 404; com 8288 o servidor FHIR recusa o UnknownUser com 401 e nada é gravado. O smoke e o e2e passam a exigir 401, e o CI falha se o messages.log tiver 'Error displaying login page' depois dos testes.

## Acceptance Criteria

- Given o container recém-iniciado, when uma chamada anônima vai para `/fhir/r4/Patient` (com ou sem `Accept`), then a resposta é 401 e o `messages.log` não ganha "Error displaying login page".
- Given a sessão do login do portal, when o navegador chama o `/fhir/r4`, then a lista, a edição e o gráfico continuam funcionando (tracer e2e).
- Given credenciais Basic do usuário de demo, when o CI espera o `/fhir/r4/metadata`, then recebe 200.
- Given o fim dos testes no CI, when o passo de log procura "Error displaying login page" no `messages.log`, then encontra 0 e o job segue verde; com 1 ou mais, o job falha e mostra as linhas.
- Given o smoke e o e2e, when checam o `/fhir/r4` anônimo e pós-logout, then exigem 401 (não aceitam mais 404).

## Steps to reproduce

1. Container com `/fhir/r4` em `AutheEnabled=8224` (story 2.2), recém-iniciado.
2. `curl http://localhost:32783/fhir/r4/Patient` sem credencial.
3. `grep "Error displaying login page" /usr/irissys/mgr/messages.log` mostra uma entrada nova de severidade 2 ("alert"); depois de 3 em 30 s, o IRIS registra "generated 3 alerts", e o `/irisHealth.sh` falha enquanto o estado está em alert.

Medido em 2026-10-05: 8224 → 404 e +1 entrada; 8288 → 401 e +0.

## References

- parent — _bmad-output/initiative-modernizacao/epic-seguranca/epic-seguranca.md
