# Mobile Alerts Gateway

The gateway listens to all sensors within range on the 868.3MHz frequency and transmits their data to the Mobile Alerts Sensor Cloud, which provides the data to a website or phone apps.

The Gateway also has a unique device ID, which follows the same scheme as any Mobile Alerts device. It is also the MAC address of the device, which is in the address range of "La Crosse Technology LTD" which always starts with 00:1d:8c:xx:xx:xx. The serial number of the gateway is "80" plus the last 6 (unique) hex digits from the device ID.

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
- 4 blinks: Gateway is ready to register (The [boot-up package](MobileAlertsGatewayBinaryUpload.markdown) is sent to the cloud server)

Once the cloud server responds the red LED turns off.

If a package is sent to the cloud server, the red LED blinks as well.


## Green LED blinks

The green LED is the status of the RF communication. It is typically always on. It blinks when it receives packages.

If sensor data packages are not confirmed (in time) the green LED blinks constantly. (See Communication.)

## Communication

The gateway caches packages from sensors and only uploads them to the cloud server every few minutes. The exceptions are Window/Door/Water/Sound sensors and Pro-Sensors, which force a transmission. Pushing the button on the Gateway also forces a transmit of all received packages to the cloud.

The cloud has to confirm the package, otherwise new data will be appended to the old package and be resent resulting in bigger packages with every transmission attempt. You can identify this failure by a continuously blinking green LED. This is common if the internet is down or your proxy server, which is replacing the cloud server, is offline.

## Factory Reset

1. Disconnect the gateway from power
2. Hold down the button on the gateway
3. Connect power, while still holding down the button
4. The red LED lights up, after a about 5s seconds the green ones also lights up. Green briefly goes off, then about 10s later they both flicker really fast.
5. Release the button
6. After a 10-15s of flickering, the device has reset and starts up normally.

If this doesn't work, try another power-cycle of the gateway.
