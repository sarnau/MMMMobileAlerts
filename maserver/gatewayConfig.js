#!/usr/bin/env node

// Configure the Mobile Alerts Gateway to use this computer as a proxy,
// so that all requests are send to us instead into the cloud.
// After the configuration this module is no longer needed and closes itself.

module.exports = function(localIPv4Adress,proxyServerPort,gatewayID,debugLog) {
  if(!debugLog) debugLog = true;
  // a port of 0 disables the proxy server
  const proxyServerActiveFlag = proxyServerPort != 0;

  const dgram = require('dgram');

  // This is the UDP port used by the Mobile Alerts Gateway
  // for the configuration
  const PORT = 8003;
  // all communication with the gateways are broadcasts
  const BROADCAST_ADDR = '255.255.255.255';

  // Find any available gateway in the local network
  const FIND_GATEWAYS = 1
  // Find a single available gateway in the local network
  const FIND_GATEWAY = 2
  // Request the configuration of the gateway
  const GET_CONFIG = 3
  // Set a new configuration. It takes a few seconds for the gateway
  // to do the update
  const SET_CONFIG = 4
  // A reboot takes about 10s for the gateway to be back up again
  const REBOOT = 5

  // this message only contains the command, a NUL ID and the size
  const FIND_GATEWAYS_SIZE = 0x0a
  // this message only contains the command, a Mobile-Alert Gateway ID
  // and the size
  const FIND_GATEWAY_SIZE = 0x0a
  // The get config has a 5 extra bytes: an unknown byte (always zero?) and
  // the current IP address of the gateway. Both are not used for setting the
  // config.
  const GET_CONFIG_SIZE = 0xba
  const SET_CONFIG_SIZE = 0xb5
  // this message only contains the command, a Mobile-Alert Gateway ID
  // and the size
  const REBOOT_SIZE = 0x0a

  var udpSocket = dgram.createSocket('udp4');

  udpSocket.on('message', function (message, rinfo) {
    // first word: command ID
    const command = message.readInt16BE(0);
    // then the gateway ID
    const mobileAlertGatewayID = message.slice(2, 8);
    // and the length of the package in bytes
    const len = message.readInt16BE(8);
    // This case actually does happen and we have to
    // ignore an incomplete message.
    if(message.length == len) {

      // Allow us to ignore all gateways except a known one.
      // This is useful for debugging if more than one Gateway
      // is in the network.
      if(gatewayID) {
        if(gatewayID.toLowerCase() != mobileAlertGatewayID.toString('hex')) {
          return;
        }
      }

      if(debugLog) {
        //console.log('Command       : ' + command);
        console.log('Mobile-Alert Gateway : '
                    + mobileAlertGatewayID.toString('hex'));
        if(message.length == len) {
          if(command == GET_CONFIG && len == GET_CONFIG_SIZE) {
            //console.log('False        : ' + Boolean(message[0x0a]));
            console.log('Name         : '
                        + message.toString('utf-8', 0x1c, 0x1c+21));
            console.log('Use DHCP       : '
                        + Boolean(message[0x0f]));
            console.log('DHCP IP        : '
                        + message[0x0b] + '.' + message[0x0c]
                        + '.' + message[0x0d] + '.' + message[0x0e]);
            console.log('Fixed IP       : '
                        + message[0x10] + '.' + message[0x11] + '.'
                        + message[0x12] + '.' + message[0x13]);
            console.log('DHCP Netmask     : '
                        + message[0x14] + '.' + message[0x15] + '.'
                        + message[0x16] + '.' + message[0x17]);
            console.log('Fixed DNS IP     : '
                        + message[0xb6] + '.' + message[0xb7] + '.'
                        + message[0xb8] + '.' + message[0xb9]);
            console.log('Fixed Gateway      : '
                        + message[0x18] + '.' + message[0x19] + '.'
                        + message[0x1a] + '.' + message[0x1b]);
            console.log('Use Proxy        : '
                        + Boolean(message[0x72]));
            console.log('Proxy Server Name    : '
                        + message.toString('utf-8', 0x73, 0x73+65));
            console.log('Proxy Port       : '
                        + message.readInt16BE(0xb4));
            console.log('Data Server Name   : '
                        + message.toString('utf-8', 0x31, 0x31+65));
          } else if (command == SET_CONFIG && len == SET_CONFIG_SIZE) {
            console.log('Name         : '
                        + message.toString('utf-8', 0x17, 0x17+21));
            console.log('Use DHCP       : '
                        + Boolean(message[0x0a]));
            console.log('Fixed IP       : '
                        + message[0x0b] + '.' + message[0x0c] + '.'
                        + message[0x0d] + '.' + message[0x0e]);
            console.log('DHCP Netmask     : '
                        + message[0x0f] + '.' + message[0x10] + '.'
                        + message[0x11] + '.' + message[0x12]);
            console.log('Fixed DNS IP     : '
                        + message[0xb1] + '.' + message[0xb2] + '.'
                        + message[0xb3] + '.' + message[0xb4]);
            console.log('Fixed Gateway      : '
                        + message[0x13] + '.' + message[0x14] + '.'
                        + message[0x15] + '.' + message[0x16]);
            console.log('Use Proxy        : ' + Boolean(message[0x6d]));
            console.log('Proxy Server Name    : '
                        + message.toString('utf-8', 0x6e, 0x6e+65));
            console.log('Proxy Port       : '
                        + message.readInt16BE(0xaf));
            console.log('Data Server Name   : '
                        + message.toString('utf-8', 0x2c, 0x2c+65));
          }
        }
      }

      if(command == GET_CONFIG) {
        const currentProxyServerActiveFlag = message.readInt8(0x72);
        // strip the <NUL> bytes
        const currentProxyServerName =
           message.toString('utf-8', 0x73, 0x73+65).replace(/\0/g, '');
        const currentProxyServerPort = message.readInt16BE(0xb4);

        // update proxy settings, if they are different from the expected ones
        if(currentProxyServerActiveFlag != proxyServerActiveFlag
           || currentProxyServerPort != proxyServerPort
           || currentProxyServerName != localIPv4Adress) {
          console.log('### Update Mobile Alerts Gateway Proxy Settings');

          // build a set config buffer by copying everything out of the get config
          var sendConfigBuffer = new Buffer(SET_CONFIG_SIZE);
          sendConfigBuffer.fill(0, 0x00, SET_CONFIG_SIZE);
          // Set Configuration command
          sendConfigBuffer.writeInt16BE(SET_CONFIG, 0x00);
          // copy the Mobile Alerts Gateway ID
          message.copy(sendConfigBuffer, 0x02, 0x02, 0x08);
          // size of the package
          sendConfigBuffer.writeInt16BE(SET_CONFIG_SIZE, 0x08);
          // Use DHCP
          sendConfigBuffer.writeInt8(message.readInt8(0x0f), 0x0a);
          // Fixed IP
          sendConfigBuffer.writeInt32BE(message.readInt32BE(0x10), 0x0b);
          // DHCP Netmask
          sendConfigBuffer.writeInt32BE(message.readInt32BE(0x14), 0x0f);
          // Fixed Gateway
          sendConfigBuffer.writeInt32BE(message.readInt32BE(0x18), 0x13);
          // Name
          sendConfigBuffer.write(
            message.toString('utf-8', 0x1c, 0x1c+21), 0x17, 'utf-8');
            // Data Server Name
          sendConfigBuffer.write(
            message.toString('utf-8', 0x31, 0x31+65), 0x2c, 'utf-8');
          // Use Proxy
          sendConfigBuffer.writeInt8(message.readInt8(0x72), 0x6d);
          // Proxy Server Name
          sendConfigBuffer.write(
            message.toString('utf-8', 0x73, 0x73+65), 0x6e, 'utf-8');
          // Proxy Port
          sendConfigBuffer.writeInt16BE(message.readInt16BE(0xb4), 0xaf);
          // Fixed DNS IP
          sendConfigBuffer.writeInt32BE(message.readInt32BE(0xb6), 0xb1);

          // Use Proxy
          sendConfigBuffer.writeInt8(proxyServerActiveFlag, 0x6d);
          // erase Proxy Server Name
          sendConfigBuffer.fill(0, 0x6e, 0xaf);
          // copy new proxy server name
          sendConfigBuffer.write(localIPv4Adress, 0x6e, 'utf-8');
          // Proxy Port
          sendConfigBuffer.writeInt16BE(proxyServerPort, 0xaf);

          udpSocket.send(sendConfigBuffer, PORT, BROADCAST_ADDR, function() {

            // reboot the gateway after a reconfig
            var rebootGatewayCommand = new Buffer(REBOOT_SIZE);
            rebootGatewayCommand.fill(0, 0x00, REBOOT_SIZE);
            rebootGatewayCommand.writeInt16BE(REBOOT, 0x00);
            // copy the Mobile Alerts Gateway ID
            message.copy(rebootGatewayCommand, 0x02, 0x02, 0x08);
            rebootGatewayCommand.writeInt16BE(REBOOT_SIZE, 0x08);

            udpSocket.send(rebootGatewayCommand, PORT, BROADCAST_ADDR, function() {
              udpSocket.close();
            });
          });
        } else {
          udpSocket.close();
        }
      }
    }
  });

  udpSocket.bind(function() {
    udpSocket.setBroadcast(true);

    // after the bind delay the request by 250ms
    setTimeout(function() {
      // find the Mobile Alerts Gateway
      var findGatewayCommand = new Buffer(FIND_GATEWAYS_SIZE);
      findGatewayCommand.fill(0, 0x00, FIND_GATEWAYS_SIZE);
      findGatewayCommand.writeInt16BE(FIND_GATEWAYS, 0x00);
      findGatewayCommand.writeInt16BE(FIND_GATEWAYS_SIZE, 0x08);
      udpSocket.send(findGatewayCommand, PORT, BROADCAST_ADDR, function() {});
    }, 250);
  });

};
