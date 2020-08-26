# IRIS FHIR Portal
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
$ docker-compose up -d
```

## Testing the FHIR Application

Open URL http://localhost:32783/csp/user/fhirUI/patientlist.html

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

The interface it's totally responsive. Meaning that you can browse the results on mobile devices.

Portrait Mode

![Mobile Portrait mode](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/mobilePortrait.gif)

Landscape Mode
![Mobile Portrait mode](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/mobileLandscape.gif)

For a transparent approach with patient data, at the end of the page, there is a modal with all the information provided by the FHIR resources.

![FHIR Resource Data](https://raw.githubusercontent.com/diashenrique/iris-fhir-portal/master/img/FHIR_ResourceData.png)
