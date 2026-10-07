Class diashenrique.fhir.portal.Dispatch Extends %CSP.REST
{

/// FHIR endpoint whose storage tables the API reads
Parameter FHIRENDPOINT = "/fhir/r4";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
<Route Url="/patient/:id" Method="GET" Call="getPatient"/>
<Route Url="/patient/:id/lab/:code" Method="GET" Call="getLabResult"/>
<Route Url="/laboptions/:id" Method="GET" Call="getOptions"/>
<Route Url="/session" Method="GET" Call="getSession"/>
</Routes>
}

/// Storage strategy of the FHIR endpoint: it names the SQL tables (R = resources, S = search parameters),
/// so the schema is never hard-coded
/// Only the JsonAdvSQL strategy has GetResourceTable and GetSearchTable, so any other strategy throws.
/// It returns a HS.FHIRServer.Storage.JsonAdvSQL.InteractionsStrategy, declared as %RegisteredObject so the class
/// also compiles in a namespace without the FHIR server classes (the IPM module warns there instead of failing)
ClassMethod Strategy() As %RegisteredObject
{
    Set strategy = ##class(HS.FHIRServer.API.InteractionsStrategy).GetStrategyForEndpoint(..#FHIRENDPOINT)
    If '$IsObject(strategy) || 'strategy.%IsA("HS.FHIRServer.Storage.JsonAdvSQL.InteractionsStrategy") {
        $$$ThrowStatus($$$ERROR($$$GeneralError, ..#FHIRENDPOINT_" must use the JsonAdvSQL strategy"))
    }
    Quit strategy
}

/// FHIR id pattern
ClassMethod IsValidId(pValue As %String) As %Boolean
{
    Quit $Match(pValue, "[A-Za-z0-9.\-]{1,64}")
}

/// Lab code: any code getOptions can return (local codes may have _ : or inner spaces); it is a bound
/// parameter, so only the length, control characters and leading or trailing whitespace are checked
ClassMethod IsValidCode(pValue As %String) As %Boolean
{
    Quit ($Length(pValue) >= 1) && ($Length(pValue) <= 64) && ($ZStrip(pValue, "*C") = pValue) && ($ZStrip(pValue, "<>W") = pValue)
}

/// Throws when reading the rows failed (the JSON functions run during %Next)
ClassMethod CheckFetch(pResult As %SQL.StatementResult)
{
    If pResult.%SQLCODE < 0 {
        Throw ##class(%Exception.SQL).CreateFromSQLCODE(pResult.%SQLCODE, pResult.%Message)
    }
}

/// 400 with a short JSON error
ClassMethod BadRequest(pMessage As %String) As %Status
{
    Set %response.Status = ..#HTTP400BADREQUEST
    Write {"error":(pMessage)}.%ToJSON()
    Quit $$$OK
}

/// 500 with a generic JSON error; the details go to the IRIS error log, not to the client
ClassMethod ServerError(pException As %Exception.AbstractException) As %Status
{
    Do pException.Log()
    Set %response.Status = ..#HTTP500INTERNALSERVERERROR
    Write {"error":"query failed"}.%ToJSON()
    Quit $$$OK
}

/// Runs a prepared statement; throws on a prepare or execution error
ClassMethod Execute(pSQL As %String, pArgs...) As %SQL.StatementResult
{
    Set statement = ##class(%SQL.Statement).%New()
    $$$ThrowOnError(statement.%Prepare(pSQL))
    Set result = statement.%Execute(pArgs...)
    If result.%SQLCODE < 0 {
        Throw ##class(%Exception.SQL).CreateFromSQLCODE(result.%SQLCODE, result.%Message)
    }
    Quit result
}

ClassMethod getPatient(pPatientId) As %Status
{
    Set %response.ContentType = "application/json"
    Quit:'..IsValidId(pPatientId) ..BadRequest("invalid patient id")

    Set arrPatient = []
    Try {
        Set resourceTable = ..Strategy().GetResourceTable("Patient")

        // JsonAdvSQL storage: the Patient search table has no "name" column, so read the resource itself
        Set sql = "SELECT ResourceString FROM "_resourceTable_" WHERE ResourceType = 'Patient' AND ResourceId = ? AND Deleted = 0"
        Set result = ..Execute(sql, pPatientId)

        While result.%Next() {
            Set patient = {}.%FromJSON(result.ResourceString)
            // A minimal Patient may have no name, or a name without given or family
            Set fullName = ""
            If $IsObject(patient.name) && (patient.name.%Size() > 0) {
                Set name = patient.name.%Get(0)
                Set given = $Select($IsObject(name.given):name.given.%Get(0), 1:"")
                Set fullName = $ZStrip(given_" "_name.family, "<>W")
            }
            Set json = {}
            Do json.%Set("name", fullName)
            Do json.%Set("birthdate", patient.birthDate)
            Do arrPatient.%Push(json)
        }
        Do ..CheckFetch(result)
    }
    Catch (oException) {
        Return ..ServerError(oException)
    }

    Write arrPatient.%ToJSON()
    Quit $$$OK
}

/// The user of the IRIS session, for the header of the portal; the web app already requires a login
ClassMethod getSession() As %Status
{
    Set %response.ContentType = "application/json"
    Write {"user":($Username)}.%ToJSON()
    Quit $$$OK
}

ClassMethod getOptions(pPatientId) As %Status
{
    Set %response.ContentType = "application/json"
    Quit:'..IsValidId(pPatientId) ..BadRequest("invalid patient id")

    Set arrLabResult = []
    Try {
        Set strategy = ..Strategy()
        Set resourceTable = strategy.GetResourceTable("Observation")
        Set searchTable = strategy.GetSearchTable("Observation")

        // The search table filters by patient (indexed); the JSON functions extract the fields.
        // The category stays in the JSON because it is multi-valued in the search table.
        Set sql = "SELECT DISTINCT "_
                  "GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'code'),'code') AS testCode, "_
                  "GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'display'),'display') AS testName "_
                  "FROM "_searchTable_" s JOIN "_resourceTable_" r ON r.Key = s.Key "_
                  "WHERE s.patient_Reference = ? AND r.ResourceType = 'Observation' AND r.Deleted = 0 "_
                  "AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'category'),'code'),0),'code'),'code') = 'laboratory' "_
                  "ORDER BY testName"
        Set result = ..Execute(sql, "Patient/"_pPatientId)

        While result.%Next() {
            Set json = {}
            Do json.%Set("code", result.testCode)
            Do json.%Set("name", result.testName)
            Do arrLabResult.%Push(json)
        }
        Do ..CheckFetch(result)
    }
    Catch (oException) {
        Return ..ServerError(oException)
    }

    Write arrLabResult.%ToJSON()
    Quit $$$OK
}

ClassMethod getLabResult(pPatientId, pLabCode) As %Status
{
    Set %response.ContentType = "application/json"
    Quit:'..IsValidId(pPatientId) ..BadRequest("invalid patient id")
    Quit:'..IsValidCode(pLabCode) ..BadRequest("invalid lab code")

    Set arrLabResult = []
    Try {
        Set strategy = ..Strategy()
        Set resourceTable = strategy.GetResourceTable("Observation")
        Set searchTable = strategy.GetSearchTable("Observation")

        Set sql = "SELECT "_
            "GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'display'),'display') AS testName, "_
            "GetProp(GetJSON(r.ResourceString,'effectiveDateTime'),'effectiveDateTime') AS effectiveDateTimeValue, "_
            "GetProp(GetJSON(r.ResourceString,'valueQuantity'),'value') AS valueQuant "_
            "FROM "_searchTable_" s JOIN "_resourceTable_" r ON r.Key = s.Key "_
            "WHERE s.patient_Reference = ? AND r.ResourceType = 'Observation' AND r.Deleted = 0 "_
            "AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'category'),'code'),0),'code'),'code') = 'laboratory' "_
            "AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(r.ResourceString,'code'),'coding'),0),'code'),'code') = ? "_
            "ORDER BY effectiveDateTimeValue"
        Set result = ..Execute(sql, "Patient/"_pPatientId, pLabCode)

        While result.%Next() {
            Set json = {}
            Do json.%Set("testName", result.testName)
            Do json.%Set("date", result.effectiveDateTimeValue)
            Do json.%Set("value", result.valueQuant)
            Do arrLabResult.%Push(json)
        }
        Do ..CheckFetch(result)
    }
    Catch (oException) {
        Return ..ServerError(oException)
    }

    Write arrLabResult.%ToJSON()
    Quit $$$OK
}

}
