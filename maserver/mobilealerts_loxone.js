#!/usr/bin/env node

const nconf = require('nconf');
const fs = require('fs');

// First consider commandline arguments and environment variables, respectively.
nconf.argv().env();

// Then load configuration from a designated file.
nconf.file({ file: 'config.json' });

// Provide default values for settings not provided above.
nconf.defaults({
  'mqtt': 'mqtt://127.0.0.1',
  'mqtt_home': 'MobileAlerts/', // default MQTT path for the device parsed data
  
  'loxone_port': 80, // default port, probably never to be changed
  'loxone_encryption': 'Token-Enc', // 'Token-Enc' or 'AES-256-CBC' or 'Hash'

  'logfile': './MobileAlerts.log',
  'logGatewayInfo': true,   // display info about all found gateways

  // The Mobile-Alert Cloud Server always uses port 8080, we do too,
  // so we are not using a privileged one.
  'proxyServerPort': 8080,
});

const localIPv4Adress = '192.168.178.75'//require('./localIPv4Address')(1);
console.log('### Local IP address for proxy: ' + localIPv4Adress);
const proxyServerPort = nconf.get('proxyServerPort');

// #############################################################

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

// #############################################################
// Setup Loxone connection to allow us sending data to it

loxone_connection = null

const node_lox_ws_api = require("node-lox-ws-api");
var loxone_client = new node_lox_ws_api(
    nconf.get('loxone_server') + ':' + nconf.get('loxone_port'),
    nconf.get('loxone_user'),
    nconf.get('loxone_password'),
    true,
    nconf.get('loxone_encryption')
);

loxone_client.connect();

loxone_client.on('authorized', function () {
    console.log('Miniserver authorized');
    loxone_connection = loxone_client
    loxone_client.send_control_command('Befehl VCI1', 22.7)
});

loxone_client.on('connect_failed', function () {
    console.log('Miniserver connect failed');
    loxone_connection = null
});

loxone_client.on('connection_error', function (error) {
    console.log('Miniserver connection error: ' + error);
});

loxone_client.on('close', function () {
    console.log("Miniserver connection closed");
    loxone_connection = null
});

loxone_client.on('send', function (message) {
    console.log("sent message: " + message);
});

// #############################################################
// Mobile Alerts Sensor Code

const sensors = require('./sensors');

lastSensorMessages = {};

function processSensorData(buffer) {
  var sensor = sensors.CreateSensorObject(buffer);
  if(sensor) {
    // Is the transmit ID unchanged (= is it the same package as the last one?)
    if(lastSensorMessages[sensor.ID]) {
      const lastTx = lastSensorMessages[sensor.ID].tx;
      if(lastTx == sensor.tx) // then we ignore it!
        return;
    }
    // remember this package as the new last one
    lastSensorMessages[sensor.ID] = sensor;

    if(loxone_connection) {
        console.log(sensor.ID)
        if(sensor.sensorType == 2) {
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperature/' + sensor.json.temperature[0], false)
        } else if(sensor.sensorType == 3) {
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperature/' + sensor.json.temperature[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.humidity/' + sensor.json.humidity[0], false)
        } else if(sensor.sensorType == 4) {
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperature/' + sensor.json.temperature[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.humidity/' + sensor.json.humidity[0], false)
            if(sensor.json.isWet[0]) {
                value = 1
            } else {
                value = 0
            }
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.isWet/' + value, false)
        } else if(sensor.sensorType == 5) {
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperature/' + sensor.json.temperature[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.humidity/' + sensor.json.humidity[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperatureExt/' + sensor.json.temperatureExt[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.airquality/' + sensor.json.airquality[0], false)
        } else if(sensor.sensorType == 6) {
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperature/' + sensor.json.temperature[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.humidity/' + sensor.json.humidity[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.waterTemperature/' + sensor.json.waterTemperature[0], false)
        } else if(sensor.sensorType == 9) {
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperature/' + sensor.json.temperature[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.humidity/' + sensor.json.humidity[0], false)
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.temperatureExt/' + sensor.json.temperatureExt[0], false)
        } else if (sensor.sensorType == 16) {
            if(sensor.json.isOpen[0]) {
                value = 1
            } else {
                value = 0
            }
            loxone_client.send_command('jdev/sps/io/' + sensor.ID + '.isOpen/' + value, false)
//            loxone_client.send_control_command(sensor.ID + '.isOpen', value)
        } else {
            console.log(sensor)
        }
    }
  }
}

// #############################################################

// configure the Mobile Alerts Gateway to use us as a proxy server, if necessary
const gatewayConfigUDP = require('./gatewayConfig')(
                          localIPv4Adress
                        , proxyServerPort
                        , nconf.get('gatewayID')
                        , nconf.get('logGatewayInfo'));

// setup ourselves as a proxy server for the Mobile Alerts Gateway.
// All 64-byte packages will arrive via this function
const proxyServerExpressApp = require('./gatewayProxyServer')(
                          localIPv4Adress,proxyServerPort
                        , nconf.get('logfile')
                        , function (buffer) { processSensorData(buffer); });
