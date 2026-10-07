/* Examples of article 4, "Getting FHIR information using SQL", on the current server.
   Schemas of the JsonAdvSQL storage strategy (IRIS for Health 2026.2): HSFHIR_X0001_R = resources,
   HSFHIR_X0001_S = search parameters, HSFHIR_X0001_S_<RESOURCE> = multi-valued search parameters.
   The portal asks the strategy of /fhir/r4 for these names (Dispatch.cls); X0001 is the first endpoint.
   Ids are assigned at load time, so the examples pick a patient and an observation with a subquery.
   GetJSON, GetProp and GetAtJSON are the functions of article 4 (src/User/SQLvar.cls).
   CI runs every statement of this file (scripts/check-readme-sql.sh). */

/* Every Observation of a patient */
SELECT *
FROM HSFHIR_X0001_S.Observation
WHERE patient_Reference = (SELECT TOP 1 patient_Reference FROM HSFHIR_X0001_S.Observation);

/* Every Observation of a patient with the LOINC code 718-7 (Hemoglobin [Mass/volume] in Blood) */
SELECT o.*
FROM HSFHIR_X0001_S.Observation o
JOIN HSFHIR_X0001_S_OBSERVATION.code c ON c.Key = o.Key
WHERE o.patient_Reference = (SELECT TOP 1 patient_Reference FROM HSFHIR_X0001_S.Observation)
AND c.value_Value = '718-7';

/* The stored resource of an Observation */
SELECT *
FROM HSFHIR_X0001_R.Rsrc
WHERE Key = (SELECT TOP 1 Key FROM HSFHIR_X0001_R.Rsrc WHERE ResourceType = 'Observation' AND Deleted = 0);

/* Its valueQuantity, with GetJSON */
SELECT ID, Key,
GetJSON(ResourceString, 'valueQuantity') AS valueQuantity
FROM HSFHIR_X0001_R.Rsrc
WHERE Key = (SELECT TOP 1 Key FROM HSFHIR_X0001_R.Rsrc WHERE ResourceType = 'Observation' AND Deleted = 0);

/* The value inside valueQuantity, with GetProp */
SELECT ID, Key,
GetJSON(ResourceString, 'valueQuantity') AS valueQuantity,
GetProp(GetJSON(ResourceString, 'valueQuantity'), 'value') AS value
FROM HSFHIR_X0001_R.Rsrc
WHERE Key = (SELECT TOP 1 Key FROM HSFHIR_X0001_R.Rsrc WHERE ResourceType = 'Observation' AND Deleted = 0);

/* Down the code: the first coding of the array (GetAtJSON) and its display */
SELECT ID, Key,
GetJSON(ResourceString, 'code') AS code,
GetJSON(GetJSON(ResourceString, 'code'), 'coding') AS coding,
GetAtJSON(GetJSON(GetJSON(ResourceString, 'code'), 'coding'), 0) AS coding1,
GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString, 'code'), 'coding'), 0), 'display'), 'display') AS display
FROM HSFHIR_X0001_R.Rsrc
WHERE Key = (SELECT TOP 1 Key FROM HSFHIR_X0001_R.Rsrc WHERE ResourceType = 'Observation' AND Deleted = 0);
