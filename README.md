# IRIS FHIR Portal

[![CI](https://github.com/diashenrique/iris-fhir-portal/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/diashenrique/iris-fhir-portal/actions/workflows/ci.yml)

The goal is to show how easy we can create a Patient Chart using FHIR capabilities in IRIS For Health and also empower the user with their own data.

## Prerequisites
Make sure you have [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) and [Docker desktop](https://www.docker.com/products/docker-desktop) installed.

## Installation 

Clone/git pull the repo into any local directory

```
$ git clone https://github.com/diashenrique/iris-fhir-portal.git
```

Open the terminal in this directory and run:

```
$ docker compose up -d
```

The image is built on `intersystems/irishealth-community:latest-cd` (InterSystems IRIS for Health 2026.2), the same release channel used by [sentai-task](https://github.com/musketeers-br/sentai-task). The FHIR R4 server uses the JsonAdvSQL storage strategy, so its SQL schemas are `HSFHIR_X0001_R` and `HSFHIR_X0001_S`.

The portal requires a login. Open http://localhost:32783/fhir/portal/diashenrique.fhir.portal.Home.cls and sign in as the demo user `fhirportal` / `fhirportal` (no roles), created during the build. One IRIS session then covers the pages, the FHIR endpoint `/fhir/r4` and the REST API `/fhir/api`; the Logout link at the top ends it. Do not expose this container outside your machine.

## Checking your Docker installation

CI runs these checks on every pull request and push to master. To run them against your local container (Docker Compose setup only; set `BASE_URL` for both if you changed the port, default `http://localhost:32783`):

```
$ bash scripts/smoke.sh
```

signs in and checks the FHIR server, the `/fhir/api` REST routes, both pages, and that nothing answers without a login or after logout. `bash scripts/check-readonly.sh` checks that the roles of `/fhir/api` can read the FHIR tables and cannot write to them. The browser test needs [Node.js](https://nodejs.org/) 22 or later and signs in and walks through the patient list, details, an update, the lab chart and logout. It changes one patient's city and restores it at the end:

```
$ cd e2e
$ npm ci
$ npx playwright install chromium
$ npx playwright test
```

On a fresh Linux machine, use `npx playwright install --with-deps chromium` to also get the browser's system libraries.

The frontend libraries come from npm through `vendor/` (see [vendor/README.md](vendor/README.md) and [vendor/INVENTORY.md](vendor/INVENTORY.md)). CI checks that the files in `fhirUI/assets/vendor` match the lockfile and runs `npm audit` on them. To run the same check locally: `cd vendor && npm ci --ignore-scripts && node sync.mjs --check`.

## Installation via IPM

The portal needs IRIS for Health with a FHIR R4 server at `/fhir/r4` that uses the JsonAdvSQL storage strategy, for example the `fhir-server` package of [iris-fhir-template](https://github.com/intersystems-community/iris-fhir-template). Install the portal in the namespace of that server, after it:

```
zn "FHIRSERVER"
zpm "install fhir-portal"
```

The module (version 1.1.0 or later) creates everything the Docker setup has, through `diashenrique.fhir.portal.Installer`:
- the web apps `/fhir/portal` and `/fhir/api`, both with password login;
- one session shared with `/fhir/r4`;
- the roles `FHIRPortalRead` (read-only FHIR databases) and `FHIRPortalAPI` (SELECT on the endpoint's SQL schemas and EXECUTE on the JSON SQL functions).

The Docker image installs the portal through the same module.

Open `http://your-server:port/fhir/portal/diashenrique.fhir.portal.Home.cls` and sign in with an IRIS user. To also create the demo login `fhirportal` / `fhirportal`, pass the module parameter. With IPM 0.10, the `-Dzpm.` form does not reach the module:

```
zpm "install fhir-portal -DDemoUser=1"
```

Installed in a namespace without `/fhir/r4` (for example `USER`, before the FHIR server exists), the module only prints a warning and configures nothing. `zpm "uninstall fhir-portal"` removes the two web apps, the roles and the demo user. The session settings stay on `/fhir/r4`.

On IRIS for Health 2026.2, `fhir-server` 1.3.7 fails when it creates the FHIRSERVER namespace itself. `scripts/ipm-install.sh` shows the workaround CI uses: create the namespace first and map IPM into it. To check the whole IPM path in a clean container on port 42783:

```
$ bash scripts/ipm-install.sh
$ BASE_URL=http://localhost:42783 bash scripts/smoke.sh
```

## Testing the FHIR Application

Open URL http://localhost:32783/fhir/portal/diashenrique.fhir.portal.Home.cls and sign in as `fhirportal` / `fhirportal`.

![FHIR Portal](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/fhirPortal.png)

On the left panel, you have a patient list with a filter bar on top.

![Patient Search list](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/search.gif)

Clicking on the patient will give you detailed information on the Patient Details form.

![Patient Search list](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/formloaded_badges.png)

The form provides the following information:

- FHIR Patient ID
- SSN (Social Security Number)
- First Name
- Last Name
- Date of Birth
- Gender
- Address
- City
- State
- Country

After the Patient Details form, we have an accordion with four blocks of information. The FHIR Resources that provide those pieces of information are:

- AllergyIntolerance
- Observation
- - Category: vital-signs
- - Category: laboratory
- Immunization

Here we have a screenshot of Laboratory Results:

![Lab Results](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/accordionResults.png)

It's possible to update the Patient Details
![Updating Patient Details](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/updatePatientDetails.gif)

## Interface

The interface it's totally responsive. Meaning that you can browse the results on mobile devices.

Portrait Mode

![Mobile Portrait mode](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/mobilePortrait.gif)

Landscape Mode
![Mobile Portrait mode](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/mobileLandscape.gif)

## Charts for Laboratory Results
When you realize the same lab tests over time, the best way to compare the results is through charts! They give you a better perspective of your evolution over time. 

Thinking about that, I introduce to you the **chart module for laboratory results**!

Now, when the FHIR Resource gives us lab results an icon/link will appear to let you see the results in a chart format.
![Chart Icon](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/labIconZoom.png)

The lab results will open in a new page.

The selection "Lab Tests" will show all the tests for the patient.
![Lab Results](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/labresultChart.gif)

All information provided on this page was retrieved making usage of _**SQL Schema of FHIR Resources**_.

## FHIR Data Source
For a transparent approach with patient data, at the end of the page, there is a modal with all the information provided by the FHIR resources.

![FHIR Resource Data](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/FHIR_ResourceData.png)
