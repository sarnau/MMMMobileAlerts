#!/usr/bin/env node

const nconf = require('nconf');
const fs = require('fs');
const request = require('request');

// First consider commandline arguments and environment variables, respectively.
nconf.argv().env();

// Then load configuration from a designated file.
nconf.file({ file: 'config.json' });
// If configuration under conf exist -> load it this helps when running in docker and docker volume for conf is mounted under conf
nconf.file({ file: 'conf/config.json' });

// Provide default values for settings not provided above.
nconf.defaults({
  // if set to null, then default IP address discovery will be used,
  // otherwise use specified IP address
  'localIPv4Address': null,

  'mqtt': 'mqtt://127.0.0.1',
  'mqtt_home': 'MobileAlerts/', // default MQTT path for the device parsed data

  'logfile': './MobileAlerts.log',
  'logGatewayInfo': true,   // display info about all found gateways

  // The Mobile-Alert Cloud Server always uses port 8080, we do too,
  // so we are not using a privileged one.
  'proxyServerPort': 8080,

  // Should the proxy forward the data to the Mobile Alerts cloud
  'mobileAlertsCloudForward': false,

  // post the resulting JSON to a http(s) Service
  'serverPost': null,
  "serverPostUser": null,
  "serverPostPassword": null
});

var localIPv4Adress = "";
if (nconf.get('localIPv4Address') == null) {
  localIPv4Adress = require('./localIPv4Address')(1);
} else {
  localIPv4Adress = nconf.get('localIPv4Address');
}

console.log('### Local IP address for proxy: ' + localIPv4Adress);
const proxyServerPort = nconf.get('proxyServerPort');

// #############################################################

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

// #############################################################
// Setup MQTT to allow us sending data to the broker

const mqtt = require('mqtt');
const mqttBroker = nconf.get('mqtt')
var mqttClient;
if(mqttBroker) {
  mqttClient = mqtt.connect(nconf.get('mqtt'), {
      'username': nconf.get('mqtt_username')
    , 'password': nconf.get('mqtt_password') })
  mqttClient.on('connect', function () {
    console.log('### MQTT server is connected');
  });
  mqttClient.on('close', function () {
    console.log('### MQTT server is closed');
  });
  mqttClient.on('offline', function () {
    console.log('### MQTT server is offline');
  });
  mqttClient.on('error', function (error) {
    console.log('### MQTT server has an error', error);
  });
}

function sendMQTTSensorOfflineStatus(sensor, isOffline) {
  const mqttHome = nconf.get('mqtt_home');
  if(!mqttHome) {
    return;
  }

  var json = sensor.json
  json.offline = isOffline
  const sensorName = nconf.get('sensors:'+sensor.ID)
  if(sensorName)
    console.log('### Offline state ',sensorName, JSON.stringify(json))
  else
    console.log('### Offline state ',sensorName, JSON.stringify(json))

  mqttClient.publish(mqttHome + sensor.ID + '/json', JSON.stringify(json));
}

// send sensor info via MQTT
function sendMQTT(sensor) {
  const mqttHome = nconf.get('mqtt_home');
  if(!mqttHome) {
    return;
  }

  var json = sensor.json
  json.offline = false
  const sensorName = nconf.get('sensors:'+sensor.ID)
  if(sensorName)
    console.log(sensorName, mqttHome+sensor.ID+'/json', JSON.stringify(json))
  else
    console.log(sensorName, mqttHome+sensor.ID+'/json', JSON.stringify(json))

  mqttClient.publish(mqttHome + sensor.ID + '/json', JSON.stringify(json));
/*    if(sensor.sensorType == 0x08) {
    var rain = 0;
    if(lastSensorMessages[sensor.ID]) {
      const eventCounterDelta = sensor.eventCounter
          - lastSensorMessages[sensor.ID].eventCounter;
      if(eventCounterDelta > 0) {
        rain = round(0.258 * eventCounterDelta,1);
      }
    }
  }
*/
}

