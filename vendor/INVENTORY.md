# Inventory of the libraries fhirUI loads

Every library the portal page (`patientlist.html`) loads, where it comes from, and its version. (`labresult.html` only sends the browser to the chart of the patient and loads nothing.)

- **npm (manifest):** pinned in `package-lock.json`, copied by `sync.mjs`, checked in CI.
- **not on npm:** kept as is, with the origin recorded here.

| Library | Version | Source | Served from |
|---|---|---|---|
| jQuery | 3.7.1 | npm `jquery` | `assets/vendor/jquery/` |
| Bootstrap (JS) | 4.6.2 | npm `bootstrap` | `assets/vendor/bootstrap/js/bootstrap.min.js` |
| Popper | 1.16.1 | npm `popper.js` (the version Bootstrap 4.6 requires) | `assets/vendor/bootstrap/js/popper.min.js` |
| Chart.js | 4.5.1 | npm `chart.js` | `assets/vendor/chart.js/chart.umd.min.js` |
| chartjs-adapter-date-fns | 3.0.0 | npm `chartjs-adapter-date-fns` (bundle with date-fns) | `assets/vendor/chart.js/chartjs-adapter-date-fns.bundle.min.js` |
| StackedMenu | 1.1.12 | npm `stacked-menu` | `assets/vendor/stacked-menu/` |
| flatpickr (and the monthSelect plugin) | 4.6.13 | npm `flatpickr` | `assets/vendor/flatpickr/` |
| toastr | 2.1.4 | npm `toastr` | `assets/vendor/toastr/` |
| perfect-scrollbar | 1.5.6 | npm `perfect-scrollbar` | `assets/vendor/perfect-scrollbar/` |
| PACE | 1.2.4 | npm `pace-js` | `assets/vendor/pace/` |
| Font Awesome Free | 5.15.4 | npm `@fortawesome/fontawesome-free` (woff2, woff and ttf webfonts only) | `assets/vendor/fontawesome/` |
| Open Iconic | 1.1.1 | npm `open-iconic` | `assets/vendor/open-iconic/` |
| Looper theme (CSS with Bootstrap 4 compiled in, and JS) | unknown (2019) | **not on npm**: commercial Bootstrap 4 template by Stilearning (uselooper.com) | `assets/stylesheets/theme.min.css`, `assets/javascript/theme.min.js` |
| fhir.js (jQuery build) | unknown (2020 copy) | **not on npm as a build**: the npm package `fhir.js` 0.0.22 ships only the sources (`src/adapters/jquery.js`); the articles 1 to 3 teach the portal with this build | `assets/vendor/fhir.js/jqFhir.js` |

Fonts: the pages also load Fira Sans from Google Fonts (`fonts.googleapis.com`).

## Looper theme license

Looper is a paid template. The maintainer of this repository bought it on 2019-10-18 on the Bootstrap Themes marketplace (themes.getbootstrap.com), with a **Standard License**. Only `theme.min.css` and `theme.min.js` are used.

- **What the Standard License allows, as far as public summaries show:** the theme in one end product, which may be distributed for free in unlimited copies, modified or combined with other work. The portal is that product: free, in this repository and in the `fhir-portal` IPM package.
- **What could not be confirmed:** whether the license allows the theme files themselves to be publicly downloadable, as they are in a public repository.
- **Why:** Bootstrap Themes closed in 2025, its license and terms pages now point to a [sunsetting FAQ](https://glow-limpet-524.notion.site/Sunsetting-Bootstrap-Themes-Customer-FAQ-1c54f54098ac804e9d69d4b2d7c14bd5), and no copy of the license text was kept with the purchase.

If that turns out not to be allowed, the theme can be replaced by a free one. Its Bootstrap 4 classes are used throughout `fhirUI`, so that is a redesign of its own (see `ux-layout-prontuario/DESIGN.md`, which is built on the Looper tokens).
