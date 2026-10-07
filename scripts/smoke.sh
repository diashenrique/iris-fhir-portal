#!/bin/bash
# HTTP smoke test of a running iris-fhir-portal container.
# Usage: BASE_URL=http://localhost:32783 bash scripts/smoke.sh
# Needs only curl, grep and sed. Exits non-zero when any check fails.

BASE_URL="${BASE_URL:-http://localhost:32783}"
ENTRY="$BASE_URL/fhir/portal/diashenrique.fhir.portal.Home.cls"
failures=0
jar=$(mktemp)
page=$(mktemp)
trap 'rm -f "$jar" "$page"' EXIT

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; failures=$((failures + 1)); }

http_code() { curl -s --max-time 30 -o /dev/null -w '%{http_code}' "$@"; }
# Calls with the session cookie of the login below
session() { curl -s --max-time 30 -b "$jar" -c "$jar" "$@"; }
session_code() { session -o /dev/null -w '%{http_code}' "$@"; }

# Anonymous and logged-out calls are refused with 401: by the FHIR server on /fhir/r4, by the web app on /fhir/api
denied() { [ "$2" = "401" ] && pass "$1 answers 401" || fail "$1 answers 401 (got $2)"; }

# The API checks also look at the content: an id without data answers 200 with []
non_empty_array() { [[ "$1" == "[{"* ]]; }
# Body and HTTP status of a session call: the status is the last 3 characters
session_body_code() { session -w '%{http_code}' "$@"; }

# Login through the IRIS login page of the portal; the session cookie then authenticates
# the pages, /fhir/r4 and /fhir/api (one GroupById)
login() {
  curl -s --max-time 30 -c "$jar" -b "$jar" -o "$page" "$ENTRY"
  local token
  token=$(grep -o 'name="IRISSessionToken" value="[^"]*"' "$page" | sed 's/.*value="//; s/"$//')
  [ -n "$token" ] || return 1
  [ "$(session_code --data-urlencode "IRISSessionToken=$token" --data-urlencode "IRISUsername=${PORTAL_USER:-fhirportal}" \
    --data-urlencode "IRISPassword=${PORTAL_PASSWORD:-fhirportal}" --data-urlencode "IRISLogin=Login" "$ENTRY")" = "302" ]
}

# Without a session
curl -s --max-time 30 -o "$page" "$ENTRY"
grep -q 'name="IRISUsername"' "$page" && pass "Portal entry asks for login" || fail "Portal entry asks for login"
[ "$(http_code "$BASE_URL/fhir/portal/patientlist.html")" = "404" ] \
  && pass "Page patientlist.html without login answers 404" || fail "Page patientlist.html without login answers 404"
denied "FHIR Patient search without login" "$(http_code -H 'Accept: application/fhir+json' "$BASE_URL/fhir/r4/Patient")"
denied "FHIR Patient search without login or Accept header" "$(http_code "$BASE_URL/fhir/r4/Patient")"
[ "$(http_code "$BASE_URL/fhir/api/laboptions/1")" = "401" ] && pass "REST /fhir/api without login answers 401" || fail "REST /fhir/api without login answers 401"
[ "$(http_code "$BASE_URL/fhir/api/session")" = "401" ] && pass "REST /fhir/api/session without login answers 401" || fail "REST /fhir/api/session without login answers 401"
[ "$(http_code "$BASE_URL/csp/user/fhirUI/patientlist.html")" = "404" ] \
  && pass "Old anonymous /csp/user/fhirUI is gone" || fail "Old anonymous /csp/user/fhirUI is gone"

if login; then pass "Login as demo user"; else fail "Login as demo user"; fi

# The user of the session, for the header of the portal
[[ "$(session "$BASE_URL/fhir/api/session")" == '{"user":"'"${PORTAL_USER:-fhirportal}"'"}' ]]   && pass "REST /fhir/api/session returns the logged-in user" || fail "REST /fhir/api/session returns the logged-in user"

# FHIR server, with the session
[ "$(session_code "$BASE_URL/fhir/r4/metadata")" = "200" ] && pass "FHIR metadata answers 200" || fail "FHIR metadata answers 200"
patients=$(session -H 'Accept: application/fhir+json' "$BASE_URL/fhir/r4/Patient?_count=100&_elements=id")
total=$(echo "$patients" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2)
[ "${total:-0}" -gt 0 ] && pass "FHIR Patient search returns $total patients" || fail "FHIR Patient search returns patients"

patient_ids=$(echo "$patients" | grep -o '"fullUrl":"[^"]*/Patient/[^"]*"' | sed 's#.*/Patient/##; s#"$##')
first_id=$(echo "$patient_ids" | head -1)

