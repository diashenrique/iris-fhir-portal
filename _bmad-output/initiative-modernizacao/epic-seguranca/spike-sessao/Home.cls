Class Spike.Home Extends %CSP.Page
{

ClassMethod OnPage() As %Status
{
    &html<<html><body>logged in as #($username)# session #(%session.SessionId)#</body></html>>
    Quit $$$OK
}

}
