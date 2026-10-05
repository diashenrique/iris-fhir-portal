---
title: 'Tracer: login simples, sessão e logout de ponta a ponta'
type: 'feature'
ticket: '2'
created: '2026-10-05'
status: 'built'
baseline_revision: '3590afa3d82a54f0a00c4343bce7505cf65165a5'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-modernizacao/epic-seguranca/spike-spike-sessao-do-iris-compartilhada-entre-paginas-fhir-r4-e-f-plan.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Qualquer pessoa que alcance a porta 32783 lê e edita pacientes: as páginas e o `/fhir/api` são anônimos, e o `myFHIR.js` carrega a credencial do usuário de demo.

**Approach:** Aplicar a configuração provada no spike 2.1. Um web app `/fhir/portal` com login por senha (página de login padrão do IRIS), agrupado com `/fhir/r4` e `/fhir/api` por sessão e cookie. Uma página CSP de entrada que leva à lista, e logout nas duas páginas. O JavaScript fica sem credencial. O `/csp/user/fhirUI` anônimo deixa de existir. Smoke e e2e passam a fazer login e ganham helpers que as entradas 3, 4 e 6 vão reusar.

## Boundaries & Constraints

**Always:** usar os valores do spike (`ServeFiles=3`, `GroupById="fhirportal"`, `CookiePath="/fhir/"`, `UseCookies=2`, `MatchRoles=":%HS_DB_FHIRSERVER"` no `/fhir/portal`, `AutheEnabled=8224` no `/fhir/r4` e `32` no `/fhir/api`); manter o cookie de sessão `SameSite=Strict` (o padrão, `SessionScope=2`); continuar com o usuário `fhirportal` como login de demo, documentado no README.

**Never:** credencial em `fhirUI/`; `MatchRoles` do `/fhir/api` (é da entrada 3); escape de HTML (entrada 4); tela de login com visual próprio, nome curto de URL ou página de erro amigável para o 404 anônimo (epic-layout-prontuario); `module.xml` (epic-ipm-paridade).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Entrada anônima | GET `/fhir/portal/diashenrique.fhir.portal.Home.cls` | Tela de login do IRIS | — |
| Estático anônimo | GET `/fhir/portal/patientlist.html` | 404, sem conteúdo | — |
| API anônima | `/fhir/r4/Patient`, `/fhir/api/laboptions/:id` | 404 e 401, sem dados | — |
| Login certo | `fhirportal`/`fhirportal` | Redireciona para `patientlist.html`; lista, edição e gráfico funcionam só com o cookie | — |
| Login errado | Senha inválida | Continua na tela de login com a mensagem do IRIS | — |
| Sessão encerrada | Logout, ou cookie expirado, com a página aberta | Chamadas FHIR negadas | O `myFHIR.js` manda o navegador para a página de entrada quando a busca da lista recebe 401 ou 404 |

</frozen-after-approval>

## Code Map

- `iris.script` -- cria `/fhir/api` (linhas 31–38, mantém `%All`) e o usuário `fhirportal` (41); recebe a criação do `/fhir/portal` e as mudanças em `/fhir/r4` e `/fhir/api`, copiadas de `spike-sessao/setup.script`.
- `src/diashenrique/fhir/portal/` -- só tem `Dispatch.cls`; ganha `Home.cls` (`%CSP.Page`). Base: `spike-sessao/Home.cls`.
- `fhirUI/resources/js/myFHIR.js` -- bloco `auth` nas linhas 9–14; busca da lista nas linhas 118–143, onde fica o redirect para a entrada.
- `fhirUI/patientlist.html`, `fhirUI/labresult.html` -- `<header class="app-header">` na linha 28 de cada uma: link "Logout".
- `fhirUI/resources/js/labresult.js` -- `urlREST = origin + "/fhir/api"`; funciona com o cookie (mesma origem), sem mudança.
- `docker-compose.yml` -- mount `./fhirUI:/usr/irissys/csp/user/fhirUI` (sai); o app serve `/home/irisowner/dev/fhirUI/`, que vem do mount `./:/home/irisowner/dev`.
- `scripts/smoke.sh` -- checagens anônimas e com Basic auth; passa a fazer login com cookie (receita do `spike-sessao/verify.sh`).
- `e2e/tests/tracer.spec.js`, `e2e/playwright.config.js` -- URLs `/csp/user/fhirUI`; restore com Basic auth via `request`.
- `.github/workflows/ci.yml` -- checagem de dados com Basic auth em `/fhir/r4`, que continua valendo com 8224.
- `README.md` (linhas 36 e 38 mais a seção Checking), `.vscode/settings.json` (link "FHIR Portal") -- trocar a URL.

