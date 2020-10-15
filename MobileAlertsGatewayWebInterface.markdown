# Gateway Web Interface

The gateway also has a little web interface, which shows it's network configuration. There is no direct way to configure the device with this web interface. However the values in bold can be modified via a UDP interface.

Mobile Alerts Settings & States<br />
<br />
<br />
Software:	MOBILE-ALERTS-Gateway V1.50.00<br />
Compilation Date:	02/11/15<br />
Compilation Time:	10:50:00<br />
Serial No. (hex.):	80AABBCC<br />
Serial No. (dec.):	00 11 22 33<br />
Name:	**MOBILEALERTS-Gateway**<br />
Registration state:	Registered<br />
Use DHCP:	**Yes**<br />
Fixed IP:	**192.168.1.222**<br />
Fixed Netmask:	**255.255.255.0**<br />
Fixed Gateway:	**192.168.1.254**<br />
Fixed DNS IP:	**192.168.1.253**<br />
DHCP valid:	Yes<br />
DHCP IP:	192.168.1.100<br />
DHCP Netmask:	255.255.255.0<br />
DHCP Gateway:	192.168.1.1<br />
DHCP DNS:	192.168.1.1<br />
DNS states:	0 / 0<br />
Data Server Name:	**www.data199.com**<br />
Use Proxy:	**No**<br />
Proxy Server Name:	**192.168.1.1**<br />
Proxy Port:	**8080**<br />
Proxy Server IP:	192.168.1.1<br />
Last contact:	No contact<br />
RF channel:	2<br />
[Go to MOBILE-ALERTS - Homepage](http://http//www.mobile-alerts.eu)<br />
<br />
Time:686300<br />

`Serial No. (hex.)` is "80" plus the lower 3 bytes of the ID converted to hex. `Serial No. (dec.)` is the same, with the lower 3 bytes treated as a single number converted to decimal and with spaces every 2 digits resulting in 8 decimal digits.

`Last contact` is a UTC UNIX timestamp in a ms resolution from the last time the gateway contacted the cloud server. This number is only correct when the first **data** package has been transmitted. Registering of the gateway does lead to 700 or 800 or so. Maybe this is the counter/100, how often the gateway has been rebooted since ever?

The `Time` on the webpage is the number of microseconds since boot divided by 100. Or – if you prefer it this way – the number of seconds plus 4 additional digits with sub-seconds resolution with the lowest 2 always being 0.
