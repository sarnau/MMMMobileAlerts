# Gateway UDP interface

The gateways can be found, read, configured and rebooted via a simple UDP interface. UDP packages send to the gateway are always broadcast packages (send to IP 255.255.255.255) and to port 8003.

The data is in a binary package with all values being big-endian. Each package has a 10 byte header:

| Offset |    Size | Description |
|--------|---------|-------------|
|    0   |    word | command |
|    2   | 6 bytes | gateway ID |
|    8   |    word | length of the whole package |

The following commands are known:

- 1: Find gateways. The gateway ID in the header is 000000000000 which will make all gateways in the local network respond with a "Get config" reply. This package takes no additional data.
- 2: Find a gateway. The gateway ID in the header has to be filled in, if found, it will respond with a "Get config" reply. This package takes no additional data.
- 3: Get config. This is send from the gateway to the host as a response to the "Find gateway" request.
- 4: Set config. This is send to the gateway to update the configuration. After receiving it, the gateway needs a few seconds to do the update.
- 5: Reboot gateway. A reboot takes about 10s for the gateway to be back up again. This package takes no additional data.

## Get config package

This package is a reply package for the commands #1 and #2.

All this information can also be read on the website of the gateway.

| Offset |    Size | Description |
|--------|---------|-------------|
|    0   |    word | command (3) |
|    2   | 6 bytes | gateway ID |
|    8   |    word | length of the whole package (186) |
|   10   |    byte | unknown, always 0 |
|  11…14 |    long | DHCP IP - current assigned IP address by a DHCP server |
|   15   |    byte | Use DHCP - 0 for no, 1 for yes |
|  16…19 |    long | Fixed IP - if no DHCP is used, this is the IP address for the gateway |
|  20…23 |    long | DHCP Netmask - if no DHCP is used, this is the IP netmask |
|  24…27 |    long | Fixed Gateway - if no DHCP is used, this is the IP address of the router |
|  28…48 |21 bytes | 20 bytes device name, typically "MOBILEALERTS-Gateway" plus a 0 byte to terminate the string |
| 49…113 |65 bytes | 64 bytes data server name, typically [www.data199.com](www.data199.com) plus a 0 byte to terminate the string |
|   114  |    byte | Use Proxy - 0 for no, 1 for yes |
|115…179 |65 bytes | 64 bytes proxy server name, typically [192.168.1.1](192.168.1.1) plus a 0 byte to terminate the string |
|   180  |    word | proxy server port number |
|182…185 |    long | Fixed DNS IP - if no DHCP is used, this is the IP address of the DNS server |


## Set config package

The package is 5 bytes shorter than the Get config package, because it is missing to entries: the unknown byte (0) and the DHCP IP, which is read-only anyway. This makes me guess, that the unknown byte is also read-only.

This package is used for the following 4 purposes:
- Disable the use of DHCP and provide static routing to the gateway. DHCP is used by default.
- Enable the use of a proxy server for routing to the gateway. No proxy is used by default.
- Set the name of the gateway. This is only used in the phone and web server UI. It might be only useful if you are running several gateways in the local network.
- Change the data server name, which is the Sensor Cloud server to receive the sensor data.

| Offset |    Size | Description |
|--------|---------|-------------|
|  0…1   |    word | command (4) |
|  2…7   | 6 bytes | gateway ID |
|  8…9   |    word | length of the whole package (181) |
|   10   |    byte | Use DHCP - 0 for no, 1 for yes |
|  11…14 |    long | Fixed IP - if no DHCP is used, this is the IP address for the gateway |
|  15…18 |    long | DHCP Netmask - if no DHCP is used, this is the IP netmask |
|  19…22 |    long | Fixed Gateway - if no DHCP is used, this is the IP address of the router |
|  23…43 |21 bytes | 20 bytes device name, typically "MOBILEALERTS-Gateway" plus a 0 byte to terminate the string |
| 44…108 |65 bytes | 64 bytes data server name, typically [www.data199.com](www.data199.com) plus a 0 byte to terminate the string |
|   109  |    byte | Use Proxy - 0 for no, 1 for yes |
|110…174 |65 bytes | 64 bytes proxy server name, typically [192.168.1.1](192.168.1.1) plus a 0 byte to terminate the string |
|175…176 |    word | proxy server port number |
|177…180 |    long | Fixed DNS IP - if no DHCP is used, this is the IP address of the DNS server |

