---
title: 'Remover o hook objectscript-quality não fixado'
type: 'chore'
ticket: '4'
created: '2026-10-05'
status: 'built'
baseline_revision: '8efe5d038cbf9d48e0da2d968ea14f28da67d629'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `.github/workflows/objectscript-quality.yml` baixa `iris-community-hook.sh` de um repositório de terceiros (litesolutions) sem versão fixa e o executa a cada push, o que expõe a cadeia de suprimentos do projeto.

**Approach:** Remover o workflow (decisão do usuário, 2026-10-05). A checagem de build passa a ser o `ci.yml` da story 1.1; a análise ObjectScript Quality pode voltar depois, com o script fixado num commit.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: remoção de um arquivo. Risco baixo, porque o `ci.yml` já cobre o build.

- Arquivo removido: `.github/workflows/objectscript-quality.yml`. Nenhuma outra referência a ele no repo (README, README-JP).
- O grep de verificação foi ampliado depois da revisão e roda sem ocorrências; um teste com 5 formas de download-e-execução confirmou que o padrão pega todas.

## Verification

**Commands:**
- `grep -rnE '(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z)?sh|(ba|z)?sh[[:space:]]+<\(|(curl|wget).*&&[[:space:]]*(ba|z)?sh|(-c|eval)[[:space:]]+"?\$\((curl|wget)' .github/workflows` -- expected: nenhuma ocorrência (o padrão pega `| sh`, `| bash`, `| sudo sh`, `bash <(curl …)`, `&& bash x.sh` e `-c "$(curl …)"`/`eval $(curl …)`; checagens HTTP como `code=$(curl …)` não casam).

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 0 medium, 1 low, 1 false.

- false — o plano não entraria no commit (só intent-to-add): o commit usa `git add -A`, como na story 1.1.
- low → patch — o grep de verificação só pegava `| sh`, `&& sh` e `sh ./`: ampliado para `| bash`, `| sudo sh`, `bash <(curl …)`, `&& bash x.sh` e `-c/eval $(curl …)`; uma primeira versão casava com `code=$(curl …)` do `ci.yml` e foi restringida; roda limpo em `.github/workflows`.
- verificação — no PR #9 só o workflow CI rodou; o objectscriptquality não disparou mais.
