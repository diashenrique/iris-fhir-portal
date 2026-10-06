#!/bin/bash
# Spike 4.1: reproduce the IPM findings on a clean IRIS for Health 2026.2 (run from the repository root:
# bash _bmad-output/initiative-modernizacao/epic-ipm-paridade/spike-ipm/run.sh). WORKAROUND=0 shows the
# fhir-server failure; the default (1) pre-creates FHIRSERVER, then installs the probe module and the
# installer steps, and runs scripts/smoke.sh against the spike container (port 42783).
set -e
REPO="$(pwd)"
A="$REPO/_bmad-output/initiative-modernizacao/epic-ipm-paridade/spike-ipm"
cd "$A"
docker rm -f ipmspike >/dev/null 2>&1 || true
docker run -d --name ipmspike -p 127.0.0.1:42783:52773 intersystems/irishealth-community:latest-cd --check-caps false >/dev/null
until docker exec ipmspike iris qlist IRIS 2>/dev/null | grep -q running; do sleep 3; done; sleep 15
MSYS_NO_PATHCONV=1 docker exec ipmspike bash -c 'wget -q https://pm.community.intersystems.com/packages/zpm/latest/installer -O /tmp/zpm.xml'
docker exec -i ipmspike iris session IRIS -U %SYS < 1-install-ipm.script > step1.log 2>&1
if [ "${WORKAROUND:-1}" = "1" ]; then
  docker exec -i ipmspike iris session IRIS -U %SYS < 1b-precreate-fhirserver.script > step1b.log 2>&1
  grep "IPM visible" step1b.log
fi
docker exec -i ipmspike iris session IRIS -U %SYS < 2-template-order.script > step2.log 2>&1
grep -E "Activate (SUCCESS|FAILURE)|ERROR!" step2.log || true
# _SYSTEM:SYS is the image default of this throwaway container (never the project container)
echo "metadata: $(curl -s -o /dev/null -w '%{http_code}' -u _SYSTEM:SYS http://localhost:42783/fhir/r4/metadata)"
[ "${WORKAROUND:-1}" = "1" ] || exit 0
MSYS_NO_PATHCONV=1 docker exec ipmspike bash -c 'rm -rf /tmp/probe && mkdir -p /tmp/probe'
docker cp probe-module/module.xml ipmspike:/tmp/probe/module.xml >/dev/null
docker cp ../../../../src ipmspike:/tmp/probe/src >/dev/null
docker cp ../../../../fhirUI ipmspike:/tmp/probe/fhirUI >/dev/null
docker cp ../../epic-robustez-fhir/spike-consultas/Rest.cls ipmspike:/tmp/SpikeRest.cls >/dev/null
docker exec -i ipmspike iris session IRIS -U %SYS < 3-probe-webapps.script > step3.log 2>&1
grep -E "^APP|^SQLVAR|Activate (SUCCESS|FAILURE)" step3.log
docker exec -i ipmspike iris session IRIS -U %SYS < 4-installer-steps.script > step4.log 2>&1
docker exec -i ipmspike iris session IRIS -U %SYS < 5-readonly-role.script > step5.log 2>&1
docker exec -i ipmspike iris session IRIS -U FHIRSERVER < 6-grant-select.script > step6.log 2>&1
sleep 2
BASE_URL=http://localhost:42783 bash "$REPO/scripts/smoke.sh" | tail -1
curl -s -u fhirportal:fhirportal http://localhost:42783/spike/privileges
echo
