---
title: 'Spike: sessão do IRIS compartilhada entre páginas, /fhir/r4 e /fhir/api'
type: 'chore'
ticket: '1'
created: '2026-10-05'
status: done
baseline_revision: '9be108cd2fcf4b21bb3c48ee4d7629973491c840'
route: 'oneshot'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O login simples decidido pelo usuário só funciona se uma sessão do IRIS, criada ao entrar nas páginas, autenticar por cookie as chamadas do navegador a `/fhir/r4` (`HS.FHIRServer.RestHandler`) e a `/fhir/api`. Hoje não se sabe se isso acontece nem com qual configuração.

**Approach:** Experimentar num container local, sem mudar código do repositório, a configuração mínima: um web app `/fhir/portal` servindo `fhirUI` com autenticação por senha e página de login, agrupado com `/fhir/r4` e `/fhir/api` (`GroupById`, cookie e sessão). Registrar neste plano a configuração e um roteiro curl reproduzível com 401 sem cookie e 200 com o cookie do login, e como Playwright e curl fazem esse login. Se não for possível, registrar as alternativas, que o usuário decide antes da entrada 2.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: investigação sem código entregue; o resultado é este plano. Risco alto, porque o desenho da entrada 2 depende da resposta.

## Resposta do spike

**Sim: uma sessão do IRIS criada pelo login nas páginas autentica, só pelo cookie, o `/fhir/r4` (`HS.FHIRServer.RestHandler`) e o `/fhir/api`.** Verificado em 2026-10-05 no container IRIS for Health 2026.2.0.221.0, com curl e com Chromium (Playwright), removendo o cabeçalho `Authorization` de todas as chamadas a `/fhir/r4`. A lista carregou os 18 pacientes só pelo cookie. Nenhuma alternativa (sessionStorage) é necessária.

### Configuração mínima (para a entrada 2)

| Web app | Propriedades |
|---|---|
| `/fhir/portal` (novo) | `NameSpace=FHIRSERVER`, `Path=/home/irisowner/dev/fhirUI/`, `Recurse=1`, `AutheEnabled=32` (só senha), **`ServeFiles=3`**, `GroupById="fhirportal"`, `CookiePath="/fhir/"`, `UseCookies=2`, **`MatchRoles=":%HS_DB_FHIRSERVER"`** |
| `/fhir/r4` (existente) | `GroupById="fhirportal"`, `CookiePath="/fhir/"`, `UseCookies=2`, **`AutheEnabled=8224`** (8192 + 32: tira o bit 64, que é o anônimo). A recusa ao anônimo passa a vir do próprio web app, não só do FHIR server rejeitando o UnknownUser; a resposta vira **404**, e não 401. A Basic auth segue valendo (checagem de dados do CI) |
| `/fhir/api` (existente) | `GroupById="fhirportal"`, `CookiePath="/fhir/"`, `UseCookies=2`, `AutheEnabled=32` (sai o anônimo); o papel mínimo é da entrada 3 |

### Achados que mudam o desenho

1. **`ServeFiles=1` (o padrão) ignora a segurança para arquivos estáticos.** Com ele, `patientlist.html` saiu 200 para um anônimo mesmo com o app exigindo senha. Com `ServeFiles=3` ("Use CSP security"), o estático só é servido a quem já pode ver páginas CSP do app; um anônimo recebe **404**, não a tela de login.
2. **A porta de entrada precisa ser uma página CSP (classe), não um `.html`.** Só uma página CSP dispara o login. A entrada 2 deve criar uma classe de entrada (ex.: `diashenrique.fhir.portal.Home`, que redireciona para `patientlist.html`) e, para a "tela simples", uma página de login própria em `LoginPage` (subclasse de `%CSP.Login`). O padrão do IRIS usa `IRISUsername`, `IRISPassword`, `IRISLogin` e um `IRISSessionToken` (CSRF de login, `CSRFToken=1`).
3. **O app de páginas precisa de `MatchRoles=":%HS_DB_FHIRSERVER"`.** Sem isso, o `fhirportal` (sem papéis) entra, mas a página CSP falha com "An error occurred with the web application", porque o usuário não lê o banco de código do `FHIRSERVER`.
4. **CSRF:** o cookie de sessão sai `CSPSESSIONID-...` com path `/fhir/`, `SameSite=Strict` (`SessionScope=2`, o padrão) e `HttpOnly`. O `PUT Patient` só leva o cookie em requisições do mesmo site.
5. **Logout:** `?IRISLogout=end` numa página CSP do app encerra a sessão do grupo. Depois disso, `/fhir/r4` dá 404, `/fhir/api` dá 401 e o estático dá 404.
7. **Handoff para os testes da entrada 2:** o smoke de hoje espera 401 no `/fhir/r4` anônimo. Com `AutheEnabled=8224`, a resposta é 404, então a checagem deve aceitar 401 ou 404 como negado, como faz o `verify.sh` deste spike.
6. Lembrete do `deferred-work.md`: ao trocar o `fhirUI` em teste manual, reinicie o container por causa do cache gzip do Web Gateway.

### Artefatos reproduzíveis

Em `_bmad-output/initiative-modernizacao/epic-seguranca/spike-sessao/`:

- `Home.cls` — página CSP de entrada usada como porta (`Spike.Home`), carregada no FHIRSERVER.
- `setup.script` — cria `/fhir/portal` e muda `/fhir/r4` e `/fhir/api` exatamente como na tabela acima.
- `verify.sh` — 13 checagens com status conferido: anônimo negado (estático 404, `/fhir/r4` 404, `/fhir/api/laboptions` 401); token do login presente e POST 302; com cookie, estático, `/fhir/r4/Patient`, `/fhir/api/laboptions` e `PUT Patient` 200; Basic auth no `/fhir/r4` 200; depois do logout, negado de novo.

Para reproduzir num container novo: `docker cp Home.cls <container>:/tmp/`; `$system.OBJ.Load("/tmp/Home.cls","ck")` no FHIRSERVER; `iris session iris -U %SYS < setup.script`; `bash verify.sh`. Resultado em 2026-10-05, depois de `docker compose down` e `up`: **13 PASS**.

### Roteiro Playwright (e2e)

`page.goto('/fhir/portal/<PaginaCSP>.cls')`, `fill` em `IRISUsername` e `IRISPassword`, clique em `IRISLogin` com `waitForNavigation`, e depois `page.goto('/fhir/portal/patientlist.html')`. O fhir.js funciona sem o bloco `auth`.

### Estado do container

O spike alterou só o container local, via `setup.script`. O código do portal não mudou, e a próxima build do zero descarta essas mudanças. Os artefatos ficam versionados como evidência e como base da entrada 2.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 3 medium, 2 low, 0 false.

- medium → patch — o roteiro não testava `/fhir/api/laboptions/:id`, que o ticket pede: `verify.sh` testa laboptions anônimo, com cookie e depois do logout.
- medium → patch — o roteiro não mostrava os 401 sem cookie: `verify.sh` checa anônimo e pós-logout, e os resultados medidos saem do script.
- medium → patch — o roteiro não era reproduzível (placeholder, setup só no container): `Home.cls`, `setup.script` e `verify.sh` versionados, provados num container novo.
- medium → patch — o 401 do `/fhir/r4` vinha do FHIR server, porque `AutheEnabled=8288` mantém o anônimo no web app: a configuração passa a `8224`, e a recusa no web app aparece como 404. Registrado como achado 7 para os testes da entrada 2.
- low → patch — a extração do token era frágil e o POST não era conferido: `verify.sh` falha se o token vier vazio e exige 302 no login.
