---
type: initiative
title: "iris-fhir-portal atual, seguro e de volta como referência"
parent: none
covers: [R1, R2, R3, R4, R5, R6, R7, R8]
after: []
assignee: ""
risk: medium
---

# iris-fhir-portal atual, seguro e de volta como referência

## Description

O portal nasceu em 2020 como exemplo de Patient Chart sobre o FHIR do IRIS for Health e é instalado pelo `iris-fhir-template` oficial via IPM. Hoje ele só funciona no IRIS 2026.2 por causa do upgrade feito nesta sessão, e apenas pelo caminho Docker. Esta iniciativa leva o projeto a um estado em que os dois caminhos de instalação funcionam no IRIS atual, sem falhas de segurança conhecidas, com testes que impedem a regressão, e com uma base que permite exibir mais do prontuário. Tudo isso mantendo o código pequeno e didático que os quatro artigos explicam. A avaliação que fundamenta tudo está em `avaliacao-do-projeto.md`.

## Outcome

Quem instala o portal (Docker ou `zpm "install fhir-portal"`, inclusive pelo `iris-fhir-template`) vê o prontuário funcionando no IRIS for Health atual. O sinal é o CI verde, rodando build, smoke test e e2e a cada PR.

## Requirements

- R1: Roda no IRIS for Health 2026.2 com build reproduzível e verificado em CI. (avaliação §2, §3, §4 Qualidade)
- R2: Sem XSS nem injeção; o acesso a dados segue o menor privilégio; nenhuma credencial administrativa fica no código. (§4 Segurança)
- R3: A tela não quebra com recursos FHIR válidos mas incompletos, nem com buscas vazias ou paginadas; os erros aparecem para o usuário. (§4 Correção funcional)
- R4: O pacote IPM instala um portal funcional, sem passo manual, no IRIS atual e dentro do `iris-fhir-template`. (§3 Atenção, §4 Arquitetura)
- R5: As dependências de frontend são mantidas, inventariadas e com versões sem CVE conhecida. (§4 Arquitetura, Segurança)
- R6: O prontuário mostra mais do que os dados já carregados oferecem: Condition, MedicationRequest, Encounter e uma linha do tempo. (§5)
- R7: README, README-JP, dev.md e os exemplos SQL refletem o estado atual; existe uma demo reproduzível. (§4 Documentação)
- R8: O layout funciona como prontuário: resumo do paciente à vista, dados clínicos legíveis sem cliques extras, gráfico de laboratório integrado e tela utilizável em 390px sem rolagem horizontal. (§4 Layout e UX)

## Done when

1. `docker compose up` a partir de um clone limpo e `zpm "install fhir-portal"` num IRIS for Health 2026.2 limpo resultam ambos em lista de pacientes, detalhes, edição e gráfico de laboratório funcionando, verificados em CI.
2. Uma varredura de XSS e injeção nas rotas e campos do portal não encontra nada, e `/fhir/api` não usa `%All`.
3. A suíte e2e cobre paciente sem SSN, sem endereço, sem exames e com mais de uma página de resultados, e passa.
4. Nenhuma dependência de frontend tem CVE conhecida no momento do release.
5. Uma nova versão do `fhir-portal` está publicada no registro IPM e o `iris-fhir-template` a instala sem erro.
6. Num celular de 390px, é possível escolher um paciente, ler o resumo, as alergias e os exames recentes e abrir o gráfico de um exame sem rolagem horizontal.

## Boundaries

O próprio portal: frontend `fhirUI/`, classes `diashenrique.*` e `User.SQLvar`, a infraestrutura Docker e o `module.xml`. Ficam de fora a configuração do FHIR server além do necessário para o portal funcionar, um app clínico de produção (o projeto continua sendo um exemplo) e qualquer coisa ligada a sentai-task além da referência de versão. Caminho tracer: um paciente carregado pelo build, exibido, editado e com o gráfico de laboratório aberto, coberto por um e2e no CI.

- Touch point: `iris-fhir-template`, que consome o pacote via `zpm "install fhir-portal"`; nenhuma mudança no repo dele, só a verificação de que a instalação funciona. Responsável: epic-ipm-paridade.
- Touch point: registro IPM (pm.community.intersystems.com), para publicar a nova versão. Responsável: epic-ipm-paridade.

## References

- avaliação — `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`
- artigos — community.intersystems.com/post/my-experience-working-fhir, /overview-iris-fhir-portal, /updating-patient-resource-using-fhir-js, /getting-fhir-information-using-sql
- referência de versão — github.com/musketeers-br/sentai-task, Dockerfile (`intersystems/iris-community:latest-cd`)
- consumidor — github.com/intersystems-community/iris-fhir-template, iris.script

## Notes

- Decision: usar o mesmo canal de imagem do sentai-task, `latest-cd`, na variante `irishealth-community` (pedido do usuário, 2026-10-05). O upgrade já foi aplicado e verificado nesta sessão.
- Decision: estratégia FHIR JsonAdvSQL no lugar da Json legada (2026-10-05), aplicada no upgrade.
- Assumption: o projeto continua sendo um exemplo didático. As escolhas de stack preferem legibilidade a frameworks pesados (sem build obrigatório no frontend até que o E5 decida o contrário).
- Decision: manter `intersystems/irishealth-community:latest-cd` em vez de fixar `:2026.2`; o CI do E1 detecta quebras de uma nova versão CD (usuário, 2026-10-05).
- Decision: autenticação do E2 por tela de login simples com sessão do IRIS; SMART on FHIR/OAuth2 fica fora desta iniciativa (usuário, 2026-10-05).
- Decision: versionar tudo, incluindo `.claude/skills`, `_bmad/` e `_bmad-output/` (usuário, 2026-10-05).
- Decision: melhorias de layout entram como épico próprio, o epic-layout-prontuario (usuário pediu, 2026-10-05).
- Open question: reativar uma demo pública? Ela pede hospedagem e uma política de reset de dados.
- Unknown: se o FHIR SQL Builder do IRIS 2026.2 cobre as consultas do gráfico sem perder o valor didático do artigo 4; o E3 contém um spike sobre isso.
- Waits on epic-frontend-deps because: o novo layout é construído sobre a base de frontend escolhida, para não ser refeito duas vezes.
- Source conflict: o README e o artigo 4 citam `HSFHIR_I0001_*`; o servidor atual usa `HSFHIR_X0001_*`. O README e o example.sql já foram corrigidos; o artigo precisa de uma errata ou de um novo artigo (E7).
