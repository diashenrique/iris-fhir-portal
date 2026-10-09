---
type: epic
title: "Documentação e demo refletem o portal atual"
parent: initiative-modernizacao
covers: [R7]
after: []
assignee: ""
risk: low
status: done
---

# Documentação e demo refletem o portal atual

## Description

A documentação parou em 2020:
- **README:** as capturas mostram o layout antigo (formulário, acordeão, gráfico noutra aba).
- **README-JP:** é o README do `iris-fhirserver-template` e nem fala do portal.
- **`dev.md`:** traz comandos da época do template.
- **Artigos:** os quatro artigos da Developer Community descrevem o portal de 2020: esquema `HSFHIR_I0001_R`, sem login, fhir.js com usuário embutido.

Este épico reescreve o README com o portal atual:
- instalação por Docker e IPM, login e o que o prontuário mostra;
- como os dados chegam (fhir.js, SQL da `/fhir/api`, `$everything`);
- exemplos SQL que o CI executa;
- capturas novas, geradas por um script.

Também traduz o README para o README-JP, atualiza o `dev.md` e deixa um rascunho de artigo para a Developer Community, com a errata dos artigos 1 a 4. A publicação do artigo fica com o usuário.

## Outcome

Quem chega ao repositório vê o portal como ele é: instala pelo Docker ou pelo IPM, faz login com o usuário de demonstração e encontra no README o que cada parte faz e de onde vêm os dados. Os exemplos SQL do README rodam no servidor atual, e o CI garante isso. Quem leu os artigos de 2020 tem um rascunho de atualização pronto para publicar.

## Requirements

- D1 (R7): **README atual.**
  - Cobre a instalação por Docker e por IPM, o login de demonstração e o que o prontuário mostra: lista, resumo, cards, gráfico, Timeline e português.
  - Explica como os dados chegam: fhir.js no `/fhir/r4`, SQL na `/fhir/api` (artigo 4) e `$everything`.
  - Traz os testes (smoke, e2e, vendor) e capturas novas.
  - O que não existe mais sai: o acordeão, a página separada do gráfico e as imagens antigas.
- D2 (R7): **Exemplos SQL verificados.** O README e o `misc/sql/example.sql` mostram as consultas da `/fhir/api` no esquema atual: as tabelas resolvidas pelo endpoint e as funções `GetJSON`, `GetProp` e `GetAtJSON`. Um script do CI executa cada bloco SQL do README, do README-JP e do `example.sql` no FHIRSERVER e falha se um deles der erro.
- D3 (R7): **Capturas reproduzíveis.** Um script (Playwright) gera as capturas do README a partir do container.
- D4 (R7): **README-JP.** Passa a ser a tradução do README.
- D5 (R7): **`dev.md`.** Traz os comandos atuais: build, `zpm load`, vendor, smoke, e2e, instalação por IPM e o reinício por causa do cache do Web Gateway.
- D6 (R7): **Rascunho de artigo.** Um rascunho para a Developer Community, em `docs/`, descreve a modernização (IRIS 2026.2, JsonAdvSQL, login, IPM 1.1.0, layout) com a errata dos artigos 1 a 4. Publicar é do usuário (hitl).

## Done when

1. O script de exemplos SQL roda no CI, nas duas pernas, e passa; mudar uma tabela de um exemplo para um nome inexistente o faz falhar.
2. O README não referencia nenhuma imagem que não exista, e as capturas novas saem do script de capturas.
3. O README-JP e o `dev.md` descrevem o portal atual (sem `fhirtemplate`, `PackageSample` ou o esquema `I0001`), e os links internos apontam para arquivos que existem.
4. O rascunho do artigo está em `docs/` com a errata.
5. CI verde em `master`.

## Boundaries

No escopo: `README.md`, `README-JP.md`, `dev.md`, `docs/`, `img/`, `misc/sql/example.sql` (o par do artigo 4), o script de capturas e o script de exemplos SQL com o passo de CI.

Ficam de fora:
- publicar o artigo na Developer Community e mexer no `iris-fhir-template`, que são do usuário;
- regerar os dados Synthea (ver Notes);
- uma demo pública (ver Notes);
- mudanças no portal.

