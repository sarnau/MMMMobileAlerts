# maserver

This simple node example server uses UDP to find a Mobile Alerts Gateway in the local network and modifies it's proxy server settings to point to the machine running the node server. The node server also provides a HTTP proxy to intercept all packages from the gateway, decodes them and forwards them to a MQTT server, a HTTP(S) JSON REST Server or the Mobile Alerts Cloud.

Run ```npm install``` in this directory to install all dependencies and then run ```mobilealerts.js```.

A ```config.json``` can contain the configuration for the MQTT server, the HTTP(S) JSON REST Server or enable the Mobile Alerts Cloud. If the automatic IPv4 address detection does not work, you can specify the IPv4 address in the config.json file.

Just copy the ```config-sample.json``` file to ```config.json``` and update the values.

Hints for the ```config.json``` keys:
  * **localIPv4Address:** if set to null, then default IP address discovery will be used, otherwise use specified IP address
  * **mqtt:** specify the address of the mqtt Server in the form ```mqtt://127.0.0.1```
  * **mqtt_home:** default MQTT path for the device parsed data
  * **logfile:** if specified, all packages will be logged in a logfile as a whole for future debugging
  * **logGatewayInfo:** display info about all found gateways
  * **proxyServerPort:** TCP port where the proxy is listening for incoming connections
  * **mobileAlertsCloudForward:** set to ```true``` if you want to forward the packages to the mobile alerts cloud
  * **serverPost:** set to the POST URL where the JSON data should be sent to
  * **serverPostUser**, **serverPostPassword**: Basic Authorization user and password for the POST URL


If you have systemd as your init system, you can copy ```maserver.service``` to ```/etc/systemd/system/```, edit it to match the path where your installation is found. Then you need to reload systemd via ```systemctl daemon-reload``` and start the Unit via ```systemctl start maserver.service```.

