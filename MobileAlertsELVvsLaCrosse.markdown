# Mobile Alerts ELV vs LaCrosse

The [Mobile Alerts](http://www.mobile-alerts.eu) are a version of the [LaCrosse Alerts Mobile](http://www.lacrossetechnology.com/alerts/) system made for the European market, which seem to cost money after a 3 months trial [La Crosse Alerts Mobile](http://www.lacrossealertsmobile.com).

Despite looking almost identical and the expectation that there are only subtile differences in the sensors, like the operating frequency (915MHz in the US vs 868MHz in Germany), the protocol seems to be completely different. Anything on the internet about the La Crosse Gateway GW-1000U, which looks identical to the Mobile Alerts Gateway is not applicable. There is a certain overlap, but it is minimal (like the UDP communication on port 8003). The sending is different, e.g. the `http_identify` does exist, but the format is different.
