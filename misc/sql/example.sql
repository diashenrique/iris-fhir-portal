/* Schemas of the JsonAdvSQL storage strategy (IRIS for Health 2022.1+):
   HSFHIR_X0001_R = resources, HSFHIR_X0001_S = search parameters,
   HSFHIR_X0001_S_<RESOURCE> = multi-valued search parameters
   Resource ids are assigned at load time: replace Patient/1 and Observation/16 with ids from your server */

/* Select all Observation of Patient/1 */
SELECT
*
FROM HSFHIR_X0001_S.Observation
where patient_Reference = 'Patient/1' ;

/* Select all Observation of Patient/1 with lonic code 718-7 (Hemoglobin [Mass/volume] in Blood)*/
SELECT
o.*
FROM HSFHIR_X0001_S.Observation o
JOIN HSFHIR_X0001_S_OBSERVATION.code c ON c.Key = o.Key
where o.patient_Reference = 'Patient/1' and c.value_Value = '718-7';

/* Get detail of the observation/16 */
SELECT
*
FROM HSFHIR_X0001_R.Rsrc where Key = 'Observation/16';

/* Get valueQuantity of the observation/16 */
SELECT
ID, Key, ResourceString,
GetJSON(ResourceString,'valueQuantity') as valueQuantity
FROM HSFHIR_X0001_R.Rsrc where Key = 'Observation/16';

/* Get value of valueQuantity of the observation/16 */
SELECT
ID, Key, ResourceString,
GetJSON(ResourceString,'valueQuantity') as valueQuantity,
GetProp(GetJSON(ResourceString,'valueQuantity'),'value') as value
FROM HSFHIR_X0001_R.Rsrc where Key = 'Observation/16';

/* An complexe example */
SELECT
ID, Key, ResourceString,
GetJSON(ResourceString,'code') as code,
GetJSON(GetJSON(ResourceString,'code'),'coding') as coding,
GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0) as coding1,
GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0),'display') as display,
GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0),'display'),'display') as value
FROM HSFHIR_X0001_R.Rsrc where Key = 'Observation/16';