if [ -z "$first_id" ]; then
  fail "REST /fhir/api/patient returns the patient (no patient id to test)"
else
  body=$(session "$BASE_URL/fhir/api/patient/$first_id")
  non_empty_array "$body" && [[ "$body" == *'"name":'* ]] \
    && pass "REST /fhir/api/patient/$first_id returns the patient" || fail "REST /fhir/api/patient/$first_id returns the patient"
fi

# Ids change on every build: use the first patient that has laboratory results.
# Stop at the first request that times out, so a hung API cannot outlast the CI job.
lab_patient=""
lab_options=""
for id in $patient_ids; do
  lab_options=$(session --max-time 10 "$BASE_URL/fhir/api/laboptions/$id") || break
  if non_empty_array "$lab_options"; then
    lab_patient=$id
    break
  fi
done

if [ -z "$lab_patient" ]; then
  fail "REST /fhir/api/laboptions returns tests for some patient"
  fail "REST /fhir/api/patient/:id/lab/:code returns results (no patient with lab tests)"
else
  pass "REST /fhir/api/laboptions/$lab_patient returns tests"

  code=$(echo "$lab_options" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)
  body=$(session "$BASE_URL/fhir/api/patient/$lab_patient/lab/$code")
  non_empty_array "$body" \
    && pass "REST /fhir/api/patient/$lab_patient/lab/$code returns results" || fail "REST /fhir/api/patient/$lab_patient/lab/$code returns results"
fi

# SQL injection probes. Patient ids outside the FHIR id pattern are refused with 400; lab codes are only
# checked for length and control characters, and every path value is bound as a parameter, so a probe
# that passes validation matches nothing (never 5xx or rows)
for probe in "patient/1%20OR%201=1" "laboptions/1'%20OR%20'1'='1"; do
  response=$(session_body_code "$BASE_URL/fhir/api/$probe")
  [ "${response: -3}" = "400" ] \
    && pass "REST /fhir/api/$probe answers 400" || fail "REST /fhir/api/$probe answers 400 (got $response)"
done
# A valid id or code without data answers 200 with []
for probe in "patient/${first_id:-1}/lab/x'%20OR%20'1'='1" "patient/does-not-exist"; do
  response=$(session_body_code "$BASE_URL/fhir/api/$probe")
  [ "$response" = "[]200" ] \
    && pass "REST /fhir/api/$probe answers 200 with []" || fail "REST /fhir/api/$probe answers 200 with [] (got $response)"
done

response=$(session_body_code "$BASE_URL/fhir/api/patient/1'x")
[ "${response: -3}" = "400" ] && [[ "$response" == *'"error":'* ]] \
  && pass "REST /fhir/api/patient/1'x answers 400 (invalid id)" || fail "REST /fhir/api/patient/1'x answers 400 (invalid id, got $response)"
[ "$(session_code "$BASE_URL/fhir/api/")" = "404" ] && pass "REST /fhir/api/ answers 404 (no root route)" || fail "REST /fhir/api/ answers 404 (no root route)"

# No CORS for a foreign origin: the API is same-origin only. The web app's empty CorsAllowlist
# is what refuses it today; this guards that setting (the routes no longer declare Cors either).
headers=$(session -D - -o /dev/null -H 'Origin: https://evil.example' "$BASE_URL/fhir/api/patient/${first_id:-1}")
preflight=$(session -D - -o /dev/null -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET'   "$BASE_URL/fhir/api/patient/${first_id:-1}")
if [[ "$headers" == *" 200"* ]] && ! grep -qi '^access-control-allow-origin' <<< "$headers$preflight"; then
  pass "REST /fhir/api sends no CORS headers to a foreign origin (GET and preflight)"
else
  fail "REST /fhir/api sends no CORS headers to a foreign origin (GET and preflight)"
fi

# Portal pages
for name in patientlist.html labresult.html; do
  [ "$(session_code "$BASE_URL/fhir/portal/$name")" = "200" ] && pass "Page $name answers 200" || fail "Page $name answers 200"
done

# Logout ends the shared session
session -o /dev/null "$ENTRY?IRISLogout=end"
denied "FHIR Patient search after logout" "$(session_code -H 'Accept: application/fhir+json' "$BASE_URL/fhir/r4/Patient")"
[ "$(session_code "$BASE_URL/fhir/api/laboptions/${first_id:-1}")" = "401" ] && pass "REST /fhir/api after logout answers 401" || fail "REST /fhir/api after logout answers 401"

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed against $BASE_URL"
  exit 1
fi
echo "All checks passed against $BASE_URL"
