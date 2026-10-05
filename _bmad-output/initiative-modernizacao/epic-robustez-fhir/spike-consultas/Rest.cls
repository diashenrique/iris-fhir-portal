/// Spike 3.6: runs inside a REST app with the same roles as /fhir/api, as the fhirportal user.
/// /schema resolves the endpoint tables; /privileges probes what %HS_DB_FHIRSERVER + FHIRPortalAPI can do in SQL.
Class Spike.Rest Extends %CSP.REST
{

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
<Route Url="/schema" Method="GET" Call="Schema"/>
<Route Url="/privileges" Method="GET" Call="Privileges"/>
</Routes>
}

ClassMethod Schema() As %Status
{
    Set %response.ContentType = "application/json"
    Set strategy = ##class(HS.FHIRServer.API.InteractionsStrategy).GetStrategyForEndpoint("/fhir/r4")
    Set out = {"user": ($username), "roles": ($roles), "resourceTable": (strategy.GetResourceTable("Observation")), "searchTable": (strategy.GetSearchTable("Observation"))}
    Set rs = ##class(%SQL.Statement).%ExecDirect(, "SELECT COUNT(*) n FROM "_out.searchTable_" WHERE patient_Reference = ?", "Patient/4")
    Do rs.%Next()
    Set out.searchSQLCODE = rs.%SQLCODE, out.searchRows = rs.n
    Write out.%ToJSON()
    Quit $$$OK
}

ClassMethod Privileges() As %Status
{
    Set %response.ContentType = "application/json"
    Set out = {"user": ($username), "roles": ($roles)}
    For sql = "SELECT TOP 1 Key FROM HSFHIR_X0001_R.Rsrc", "SELECT TOP 1 Key FROM HSFHIR_X0001_S.Patient", "UPDATE HSFHIR_X0001_R.Rsrc SET Verb = Verb WHERE 1 = 0", "DELETE FROM HSFHIR_X0001_S.Patient WHERE 1 = 0", "SELECT TOP 1 Name FROM Security.Users" {
        Set rs = ##class(%SQL.Statement).%ExecDirect(, sql)
        Do out.%Set(sql, rs.%SQLCODE_" "_rs.%Message)
    }
    Write out.%ToJSON()
    Quit $$$OK
}

}
