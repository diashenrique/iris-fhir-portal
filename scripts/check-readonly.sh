#!/bin/bash
# Proves that the roles of /fhir/api read the FHIR tables and cannot write to them: a temporary user with only
# those roles runs SELECT, UPDATE and DELETE on the endpoint's resource and search tables (resolved from the
# endpoint, as Dispatch does) and must get SQLCODE 0 for the SELECT and -99 (privilege violation) for the others.
# Usage: bash scripts/check-readonly.sh
# Env: IRIS_EXEC, how to reach the IRIS container (default: docker compose exec -T iris)
set -eo pipefail
IRIS_EXEC="${IRIS_EXEC:-docker compose exec -T iris}"
export MSYS_NO_PATHCONV=1
USER_NAME="fhirPortalReadCheck"
PASSWORD="check-$RANDOM-$RANDOM"
ROLES="$($IRIS_EXEC iris session IRIS -U %SYS <<'EOF' | sed -n 's/^ROLES //p' | tr -d '\r'
kill p set s=##class(Security.Applications).Get("/fhir/api",.p) write "ROLES ",$Translate($ZStrip(p("MatchRoles"),"<",":"),":",","),!
halt
EOF
)"
echo "Roles of /fhir/api: $ROLES"

# Login is the last command of its session: a terminal with only these roles may not read another command.
# Its line runs the queries and halts.
OUT="$($IRIS_EXEC iris session IRIS -U %SYS <<EOF 2>&1 || true
do ##class(Security.Users).Delete("$USER_NAME")
write "user ",##class(Security.Users).Create("$USER_NAME","$ROLES","$PASSWORD"),!
zn "FHIRSERVER"
set st=##class(HS.FHIRServer.API.InteractionsStrategy).GetStrategyForEndpoint("/fhir/r4"),r=st.GetResourceTable("Patient"),s=st.GetSearchTable("Observation")
set q(1)="SELECT COUNT(*) FROM "_r,q(2)="UPDATE "_r_" SET ResourceString=ResourceString WHERE 1=0",q(3)="DELETE FROM "_r_" WHERE 1=0",q(4)="DELETE FROM "_s_" WHERE 1=0"
write "LOGIN ",\$System.Security.Login("$USER_NAME"),! for i=1:1:4 { set x=##class(%SQL.Statement).%ExecDirect(,q(i)) write "SQL ",x.%SQLCODE," ",q(i),! } halt
EOF
)"
$IRIS_EXEC iris session IRIS -U %SYS >/dev/null <<EOF || true
do ##class(Security.Users).Delete("$USER_NAME")
halt
EOF

echo "$OUT" | grep -E "^(user|LOGIN|SQL) " | tr -d '\r'
fail=0
echo "$OUT" | grep -q "^LOGIN 1" || { echo "FAIL  could not log in as the check user"; fail=1; }
echo "$OUT" | grep -qE "^SQL 0 SELECT" && echo "PASS  SELECT on the resource table" || { echo "FAIL  SELECT on the resource table"; fail=1; }
[ "$(echo "$OUT" | grep -cE "^SQL -99 (UPDATE|DELETE)")" = 3 ] \
  && echo "PASS  UPDATE and DELETE on the FHIR tables are denied (-99)" \
  || { echo "FAIL  UPDATE and DELETE on the FHIR tables are denied (-99)"; fail=1; }
exit $fail
