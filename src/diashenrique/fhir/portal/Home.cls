/// Entry page of the /fhir/portal web app. Static files there are served only to an
/// authenticated session (ServeFiles=3), and only a CSP page triggers the IRIS login,
/// so this page is the door: it requires login and then sends the browser to the patient list.
/// Logout is ?IRISLogout=end on this page.
Class diashenrique.fhir.portal.Home Extends %CSP.Page
{

ClassMethod OnPreHTTP() As %Boolean [ ServerOnly = 1 ]
{
    Set %response.Redirect = "patientlist.html"
    Quit 1
}

ClassMethod OnPage() As %Status [ ServerOnly = 1 ]
{
    Quit $$$OK
}

}