## References

- parent: `_bmad-output/initiative-modernizacao/initiative-modernizacao.md`, R7
- avaliação: `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`, §4 Documentação
- artigos: as quatro URLs dos artigos citadas no `avaliacao-do-projeto.md` (fontes)
- estado atual: os épicos fechados (E1 a E6 e E8) e os seus planos, que são a fonte do que o README descreve
- código: `src/diashenrique/fhir/portal/Dispatch.cls`, que tem as consultas da `/fhir/api`, e `scripts/`

## Notes

- Decision (autonomia, 2026-10-07): não haverá demo pública. A demo reproduzível é o `docker compose up` com os dados do repositório, provado no CI. O usuário comentou que o projeto tem pouca visibilidade (2026-10-07).
- Decision (autonomia, 2026-10-07): os dados Synthea de `data/fhir` ficam como estão. Eles carregam e cobrem todos os cards; regerá-los exigiria o Synthea (Java) e mudaria os pacientes de que os artigos falam.
- Decision (autonomia, 2026-10-07): o README fica em inglês, como os artigos, e o README-JP é a tradução dele. O `dev.md` fica em inglês.
- Decision (autonomia, 2026-10-07): o épico depende da 4.5, cujos dois caminhos de instalação já são os finais, e não da publicação da 1.1.0 (4.6). O README descreve a instalação por IPM a partir do checkout e pelo registro, quando a 1.1.0 for publicada.
- Fora deste épico, com o usuário: avisar o mantenedor do `iris-fhir-template` sobre o `fhir-server` quebrado no 2026.2 (spike 4.1).
- Decision (autonomia, 2026-10-07): o tracer bullet é a 7.1, os exemplos SQL verificados no CI. Ela é a única parte com risco técnico (SQL arbitrário pelo `iris session`, o esquema nas duas pernas), e o contrato dela vale para o README, o README-JP e o `example.sql`.
- Decision (autonomia, 2026-10-07): a sequência. A 7.1, a 7.2 e a 7.3 mexem nas mesmas seções do README, então correm em sequência. O artigo (7.4) só precisa do README (7.2) e pode correr junto com a 7.3.
- Decision (autonomia, 2026-10-07): o `misc/sql/example.sql`, o par do artigo 4, fica. Ele passa ao contrato dos blocos SQL (esquema X0001, sem ids fixos) e entra na checagem do CI.
- Decision (autonomia, 2026-10-07): a validação do breakdown (set check) também:
  - trocou as imagens do README por caminhos relativos (`img/...`);
  - ajustou os `after`;
  - deixou a instalação pelo registro como condicional à 4.6.
- Fechado (2026-10-07), com a checagem de fechamento:
  1. **MET.** O `check-readme-sql.sh` roda no CI, nas duas pernas, com 10 exemplos (2 do README, 2 do README-JP e 6 do `example.sql`). Trocar a tabela de um bloco por `NoSuchTable` o faz falhar (7.1).
  2. **MET.** Os 6 caminhos `img/` do README existem e saem do `e2e/screenshots.js`, e as 13 imagens antigas saíram (7.2). Nenhum dos quatro artigos usa imagens do repositório; elas ficam hospedadas na Developer Community.
  3. **MET.** O README-JP e o `dev.md` descrevem o portal atual, sem `fhirtemplate`, `PackageSample` nem `I0001`, e os links internos existem (7.3).
  4. **MET.** `docs/article-2026-update.md` traz uma errata para cada artigo (7.4).
  5. **MET.** O CI do PR do épico fecha o "verde em `master`".

  As 5 entradas estão `done`. Ficam com o usuário: publicar o rascunho do artigo e a 1.1.0 no registro IPM (4.6). Adiado: o botão "Reveal" no celular (`deferred-work.md`).
- Publicado (informado pelo usuário em 2026-10-09): o artigo saiu na Developer Community, https://community.intersystems.com/post/iris-fhir-portal-six-years-later-iris-health-2026-2-login-and-real-patient-chart. O README e o README-JP passam a apontar para ele.
