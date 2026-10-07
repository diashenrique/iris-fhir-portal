---
title: 'Bootstrap 4.6 e o inventário das bibliotecas fora do npm'
type: 'chore'
ticket: '3'
created: '2026-10-07'
status: 'built'
baseline_revision: '38ad7f819fc3147c610a6586c4b00da2a78a769c'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Bootstrap JS 4.3.1 e o popper são cópias manuais com 3,7 MB de CSS e mapas que nenhuma página carrega, e não há registro da origem do tema.

**Approach:** `bootstrap` 4.6.2, `popper.js` 1.16.1 (o que o Bootstrap 4.6 pede) e `stacked-menu` 1.1.12 (a mesma versão vendorizada, que está no npm) entram pelo manifesto; o sync apaga o resto das pastas. `vendor/INVENTORY.md` lista toda biblioteca carregada, com versão e origem.

</frozen-after-approval>

## Implementation Notes

- Achado: o tema é o Looper (Stilearning), um template comercial de Bootstrap 4. O inventário registra a origem e pede ao mantenedor do repositório que confirme a licença de redistribuição. Essa decisão é do usuário.
- O `vendor/bootstrap` caiu de 3,7 MB para 96 KB, e o `stacked-menu` perdeu os arquivos `.map` e as versões não minificadas.
- Verificado:
  - Smoke inteiro e e2e 25/25.
  - Na página, `$.fn.tooltip.Constructor.VERSION` é 4.6.2 e o jQuery é 3.7.1.
  - O acordeão abre uma seção por vez (como o `data-parent` define), o modal docked abre, e não há erro de script. O único 404 é o ícone da página de login do IRIS, já registrado na 5.2.

## Review Triage Log

Revisão `quick` do implementador: 0 achados.
