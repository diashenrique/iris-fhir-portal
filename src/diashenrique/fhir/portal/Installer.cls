/// Configures the portal in the namespace of its FHIR endpoint; module.xml (IPM) calls Setup when the module
/// is activated. This is the only place that creates the web apps, the role, the SQL grants and the demo user.
/// It is safe to run again: what exists is updated, not duplicated.
Class diashenrique.fhir.portal.Installer
{

/// FHIR endpoint the portal reads (the same as Dispatch)
Parameter FHIRENDPOINT = "/fhir/r4";

/// Role of /fhir/api: SELECT on the endpoint's resource and search schemas and EXECUTE on the JSON SQL functions
Parameter APIROLE = "FHIRPortalAPI";

/// Role of /fhir/api: read-only access to the FHIR databases (the database role of the namespace gives read and write)
Parameter READROLE = "FHIRPortalRead";

/// One IRIS session shared by the portal pages, /fhir/api and the FHIR endpoint
Parameter SESSIONGROUP = "fhirportal";

Parameter COOKIEPATH = "/fhir/";

/// Demo login documented in the README (no roles of its own)
Parameter DEMOUSER = "fhirportal";

/// pPortalPath: folder of the portal's static files (default: <install>/csp/fhir/portal/, where module.xml copies fhirUI).
/// pDemoUser: 1 creates the demo user (zpm "install fhir-portal -DDemoUser=1").
/// In a namespace without the FHIR endpoint, it only warns: the module stays loaded and nothing is configured.
/// The Security classes exist only in %SYS, where this class does not: everything there runs inline in this method.
ClassMethod Setup(pPortalPath As %String = "", pDemoUser As %Boolean = 0) As %Status
{
    Set sc = $$$OK
    Set namespace = $Namespace
    Try {
        New $Namespace
        Set $Namespace = "%SYS"

        Set endpointNamespace = ""
        If ##class(Security.Applications).Exists(..#FHIRENDPOINT) {
            $$$ThrowOnError(##class(Security.Applications).Get(..#FHIRENDPOINT, .props))
            Set endpointNamespace = $Get(props("NameSpace"))
        }
        If endpointNamespace '= namespace {
            Write !,"fhir-portal: ",..#FHIRENDPOINT," is not a FHIR endpoint of namespace ",namespace,", so nothing was configured.",!
            Write "Install fhir-portal in the namespace of the FHIR server, after it, for example:",!
            Write "  zn ""FHIRSERVER"" zpm ""install fhir-portal""",!
            Quit
        }
        // Dispatch reads only the tables of the JsonAdvSQL strategy: any other one would fail on every /fhir/api call
        Set $Namespace = namespace
        Set strategy = ##class(HS.FHIRServer.API.InteractionsStrategy).GetStrategyForEndpoint(..#FHIRENDPOINT)
        If '$IsObject(strategy) || 'strategy.%IsA("HS.FHIRServer.Storage.JsonAdvSQL.InteractionsStrategy") {
            $$$ThrowStatus($$$ERROR($$$GeneralError, ..#FHIRENDPOINT_" must use the JsonAdvSQL storage strategy"))
        }
        // The SQL schemas Dispatch reads (resources and search parameters), named by the endpoint, never hard-coded
        Set grants = $ListBuild("SELECT ON SCHEMA "_$Piece(strategy.GetResourceTable("Patient"), "."),
            "SELECT ON SCHEMA "_$Piece(strategy.GetSearchTable("Observation"), "."),
            "EXECUTE ON SQLUser.GetJSON, SQLUser.GetProp, SQLUser.GetAtJSON")
        Set $Namespace = "%SYS"
        If pPortalPath = "" Set pPortalPath = $System.Util.InstallDirectory()_"csp/fhir/portal/"
        Set dbRole = "%HS_DB_"_namespace

        If '##class(Security.Roles).Exists(..#APIROLE) {
            $$$ThrowOnError(##class(Security.Roles).Create(..#APIROLE, "SQL privileges of /fhir/api", "", ""))
        }
        // The databases of the namespace's database role, each with R instead of RW
        $$$ThrowOnError(##class(Security.Roles).Get(dbRole, .roleProps))
        Set readResources = ""
        For i = 1:1:$Length(roleProps("Resources"), ",") {
            Set resource = $Piece($Piece(roleProps("Resources"), ",", i), ":")
            Continue:$Extract(resource, 1, 4)'="%DB_"
            Set readResources = readResources_$Select(readResources="":"", 1:",")_resource_":R"
        }
        If ##class(Security.Roles).Exists(..#READROLE) {
            Kill roleProps
            Set roleProps("Resources") = readResources
            $$$ThrowOnError(##class(Security.Roles).Modify(..#READROLE, .roleProps))
        } Else {
            $$$ThrowOnError(##class(Security.Roles).Create(..#READROLE, "Read-only FHIR databases of /fhir/api", readResources, ""))
        }

        // Portal pages: static files only for an authenticated session (ServeFiles=3); the role lets the entry page run
        Set apps("/fhir/portal", "NameSpace") = namespace, apps("/fhir/portal", "Path") = pPortalPath
        Set apps("/fhir/portal", "Recurse") = 1, apps("/fhir/portal", "AutheEnabled") = 32
        Set apps("/fhir/portal", "ServeFiles") = 3, apps("/fhir/portal", "MatchRoles") = ":"_dbRole
        // REST API: read-only databases and SQL privileges for exactly what Dispatch reads, so not even a bug in it
        // could write to the FHIR tables (UPDATE and DELETE fail with SQLCODE -99)
        Set apps("/fhir/api", "NameSpace") = namespace, apps("/fhir/api", "DispatchClass") = "diashenrique.fhir.portal.Dispatch"
        Set apps("/fhir/api", "AutheEnabled") = 32, apps("/fhir/api", "MatchRoles") = ":"_..#READROLE_":"_..#APIROLE
        // FHIR endpoint: keep 8288 (unauthenticated allowed on the web app): the FHIR server itself refuses UnknownUser
        // with 401. Without the unauthenticated bit (8224) every anonymous call makes CSP look for a login page this
        // REST app does not have, logs a severity-2 alert and leaves the container unhealthy.
        Set apps(..#FHIRENDPOINT, "AutheEnabled") = 8288

        // Every app joins one session group; what exists is modified, the rest created
        Set app = ""
        For {
            Set app = $Order(apps(app))
            Quit:app=""
            Kill props
            Merge props = apps(app)
            Set props("GroupById") = ..#SESSIONGROUP, props("CookiePath") = ..#COOKIEPATH, props("UseCookies") = 2
            If ##class(Security.Applications).Exists(app) {
                $$$ThrowOnError(##class(Security.Applications).Modify(app, .props))
            } Else {
                Set props("IsNameSpaceDefault") = 0
                $$$ThrowOnError(##class(Security.Applications).Create(app, .props))
            }
        }

        If +pDemoUser && '##class(Security.Users).Exists(..#DEMOUSER) {
            $$$ThrowOnError(##class(Security.Users).Create(..#DEMOUSER, "", "fhirportal", "FHIR Portal demo user"))
        }

        Set $Namespace = namespace
        For i = 1:1:$ListLength(grants) {
            Set result = ##class(%SQL.Statement).%ExecDirect(, "GRANT "_$List(grants, i)_" TO "_..#APIROLE)
            If result.%SQLCODE < 0 {
                Throw ##class(%Exception.SQL).CreateFromSQLCODE(result.%SQLCODE, result.%Message)
            }
        }
        Write !,"fhir-portal: configured; open /fhir/portal/diashenrique.fhir.portal.Home.cls",!
    } Catch ex {
        Set sc = ex.AsStatus()
    }
    Quit sc
}

/// Undoes Setup when the module is uninstalled (zpm "uninstall fhir-portal"): the portal's web apps, roles and demo user.
/// The session group settings and AutheEnabled 8288 stay on the FHIR endpoint, which belongs to the FHIR server.
/// Only what belongs to this namespace is removed, so uninstalling a copy loaded elsewhere (USER) touches nothing.
ClassMethod Remove() As %Status
{
    Set sc = $$$OK
    Set namespace = $Namespace
    Try {
        New $Namespace
        Set $Namespace = "%SYS"
        For app = "/fhir/portal", "/fhir/api" {
            Continue:'##class(Security.Applications).Exists(app)
            Kill props
            $$$ThrowOnError(##class(Security.Applications).Get(app, .props))
            Continue:$Get(props("NameSpace"))'=namespace
            $$$ThrowOnError(##class(Security.Applications).Delete(app))
            Set removed = 1
        }
        // The roles and the demo user exist for these apps only
        If $Get(removed) {
            For role = ..#READROLE, ..#APIROLE {
                If ##class(Security.Roles).Exists(role) $$$ThrowOnError(##class(Security.Roles).Delete(role))
            }
            If ##class(Security.Users).Exists(..#DEMOUSER) $$$ThrowOnError(##class(Security.Users).Delete(..#DEMOUSER))
            Write !,"fhir-portal: removed /fhir/portal, /fhir/api, their roles and the demo user",!
        }
    } Catch ex {
        Set sc = ex.AsStatus()
    }
    Quit sc
}

}
