ARG IMAGE=store/intersystems/iris-community:2020.1.0.204.0
ARG IMAGE=intersystemsdc/iris-community:2020.1.0.209.0-zpm
ARG IMAGE=intersystemsdc/iris-community:2020.2.0.204.0-zpm
ARG IMAGE=intersystemsdc/irishealth-community:2020.2.0.204.0-zpm
ARG IMAGE=intersystemsdc/irishealth-community:2020.3.0.200.0-zpm
#Replaced with below image to fix Error: Invalid Community Edition license
ARG IMAGE=intersystemsdc/irishealth-community:2021.1.0.215.3-zpm
ARG IMAGE=intersystemsdc/irishealth-community
# Same release channel as musketeers-br/sentai-task (intersystems/iris-community:latest-cd, IRIS 2026.2),
# in its IRIS for Health flavor: the FHIR server needs HealthShare libraries.
ARG IMAGE=intersystems/irishealth-community:latest-cd
FROM $IMAGE

WORKDIR /home/irisowner/dev

# The checkout is bind-mounted only for this step (BuildKit): the FHIR test data and the
# ObjectScript sources are loaded into the databases, nothing is copied into the image layers.
RUN --mount=type=bind,src=.,dst=. \
    iris start IRIS && \
    iris session IRIS < iris.script && \
    iris stop IRIS quietly
