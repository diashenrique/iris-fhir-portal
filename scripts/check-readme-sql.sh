#!/bin/bash
# Runs every SQL example of the documentation against the FHIR server, so the examples cannot go stale:
# each ```sql block of README.md and README-JP.md, and each statement of misc/sql/example.sql (ended by ;).
# Every statement runs in FHIRSERVER and every row is read (the JSON functions of article 4 run while rows
# are fetched); the script fails on the first negative SQLCODE or fetch error.
# Examples use the literal schemas of the endpoint (HSFHIR_X0001_R / _S) and no ? parameters.
# Usage: bash scripts/check-readme-sql.sh
# Env: IRIS_EXEC, how to reach the IRIS container (default: docker compose exec -T iris)
set -eo pipefail
IRIS_EXEC="${IRIS_EXEC:-docker compose exec -T iris}"
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."

# The statements, one per line as an ObjectScript string literal, with where each comes from
STATEMENTS="$(node - <<'EOF'
const fs = require('fs');
const out = [];
const add = (file, n, sql) => {
  // Comments out, one line, quotes doubled for an ObjectScript string literal
  const text = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ').trim().replace(/;$/, '').trim();
  if (text) out.push(`${file}#${n}\t${text.replace(/"/g, '""')}`);
};
for (const file of ['README.md', 'README-JP.md']) {
  if (!fs.existsSync(file)) continue;
  const blocks = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').match(/```sql\n[\s\S]*?```/g) || [];
  blocks.forEach((b, i) => add(file, i + 1, b.replace(/^```sql\n/, '').replace(/```$/, '')));
}
const sqlFile = 'misc/sql/example.sql';
fs.readFileSync(sqlFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').split(';').forEach((s, i) => add(sqlFile, i + 1, s));
process.stdout.write(out.join('\n'));
EOF
)"
COUNT=$(printf '%s\n' "$STATEMENTS" | grep -c . || true)
[ "$COUNT" -gt 0 ] || { echo "FAIL  no SQL examples found"; exit 1; }

# One ObjectScript line per statement: execute, read every row, print the SQLCODE and any fetch error
SESSION='zn "FHIRSERVER"'$'\n'
while IFS=$'\t' read -r where sql; do
  SESSION+="set r=##class(%SQL.Statement).%ExecDirect(,\"$sql\"),sc=1 if r.%SQLCODE>=0 { while r.%Next(.sc) {} } write \"SQL $where \",r.%SQLCODE,\" \",\$select(\$system.Status.IsError(sc):\"FETCH-ERROR \"_\$system.Status.GetErrorText(sc),1:r.%Message),!"$'\n'
done <<< "$STATEMENTS"
SESSION+='halt'$'\n'

OUT="$($IRIS_EXEC iris session IRIS -U %SYS <<< "$SESSION" 2>&1 || true)"
RESULTS="$(echo "$OUT" | grep -E '^SQL ' | tr -d '\r' || true)"
echo "$RESULTS"

fail=0
[ "$(echo "$RESULTS" | grep -c '^SQL ')" = "$COUNT" ] || { echo "FAIL  ran $(echo "$RESULTS" | grep -c '^SQL ') of $COUNT statements"; echo "$OUT" | tail -20; fail=1; }
if echo "$RESULTS" | grep -qE '^SQL [^ ]+ -[0-9]|FETCH-ERROR'; then
  echo "FAIL  an SQL example of the documentation does not run"
  fail=1
fi
[ "$fail" = 0 ] && echo "PASS  $COUNT SQL examples of the documentation run against the FHIR server"
exit $fail