## Tasks & Acceptance

**Execution:**
- [ ] `src/diashenrique/fhir/portal/Home.cls` -- criar a página de entrada: depois do login, redireciona para `patientlist.html`; com `IRISLogout=end`, o IRIS encerra a sessão e mostra o login -- porta CSP exigida pelo `ServeFiles=3`.
- [ ] `iris.script` -- criar `/fhir/portal` e ajustar `/fhir/r4` e `/fhir/api` com os valores do spike, depois do `LoadDir` -- sessão compartilhada.
- [ ] `fhirUI/resources/js/myFHIR.js` -- remover `auth`; quando a busca da lista recebe 401 ou 404, ir para `diashenrique.fhir.portal.Home.cls` -- sessão como única credencial.
- [ ] `fhirUI/patientlist.html`, `fhirUI/labresult.html` -- link "Logout" no header para `diashenrique.fhir.portal.Home.cls?IRISLogout=end`.
- [ ] `docker-compose.yml` -- remover o mount de `fhirUI` em `/csp/user`.
- [ ] `scripts/smoke.sh` -- função `login` (cookie jar, token, 302) usada por todas as checagens autenticadas; checagens anônimas: estático 404, `/fhir/r4` 401 ou 404, `/fhir/api` 401, entrada mostrando o login; páginas em `/fhir/portal/`.
- [ ] `e2e/tests/helpers.js` (novo), `e2e/tests/tracer.spec.js` -- `login(page)`; o tracer usa login, `page.request` (cookies do contexto) para laboptions e para o restore, e termina com logout voltando à tela de login; novo teste: contexto anônimo recebe 404 em `patientlist.html`.
- [ ] `README.md`, `.vscode/settings.json` -- URL `http://localhost:32783/fhir/portal/diashenrique.fhir.portal.Home.cls` e login `fhirportal`/`fhirportal`.

**Acceptance Criteria:**
- Given um clone limpo, when `docker compose up` e o CI rodam, then o smoke e o e2e passam com login, e `git grep fhirportal -- fhirUI` não encontra nada.
- Given o container no ar, when alguém pede `/csp/user/fhirUI/patientlist.html`, then recebe 404.

## Design Notes

A página de login é a padrão do IRIS ("tela simples"); o visual próprio fica para o epic-layout-prontuario. A URL de entrada é longa porque `Package` só vale para `.csp` e compilar `.csp` em runtime exigiria escrita no banco de código; uma URL curta fica para o mesmo épico. A checagem de dados do `ci.yml` continua com Basic auth: ela prova a carga independentemente do código de login, e o Done when 4 permite `fhirportal` nos workflows. O `Path` do `/fhir/portal` depende do bind mount do checkout, como já acontecia com o `/csp/user/fhirUI`; empacotar os arquivos é do epic-ipm-paridade.

## Verification

**Commands:**
- `docker compose down -v && docker compose build && docker compose up -d`, depois `bash scripts/smoke.sh` -- expected: todas as checagens PASS.
- `cd e2e && npx playwright test` -- expected: tracer e teste anônimo passam.
- `PAGE=http://localhost:32783/fhir/portal/diashenrique.fhir.portal.Home.cls bash _bmad-output/initiative-modernizacao/epic-seguranca/spike-sessao/verify.sh` -- expected: 13 PASS.
- CI do PR -- expected: verde.

## Implementation Notes

