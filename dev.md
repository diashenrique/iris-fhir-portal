# Development notes

Commands for working on the portal. The [README](README.md) explains what the portal is and how to install it.

## Container

```
docker compose build              # build the image: FHIR server, data, the portal module (zpm load)
docker compose build --no-cache   # the same, from scratch
docker compose up -d
docker compose down
```

The build runs `iris.script`. It creates the FHIRSERVER namespace and the `/fhir/r4` endpoint (JsonAdvSQL), loads `data/fhir`, and installs the portal with `zpm "load /home/irisowner/dev -DDemoUser=1 -DPortalPath=/home/irisowner/dev/fhirUI/"`. The build fails if the module does not configure the portal.

`/fhir/portal` serves `fhirUI/` from the checkout, which is mounted in the container. After editing a page, a script or a stylesheet, run `docker compose restart`: the Web Gateway caches the gzipped files and keeps serving the old ones until IRIS restarts.

## IRIS terminal

```
docker compose exec iris iris session IRIS -U FHIRSERVER
```

After changing a class in `src/`, load the module again in that terminal:

```
zpm "load /home/irisowner/dev -DDemoUser=1 -DPortalPath=/home/irisowner/dev/fhirUI/"
```

The VS Code settings in `.vscode/` connect the ObjectScript extension to the container through the InterSystems Server Manager. The Server Manager asks for the password on the first connection.

## Checks

The same checks CI runs, against the local container (`BASE_URL` defaults to `http://localhost:32783`):

```
bash scripts/smoke.sh               # login, FHIR, /fhir/api, pages, logout
bash scripts/check-readonly.sh      # /fhir/api can read the FHIR tables, not write
bash scripts/check-readme-sql.sh    # the SQL examples of README, README-JP and misc/sql/example.sql
cd e2e && npm ci && npx playwright test
```

The e2e tests log out after each test. The Community license allows few sessions, and the sessions of a crashed run expire after 15 minutes; `docker compose restart` frees them at once.

## Frontend libraries

They come from npm through `vendor/`; see [vendor/README.md](vendor/README.md).

```
cd vendor && npm ci --ignore-scripts && node sync.mjs --check
```

## Installation through IPM

`scripts/ipm-install.sh` installs, in a clean container on port 42783, IPM, the `fhir-server` package of the iris-fhir-template, and the module of this checkout. CI runs it as its second leg. `PORTAL_SOURCE=registry` installs the published `fhir-portal` package instead.

```
bash scripts/ipm-install.sh
BASE_URL=http://localhost:42783 bash scripts/smoke.sh
IRIS_EXEC="docker exec -i fhirportal-ipm" bash scripts/check-readonly.sh
```

## README screenshots

With the container up:

```
cd e2e && node screenshots.js
```

## Releases to the IPM registry

The same flow as [sentai-task](https://github.com/musketeers-br/sentai-task):

1. Every push to `master` runs `.github/workflows/bump-module-version.yml`. It raises the last number of `<Version>` in `module.xml` (1.1.0 becomes 1.1.1) and commits it as ProjectBot.
2. The maintainer publishes a new version of the app on [Open Exchange](https://openexchange.intersystems.com/package/iris-fhir-portal), which has "Publish in Package Manager" on. Open Exchange packages `module.xml` from GitHub and sends it to the registry (https://pm.community.intersystems.com/packages/fhir-portal).
3. Run CI by hand with `portal_source: registry` (Actions → CI → Run workflow). Its IPM leg installs the published package on a clean IRIS for Health with the `fhir-server` package.
