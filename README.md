# MMMMobileAlerts

Documentation about the protocols of ELV Mobile Alerts sensors plus a node MQTT gateway

# Mobile Alerts

This document tries to describe every detail of the Mobile Alerts sensors, which are sold by [ELV](https://www.elv.de/ip-wettersensoren-system.html) in Germany, but are also available at the common suspects (Amazon, etc). Be careful buying at Amazon: certain sensors mention Mobile Alerts, but seem to be designed for the US. They are _not_ compatible with the ELV Mobile Alerts ones!

Mobile Alerts is covering mostly climate sensors, but also contains moisture and door/window sensors plus a sound detector, which acts as a gateway for smoke sensors.

The [Mobile Alerts](http://www.mobile-alerts.eu) are a version of the [LaCrosse Alerts Mobile](http://www.lacrossetechnology.com/alerts/) system made for the European market.

## Detailed Infomation

- [Mobile Alerts ELV vs LaCrosse](MobileAlertsELVvsLaCrosse.markdown) - Difference between ELV and LaCrosse sensors
- [Mobile Alerts Devices](MobileAlertsDevices.markdown) - List of all devices with technical infos
- [Mobile Alerts Sensor QR Code](MobileAlertsSensorQRCode.markdown) - QR Code format found on sensors
- [Mobile Alerts Gateway](MobileAlertsGateway.markdown) - Serial number format, LED function
  * [Mobile Alerts Gateway Web Interface](MobileAlertsGatewayWebInterface.markdown) - Web interface of the Gateway
  * [Mobile Alerts Gateway UDP Protocol](MobileAlertsGatewayUDPInterface.markdown) - Find/Configure a Gateway
  * [Mobile Alerts Gateway REST API](MobileAlertsGatewayRESTAPI.markdown) - Public limited REST API
  * [Mobile Alerts Gateway Application API](MobileAlertsGatewayApplicationAPI.markdown) - API used by iOS application to read all data from the cloud
  * [Mobile Alerts Gateway Upload into Cloud](MobileAlertsGatewayBinaryUpload.markdown) - binary protocol used by the Gateway to upload sensor data into the Cloud
