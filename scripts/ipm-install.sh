#!/bin/bash
# Installs the portal the way an IPM user does, in a clean IRIS for Health container: IPM from the registry,
# the fhir-server package (the iris-fhir-template) with its test data, then this checkout's module.xml
# with zpm load in the FHIRSERVER namespace and the demo login. CI runs it; locally it does not touch
# the docker compose container.
# Usage: bash scripts/ipm-install.sh   (then BASE_URL=http://localhost:42783 bash scripts/smoke.sh)
# Env: PORT (default 42783), NAME (container, default fhirportal-ipm), IMAGE
set -eo pipefail
PORT="${PORT:-42783}"
NAME="${NAME:-fhirportal-ipm}"
IMAGE="${IMAGE:-intersystems/irishealth-community:latest-cd}"
# Windows paths for Docker Desktop under Git Bash; plain pwd elsewhere
REPO="$(cd "$(dirname "$0")/.." && (pwd -W 2>/dev/null || pwd))"
LOG="$(mktemp)"
trap 'rm -f "$LOG"' EXIT
export MSYS_NO_PATHCONV=1

fail() {
  echo "IPM install failed ($1); full log:"
  cat "$LOG"
  exit 1
}

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -p "127.0.0.1:$PORT:52773" -v "$REPO:/opt/fhir-portal:ro" "$IMAGE" --check-caps false >/dev/null
for i in $(seq 1 60); do
  docker exec "$NAME" iris qlist IRIS 2>/dev/null | grep -q running && break
  sleep 5
done
docker exec "$NAME" iris qlist IRIS | grep -q running || { echo "IRIS did not start"; docker logs --tail=100 "$NAME"; exit 1; }
# qlist says running before the instance takes sessions
sleep 15

docker exec "$NAME" wget -q https://pm.community.intersystems.com/packages/zpm/latest/installer -O /tmp/zpm.xml

# fhir-server 1.3.7 fails on IRIS 2026.2 when it creates FHIRSERVER itself: the end of its Activate runs there,
# before IPM is mapped into it, and the failure removes the namespace (spike 4.1). Creating the namespace first
# and mapping IPM globally avoids it; its Setup accepts an existing namespace.
docker exec -i "$NAME" iris session IRIS -U %SYS > "$LOG" 2>&1 <<'EOF' || fail "iris session exited with $?"
do ##class(Security.Users).UnExpireUserPasswords("*")
write "ipm installer: ",$system.OBJ.Load("/tmp/zpm.xml","ck"),!
zn "HSLIB"
do ##class(HS.Util.Installer.Foundation).Install("FHIRSERVER")
zn "%SYS"
zpm "enable -map -globally"
zpm "enable -community"
// From USER, like the template: IPM installs nothing from %SYS
zn "USER"
zpm "install fhir-server"
zn "FHIRSERVER"
zpm "load /opt/fhir-portal -v -DDemoUser=1"
zpm "list"
halt
EOF

# iris session exits 0 even when a command fails: the log decides.
# IPM prints ERROR! and status errors print ERROR #; other text that mentions an error is not a failure.
grep -E "\] *Activate (SUCCESS|FAILURE)|fhir-portal: |ERROR!|ERROR #" "$LOG" || true
if grep -qE "FAILURE|ERROR!|ERROR #" "$LOG"; then fail "FAILURE or ERROR in the log"; fi
grep -qE "\|fhir-server\][[:space:]]*Activate SUCCESS" "$LOG" || fail "fhir-server was not activated"
grep -q "fhir-portal: configured" "$LOG" || fail "the portal was not configured"
echo "fhir-server and fhir-portal installed on http://localhost:$PORT"
