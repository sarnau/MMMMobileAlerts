# Mobile Alerts

This document tries to describe every detail of the Mobile Alerts sensors, which are sold by ELV in Germany, but are also available at the common suspects (Amazon, etc)

Mobile Alerts is covering mostly climate sensors, but also contains moisture and door/window sensors plus a sound detector, which acts as a gateway for smoke sensors.

The [Mobile Alerts](http://www.mobile-alerts.eu) are a version of the [LaCrosse Alerts Mobile](http://www.lacrossetechnology.com/alerts/) system made for the European market, which seem to cost money after a 3 months trial [La Crosse Alerts Mobile](http://www.lacrossealertsmobile.com).

Despite looking almost identical and the expectation that there are only subtile differences in the sensors, like the operating frequency (915MHz in the US vs 868MHz in Germany), the protocol seems to be completely different. Anything on the internet about the La Crosse Gateway GW-1000U, which looks identical to the Mobile Alerts Gateway is not applicable. There is a certain overlap, but it is minimal (like the UDP communication on port 8003). The sending is different, e.g. the `http_identify` does exist, but the format is different.


## Mobile Alerts Devices

Here a list of all known products from Mobile Alerts. The product code is a marketing code, the ID is the format of the sensor data being transmitted (sensors with the same ID send data in the identical way)

| Product code | Device name      |
|--------------|------------------|
| MA10001      | START SET (MA10000 + MA10100) |
| MA10005      | START SET (MA10000 + TX47 (3 minutes) + WL2000) |
| MA10006      | START SET (MA10000 + TX45TH-IT (2 minutes) + MA10410) |
| MA10007      | Temperaturüberwachung (MA10000 + MA10320 + MA10100) |
| MA10008      | Special Set Hausüberwachung (MA10000 + MA10100 + 3 * MA10800) |
| MA10012      | Zusatzsensoren (MA10000 + MA10231 + MA10232) |
| MA10028      | Introduction Set (MA10000 + MA10000 + MA10100 + MA10350 + MA10800) |
| MA10029      | Aquarium Set (MA10000 + MA10100 + MA10101) |
| MA10050      | Internet Weather Center (MA10660 + MA10650 + MA10200) |

| Product code | ID   | Device name      | Accuracy | Transmission Rate |
|--------------|------|------------------|----------|-------------------|
| MA10000      | ID00 | Gateway          |          | |
| ?            | ID01 | Temperature sensor with ext. cable probe | | |
| MA10100      | ID02 | Temperature sensor | -29.9°C…+59.9°C, ±1°C | 7 min |
| MA10101      | ID02 | Temperature sensor with cable probe | –29.9°C…+59.9°C | 7 min |
| MA10120      | ID09 | Pro Temperature sensor with cable probe | –29.9°C…+59.9°C ±1°C | 7 min |
| MA10200      | ID03 | Thermo-hygro-sensor | –39.9°C…+59.9°C, 20%…99%, ±4% | 7 min |
| MA10230      | ID12 | Indoor Climate Status | –39.9°C…+59.9°C, ±0.8°C, 1%…99%, ±3% | |
| MA10250      | ID03 | Thermo-Hygro Outdoor | –39.9°C…+59.9°C, ±1°C, 20%…99% ±5% | 7 min |
| MA10300      | ID03 | Thermo-hygro-sensor with cable probe | –39.9°C…+59.9°C, 20%…99%, ±4% | 7 min |
| MA10320      | ID09 | Pro Thermo-hygro-sensor with ext. cable probe | –39.9°C…+59.9°C, ±1°C, cable probe –50°C…+110°C, ±0,5°C, 20%…99% ±5% | 3.5 min |
| MA10350      | ID04 | Thermo-hygro-sensor with water detector | –39.9°C…+59.9°C, 20%…99%, ±4% | */7 min |
| MA10410      | ID07 | Weather Station | indoor: -9.9°C…+59.9°C ±1°C, 20%…95% ±4%, outdoor -39.9°C…+59.9°C ±1°C, outdoor 1%…99% ±4% | 6 min |
| MA10650      | ID08 | Rain meter | 0mm/h…300mm/h, 0.258mm | during rain up to every second, or every 2 hours during idle |
| MA10660      | ID0B | Wind speed and wind direction display | wind and gusts: 0-50 m/s, ±5% or ±0.5 m/s, 0,02s gusts, direction 22,5° resolution | 6 min |
| MA10700      | ID06 | Thermo-hygro-sensor with pool sensor | –39.9°C…+59.9°C ±1°C, 20%…99%, ±4% Pool:0°C…+59.9°C ±1°C | |
| MA10800      | ID10 | Contact sensor | | state change, or every 6 hours during idle |
| MA10860      | ID0a | Sensor for acoustical observation of detectors | ? | ? |
| WL2000       | ID05 | Air quality monitor | indoor: -9.5°C…+59.9°C ±1°C, 20%…95% ±4%, outdoor -39.9°C…+59.9°C ±1°C, outdoor 1%…99%, CO²-equivalent: 450ppm…3950ppm ±50ppm | 7 min |
| ?            | ID0E | Thermo-hygro-sensor | | |
| ?            | ID0F | Temperature sensor with ext. cable probe | | |
| ?            | ID11 | 4 Thermo-hygro-sensors | | |

Each device has a unique device ID, which is 12 uppercase characters long. Every device within the range of the gateway is received by the gateway and forwarded to the internet, it technically is not necessary to know the ID, you can find it out by listening to the gateway.

The 12 characters are representing a 6 byte number, which is simply converted into a hexadecimal string.

The first byte is considered by Mobile Alerts the ID, like ID02 or ID08. This ID is defining the type of sensor which is transmitting and how the data is to be interpreted.

### Rain Meter Details

The rain meter is measuring rainfall in an 100cm2 area with a rocker counter, which flips over every 2.58ml. This will result in a theoretical resolution of 0.258mm/m2 – by very slowly adding a measured weight of water to the funnel and counting the switches, I would guess that the flip happens every 3ml-3.25ml, which means it reports between 10-30% too low. But as somebody said "Rain doesn't fall as accurate as we can measure it". It doesn't matter, because dust, etc. will have a greater impact on the measurement anyway. We want to know: (a) when does it rain, (b) did it rain a little or a lot. The sensor is sufficient for that.

Warning: because of it's battery power, it is not heated and therefore can't measure snow, hail or sleet.


## QR Code on the sensors

Every sensor has a QR Code printed on it, or in the box (for the small window sensors), it looks like this one:

![QR Code](qrcode.png)

It is a simple 3 line ASCII text, with lines separated by CR (ASCII 13). The first line is the serial number of the sensor, follow by the production date (day.month.year), followed by the product name or version number.

Here is a small sample code that generates the QR Code:

```
    #!/usr/bin/python

    import qrcode

    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )

    sensorID = '091234567890'           # [0-9A-F]{12}
    productionDate = '01.02.2015'       # "dd.MM.yyyy"
    productCode = 'MA10320/103300'

    qr.add_data('\r'.join([sensorID,productionDate,productCode]))
    #qr.add_data('0A1234567890\r01.01.2015\rMA10860')
    #qr.add_data('031234567890\r01.01.2015\rMA10200/10210')
    #qr.add_data('101234567890\r01.01.2015\rV05i')
    qr.make(fit=True)

    img = qr.make_image()
    img.save("qrcode.png","PNG")
```

## Mobile Alerts Gateway

The gateway listens to all sensors within range on the 868.3MHz frequency and transmits their data to the Mobile Alerts Sensor Cloud, which provides the data to a website or phone apps.

The Gateway also has a unique device ID, which follows the same scheme as any Mobile Alerts device. It is also the MAC address of the device, which is in the address range of "La Crosse Technology LTD" and always starts with 00:1d:8c:xx:xx:xx. The serial number of the gateway is "80" plus the last 6 (unique) letters from the device ID.

Example:
`Gateway ID: 001d8cAABBCC`
`Gateway Serial: 80AABBCC`

BTW: The gateway is only compatible to IPv4, not IPv6!


### Gateway web interface

The gateway also has a little web interface, which shows it's network configuration. There is no direct way to configure the device with this web interface. However the values in bold can be modified via a UDP interface.

Mobile Alerts Settings & States


Software:	MOBILE-ALERTS-Gateway V1.50.00
Compilation Date:	02/11/15
Compilation Time:	10:50:00
Serial No. (hex.):	80AABBCC
Serial No. (dec.):	00 11 22 33
Name:	**MOBILEALERTS-Gateway**
Registration state:	Registered
Use DHCP:	**Yes**
Fixed IP:	**192.168.1.222**
Fixed Netmask:	**255.255.255.0**
Fixed Gateway:	**192.168.1.254**
Fixed DNS IP:	**192.168.1.253**
DHCP valid:	Yes
DHCP IP:	192.168.1.100
DHCP Netmask:	255.255.255.0
DHCP Gateway:	192.168.1.1
DHCP DNS:	192.168.1.1
DNS states:	0 / 0
Data Server Name:	**www.data199.com**
Use Proxy:	**No**
Proxy Server Name:	**192.168.1.1**
Proxy Port:	**8080**
Proxy Server IP:	192.168.1.1
Last contact:	No contact
RF channel:	2
[Go to MOBILE-ALERTS - Homepage](http://http//www.mobile-alerts.eu)

Time:686300

`Serial No. (hex.)` is "80" plus the lower 3 bytes of the ID converted to hex. `Serial No. (dec.)` is the same, with the lower 3 bytes treated as a single number converted to decimal and with spaces every 2 digits resulting in 8 decimal digits.

`Last contact` is a UTC UNIX timestamp in a ms resolution from the last time the gateway contacted the cloud server.

The `Time` on the webpage is the number of microseconds since boot divided by 100. Or – if you prefer it this way – the number of seconds plus 4 additional digits with sub-seconds resolution with the lowest 2 always being 0.

The sensor data is send to the cloud server with the name [www.data199.com](www.data199.com), registered by DATA INFORMATION SERVICES GmbH in Wildau, Germany. It is actually a Microsoft Azure Website running on a Microsoft system in the US with the domain of [sensorcloud.cloudapp.net](sensorcloud.cloudapp.net)


### Gateway UDP interface

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

#### Get config package

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


#### Set config package

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


## Mobile Alerts REST API

Recently Mobile Alerts documented their REST API, which allows accessing the last value in the cloud. It is only available for few sensors (ID 01, 08, 09, 0B and 0E) sensor types.

A description and download of the REST API can be found here: [here](http://www.mobile-alerts.eu/images/public_server_api_documentation.pdf).


## Mobile Alerts Sensor Cloud Protocol

## Reading from the Cloud

The Sensor Cloud is accessed from phones to display the data of the sensors. The only protection against others reading the data is the secrecy of the device IDs.

To receive the data, send a POST request to [http://www.data199.com:8080/api/v1/dashboard](http://www.data199.com:8080/api/v1/dashboard) with the following HTTP headers:

    "User-Agent" : "remotemonitor/248 CFNetwork/758.2.8 Darwin/15.0.0",
    "Accept-Language" : "en-us",
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    "Host" : "www.data199.com:8080",

and the following data in the body of the request (as a Python sample code):

    devicetoken = 'empty'				# defaults to "empty"
    vendorid = 'BE60BB85-EAC9-4C5B-8885-1A54A9D51E29'	# iOS vendor UUID (returned by iOS, any UUID will do). Launch uuidgen from the terminal to generate a fresh one.
    phoneid = 'Unknown'					# Phone ID - probably generated by the server based on the vendorid (this string can be "Unknown" and it still works)
    version = '1.21'					# Info.plist CFBundleShortVersionString
    build = '248'						# Info.plist CFBundleVersion
    executable = 'Mobile Alerts'		# Info.plist CFBundleExecutable
    bundle = 'de.synertronixx.remotemonitor'	# [[NSBundle mainBundle] bundleIdentifier]
    lang = 'en'							# preferred language

    request = "devicetoken=%s&vendorid=%s&phoneid=%s&version=%s&build=%s&executable=%s&bundle=%s&lang=%s" % (devicetoken,vendorid,phoneid,version,build,executable,bundle,lang)
    request += '&timezoneoffset=%d' % 60		# local offset to UTC time
    request += '&timeampm=%s' % ('true')		# 12h vs 24h clock
    request += '&usecelsius=%s' % ('true')		# Celcius vs Fahrenheit
    request += '&usemm=%s' % ('true')			# mm va in
    request += '&speedunit=%d' % 0				# wind speed (0: m/s, 1: km/h, 2: mph, 3: kn)
    request += '&timestamp=%s' % datetime.datetime.utcnow().strftime("%s")	# current UTC timestamp

    requestMD5 = request + 'asdfaldfjadflxgeteeiorut0ß8vfdft34503580'	# SALT for the MD5
    requestMD5 = requestMD5.replace('-','')
    requestMD5 = requestMD5.replace(',','')
    requestMD5 = requestMD5.replace('.','')
    requestMD5 = requestMD5.lower()

    m = hashlib.md5()
    m.update(requestMD5)
    hexdig = m.hexdigest()

    request += '&requesttoken=%s' % hexdig

    request += '&deviceids=%s' % ','.join(sensors)
    #request += '&measurementfroms=%s' % ('0,' * len(sensors))
    #request += '&measurementcounts=%s' % ('50,' * len(sensors))

As you can see: the first part of the request (before the sensor IDs) is "signed" with an MD5 salted hash to avoid people modifying it. I am not sure why the device IDs are not included in it. This request will send all data for all sensors back. You can reduce the amount by limit the number of data points with the measurementcounts parameter (one per sensor) or by measurementfroms, which is a UNIX UTC timestamp for each sensor.

The returned data is a JSON block with timestamps again being UNIX UTC based ones.


## Sending data into the Cloud

The gateway sends data via a binary HTTP request to [http://www.data199.com/gateway/put](http://www.data199.com/gateway/put) (to be exact the data server, which is in the configuration). The `content-type` describes it as `application/octet-stream` and an additional header `http_identify` contains the following string: Gateway Serial + ":" + Gateway MAC + ":" + action code.

`http_identify: 80ABCDEF:006789ABCDEF:00` send during boot-up of the gateway.
`http_identify: 80ABCDEF:006789ABCDEF:C0` send during message transmission.

### Gateway block send during boot-up

The binary data send during boot-up always seems to be 15 bytes. All values are always big-endian, if endianness matters.

| Byte  | Meaning |
|-------|---------|
|  0    | byte, containing the size of the package (15 bytes) |
|  1    | 32-bit value containing the seconds since boot for the gateway, often something like 7 |
|  5    | 6 bytes of the gateway ID |
|  11   | word, always 1? |
|  13   | word, always 50? |

### Sensor 64-byte data block format

The binary data to transfer the packages to the server is always a multiple of 64-byte blocks with each block containing one message from a sensor. Data that is non-urgent is buffered within the gateway to minimize the number of transfers to the cloud server, it seems to be send every 7 minutes. Only messages marked in the tx counter as events are send immediately. If such an event occurs, all buffered packages are also sent. Pressing the button on the gateway sends all data immediately, which is helpful for debugging.

Every 64-byte block has a simple 7-bit checksum. It is calculated by just summing up the first 63 bytes and storing the lower 7 bit in the last byte of the message. Bit 7 in the last byte is always 0. If the checksum is invalid, the server simply ignores the package, but still returns HTTP status 200 (= OK), probably to avoid the gateway sending a defect package over and over again.

#### Offset 0: Package Header
| header | device ID | package length | sensor type |
|----|----------------|
|0xce|ID02|0x12|temperature|
|0xd2|ID03|0x16|temperature + humidity|
|0xd3|ID10|0x17|open/close sensor|
|0xd4|ID04|0x18|temperature + humidity + dry-contact|
|0xd6|ID06|0x1a|temperature + humidity + pool temperature|
|0xe1|ID08|0x25|rain|
|0xe2|ID0b|0x26|wind|

#### Offset 1: UNIX UTC Timestamp
A 4 byte UNIX UTC timestamp when the data was received by the gateway.

#### Offset 4: Package Length
Length of data within the whole package in bytes. It seems to be always be the same for the same header and device ID.

#### Offset 6: Device ID
6 byte device ID, which matches the sensor MAC address. The first byte is the ID, which defines the content of the data.

#### Offset 12: Data
Starting here is the sensor depended data.

| ID | Format of data |
|----|----------------|
| 02 | **Temperature sensor** |
|    |  0 word: tx counter |
|    |  2 word: current temperature |
|    |  4 word: previous temperature |
| 03 | **Temperature/Humidity sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: humidity |
|    |  6 word: previous temperature |
|    |  8 word: previous humidity |
| 04 | **Temperature/Humidity/Water Detector sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: humidity |
|    |  6 byte: wetness sensor |
|    |  7 word: previous temperature |
|    |  9 word: previous humidity |
|    | 11 byte: previous water sensor |
| 05 | **Air Quality Monitor [WL2000]** |
| 06 | **Temperature/Humidity/Pool sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: pool temperature |
|    |  6 word: humidity |
|    |  8 word: previous temperature |
|    | 10 word: previous pool temperature |
|    | 12 word: previous humidity |
| 08 | **Rain sensor** |
|    |  0 word: tx counter |
|    |  2 word: Bit 14-15: %10:rain seesaw to the left  |
|    |          Bit 14-15: %01:rain seesaw to the right  |
|    |          Bit 14-15: %00:2 hour idle timer, no movement detected |
|    |          Bit 0-13: temperature  |
|    |  4 word: seesaw movement counter = 0.25mm/m2 per count, e.g. 20 ticks = 5l/m2 rain - needs to be counted over a 1 hour period for normalization |
|    |  6 word: Bit 14-15: %00: probably unused  |
|    |          Bit 14-15: %01: Unit: hours (overflow after ~682 days)  |
|    |          Bit 14-15: %10: Unit: min (overflow after ~11 days)  |
|    |          Bit 14-15: %11: Unit: sec (overflow after ~4 hours)  |
|    |          Bit 0-13: Time value since the last event |
|    |  8 word: previous event time (lower 13 bits contain the time in seconds/minutes/hours/days since last event)  |
|    | 10 word: previous event time  |
|    | 12 word: previous event time  |
|    | 14 word: previous event time  |
|    | 16 word: previous event time  |
|    | 18 word: previous event time  |
|    | 20 word: previous event time  |
|    | 22 word: previous event time  |
| 09 | **Pro Temperature/Humidity/Ext.Temperature sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: ext. temperature |
|    |  6 word: humidity |
|    |  8 word: previous temperature |
|    | 10 word: previous ext. temperature |
|    | 12 word: previous humidity |
| 0a | **MA10860** |
|    |  0 word: tx counter |
|    |  2 word: Bit 15: Alarm 1 triggered |
|    |          Bit 14: Alarm 2 triggered |
|    |          Bit 13: Alarm 3 triggered |
|    |          Bit 12: Alarm 4 triggered |
|    |          Bit 11: unknown, always 0 |
|    |          Bit 10: unknown, always 0 |
|    |          Bit 0-9: Temperature without overflow and error bits |
| 0b | **Wind sensor** |
|    |  0 3-byte: tx counter (this tx counter is 3 bytes instead of 2 bytes!) |
|    |  3 long: Bit 28…31: wind direction (0 = N, 1 = NNO, 2 = NO, 3 = ONO, 4 = O, …, 12 = W, 13 = WNW, 14 = NW, 15 = NNW) |
|    |          Bit 27: unknown, always 0 |
|    |          Bit 26: unknown, always 0 |
|    |          Bit 25: Bit 8 for the wind speed (to have a 9 bit resolution) |
|    |          Bit 24: Bit 8 for the gust speed (to have a 9 bit resolution) |
|    |          Bit 15…23: wind speed in m/s, divide value by 10 |
|    |          Bit 8…15: gust speed in m/s, divide value by 10 |
|    |          Bit 0…7: typical 210, which multiplied by 2 equals 410s or 7 minutes, which is the duration since the last transmit) |
|    |  7 long: previous state |
|    | 11 long: previous state |
|    | 15 long: previous state |
|    | 19 long: previous state |
|    | 23 long: previous state |
| 0c | illegal sensor id |
| 0d | illegal sensor id |
| 0e | **Professional Thermo/Hygro sensor** |
| 10 | **Door/Window sensor** (idle time: 6 hours) |
|    |  0 word: tx counter |
|    |  2 word: Bit 15: 0:Closed, 1:Open  |
|    |          Bit 13-14: %00: Unit: ?days?  |
|    |          Bit 13-14: %01: Unit: hours (overflow after ~341 days)  |
|    |          Bit 13-14: %10: Unit: min (overflow after ~5 days)  |
|    |          Bit 13-14: %11: Unit: sec (overflow after ~2 hours)  |
|    |          Bit 0-12: Time value  |
|    |  4 word: previous state (lower 12 bits contain the time in seconds/minutes/hours/days since last event) |
|    |  6 word: previous state |
|    |  8 word: previous state |
| 12 | **Humidity Guard** |

#### Value decoding

##### Tx Counter

| Bits  | Meaning |
|------|---------|
|  15  | unknown, always seems to be 0. |
|  14  | 0: the transmission was triggered by the internal timer of the device e.g. for thermometers transmitting the temperature every 7 minutes or sensors sending every 2 hours a heartbeat |
|      | 1: the transmission was triggered by an event, like a battery change or the trigger of an alarm sensor or the button on the device |
| 0…13 | These bits are a counter that is incremented on every new event overflowing from 0x3fff back to 0x0000. It can be used to filter out duplicate messages on the receiver side. |


##### Temperature

| Bits  | Meaning |
|-------|---------|
|  15   | unknown, typically 0, but can be 1 |
|  14   | unknown, typically 0, but can be 1 |
|  13   | overflow (too hot for the sensor) and is displayed as "OFL°C" |
|  12   | sensor error occurred. It is represented as "---°C" |
|  11   | unknown, always seems to be 0. |
| 0…10  | temperature is a signed 11 bit value in 1/10°C.
|       | 0…1023 represents 0.0°C…102.3°C = value * 0.1 |
|       | 1024…2047 do represent -102.4°C…-0.1°C = (2048-value) * -0.1 |

A sensor error typically occurs if e.g. the water temperature sensor of the pool sensor is offline (e.g. no batteries). In this case the water temperature can't be reported.

##### Humidity

| Bits  | Meaning |
|-------|---------|
|  15   | unknown, typically 0, but can be 1 |
|  14   | unknown, typically 0, but can be 1 |
|  13   | unknown |
|  12   | unknown |
| 8…11  | unknown, typically a value of 10, on the MA10250PRO (Outdoor sensor) it is 0 |
|   7   | unknown |
| 0…6   | humidity is a 7 bit value and read as % |

##### Wetness

| Bits  | Meaning |
|-------|---------|
|   7   | unknown, always 1 |
|   6   | unknown, always 0 |
|   5   | unknown, always 1 |
|   4   | unknown, always 0 |
|   3   | unknown, always 1 |
|   2   | unknown, always 0 |
|   1   | unknown, 0:dry, 1:wet |
|   0   | unknown, 0:wet, 1:dry |
