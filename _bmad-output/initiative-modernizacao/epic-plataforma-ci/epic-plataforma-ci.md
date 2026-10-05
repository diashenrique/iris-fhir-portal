---
type: epic
title: "Base de plataforma e CI no IRIS 2026.2"
parent: initiative-modernizacao
covers: [R1]
after: []
assignee: ""
risk: medium
---

# Base de plataforma e CI no IRIS 2026.2

## Description

O upgrade para IRIS for Health 2026.2 (`latest-cd`) já está aplicado e foi verificado à mão (commit `c63cbcc`). Este épico transforma essa verificação manual em CI: cada push ou PR builda a imagem a partir de um clone limpo, roda um smoke test HTTP e um e2e no navegador sobre o caminho principal do portal. Assim, uma nova versão CD do IRIS ou uma mudança de código que quebre o portal aparece em vermelho. O épico também tira do repositório o que expõe a cadeia de suprimentos ou o ambiente de dev (o hook de terceiros não fixado, as portas abertas em todas as interfaces) e as sobras do template. Os outros épicos usam o smoke test e o harness e2e daqui para provar as próprias mudanças.

## Outcome

Quem mantém o portal sabe, em cada PR e a cada nova imagem `latest-cd`, se o portal ainda funciona, sem testar à mão. O sinal é o workflow de CI verde em `master` e vermelho quando algo quebra.

## Requirements

- E1 (R1): O CI builda a imagem `irishealth-community:latest-cd` a partir de um clone limpo, em todo push e PR, e falha se o build ou a carga FHIR falharem. (avaliação §3, §4 Qualidade)
- E2 (R1): Um smoke test, executável localmente e no CI, verifica o FHIR (`metadata` e busca de Patient com o usuário de demo), as três rotas de `/fhir/api` e as duas páginas. (avaliação §3 Verificado)
- E3 (R1): Um e2e no navegador cobre o tracer da iniciativa (lista → detalhe → editar e salvar → gráfico de laboratório) e roda no CI. (initiative, Boundaries)
- E4 (R1): Nenhum workflow baixa e executa script de terceiros sem versão fixa. (avaliação §4 Qualidade)
- E5 (R1): O ambiente local publica as portas só em `127.0.0.1`, e o repositório não tem classes nem configurações de IDE de template sem uso. (avaliação §4 Segurança, Arquitetura, §2 Docs/IDE)

## Done when

1. Um PR para `master` dispara o workflow, que builda a imagem `latest-cd`, roda smoke e e2e e termina verde.
2. Quebrar o `iris.script` ou remover a credencial do `myFHIR.js` num branch de teste deixa o workflow vermelho.
3. Nenhum arquivo em `.github/workflows` executa um script baixado sem versão fixa.
4. `docker compose up` a partir de um clone limpo expõe só `127.0.0.1:32782` e `127.0.0.1:32783`, e o build não carrega `PackageSample.*` nem `fhirtemplate.*`.
5. O branch `modernizacao-iris-2026` com este épico está mergeado em `master`.

## Boundaries

A infraestrutura do repositório: `.github/workflows`, `Dockerfile`, `docker-compose.yml`, scripts de teste, `.vscode` e as classes de template em `src/`. Ficam de fora a autenticação do usuário final e as credenciais em `.vscode` (épico de segurança), a correção dos bugs de tela (robustez) e o caminho de instalação via IPM (paridade IPM).

## References

- parent — `_bmad-output/initiative-modernizacao/initiative-modernizacao.md`, Requirements R1
- avaliação — `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`, §3 e §4 Qualidade, testes e CI
- referência — github.com/musketeers-br/sentai-task, `docker-compose.override.yml` (portas em loopback)

## Notes

- Decision: imagem em `latest-cd`, sem tag fixa; o CI é o alarme de quebra (usuário, 2026-10-05).
- Assumption: CI no GitHub Actions, já que o repositório está no GitHub e o workflow atual usa Actions.
- Assumption: e2e com Playwright (Node), executado contra o container do CI.
- Unknown: se o runner `ubuntu-latest` tem disco suficiente para a imagem (cerca de 6 GB) mais as camadas do build; a entrada 1 descobre isso e libera espaço no runner se for preciso.
- Tracer bullet: entrada 1, um workflow que builda a imagem e prova que `/fhir/r4/metadata` responde 200 dentro do runner; ela atravessa Actions → BuildKit → IRIS → HTTP.
- Sequenciamento: 2 e 3 estendem o `ci.yml` da entrada 1 e rodam em sequência (mesmo arquivo). A 4 não depende de nada e pode rodar a qualquer momento. A 5 roda depois da 2, porque é verificada pelo build e pelo smoke no CI. Depois vêm o sweep (6) e o merge (7).
- Decision: remover o workflow objectscript-quality em vez de fixar o script (usuário, 2026-10-05).
- Decision: breakdown de 7 entradas aprovado (usuário, 2026-10-05).
- Decision: o merge em `master` e o badge ficam numa entrada separada do sweep, que só faz limpeza (validação, 2026-10-05).
- Decision: a conexão SQLTools fica na porta web 32783; o driver InterSystems usa a API REST, não o superserver (sugestão do validador recusada, 2026-10-05).
