# Inventory of the libraries fhirUI loads

Every library the pages (`patientlist.html`, `labresult.html`) load, where it comes from, and its version.

- **npm (manifest):** pinned in `package-lock.json`, copied by `sync.mjs`, checked in CI.
- **legacy copy:** a 2020 copy, moved to the manifest by entry 5.4 of epic-frontend-deps.
- **not on npm:** kept as is, with the origin recorded here.

| Library | Version | Source | Served from |
|---|---|---|---|
| jQuery | 3.7.1 | npm `jquery` | `assets/vendor/jquery/jquery.min.js` |
| Bootstrap (JS) | 4.6.2 | npm `bootstrap` | `assets/vendor/bootstrap/js/bootstrap.min.js` |
| Popper | 1.16.1 | npm `popper.js` (the version Bootstrap 4.6 requires) | `assets/vendor/bootstrap/js/popper.min.js` |
| Chart.js | 4.5.1 | npm `chart.js` | `assets/vendor/chart.js/chart.umd.min.js` |
| chartjs-adapter-date-fns | 3.0.0 | npm `chartjs-adapter-date-fns` (bundle with date-fns) | `assets/vendor/chart.js/chartjs-adapter-date-fns.bundle.min.js` |
| StackedMenu | 1.1.12 | npm `stacked-menu` | `assets/vendor/stacked-menu/stacked-menu.min.js` |
| Looper theme (CSS with Bootstrap 4 compiled in, and JS) | unknown (2019) | **not on npm**: commercial Bootstrap 4 template by Stilearning (uselooper.com) | `assets/stylesheets/theme.min.css`, `assets/javascript/theme.min.js` |
| flatpickr (and the monthSelect plugin) | 4.6.1 | legacy copy | `assets/vendor/flatpickr/` |
| toastr | 2.1.4 | legacy copy | `assets/javascript/toastr.min.js`, `assets/stylesheets/toastr.min.css` |
| perfect-scrollbar | 1.4.0 | legacy copy | `assets/vendor/perfect-scrollbar/` |
| PACE | 1.0.2 | legacy copy | `assets/vendor/pace/` |
| Font Awesome Free | 5.9.0 | legacy copy | `assets/vendor/fontawesome/` |
| Open Iconic | unknown | legacy copy | `assets/vendor/open-iconic/` |
| fhir.js (jQuery build) | unknown | legacy copy | `jqFhir.js` |

Fonts: the pages also load Fira Sans from Google Fonts (`fonts.googleapis.com`).

## Looper theme license

Looper is a paid template. Whoever maintains this repository should confirm that its license allows the files to be redistributed in a public repository and in the IPM package. Only `theme.min.css` and `theme.min.js` are used.
