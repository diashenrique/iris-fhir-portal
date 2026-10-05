---
type: epic
title: "Portal sem XSS, sem %All e sem credencial embutida"
parent: initiative-modernizacao
covers: [R2]
after: []
assignee: ""
risk: high
status: in-progress
---

# Portal sem XSS, sem %All e sem credencial embutida

## Description

Hoje o portal monta HTML por concatenação com dados FHIR, então um nome de paciente gravado pelo próprio formulário de edição executa script. O `/fhir/api` é anônimo com `MatchRoles=":%All"`. O JavaScript carrega a credencial do usuário de demo, e o `.vscode` traz `_SYSTEM/SYS`. Este épico fecha essas portas. Toda saída de dados vira texto. O acesso passa por uma tela de login simples, com sessão do IRIS compartilhada entre as páginas, o `/fhir/r4` e o `/fhir/api` (decisão do usuário). O `/fhir/api` roda com um papel mínimo. Nenhuma credencial fica em arquivo versionado, exceto a documentação do login de demo no README. Os testes do E1 passam a fazer login, e cada story deixa um teste de regressão.

## Outcome

Quem abre o portal precisa entrar com usuário e senha, e nenhum dado FHIR consegue executar código no navegador. O sinal é o CI verde com os testes de XSS, de acesso anônimo e de injeção.

## Requirements

- S1 (R2): Sem login, nenhuma página do portal, nem `/fhir/r4`, nem `/fhir/api` entrega dados de paciente; um login simples cria uma sessão do IRIS usada pelos três, e o logout a encerra. (decisão do usuário, 2026-10-05; avaliação §4 Segurança)
- S2 (R2): O JavaScript não contém credencial; o usuário `fhirportal` continua como login de demo, documentado no README. (avaliação §3 Atenção)
- S3 (R2): Todo dado FHIR exibido (lista, tabelas, opções de exame, modal com o JSON bruto, badges) é inserido como texto, nunca como HTML. (avaliação §4 Segurança; `myFHIR.js` 134–279, `labresult.js` 47)
- S4 (R2): O `/fhir/api` roda com um papel mínimo (sem `%All`), só com sessão autenticada e sem CORS aberto, e continua parametrizado contra injeção. (avaliação §4 Segurança; `iris.script` 33–38; `Dispatch.cls` rotas com `Cors="true"`)
- S5 (R2): Nenhum arquivo versionado contém `_SYSTEM/SYS`. (avaliação §4 Segurança; `.vscode/settings.json` 11, 27)
- S6 (R2): O SSN, que é PHI, tem um tratamento explícito na tela, conforme a decisão do usuário. (avaliação §4 Segurança)

## Done when

1. Sem login, a lista de pacientes, `/fhir/r4/Patient` e `/fhir/api/*` não entregam dados; com login pela tela, o e2e do tracer passa sem credencial no JavaScript, e o logout volta para a tela de login.
2. Um paciente com nome `<img src=x onerror=...>` aparece como texto na lista, nos detalhes e no modal, e nenhum script executa (teste e2e).
3. O `/fhir/api` roda sem `%All`; as sondas de SQL injection do smoke retornam vazio, e uma origem estranha não recebe cabeçalhos CORS.
4. `git grep`, fora de `_bmad-output/`, `_bmad/` e `.claude/`, não encontra `SYS` como senha, nem `fhirportal` fora do README, do `iris.script` (criação do usuário) e dos testes (`scripts/`, `e2e/`, `.github/workflows/`).
5. O SSN segue a decisão registrada nas Notes.
6. CI verde em `master` com tudo isso.

## Boundaries

A segurança do portal no caminho Docker: `fhirUI/` (páginas e JS), `src/diashenrique/fhir/portal/`, `iris.script`, `.vscode/` e os testes do E1, que passam a fazer login. Fora do escopo: SMART on FHIR e OAuth2 (decisão do usuário), atualização do jQuery e de outros vendors (epic-frontend-deps), o `module.xml` e o caminho IPM (epic-ipm-paridade, que adota o modelo de autenticação daqui) e a robustez com dados incompletos (epic-robustez-fhir).

## References

- parent — `_bmad-output/initiative-modernizacao/initiative-modernizacao.md`, R2 e Notes (decisão do login simples)
- avaliação — `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`, §3 e §4 Segurança
- epic anterior — `_bmad-output/initiative-modernizacao/epic-plataforma-ci/`: CI, `scripts/smoke.sh` e `e2e/` que este épico estende
- deferred — `_bmad-output/initiative-modernizacao/deferred-work.md`: o Web Gateway guarda em cache o gzip do `fhirUI`; reinicie o container depois de editar JS em teste manual

## Notes

- Decision: login simples com sessão do IRIS, sem SMART on FHIR (usuário, 2026-10-05).
- Unknown: se uma sessão do IRIS criada no login das páginas autentica as chamadas REST do `HS.FHIRServer.RestHandler` (`/fhir/r4`) e do `/fhir/api`. Candidatos: aplicações no mesmo grupo de autenticação (`GroupById`) e cookie de sessão com path comum. A entrada 1 (spike) responde a isso antes do tracer.
- Decision: SSN mascarado (***-**-1234) com botão para revelar; o update grava o valor real (usuário, 2026-10-05).
- Decision: o portal passa para a URL `/fhir/portal/`, a mesma do `module.xml`; o `/csp/user/fhirUI` anônimo deixa de existir (usuário, 2026-10-05).
- Decision: se o spike mostrar que o FHIR server não aceita a sessão por cookie, a alternativa é decidida com o usuário depois do spike, com a evidência dele (usuário, 2026-10-05).
- Decision: breakdown de 7 entradas aprovado (usuário, 2026-10-05).
- Decision: o `/fhir/r4` volta a `AutheEnabled=8288` (anônimo recusado pelo servidor FHIR com 401) em vez de 8224, porque com 8224 cada chamada anônima gera um alerta de severidade 2 e deixa o container unhealthy (usuário, 2026-10-05; bug 8).
- Tracer bullet: entrada 2, login → sessão → lista → `/fhir/r4` e `/fhir/api` → logout, precedida pelo spike (entrada 1), porque o desenho depende da resposta dele.
- Sequenciamento: 1 → 2; depois 3, 4 e 5 em paralelo (3 mexe em `iris.script`, `Dispatch.cls` e smoke; 4 em `myFHIR.js`, `labresult.js` e e2e; 5 em `.vscode`, depois da 2, que também mexe nele); 6 depois da 4 (mesmo `myFHIR.js` e e2e); 7 fecha.
- Handoff para o epic-ipm-paridade: o modelo de autenticação daqui (web apps, papel mínimo, login) é o que o `module.xml` vai declarar.
