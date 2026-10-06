---
type: epic
title: "zpm install fhir-portal funcional no IRIS atual"
parent: initiative-modernizacao
covers: [R4]
after: []
assignee: ""
risk: high
status: in-progress
---

# zpm install fhir-portal funcional no IRIS atual

## Description

O pacote `fhir-portal` 1.0.3 do registro IPM, que o `iris-fhir-template` instala, não funciona em nenhum IRIS atual. Ele não empacota o `User.SQLvar`, onde ficam as funções SQL do artigo 4 que o `Dispatch` usa. Ele publica as páginas sem login (`UnauthenticatedEnabled=1`) e não tem o grupo de sessão, o papel mínimo nem o ajuste do `/fhir/r4` que os épicos E2 e E3 criaram. O Docker monta tudo isso pelo `iris.script`, por um caminho diferente. Este épico faz o `module.xml` declarar e configurar o portal inteiro, faz o Docker instalar pelo mesmo módulo (`zpm load`) e prova a instalação no cenário do `iris-fhir-template` (pacote `fhir-server` mais `fhir-portal`) num job de CI. Também endurece o acesso SQL do `/fhir/api` e publica a versão 1.1.0.

## Outcome

Quem roda `zpm "install fhir-portal"` num IRIS for Health 2026.2 com um servidor FHIR em `/fhir/r4`, inclusive dentro do `iris-fhir-template`, tem o portal com login, lista, edição e gráfico funcionando. O sinal é o job de CI de instalação por IPM verde.

## Requirements

- P1 (R4): O `module.xml` empacota tudo o que o portal precisa (`diashenrique.fhir.portal`, `User.SQLvar`, `fhirUI/`) e, ao instalar, cria os web apps `/fhir/portal` e `/fhir/api`, o papel mínimo e o grupo de sessão com o `/fhir/r4`, com os mesmos valores que o Docker usa hoje. (avaliação §3 e §4 Arquitetura; epic-seguranca; epic-robustez-fhir 3.7)
- P2 (R4): O Docker instala o portal pelo mesmo módulo (`zpm load`), e o `iris.script` deixa de criar web apps, papéis e GRANTs. (avaliação §4 Arquitetura)
- P3 (R4): Um job de CI instala, num IRIS for Health 2026.2 limpo, o pacote `fhir-server` do registro (o `iris-fhir-template`) e depois o portal pelo `module.xml` do checkout, e roda o smoke e o e2e contra ele. (initiative, Done when 1 e 5)
- P4 (R4): O acesso SQL do `/fhir/api` deixa de incluir escrita nas tabelas FHIR, ou fica documentada a razão técnica para não ser possível. (spike 3.6; deferred-work.md)
- P5 (R4): O usuário de demonstração `fhirportal` só é criado quando pedido por parâmetro do módulo; o Docker e o CI pedem. (epic-seguranca, S2)
- P6 (R4): A versão 1.1.0 é publicada no registro IPM, e o README explica a instalação por IPM. (initiative, Done when 5)

## Done when

1. O job de CI de instalação por IPM (`fhir-server` do registro mais `zpm load` do checkout) fica verde com o smoke e o e2e.
2. O build Docker usa `zpm load`, e `git grep -n "Security.Applications\|Security.Roles\|GRANT" -- iris.script` não encontra nada.
3. Como `fhirportal` com os papéis do `/fhir/api`, um `UPDATE` ou `DELETE` em `HSFHIR_*` falha por privilégio, ou o épico registra por que não é possível.
4. `zpm "install fhir-portal"` da versão 1.1.0 publicada funciona num IRIS for Health 2026.2 limpo com o `fhir-server`.
5. CI verde em `master`.

## Boundaries

O empacotamento e a instalação do portal: `module.xml`, uma classe instaladora em `src/diashenrique/fhir/portal/`, `Dockerfile`, `iris.script`, `.github/workflows/ci.yml` e o README (seção de instalação). Ficam de fora: mudanças no `iris-fhir-template` (só é verificado); mudanças de comportamento no portal; a atualização de bibliotecas do frontend (epic-frontend-deps).

- Touch point: registro IPM (pm.community.intersystems.com), para publicar a 1.1.0; responsável: esta épica, com uma pessoa publicando (credenciais).
- Touch point: `iris-fhir-template` (pacote `fhir-server` 1.3.7 no registro), usado no CI como está.

## References

- parent — `_bmad-output/initiative-modernizacao/initiative-modernizacao.md`, R4
- avaliação — `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`, §3 Atenção e §4 Arquitetura
- configuração atual — `iris.script` (web apps, papel `FHIRPortalAPI`, GRANT, grupo de sessão, usuário de demo), `module.xml` 1.0.3
- spikes — `epic-seguranca/spike-sessao/` (sessão) e `epic-robustez-fhir/spike-consultas/` (esquema e privilégios)
- referência de IPM em 2026.2 — github.com/musketeers-br/sentai-task, Dockerfile (instalador do zpm via wget) e iris.script (`zpm "load ..."`)

## Notes

- Decision (autonomia): o usuário concedeu autonomia total (2026-10-05, reafirmada em 2026-10-06).
- Fato: a imagem `intersystems/irishealth-community:latest-cd` (2026.2) não tem o IPM (`%IPM.Main` e `%ZPM.PackageManager` ausentes); ele é instalado pelo instalador do registro.
- Fato: o registro tem `fhir-portal` 1.0.3 (sem o `User.SQLvar`) e `fhir-server` 1.3.7, que é o próprio `iris-fhir-template`. O `iris.script` do template roda `zpm "install fhir-portal"`.
- Decision (autonomia): breakdown de 6 entradas aprovado depois da validação, com as correções dela. A publicação (entrada 6) vem depois do sweep, para a 1.1.0 sair com a limpeza.
- Tracer bullet: entrada 2, o módulo instalando o portal inteiro e o job de CI provando pelo IPM, depois do spike (entrada 1).
- Sequenciamento: 1 → 2 → 3 → 4 → 5 → 6. A entrada 4 espera a 3 porque as duas mexem no `ci.yml` e na configuração de papéis.
- Decisões que o spike define: o namespace do módulo do portal e o comportamento quando o FHIRSERVER ou o `/fhir/r4` ainda não existem (ordem do template); como resolver a posse do `User.SQLvar` frente ao `User.PKG` do `fhir-server` (a robustez decidiu que a classe fica no projeto).
- Unknown: se o `fhir-server` 1.3.7 instala no 2026.2; se o `<CSPApplication>` do IPM aceita `ServeFiles=3`, `GroupById` e `MatchRoles` com papel próprio, ou se a classe instaladora precisa ajustar isso; se o `User.PKG` do template entra em conflito com o `User.SQLvar` do portal; como dar ao `/fhir/api` leitura sem escrita nas tabelas FHIR. O spike (entrada 1) responde antes do tracer.
