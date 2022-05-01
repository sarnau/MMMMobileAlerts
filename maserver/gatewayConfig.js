#!/usr/bin/env node

// Configure the Mobile Alerts Gateway to use this computer as a proxy,
// so that all requests are send to us instead into the cloud.
// After the configuration this module is no longer needed and closes itself.

module.exports = class UDPGatewayConfig {
    constructor() { }
    configureGateways(localIPv4Adress, proxyIPv4Address, proxyServerPort, gatewayID, debugLog, gatewayIP, logFile, mobileAlertsCloudForward, _callback) {
        var gatewayConfigObj = {};
        var gatewayArr = [];
        // debug log on if not set (allow false)
        if ([null, undefined].includes(debugLog))
            debugLog = true;
        // a port of 0 disables the proxy server
        const proxyServerActiveFlag = proxyServerPort != 0;

        const dgram = require('dgram');

        // This is the UDP port used by the Mobile Alerts Gateway
        // for the configuration
        const PORT = 8003;
        //If gatewayIP parameter is set take it, else fallback to broadcast address
        const GATEWAY_ADDR = gatewayIP ? gatewayIP : '255.255.255.255';
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
        var gatewayConfigObj = {};

        udpSocket.on('listening', function () {
            const address = udpSocket.address();
            console.log(`listening on ${address.address}:${address.port}`);
        })

        udpSocket.on('close', function () {
            console.log('end udp socket config');
            var confDict = { 'ip': proxyIPv4Address, 'port': proxyServerPort, 'log': logFile, 'cloudForward': mobileAlertsCloudForward };
            console.log('dict: ' + JSON.stringify(confDict));
            _callback(gatewayArr, confDict);
        })

        udpSocket.on('message', function (message, rinfo) {
            // first word: command ID
            const command = message.readInt16BE(0);
            // then the gateway ID
            const mobileAlertGatewayID = message.slice(2, 8);
            // and the length of the package in bytes
            const len = message.readInt16BE(8);
            // This case actually does happen and we have to
            // ignore an incomplete message.
            if (message.length == len) {

                // Allow us to ignore all gateways except a known one.
                // This is useful for debugging if more than one Gateway
                // is in the network.
                if (gatewayID) {
                    if (gatewayID.toLowerCase() != mobileAlertGatewayID.toString('hex')) {
                        return;
                    }
                }

                var configTransDict = {
                    'MAGateway': 'Mobile-Alert Gateway',
                    'DHCP': 'Use DHCP',
                    'DHCP_NMask': 'DHCP Netmask',
                    'Fixed_GW': 'Fixed Gateway',
                    'Proxy': 'Use Proxy',
                    'Proxy_Addr': 'Proxy Address',
                    'Data_GW': 'Data Gateway'
                }
                var hexPad = 0;
                if (command == SET_CONFIG && len == SET_CONFIG_SIZE) {
                    hexPad = -5;
                }
                gatewayConfigObj = {
                    'MAGateway': mobileAlertGatewayID.toString('hex'),
                    'Name': message.toString('utf-8', 0x1c + hexPad, 0x1c + 21 + hexPad),
                    'DHCP': Boolean(message[0x0f + hexPad]),
                    'DHCP_IP': message[0x0b + hexPad] + '.' + message[0x0c + hexPad] + '.' + message[0x0d + hexPad] + '.' + message[0x0e + hexPad],
                    'Fixed_IP': message[0x10 + hexPad] + '.' + message[0x11 + hexPad] + '.' + message[0x12 + hexPad] + '.' + message[0x13 + hexPad],
                    'DHCP_NMask': message[0x14 + hexPad] + '.' + message[0x15 + hexPad] + '.' + message[0x16 + hexPad] + '.' + message[0x17 + hexPad],
                    'Fixed_DNS': message[0xb6 + hexPad] + '.' + message[0xb7 + hexPad] + '.' + message[0xb8 + hexPad] + '.' + message[0xb9 + hexPad],
                    'Fixed_GW': message[0x18 + hexPad] + '.' + message[0x19 + hexPad] + '.' + message[0x1a + hexPad] + '.' + message[0x1b + hexPad],
                    'Proxy': Boolean(message[0x72 + hexPad]),
                    'Proxy_Addr': message.toString('utf-8', 0x73 + hexPad, 0x73 + 65 + hexPad),
                    'Proxy_Port': message.readInt16BE(0xb4 + hexPad),
                    'Data_GW': message.toString('utf-8', 0x31 + hexPad, 0x31 + 65 + hexPad)
                }

                if (debugLog) {
                    for (const [itemKey, itemValue] of Object.entries(gatewayConfigObj)) {
                        console.log((configTransDict[itemKey] ? configTransDict[itemKey] : itemKey.replace('_', ' ')).padEnd(21) + ': ' + itemValue);
                    }
                    //console.log('Command       : ' + command);
                }
                gatewayArr.push(gatewayConfigObj);

                if (command == GET_CONFIG) {
                    const currentProxyServerActiveFlag = message.readInt8(0x72);
                    // strip the <NUL> bytes
                    const currentProxyServerName =
                        message.toString('utf-8', 0x73, 0x73 + 65).replace(/\0/g, '');
                    const currentProxyServerPort = message.readInt16BE(0xb4);

                    // update proxy settings, if they are different from the expected ones
                    if (currentProxyServerActiveFlag != proxyServerActiveFlag
                        || currentProxyServerPort != proxyServerPort
                        || currentProxyServerName != proxyIPv4Address) {
                        console.log('### Update Mobile Alerts Gateway Proxy Settings');

                        // build a set config buffer by copying everything out of the get config
                        var sendConfigBuffer = Buffer.alloc(SET_CONFIG_SIZE);
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
                            message.toString('utf-8', 0x1c, 0x1c + 21), 0x17, 'utf-8');
                        // Data Server Name
                        sendConfigBuffer.write(
                            message.toString('utf-8', 0x31, 0x31 + 65), 0x2c, 'utf-8');
                        // Use Proxy
                        sendConfigBuffer.writeInt8(message.readInt8(0x72), 0x6d);
                        // Proxy Server Name
                        sendConfigBuffer.write(
                            message.toString('utf-8', 0x73, 0x73 + 65), 0x6e, 'utf-8');
                        // Proxy Port
                        sendConfigBuffer.writeInt16BE(message.readInt16BE(0xb4), 0xaf);
                        // Fixed DNS IP
                        sendConfigBuffer.writeInt32BE(message.readInt32BE(0xb6), 0xb1);

                        // Use Proxy
                        sendConfigBuffer.writeInt8(proxyServerActiveFlag, 0x6d);
                        // erase Proxy Server Name
                        sendConfigBuffer.fill(0, 0x6e, 0xaf);
                        // copy new proxy server name
                        sendConfigBuffer.write(proxyIPv4Address, 0x6e, 'utf-8');
                        // Proxy Port
                        sendConfigBuffer.writeInt16BE(proxyServerPort, 0xaf);

                        udpSocket.send(sendConfigBuffer, PORT, GATEWAY_ADDR, function () {

                            // reboot the gateway after a reconfig
                            var rebootGatewayCommand = Buffer.alloc(REBOOT_SIZE);
                            rebootGatewayCommand.fill(0, 0x00, REBOOT_SIZE);
                            rebootGatewayCommand.writeInt16BE(REBOOT, 0x00);
                            // copy the Mobile Alerts Gateway ID
                            message.copy(rebootGatewayCommand, 0x02, 0x02, 0x08);
                            rebootGatewayCommand.writeInt16BE(REBOOT_SIZE, 0x08);

                            udpSocket.send(rebootGatewayCommand, PORT, GATEWAY_ADDR, function () {
                                console.log('handled gateway ' + GATEWAY_ADDR);
                                udpSocket.disconnect();
                            });
                        });
                    } else {
                        //udpSocket.close();
                        console.log('data from msg did not match...');
                    }
                }
            }
        });

        udpSocket.bind({ address: localIPv4Adress }, function () {
            udpSocket.setBroadcast(true);

            // after the bind delay the request by 250ms
            setTimeout(function () {
                // find the Mobile Alerts Gateway
                var findGatewayCommand = Buffer.alloc(FIND_GATEWAYS_SIZE);
                findGatewayCommand.fill(0, 0x00, FIND_GATEWAYS_SIZE);
                findGatewayCommand.writeInt16BE(FIND_GATEWAYS, 0x00);
                findGatewayCommand.writeInt16BE(FIND_GATEWAYS_SIZE, 0x08);
                udpSocket.send(findGatewayCommand, PORT, GATEWAY_ADDR, function () { });
            }, 500);
        });
        setTimeout(function () { udpSocket.close() }, 2000);
    }
}