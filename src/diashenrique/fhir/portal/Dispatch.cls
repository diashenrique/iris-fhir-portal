Class diashenrique.fhir.portal.Dispatch Extends %CSP.REST
{

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>

<Route Url="/" Method="GET" Call="Test" Cors="true"/>
<Route Url="/patient/:id" Method="GET" Call="getPatient" Cors="true"/>
<Route Url="/patient/:id/lab/:code" Method="GET" Call="getLabResult" Cors="true"/>
<Route Url="/laboptions/:id" Method="GET" Call="getOptions" Cors="true"/>
</Routes>
}

ClassMethod getPatient(pPatientId) As %Status
{
    Set %response.ContentType = "application/json"

    Set tSC = $System.Status.OK()

    Set arrPatient = []

    Try {

        Set oRS = ##class(%SQL.Statement).%New()

        Set sql = "SELECT %external(name) as name, birthdate FROM HSFHIR_I0001_S.Patient WHERE _id = "_pPatientId

        Set tSC = oRS.%Prepare(sql)

        Quit:$System.Status.IsError(tSC)

        Set result = oRS.%Execute()

        If (result.%SQLCODE '< 0) {

            While result.%Next() {
                Set json = { }
                Do json.%Set("name",result.name)
                Do json.%Set("birthdate",result.birthdate)
                Do arrPatient.%Push(json)
            }
        }
        Else {
            Throw ##class(%Exception.SQL).CreateFromSQLCODE(result.%SQLCODE,result.%Message)
        }

    }
    Catch (oException) {
        Set tSC = oException.AsStatus()
    }

    Write arrPatient.%ToJSON()

    Quit $$$OK
}

ClassMethod getOptions(pPatientId) As %Status
{
    Set %response.ContentType = "application/json"

    Set tSC = $System.Status.OK()

    Set arrLabResult = []

    Try {

        Set oRS = ##class(%SQL.Statement).%New()

        Set sql = "SELECT DISTINCT "_
                  "GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0),'code'),'code') as testCode, "_
                  "GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0),'display'),'display') as testName "_
                  "FROM HSFHIR_I0001_R.Rsrc "_ 
                  "WHERE GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'category'),'code'),0),'code'),'code') = 'laboratory' "_
                  "AND GetProp(GetJSON(ResourceString,'subject'),'reference') = 'Patient/"_pPatientId_"'"_
                  "Order By GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0),'display'),'display')"

        Set tSC = oRS.%Prepare(sql)

        Quit:$System.Status.IsError(tSC)

        Set result = oRS.%Execute()

        If (result.%SQLCODE '< 0) {

            While result.%Next() {
                Set json = { }
                Do json.%Set("code",result.testCode)
                Do json.%Set("name",result.testName)
                Do arrLabResult.%Push(json)
            }

        }
        Else {
            Throw ##class(%Exception.SQL).CreateFromSQLCODE(result.%SQLCODE,result.%Message)
        }

    }
    Catch (oException) {
        Set tSC = oException.AsStatus()
    }

    Write arrLabResult.%ToJSON()

    Quit $$$OK
}

ClassMethod getLabResult(pPatientId, pLabCode) As %Status
{
    Set %response.ContentType = "application/json"

    Set tSC = $System.Status.OK()

    Set arrLabResult = []

    Try {

        Set oRS = ##class(%SQL.Statement).%New()

        Set sql = "SELECT "_
            "GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0),'display'),'display') as testName, "_
            "GetProp(GetJSON(ResourceString,'effectiveDateTime'),'effectiveDateTime') as effectiveDateTimeValue, "_
            "GetProp(GetJSON(ResourceString,'valueQuantity'),'value') as valueQuant "_
            "FROM HSFHIR_I0001_R.Rsrc "_
            "WHERE GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'category'),'code'),0),'code'),'code') = 'laboratory' "_
            "AND GetProp(GetJSON(ResourceString,'subject'),'reference') = 'Patient/"_pPatientId_"' "_
            "AND GetProp(GetJSON(GetAtJSON(GetJSON(GetJSON(ResourceString,'code'),'coding'),0),'code'),'code') = '"_pLabCode_"'"_
            "ORDER BY GetProp(GetJSON(ResourceString,'effectiveDateTime'),'effectiveDateTime')"

        Set tSC = oRS.%Prepare(sql)

        Quit:$System.Status.IsError(tSC)

        Set result = oRS.%Execute()

        If (result.%SQLCODE '< 0) {

            While result.%Next() {
                Set json = { }
                Do json.%Set("testName",result.testName)
                Do json.%Set("date",result.effectiveDateTimeValue)
                Do json.%Set("value",result.valueQuant)
                Do arrLabResult.%Push(json)
            }
        }
        Else {
            Throw ##class(%Exception.SQL).CreateFromSQLCODE(result.%SQLCODE,result.%Message)
        }

    }
    Catch (oException) {
        Set tSC = oException.AsStatus()
    }

    Write arrLabResult.%ToJSON()

    Quit $$$OK
}

}
