---
title: 'README-JP e dev.md atuais'
type: 'docs'
ticket: '3'
created: '2026-10-07'
status: done
baseline_revision: 'dcac83bc8d8acc2fa226d4c5fc7d354ae173dc27'
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

**Problem:** O README-JP é o README do `iris-fhirserver-template` (não fala do portal), e o `dev.md` traz comandos do template de 2020, com credenciais do registro de teste do IPM.

**Approach:**
- **README-JP:** passa a ser a tradução japonesa do README da 7.2, com os mesmos blocos sql (verificados pelo `check-readme-sql`) e as mesmas imagens relativas.
- **`dev.md`:** é reescrito com os comandos atuais: build, terminal, `zpm load`, o `docker compose restart` por causa do cache do Web Gateway, as checagens, o vendor, a instalação por IPM e as capturas.

</frozen-after-approval>

## Implementation Notes

- O README-JP diz que não há interface em japonês e aponta para o README em inglês.
- Verificado:
  - `git grep -n 'fhirtemplate\|PackageSample\|I0001' -- README-JP.md dev.md` não encontra nada.
  - Os links internos dos dois arquivos existem.
  - O `check-readme-sql` passa com 10 exemplos, 2 deles do README-JP.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