Implementado direto a partir do plano: o subagente de implementação caiu duas vezes com `529 Overloaded` antes de alterar qualquer arquivo, e o workflow prevê implementação direta quando não há subagente.

- Arquivos: `src/diashenrique/fhir/portal/Home.cls` (novo; `OnPreHTTP` redireciona para `patientlist.html`), `iris.script` (cria `/fhir/portal` e ajusta `/fhir/r4` e `/fhir/api` com os valores do spike), `fhirUI/resources/js/myFHIR.js` (sem `auth`; redirect para a entrada quando a lista recebe 401 ou 404), `fhirUI/patientlist.html` e `labresult.html` (link `#logout`), `docker-compose.yml` (sem o mount em `/csp/user`), `scripts/smoke.sh` (login com cookie jar, checagens anônimas e pós-logout), `e2e/tests/helpers.js` (novo, `login`), `e2e/tests/tracer.spec.js` (4 testes), `README.md`, `.vscode/settings.json`, `.github/workflows/ci.yml`.
- Desvio: o passo "Wait for FHIR server" do `ci.yml` passou a usar `-u fhirportal:fhirportal`. Com `AutheEnabled=8224`, o `/fhir/r4/metadata` anônimo também responde 404 (medido), então a espera anônima nunca terminaria. O Done when 4 permite a credencial em workflows.
- Surpresa: o adapter jQuery do fhir.js rejeita com `{ error: jqXHR }`, então `err.status` nunca existe; o redirect lê `err.error.status`. Os outros `.catch` com o mesmo problema foram registrados em `deferred-work.md` (epic-robustez-fhir).
- Matriz: entrada anônima, estático anônimo e API anônima (smoke e e2e 1); login certo (e2e 4, sem credencial no JS, com edição, gráfico e logout); login errado (e2e 2); sessão encerrada com a página aberta (e2e 3, servindo do cache as respostas estáticas recebidas no login, como faria o navegador com o `Expires` de 1 hora).
- Verificado com rebuild do zero (`--no-cache`): build com exit 0 (compila `Home` e `Dispatch`); smoke com 15 PASS; e2e com 4 testes passando; `verify.sh` do spike com `PAGE` na entrada real, 13 PASS.
- Depois dos patches da revisão, reverificado: smoke todo PASS, com o `/fhir/api` estrito em 401; e2e com 4 testes passando.
- Verificado no GitHub: PR #12, run 37313237882 verde em 6min08s (build, espera com Basic auth, dados, smoke com login e E2E com 4 testes).

## Plan Change Log

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 2 medium, 3 low, 1 false, 1 maybe-false (rejeitado como low).

- medium → patch — laço de redirect entre `Home.cls` e a lista quando o portal está logado mas o `/fhir/r4` recusa: reproduzido exigindo `Resource=%Admin_Manage` no `/fhir/r4` (163 navegações em 6 s). Correção: trava por aba em `sessionStorage` (redireciona uma vez; numa segunda recusa logo depois, mostra um toast de erro); com a mesma configuração, 3 navegações. Configuração restaurada.
- medium → patch — o teste de senha errada não esperava o POST e não checava a mensagem: espera a resposta do POST, exige "Access Denied" e `not.toHaveURL(patientlist)`.
- low → patch — o smoke aceitava 404 no `/fhir/api` anônimo e pós-logout: agora só 401, como mediu o spike e como checa o e2e.
- low → patch — `README-JP.md:79` ainda apontava para `/csp/user/fhirUI`, o que o verify do ticket proíbe: URL trocada pela entrada nova; o resto do README-JP continua com o epic-docs-demo.
- maybe-false (seria low) → rejeitado — o replay do cache no teste da página aberta reaproveita cabeçalhos de encoding: o teste passa com o conteúdo real servido pelo Gateway; só mudaria se o Playwright deixasse de normalizar o corpo.
- low → patch — o loop de laboptions no smoke chamava `curl -b` direto: usa `session --max-time 10`.
- false — o plano staged diverge do working tree: o commit usa `git add -A`, e a divergência era só o cabeçalho escrito depois do stage.
