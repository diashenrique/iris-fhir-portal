Class fhirtemplate.Setup
{

ClassMethod SetupFHIRServer() As %Status
{
    ZNspace "HSLIB"
    Set namespace = "FHIRSERVER"
    Set appKey = "/fhir/r4"
    Set strategyClass = "HS.FHIRServer.Storage.Json.InteractionsStrategy"
    Set metadataConfigKey = "HL7v40"
    Set importdir = "/opt/irisapp/src"

    //Install a Foundation namespace and change to it
    Do ##class(HS.HC.Util.Installer).InstallFoundation(namespace)
    ZNspace namespace

    // Install elements that are required for a FHIR-enabled namespace
    ZWrite ##class(HS.FHIRServer.Installer).InstallNamespace()

    // Install an instance of a FHIR Service into the current namespace
    ZWrite ##class(HS.FHIRServer.Installer).InstallInstance(appKey, strategyClass, metadataConfigKey,"",0)

    Set strategy = ##class(HS.FHIRServer.API.InteractionsStrategy).GetStrategyForEndpoint(appKey)
    Set config = strategy.GetServiceConfigData()
    Set config.DebugMode = 4
    ZWrite strategy.SaveServiceConfigData(config)
    // load test data
    Quit ##class(HS.FHIRServer.Tools.DataLoader).SubmitResourceFiles("/opt/irisapp/fhirdata/", namespace, appKey)
}

ClassMethod LoadPatientData(path, namespace, appKey) As %Status
{
    Quit ##class(HS.FHIRServer.Tools.DataLoader).SubmitResourceFiles(path, namespace, appKey)
}

ClassMethod AddApp() As %Status
{
    Set namespace="FHIRSERVER"
    ZNspace "%SYS"
    Set webName = "/fhirUI" 
    Set webProperties("NameSpace") = namespace 
    Set webProperties("Enabled") = 1 
    Set webProperties("Path") = "/irisdev/app/fhirUI/"
    Set webProperties("AutheEnabled") = 64 
    Set webProperties("ServeFiles")=2
    Set webProperties("Recurse")=1
    Quit ##class(Security.Applications).Create(webName, .webProperties)
}

}
