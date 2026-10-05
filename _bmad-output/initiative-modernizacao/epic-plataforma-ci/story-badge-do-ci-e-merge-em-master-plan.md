---
title: 'Badge do CI e merge em master'
type: 'chore'
ticket: '7'
created: '2026-10-05'
status: 'built'
baseline_revision: 'b3153aa59afd8149abe79aed0e871a2377a180bd'
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

**Problem:** O README não mostra se o CI está verde nem como rodar localmente as verificações que o CI executa (smoke e e2e), que são o fechamento do epic-plataforma-ci.

**Approach:** Badge do workflow `ci.yml` logo abaixo do título e uma seção curta logo depois de Installation, com `bash scripts/smoke.sh` e o e2e em `e2e/`. O merge em `master` é feito pelo usuário, como nos PRs #8 a #10, e esta story termina com o CI verde em `master`. O resto do README fica para o epic-docs-demo.

</frozen-after-approval>

## Implementation Notes

Rota oneshot: cerca de 20 linhas no README. Risco baixo.

- Arquivo: `README.md` — badge do `ci.yml` (branch master) abaixo do título; seção "Checking your installation" depois de Installation, com o smoke e os 4 comandos do e2e.
- O README é CRLF no checkout; a edição preserva os fins de linha (o diff só tem as linhas novas).
- Após a revisão, a seção virou "Checking your Docker installation": vale só para o setup Docker; `BASE_URL` serve aos dois comandos; Node.js 22+ é pré-requisito do e2e; o texto avisa que o teste altera e restaura a cidade de um paciente; e cita `--with-deps` no Linux. CI descrito como PR e push em master.

## Verification

**Commands:**
- CI do PR -- expected: verde.
- Depois do merge, o run de `push` em `master` -- expected: verde, com o badge mostrando passing.

## Review Triage Log

Revisão `quick`, passada 1: 0 high, 0 medium, 6 low, 0 false, 1 sem veredito.

- low → patch — `BASE_URL` citado só para o smoke, mas o e2e também usa: nota vale para os dois.
- low → patch — Node.js ausente dos pré-requisitos: citado na seção (22+, igual ao CI).
- low → patch — `playwright install` sem `--with-deps` difere do CI: nota para Linux limpo.
- low → patch — o README não dizia que o e2e grava no FHIR: avisa que altera e restaura a cidade.
- low → patch — "every pull request" incompleto: PR e push em master.
- low → patch — a seção parecia valer para o IPM: título e texto restritos ao setup Docker.
- verificação pendente — CI verde em master depois do merge (feito pelo usuário).
