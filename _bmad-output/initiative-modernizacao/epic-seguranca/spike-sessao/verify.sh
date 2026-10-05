#!/bin/bash
# Spike 2.1: proves the shared IRIS session. Run after setup.script on a fresh container.
B="${BASE_URL:-http://localhost:32783}"
PAGE="${PAGE:-$B/fhir/portal/Spike.Home.cls}"
J=$(mktemp); L=$(mktemp); fails=0
check() { [ "$2" = "$3" ] && echo "PASS  $1 ($2)" || { echo "FAIL  $1 (got $2, want $3)"; fails=$((fails + 1)); }; }
# The web app refuses anonymous calls with 404 on /fhir/r4 (AutheEnabled=8224) and 401 on /fhir/api: both mean denied
denied() { [ "$2" = "401" ] || [ "$2" = "404" ] && echo "PASS  $1 denied ($2)" || { echo "FAIL  $1 (got $2, want 401 or 404)"; fails=$((fails + 1)); }; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

ID=$(curl -s -u fhirportal:fhirportal -H 'Accept: application/fhir+json' "$B/fhir/r4/Patient?_count=1&_elements=id" \
  | grep -o '/Patient/[0-9]*"' | head -1 | tr -dc 0-9)

check "anonymous static file"          "$(code "$B/fhir/portal/patientlist.html")" 404
denied "anonymous /fhir/r4/Patient"     "$(code -H 'Accept: application/fhir+json' "$B/fhir/r4/Patient")"
check "anonymous /fhir/api/laboptions" "$(code "$B/fhir/api/laboptions/$ID")" 401

curl -s -c "$J" -b "$J" -o "$L" "$PAGE"
TOK=$(grep -o 'name="IRISSessionToken" value="[^"]*"' "$L" | sed 's/.*value="//;s/"$//')
[ -n "$TOK" ] && echo "PASS  login form has IRISSessionToken" || { echo "FAIL  no IRISSessionToken in login form"; fails=$((fails + 1)); }
check "login POST" "$(curl -s -c "$J" -b "$J" -o /dev/null -w '%{http_code}' --data-urlencode "IRISSessionToken=$TOK" \
  --data-urlencode IRISUsername=fhirportal --data-urlencode IRISPassword=fhirportal --data-urlencode IRISLogin=Login "$PAGE")" 302

check "cookie static file"          "$(code -b "$J" "$B/fhir/portal/patientlist.html")" 200
check "cookie /fhir/r4/Patient"     "$(code -b "$J" -H 'Accept: application/fhir+json' "$B/fhir/r4/Patient")" 200
check "cookie /fhir/api/laboptions" "$(code -b "$J" "$B/fhir/api/laboptions/$ID")" 200
P=$(curl -s -b "$J" -H 'Accept: application/fhir+json' "$B/fhir/r4/Patient/$ID")
check "cookie PUT Patient"          "$(code -b "$J" -X PUT -H 'Content-Type: application/fhir+json' --data "$P" "$B/fhir/r4/Patient/$ID")" 200
check "basic auth /fhir/r4 (CI)"    "$(code -u fhirportal:fhirportal -H 'Accept: application/fhir+json' "$B/fhir/r4/Patient")" 200

curl -s -b "$J" -c "$J" -o /dev/null "$PAGE?IRISLogout=end"
check "after logout static file"          "$(code -b "$J" "$B/fhir/portal/patientlist.html")" 404
denied "after logout /fhir/r4/Patient"     "$(code -b "$J" -H 'Accept: application/fhir+json' "$B/fhir/r4/Patient")"
check "after logout /fhir/api/laboptions" "$(code -b "$J" "$B/fhir/api/laboptions/$ID")" 401

rm -f "$J" "$L"
[ "$fails" -eq 0 ] && echo "All checks passed" || { echo "$fails check(s) failed"; exit 1; }