// send sensor info via Server POST
function sendPOST(sensor) {
  const serverPost = nconf.get('serverPost');
  if(serverPost == null) {
    return;
  }

  var json = sensor.json
  json.offline = false

  var auth = "";
  var header = {};
  if (nconf.get('serverPostUser') != null && nconf.get('serverPostPassword') != null) {
    auth = 'Basic ' + Buffer.from(nconf.get('serverPostUser') + ':' + nconf.get('serverPostPassword')).toString('base64');
    header = {'Authorization': auth};
  }

  var options = {
    uri: serverPost,
    method: 'POST',
    headers: header,
    json: json
  };

  console.log("posting data...");
  request(options, function (error, response, body) {
    if (error || response.statusCode != 200) {
      console.log("serverPOST failed: " + error);
    }
  });

}

// #############################################################
// Mobile Alerts Sensor Code

const sensors = require('./sensors');

var lastSensorMessages = {};
try {
  sensorList = JSON.parse(fs.readFileSync('lastSensorMessages.json', 'utf8'));
  for(sensorID in sensorList) {
    buf = sensorList[sensorID].buffer;
    if(buf) {
      lastSensorMessages[sensorID] = sensors.CreateSensorObject(new Buffer(buf.data));
      lastSensorMessages[sensorID].isOffline = sensorList[sensorID].isOffline
    }
  }
}
catch(err) {
  console.error(err);
  lastSensorMessages = {};
}

var lastWriteTimestamp = 0;

function processSensorData(buffer) {
  var sensor = sensors.CreateSensorObject(buffer);
  if(sensor) {
    // Is the transmit ID unchanged (= is it the same package as the last one?)
    if(lastSensorMessages[sensor.ID]) {
      const lastTx = lastSensorMessages[sensor.ID].tx;
      if(lastTx == sensor.tx) // then we ignore it!
        return;
    }

    sensor.isOffline = false;

    sendMQTT(sensor);   // send the sensor via MQTT
    sendPOST(sensor);   // send the sensor via JSON POST

    // check all sensors if they are considered offline
    // (no message within a given period)
    for(sensorID in lastSensorMessages)
    {
      // make sure we modify a copy
      var sensorTimeoutDate = new Date(lastSensorMessages[sensorID].unixTime);
      // add the timeout to the last time the sensor was transmitting
      // sensor timeout + a 7 minutes transmission buffer for the gateway
      sensorTimeoutDate.setMinutes(sensorTimeoutDate.getMinutes()
                        + lastSensorMessages[sensorID].timeoutInMinutes);
      // compare with the current time to check for the timeout
      var currentDate = new Date();
      const isOffline = sensorTimeoutDate < currentDate;
      // status changed?
      if(lastSensorMessages[sensorID].isOffline != isOffline) {
        lastSensorMessages[sensorID].isOffline = isOffline;
        sendMQTTSensorOfflineStatus(lastSensorMessages[sensorID], isOffline);
      }
    }
    // remember this package as the new last one
    lastSensorMessages[sensor.ID] = sensor;

    // throttle writing to happen only once every 10s
    var currentTimestamp = Date.now() / 1000;
    if(lastWriteTimestamp + 10 <= currentTimestamp) {
      lastWriteTimestamp = currentTimestamp;
      fs.writeFile('lastSensorMessages.json',
        JSON.stringify(lastSensorMessages, null, 4), function (error) { });
    }
  }
}

// #############################################################

// configure the Mobile Alerts Gateway to use us as a proxy server, if necessary
const publicIPv4Adress = nconf.get('publicIPv4adress')
//In case NAT is used configuration can contain public IP -> Could contain docker system public IP
const proxyListenIp = publicIPv4Adress ? publicIPv4Adress : localIPv4Adress;

const gatewayConfigUDP = require('./gatewayConfig')(
                          localIPv4Adress
                        , proxyListenIp
                        , proxyServerPort
                        , nconf.get('gatewayID')
                        , nconf.get('logGatewayInfo')
                        , nconf.get('gatewayIp'));

// setup ourselves as a proxy server for the Mobile Alerts Gateway.
// All 64-byte packages will arrive via this function
const proxyServerExpressApp = require('./gatewayProxyServer')(
                          localIPv4Adress,proxyServerPort
                        , nconf.get('logfile'), nconf.get('mobileAlertsCloudForward')
                        , function (buffer) { processSensorData(buffer); });
