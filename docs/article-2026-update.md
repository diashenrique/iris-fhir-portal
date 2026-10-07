<!-- Draft for the InterSystems Developer Community. Not published: the author publishes it.
     Links point to the repository on GitHub, so they work from the Community too. -->

# iris-fhir-portal, six years later: IRIS for Health 2026.2, a login and a real patient chart

In 2020 I wrote iris-fhir-portal for the FHIR contest, and explained it in four articles:

1. [My experience working with FHIR](https://community.intersystems.com/post/my-experience-working-fhir)
2. [Overview of iris-fhir-portal](https://community.intersystems.com/post/overview-iris-fhir-portal)
3. [Updating Patient resource using fhir.js](https://community.intersystems.com/post/updating-patient-resource-using-fhir-js)
4. [Getting FHIR information using SQL](https://community.intersystems.com/post/getting-fhir-information-using-sql)

The portal is still installed by the `iris-fhir-template` (`zpm "install fhir-portal"`), but on a current IRIS it no longer worked: the lab results page came up empty, the SQL schemas of the articles were gone, and the pages had no login. This post is about bringing it to IRIS for Health 2026.2, and about what changed in each article.

![The patient chart](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/portal-chart.png)

## What changed

- **IRIS for Health 2026.2.** The image is `intersystems/irishealth-community:latest-cd`. The FHIR server uses the **JsonAdvSQL** storage strategy, the current one, instead of the legacy Json strategy.
- **One login for everything.** The pages, the FHIR endpoint `/fhir/r4` and the portal's REST API `/fhir/api` share one IRIS session, through the session group of the web applications (`GroupById`). There is no credential in the JavaScript anymore. The static files are served only to a logged-in session (`ServeFiles=3`), and **Log out** ends the session everywhere.
- **A read-only SQL API.** `/fhir/api` runs with two roles:
  - `FHIRPortalRead` reads the FHIR databases and cannot write them;
  - `FHIRPortalAPI` has `SELECT` on the endpoint's schemas and `EXECUTE` on the JSON functions.

  An `UPDATE` or `DELETE` from it fails with SQLCODE -99, and CI checks that.
- **An IPM module that installs everything.** `fhir-portal` 1.1.0 creates the web applications, the roles, the grants and the shared session. Install it in the namespace of the FHIR server: `zn "FHIRSERVER"` then `zpm "install fhir-portal -DDemoUser=1"`. *(Until 1.1.0 is published on the registry, install it from the repository with `zpm "load"`; the README has both.)* The Docker image installs the portal through the same module.
- **A patient chart instead of a form.**
  - **Layout:** a summary of the patient (age, sex, an allergy alert, active conditions) on top, with clinical cards that are always open: allergies, conditions, medications, vital signs, laboratory, immunizations, encounters and care plans.
  - **Lab chart:** inside the Laboratory card, no longer on a separate page.
  - **Timeline:** every dated event of the patient, from one call to `Patient/$everything`.
  - **Screens and languages:** the layout works on a phone, and the interface can switch to Portuguese.
- **Kept honest by CI.** Every pull request builds the image, installs the portal through IPM in a second, clean container, and runs a smoke test, the end-to-end tests (Playwright), a check of the vendored libraries (`npm audit`) and the SQL examples of the README against the server.

![The Timeline from $everything](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/portal-timeline.png)

## Errata

### Article 1, "My experience working with FHIR"

- **Setting up the FHIR server.** The setup steps of 2020 (the older installer classes and the Json strategy) are replaced by `HS.Util.Installer.Foundation` and `HS.FHIRServer.Installer.InstallInstance` with the JsonAdvSQL strategy and the `hl7.fhir.r4.core@4.0.1` package. See [`iris.script`](https://github.com/diashenrique/iris-fhir-portal/blob/master/iris.script).
- **Calling the server.** The FHIR server now refuses anonymous calls with 401. The portal no longer sends a user and password from the browser: you log in once, and the IRIS session authenticates every call.
- **Patient ids.** The ids are assigned when the data is loaded, so they change from one build to the next. Examples that use `Patient/1` need the id from your own server.

### Article 2, "Overview of iris-fhir-portal"

- **The address.** The portal is at `/fhir/portal/diashenrique.fhir.portal.Home.cls`, which asks for the login. It was `/csp/user/fhirUI/patientlist.html`.
- **The layout.** The accordion of four blocks is gone: the clinical cards are always open, and there are more of them. The screenshots of the article show the old layout; the README has current ones.
- **The SSN.** It is found by its identifier system (`http://hl7.org/fhir/sid/us-ssn`), not by its position in the `identifier` array, and it stays masked until you choose **Reveal**.
- **The data on screen.** The patient data is written as text (no HTML built from FHIR values). Dates are readable, and numbers are rounded.

### Article 3, "Updating Patient resource using fhir.js"

- **Editing.** It happens in an **Edit** modal, and the update is still `client.update` of fhir.js.
- **Empty fields.** An empty field removes the element from the resource instead of saving an empty string, which FHIR rejects.
- **The SSN.** It is only saved when it was revealed and edited, so the mask is never written back.
- **After saving.** The summary and the FHIR JSON panel show the server's copy, with the new `meta.versionId`.

### Article 4, "Getting FHIR information using SQL"

- **The schemas.** They are those of JsonAdvSQL: `HSFHIR_X0001_R.Rsrc` holds every resource as JSON (with `ResourceType`, `ResourceId` and `Deleted`), and `HSFHIR_X0001_S.<Resource>` holds the search parameters. The `HSFHIR_I0001_*` tables of the article no longer exist.
- **Table names.** `Dispatch` asks the storage strategy of `/fhir/r4` for them (`GetResourceTable`, `GetSearchTable`) instead of hard-coding them. It filters by patient on the search table and extracts the fields with the article's functions, `GetJSON`, `GetProp` and `GetAtJSON`, which are still the heart of it.
- **Parameters and errors.** The queries use bound parameters (`?`). Invalid ids answer 400 and a failed query answers 500, instead of an empty list.
- **`GetAtJSON`.** It returns an empty string past the end of an array.
- **The examples.** [`misc/sql/example.sql`](https://github.com/diashenrique/iris-fhir-portal/blob/master/misc/sql/example.sql) and the [README](https://github.com/diashenrique/iris-fhir-portal#how-the-portal-reads-fhir-data) have the current queries. CI runs every one of them against the server, so they do not go stale again.
- **The lab chart.** It lives in the Laboratory card. `labresult.html` now sends you to the patient's chart.

## Try it

```
git clone https://github.com/diashenrique/iris-fhir-portal.git
cd iris-fhir-portal
docker compose up -d
```

Then open http://localhost:32783/fhir/portal/diashenrique.fhir.portal.Home.cls and log in as `fhirportal` / `fhirportal`. The [README](https://github.com/diashenrique/iris-fhir-portal#readme) has the rest.
