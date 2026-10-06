---
title: 'Spike: IPM no IRIS 2026.2, pacote fhir-server e instalação do portal'
type: 'chore'
ticket: '1'
created: '2026-10-06'
status: done
baseline_revision: '572fa5ad8c46bddc808edc458be3d94428386e84'
route: 'oneshot'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Não se sabe se o IPM e o pacote `fhir-server` (o `iris-fhir-template`) funcionam no IRIS for Health 2026.2, o que o `<CSPApplication>`/`<WebApplication>` do IPM consegue declarar, o que acontece na ordem de instalação do template (portal antes do FHIR) com o `User.SQLvar` dos dois módulos, nem como dar ao `/fhir/api` leitura sem escrita nas tabelas FHIR.

**Approach:** Responder num container limpo, com roteiros versionados em `spike-ipm/` (`run.sh` reproduz tudo do zero) e a receita registrada neste plano para as entradas 2 a 4.

</frozen-after-approval>

## Resposta do spike

Reprodução: `bash _bmad-output/initiative-modernizacao/epic-ipm-paridade/spike-ipm/run.sh` a partir da raiz do repositório (container `ipmspike` na porta 42783). Resultado em 2026-10-06: `fhir-server` ativo, `/fhir/r4/metadata` 200, módulo de prova ativo no FHIRSERVER, `scripts/smoke.sh` com todas as checagens PASS contra ele, e UPDATE/DELETE nas tabelas FHIR com SQLCODE -99 para o papel do `/fhir/api`.

### 1. IPM no 2026.2

- A imagem não traz o IPM: `%IPM.Main` e `%ZPM.PackageManager` não existem. O instalador do registro (`https://pm.community.intersystems.com/packages/zpm/latest/installer`, carregado com `$system.OBJ.Load(...,"ck")` no %SYS) instala o IPM 0.10.9.
- `zpm "enable -community"` configura o registro.
- O IPM 0.10.9 avisa que `<CSPApplication>` está obsoleto: o módulo deve usar `<WebApplication>`.

### 2. O pacote `fhir-server` 1.3.7 (iris-fhir-template) falha no 2026.2

- Sem contorno, o `zpm "install fhir-server"` carrega os dados e cria o namespace, mas termina com `Activate FAILURE` e `<CLASS DOES NOT EXIST>CollectAnalytics+1^%IPM.Repo.Remote.PackageService.1 *%IPM.Repo.UniversalSettings`. O `Setup` do template termina com o processo no `FHIRSERVER`, onde o IPM não está mapeado (o namespace acabou de nascer). A falha desfaz o namespace e o `/fhir/r4`: depois dela, `/fhir/r4/metadata` dá 404 e `FHIRSERVER` "does not exist".
- `zpm "enable -map -globally"` antes do install **não** basta, porque o namespace é criado depois.
- **Contorno que funciona** (`1b-precreate-fhirserver.script`): criar o namespace Foundation antes (`HS.Util.Installer.Foundation.Install("FHIRSERVER")` no HSLIB), rodar `zpm "enable -map -globally"` e só então `zpm "install fhir-server"`. O `Setup` aceita o namespace existente: `/fhir/r4` 200 e 6 pacientes.
- Consequência: o próprio `iris-fhir-template` está quebrado no 2026.2 com o IPM atual. Isso é dele, não deste projeto; fica registrado para avisar o mantenedor (ação externa, do usuário).

### 3. Ordem do template e namespace do portal

- O template roda `zn "USER"`, `zpm "install fhir-portal"` e depois o `fhir-server`. O portal é instalado no namespace corrente (USER), então o `/fhir/api` da 1.0.3 aponta para USER, onde as tabelas FHIR não existem.
- O portal precisa rodar no namespace do FHIR (o `Dispatch`, o `Home` e as funções SQL). **Recomendação para a entrada 2:** o módulo é instalado no namespace do endpoint (`zn "FHIRSERVER"`, `zpm "load ..."`/`"install fhir-portal"`). A classe instaladora verifica se o `/fhir/r4` existe no namespace corrente; se não existir, escreve um aviso claro ("instale no namespace do servidor FHIR depois do fhir-server") e termina com sucesso, sem criar nada. Assim o build do template não quebra mais do que já quebra hoje.
- **`User.SQLvar`:** o `fhir-server` traz o mesmo `src/User/SQLvar.cls` para o USER. O portal instalado no FHIRSERVER traz a cópia dele para o FHIRSERVER, e as duas convivem (`SQLVAR in FHIRSERVER: 1`, `SQLVAR in USER: 1`), sem conflito de posse, porque são namespaces diferentes. O portal empacota `<Resource Name="User.SQLvar.CLS"/>`.

