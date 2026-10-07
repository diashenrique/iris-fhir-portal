# Inventory of the libraries fhirUI loads

Every library the pages (`patientlist.html`, `labresult.html`) load, where it comes from, and its version.

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

Looper is a paid template. Whoever maintains this repository should confirm that its license allows the files to be redistributed in a public repository and in the IPM package. Only `theme.min.css` and `theme.min.js` are used.
