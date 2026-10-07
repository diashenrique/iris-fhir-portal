---
title: 'Publicar fhir-portal 1.1.0 e documentar a instalação por IPM'
type: 'docs'
ticket: '6'
created: '2026-10-06'
status: 'in-progress'
baseline_revision: '172be2d0a035a391661033a8ea95c49f5f4cfaac'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O registro IPM só tem a 1.0.3, e o README descreve uma instalação que não funciona mais.

**Approach:** README com a seção de instalação por IPM: namespace, ordem, parâmetro de demo, aviso fora do namespace do FHIR, desinstalação e o contorno do `fhir-server` no 2026.2. `scripts/ipm-install.sh` aceita `PORTAL_SOURCE=registry`, e o `workflow_dispatch` do CI ganha a entrada `portal_source`, para provar a versão publicada no mesmo job. A publicação da 1.1.0 é do usuário (hitl): precisa das credenciais do registro.

</frozen-after-approval>

## Passos do usuário (hitl)

1. Depois do merge, publicar a 1.1.0 a partir do `master`, pelo Open Exchange (atualizar o app para a release nova) ou com `zpm "publish"` e as credenciais do registro.
2. Rodar o CI manualmente com `portal_source: registry`: Actions → CI → Run workflow. A perna "Install through IPM" instala a versão publicada; verde fecha o Done when 4 do épico.

3. Com o CI verde no passo 2, fechar a issue #6 ("The second page with lab results doesn't work"), dizendo que a 1.1.0 empacota o `User.SQLvar`, que faltava na 1.0.3 e deixava a página de exames vazia.

## Implementation Notes

- Antes da publicação, `PORTAL_SOURCE=registry` falha de propósito: a 1.0.3 não escreve "fhir-portal: configured".