### 4. `<WebApplication>`: o que o módulo consegue declarar

O módulo de prova (`probe-module/module.xml`) mostrou que os atributos passam direto para o `Security.Applications`:

| Atributo | Resultado |
|---|---|
| `AutheEnabled="32"`, `ServeFiles="3"`, `GroupById`, `CookiePath`, `UseCookies`, `MatchRoles`, `DispatchClass`, `SessionScope="2"` | aplicados como declarados |
| `Path` | sem ele, o `/fhir/portal` ficava com `Path=/fhirUI` (inexistente), embora os arquivos fossem copiados para `${cspdir}/fhir/portal`; com `Path="${cspdir}/fhir/portal/"` explícito, funciona |
| `CSRFToken` | o padrão do `<WebApplication>` é vazio (sem token CSRF no login), enquanto o `Security.Applications.Create` liga; o smoke falha sem ele; declarar `CSRFToken="1"` resolve |

- Recarregar o módulo **sobrescreve** o `MatchRoles` com o valor do `module.xml`. Os papéis do `/fhir/api` precisam estar no próprio `module.xml`, e a classe instaladora precisa criá-los antes dos web apps (`<Invoke Phase="Activate" When="Before">`).
- O que só a classe instaladora faz: criar os papéis e os GRANTs, ajustar o `/fhir/r4` (`GroupById`, `CookiePath`, `UseCookies`, `AutheEnabled=8288`), que pertence ao `fhir-server`, e criar o usuário de demonstração quando pedido.

### 5. `/fhir/api` só com leitura (P4)

- O `%HS_DB_FHIRSERVER` dá RW nos bancos `%DB_FHIRSERVER`, `%DB_FHIRSERVERX0001R` e `%DB_FHIRSERVERX0001V` **e** os privilégios SQL das tabelas FHIR. Sem ele, o SQL dinâmico passa a ser checado: SELECT, UPDATE e DELETE dão -99.
- **Receita que funciona** (`5-readonly-role.script`, `6-grant-select.script`): um papel `FHIRPortalRead` com os três bancos só em **R**, `GRANT SELECT ON SCHEMA HSFHIR_X0001_R` e `... HSFHIR_X0001_S` ao `FHIRPortalAPI`, mais o `GRANT EXECUTE` nas funções, e `MatchRoles=":FHIRPortalRead:FHIRPortalAPI"` no `/fhir/api` (sem `%HS_DB_FHIRSERVER`). Resultado: smoke inteiro passa; UPDATE e DELETE dão -99. O cache de consultas do SQL dinâmico funcionou com os bancos só em leitura.
- Os nomes `X0001` (esquemas e bancos) vêm do endpoint: a classe instaladora usa `GetStrategyForEndpoint("/fhir/r4")` (`GetResourceTable`, `GetSearchTable`) para os esquemas, e os bancos de dados em que o namespace mapeia os pacotes `HSFHIR.X0001.*` (a entrada 4 resolve como; o `%HS_DB_FHIRSERVER` lista os três).

### Para as entradas seguintes

- Entrada 2: `<WebApplication>` com os atributos da tabela (incluindo `Path` e `CSRFToken`), `<Resource Name="User.SQLvar.CLS"/>`, `<Invoke>` antes da ativação para papéis, GRANTs e o ajuste do `/fhir/r4`, aviso sem falha fora do namespace do FHIR. O job de CI usa o contorno do item 2 para o `fhir-server`.
- Entrada 4: trocar o `%HS_DB_FHIRSERVER` do `/fhir/api` pela receita do item 5.

## Implementation Notes

Rota oneshot: investigação sem código entregue; o resultado é este plano e os roteiros em `spike-ipm/`. Os experimentos rodaram só no container `ipmspike`, removido no fim.
