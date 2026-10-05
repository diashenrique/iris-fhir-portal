#!/bin/bash
# HTTP smoke test of a running iris-fhir-portal container.
# Usage: BASE_URL=http://localhost:32783 bash scripts/smoke.sh
# Needs only curl, grep and sed. Exits non-zero when any check fails.

BASE_URL="${BASE_URL:-http://localhost:32783}"
FHIR_AUTH="fhirportal:fhirportal"
failures=0

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; failures=$((failures + 1)); }

http_code() { curl -s --max-time 30 -o /dev/null -w '%{http_code}' "$@"; }

# Dispatch answers [] with HTTP 200 when its SQL fails, so the API checks look at the content
non_empty_array() { [[ "$1" == "[{"* ]]; }

# FHIR server
[ "$(http_code "$BASE_URL/fhir/r4/metadata")" = "200" ] && pass "FHIR metadata answers 200" || fail "FHIR metadata answers 200"
[ "$(http_code -H 'Accept: application/fhir+json' "$BASE_URL/fhir/r4/Patient")" = "401" ] \
  && pass "FHIR Patient search without credentials answers 401" || fail "FHIR Patient search without credentials answers 401"

patients=$(curl -s --max-time 30 -u "$FHIR_AUTH" -H 'Accept: application/fhir+json' \
  "$BASE_URL/fhir/r4/Patient?_count=100&_elements=id")
total=$(echo "$patients" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2)
[ "${total:-0}" -gt 0 ] && pass "FHIR Patient search as demo user returns $total patients" || fail "FHIR Patient search as demo user returns patients"

patient_ids=$(echo "$patients" | grep -o '"fullUrl":"[^"]*/Patient/[^"]*"' | sed 's#.*/Patient/##; s#"$##')
first_id=$(echo "$patient_ids" | head -1)

if [ -z "$first_id" ]; then
  fail "REST /fhir/api/patient returns the patient (no patient id to test)"
else
  body=$(curl -s --max-time 30 "$BASE_URL/fhir/api/patient/$first_id")
  non_empty_array "$body" && [[ "$body" == *'"name":'* ]] \
    && pass "REST /fhir/api/patient/$first_id returns the patient" || fail "REST /fhir/api/patient/$first_id returns the patient"
fi

# Ids change on every build: use the first patient that has laboratory results.
# Stop at the first request that times out, so a hung API cannot outlast the CI job.
lab_patient=""
lab_options=""
for id in $patient_ids; do
  lab_options=$(curl -s --max-time 10 "$BASE_URL/fhir/api/laboptions/$id") || break
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
  body=$(curl -s --max-time 30 "$BASE_URL/fhir/api/patient/$lab_patient/lab/$code")
  non_empty_array "$body" \
    && pass "REST /fhir/api/patient/$lab_patient/lab/$code returns results" || fail "REST /fhir/api/patient/$lab_patient/lab/$code returns results"
fi

# Portal pages
for page in patientlist.html labresult.html; do
  [ "$(http_code "$BASE_URL/csp/user/fhirUI/$page")" = "200" ] && pass "Page $page answers 200" || fail "Page $page answers 200"
done

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed against $BASE_URL"
  exit 1
fi
echo "All checks passed against $BASE_URL"
