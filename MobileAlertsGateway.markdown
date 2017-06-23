# Mobile Alerts Gateway

The gateway listens to all sensors within range on the 868.3MHz frequency and transmits their data to the Mobile Alerts Sensor Cloud, which provides the data to a website or phone apps.

The Gateway also has a unique device ID, which follows the same scheme as any Mobile Alerts device. It is also the MAC address of the device, which is in the address range of "La Crosse Technology LTD" and always starts with 00:1d:8c:xx:xx:xx. The serial number of the gateway is "80" plus the last 6 (unique) letters from the device ID.

Example:
`Gateway ID: 001d8cAABBCC`
`Gateway Serial: 80AABBCC`

BTW: The gateway is only compatible to IPv4, not IPv6!

## Red LED blinks

The red LED is for Ethernet communication status.

On power-on the following blink pattern can be used to detect the status:

- 1 blink: Ethernet cable is plugged in
- 2 blinks: DHCP server address assigned and internet is found
- 3 blinks: cloud server found via DNS
- 4 blinks: Gateway is ready to register (The [boot-up package](MobileAlertsGatewayBinaryUpload) is send to the cloud server)

Once the cloud server responds the red LED turns off.

If a package is send to the cloud server, the red LED blinks as well.


## Green LED blinks

The green LED is the status of the RF communication. It is typically always on. It blinks when it receives packages.


## Communication

The gateway caches packages from sensors and only uploads them to the cloud server every few minutes. The exceptions are Window/Door/Water/Sound sensors and Pro-Sensors, which force a transmission. Pushing the button on the Gateway also forces a transmit of all received packages to the cloud.

The cloud has to confirm the package, otherwise they will be resent. You can see a failure on this by a continuously blinking LED. This is common if the internet is down or your proxy server, which is replacing the cloud server, is offline.

## Factory Reset

1. Disconnect the gateway from power
2. hold down the button on the gateway
3. connect power, while still holding down the button
4. Release button after you see: RED on, RED off, RED on

If this doesn't work, try another power-cycle of the gateway.

