# maserver

This simple node example server uses UDP to find a Mobile Alerts Gateway in the local network and modifies it's proxy server settings to point to the machine running the node server. The node server also provides a HTTP proxy to intercept all packages from the gateway, decodes them and forwards them to a MQTT server.

Run ```npm install``` in this directory to install all dependencies and then run ```mobilealerts.js```.

A ```config.json``` can contain the configuration for the MQTT server. You might also have to update the ```localIPv4Address.js``` to match the machine, depending on which OS you are running the node server.
