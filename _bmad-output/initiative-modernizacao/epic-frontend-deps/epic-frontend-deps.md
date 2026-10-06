---
type: epic
title: "Dependências de frontend mantidas e inventariadas"
parent: initiative-modernizacao
covers: [R5]
after: []
assignee: ""
risk: medium
status: in-progress
---

# Dependências de frontend mantidas e inventariadas

## Description

As bibliotecas do `fhirUI` foram copiadas à mão em 2020 e não têm inventário.
- **Versões com CVE conhecida:** jQuery 3.4.1 tem a CVE-2020-11022 e a CVE-2020-11023; Chart.js 2.8 tem prototype pollution, corrigida na 2.9.4.
- **Versões desatualizadas:** Chart.js está três versões major atrás; Bootstrap 4.3.1 e flatpickr 4.6.1 também estão para trás.
- **Peso:** são 11 MB de vendor versionados, com 60 locales do flatpickr e fontes completas.

Este épico passa as bibliotecas para um manifesto npm com lockfile, em `vendor/` na raiz do repositório. Um script copia do `node_modules` para o `fhirUI` só os arquivos que as páginas usam, e o CI confere que os arquivos versionados batem com o lockfile e roda `npm audit`. O épico também atualiza as bibliotecas e acrescenta a acessibilidade básica que a iniciativa pediu.

## Outcome

Toda biblioteca servida pelo portal tem versão e origem registradas. Nenhuma tem advisory conhecido de severidade moderada ou maior, e o CI falha quando isso muda. O vendor fica só com o que as páginas carregam, e a lista de pacientes e o gráfico de exames têm acessibilidade básica.

## Requirements

- F1 (R5): Um manifesto (`package.json` com lockfile) registra cada biblioteca do `fhirUI` disponível no npm. As que não estão no npm (o tema e o stacked-menu) ficam num inventário com a origem e a versão. O manifesto fica em `vendor/`, fora do `fhirUI`, que o IPM empacota e o Docker serve.
- F2 (R5): Um script copia do `node_modules` para o `fhirUI/assets/vendor` só os arquivos que as páginas usam. No CI, um modo `--check` falha quando os arquivos versionados diferem do lockfile.
- F3 (R5): jQuery na 3.7.x, Bootstrap na 4.6.x (o tema é Bootstrap 4) e Chart.js na 4.x com adaptador de datas. flatpickr, toastr, perfect-scrollbar, pace e Font Awesome ficam na última versão compatível.
- F4 (R5): O CI roda `npm audit` no manifesto do `vendor/` (o `e2e/` é ferramenta de teste e fica fora) e falha com advisory de severidade moderada ou maior.
- F5 (R5): A lista de pacientes é navegável por teclado, e o gráfico de exames tem uma alternativa em texto com os mesmos valores.

## Done when

1. O check de vendor do CI (`--check` do script de cópia) fica verde, e mudar à mão um arquivo vendorizado o faz falhar.
2. `npm audit --audit-level=moderate` no manifesto não encontra nada, e o CI roda essa checagem.
3. As páginas carregam jQuery 3.7.x, Bootstrap 4.6.x e Chart.js 4.x, e o e2e passa inteiro.
4. Um teste e2e navega na lista de pacientes só pelo teclado e lê os valores do gráfico na alternativa em texto.
5. CI verde em `master`.

## Boundaries

Ficam no escopo as bibliotecas e os arquivos do `fhirUI` que as carregam, o script de vendor, o manifesto, o `ci.yml` e as mudanças de código que as atualizações exigem (`labresult.js` para o Chart.js 4). Ficam de fora:
- o redesenho de telas (epic-layout-prontuario);
- a troca de jQuery por JS puro;
- a troca do fhir.js (ver Notes);
- o Bootstrap 5, porque o tema é Bootstrap 4.

## References

- parent: `_bmad-output/initiative-modernizacao/initiative-modernizacao.md`, R5
- avaliação: `_bmad-output/initiative-modernizacao/avaliacao-do-projeto.md`, §3 (jQuery e CVE) e §4 Arquitetura (vendor, fhir.js, Chart.js)
- código: `fhirUI/patientlist.html` e `fhirUI/labresult.html` (as tags `<script>` e `<link>`), `fhirUI/resources/js/labresult.js` (o gráfico, com eixo `time` da API 2.x) e `fhirUI/resources/js/myFHIR.js` (o fhir.js em três chamadas: duas buscas e um update)

## Notes

- Decision (autonomia, 2026-10-06): o jQuery fica, atualizado. O epic-layout-prontuario vai reescrever as telas; migrar para JS puro agora seria reescrever duas vezes.
- Decision (autonomia, 2026-10-06): o fhir.js fica, fixado no manifesto (ou no inventário, se o npm não trouxer o build jQuery). Os artigos 1 a 3 ensinam o portal com ele, ele não tem CVE conhecida, e o uso é pequeno (duas buscas e um update). Trocá-lo é uma decisão de conteúdo dos artigos, para o epic-docs-demo.
- Decision (autonomia, 2026-10-06): fica o Bootstrap 4.6, porque o tema (`theme.min.css` e `theme.min.js`) é feito para o Bootstrap 4.
- Decision (autonomia, 2026-10-06): o tracer bullet é o manifesto mais o script de cópia e o check, provados com o jQuery 3.7.1; depois vem o Chart.js 4, a parte de que há menos certeza.
- Unknown: se o fhir.js do npm traz o build jQuery (`jqFhir.js`) idêntico ao versionado; se não trouxer, ele vai para o inventário dos arquivos fora do npm.
- Unknown: qual adaptador de datas do Chart.js 4 serve sem bundler (há builds UMD do `chartjs-adapter-date-fns`).
- Decision (autonomia, 2026-10-06): a validação do breakdown (set check) dividiu a entrada das "demais bibliotecas" em Bootstrap mais inventário (3) e o resto mais o `npm audit` (4). Também fez cada entrada remover os arquivos antigos da biblioteca que move, em vez de uma limpeza geral no tracer, pôs a acessibilidade depois da 4, que mexe nos mesmos HTML, e pôs o tracer depois da 4.5, que mexe no `ci.yml`.
- Decision (autonomia, 2026-10-06): a 1.1.0 do IPM sai com o vendor que estiver no `master` quando o usuário publicar; o épico não espera a publicação.
