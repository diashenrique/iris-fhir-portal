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

# The checkout is bind-mounted only for this step (BuildKit): the FHIR test data is loaded and the portal
# module installed from it (zpm load), nothing is copied into the image layers. The image has no IPM, so
# its installer comes from the community registry, as in musketeers-br/sentai-task. iris session exits 0 even
# when a line of iris.script fails, so the build checks the log for the portal module's success line.
RUN --mount=type=bind,src=.,dst=. \
    wget -q https://pm.community.intersystems.com/packages/zpm/latest/installer -O /tmp/zpm.xml && \
    iris start IRIS && \
    iris session IRIS < iris.script | tee /tmp/iris-script.log && \
    iris stop IRIS quietly && \
    grep -q "fhir-portal: configured" /tmp/iris-script.log && \
    rm -f /tmp/zpm.xml /tmp/iris-script.log
