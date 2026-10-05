---
title: 'Credenciais fora do .vscode'
type: 'chore'
ticket: '5'
created: '2026-10-05'
status: 'built'
baseline_revision: '6d1bea33c6a68652da12e750c285fba8205a73b8'
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

**Problem:** `.vscode/settings.json` guarda a senha `SYS` do `_SYSTEM` (extensão ObjectScript) e do `SuperUser` (SQLTools) num arquivo versionado.

**Approach:** Remover as duas senhas. A extensão ObjectScript pede a senha quando o campo falta, e a conexão SQLTools passa a `askForPassword: true`. Os usernames ficam. Conferir com `git grep` que nenhum arquivo versionado guarda `SYS` como senha. Uma pessoa confere no VS Code que o prompt de senha conecta.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: 4 linhas em um arquivo. Risco baixo.

- Arquivo: `.vscode/settings.json` — sem `password` no `objectscript.conn` e no SQLTools (`askForPassword: true`); também saiu o link "FHIR server test" para `/fhir/r4/metadata`, que desde a story 2.2 responde 404 sem login.
- O grep do ticket (`"password"|SYS"`) casava com `zn "%SYS"` e com o `theme.min.js`. Troquei por `"password"[[:space:]]*:|:[[:space:]]*"SYS"`, que não acha nada no repo e acha 2 linhas na versão anterior do arquivo.
- Surpresa: depois da edição, a extensão ObjectScript do VS Code aberto regravou o arquivo com `"active": false` (mtime posterior à edição), o comportamento esperado quando ela pede a senha e o prompt fica sem resposta. O valor voltou para `true`. A checagem humana é justamente responder a esse prompt.
- Pendente (hitl): conferir no VS Code que o prompt de senha conecta. Se a extensão se desativar por um prompt cancelado, use "ObjectScript: Toggle Connection" ou volte `active` para `true`.

## Verification

**Commands:**
- `git grep -nE '"password"[[:space:]]*:|:[[:space:]]*"SYS"' -- . ':(exclude)_bmad-output' ':(exclude)_bmad' ':(exclude).claude'` -- expected: nenhuma senha.
- Manual (hitl): abrir o projeto no VS Code com o container no ar -- expected: a extensão ObjectScript e o SQLTools pedem a senha e conectam.

- Verificado no GitHub: PR #13, run 37322708909 verde em 6min15s (smoke, E2E com 5 testes e o passo "No CSP login-page alerts").

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 1 medium, 1 low, 0 false, 1 verificação humana pendente.

- medium → patch — `"active": false` no `objectscript.conn` desligaria a extensão: não veio da story, foi a própria extensão do VS Code aberto que gravou depois do prompt de senha sem resposta (mtime posterior à edição); restaurado para `true` e documentado nas notas.
- low → mantido — remover o link "FHIR server test" vai além das senhas: o link levava a um 404 desde a story 2.2; registrado nas notas.
- hitl pendente — conferir no VS Code que o prompt de senha conecta (ObjectScript e SQLTools): é do usuário.
