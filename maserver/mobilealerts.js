#!/usr/bin/env node

const fs = require('fs');
const request = require('request');
const easyConf = require('./easyConf');
const eConf = new easyConf();

// we need to hold client connections to mqtt in case of special publish type sonoff
// client is defined online/alive only if it keeps connected...
var mqttClientDict = {};

// First consider commandline arguments and environment variables, respectively.
eConf.argv().env();

// Then load configuration from a designated file.
eConf.file({ file: 'config.json' });
// If configuration under conf exist -> load it this helps when running in docker and docker volume for conf is mounted under conf
eConf.file({ file: 'conf/config.json' });

// Provide default values for settings not provided above.
eConf.defaults({
    // if set to null, then default IP address discovery will be used,
    // otherwise use specified IP address
    'localIPv4Address': null,

    'mqtt': 'mqtt://127.0.0.1',
    'mqtt_home': 'MobileAlerts/', // default MQTT path for the device parsed data

    'publish_type': 'default', // Implementation to support multiple types of publishing via MQTT (implemented to support e.g. Sonoff Adapter)
    // check if the following should be a general implementation for all or all special publish types
    'sonoffPublish_prefix': null, // publish devices with a specific prefix rather than only their ID in case of publish type sonoff
    'logfile': './MobileAlerts.log',
    'logGatewayInfo': true,   // display info about all found gateways

    // The Mobile-Alert Cloud Server always uses port 8080, we do too,
    // so we are not using a privileged one.
    'proxyServerPort': 8080,

    // Should the proxy forward the data to the Mobile Alerts cloud
    'mobileAlertsCloudForward': false,

    // post the resulting JSON to a http(s) Service
    'serverPost': null,
    'serverPostUser': null,
    'serverPostPassword': null,
    'locale': null // locale that will be used to define how dates should be generated (to override system based locale) e.g. 'en-US'
});
let locale = eConf.get('locale');

var localIPv4Adress = "";
if (eConf.get('localIPv4Address') == null) {
    localIPv4Adress = require('./localIPv4Address')(1);
} else {
    localIPv4Adress = eConf.get('localIPv4Address');
}

console.log('### Local IP address for proxy: ' + localIPv4Adress);
const proxyServerPort = eConf.get('proxyServerPort');

// #############################################################

function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

// #############################################################
// Setup MQTT to allow us sending data to the broker

const mqtt = require('mqtt');
const mqttBroker = eConf.get('mqtt')
var mqttClient;
if (mqttBroker) {
    mqttClient = mqtt.connect(eConf.get('mqtt'), {
        'username': eConf.get('mqtt_username'),
        'password': eConf.get('mqtt_password')
    })
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

function publishSonoffSensorState(sensorJson) {
    var clientId = eConf.get('sonoffPublish_prefix') + sensorJson.id;
    console.log(new Date().toLocaleString() + 'sonoff publish...');
    console.log('clientId: ' + clientId);
    console.log('topic: ' + clientId + '/STATE');
    console.log('data: ' + JSON.stringify(sensorJson));
    var sonoffMqttClient = null;
    if (clientId in mqttClientDict && mqttClientDict[clientId].connected === true) {
        sonoffMqttClient = mqttClientDict[clientId];
    } else {
        var sonoffMqttClient = mqtt.connect(eConf.get('mqtt'), {
            'clientId': clientId,
            'username': eConf.get('mqtt_username'),
            'password': eConf.get('mqtt_password')
        });
        mqttClientDict[clientId] = sonoffMqttClient;
    }
    sonoffMqttClient.publish('tele/' + clientId + '/STATE', JSON.stringify(sensorJson));
}

function sendMQTTSensorOfflineStatus(sensor, isOffline) {
    const mqttHome = eConf.get('mqtt_home');
    mqttHome = (eConf.get('publish_type') == 'sonoff' ? eConf.get('sonoffPublish_prefix') : mqttHome);
    if (!mqttHome) {
        return;
    }

    var json = sensor.json
    json.offline = isOffline
    const sensorName = eConf.get('sensors:' + sensor.ID)
    if (sensorName)
        console.log('### Offline state ', sensorName, JSON.stringify(json))
    else
        console.log('### Offline state ', sensor.ID, JSON.stringify(json))
    if (eConf.get('publish_type') == 'default') {
        mqttClient.publish(mqttHome + sensor.ID + '/json', JSON.stringify(json));
    } else if (eConf.get('publish_type') == 'sonoff') {
        publishSonoffSensorState(json);
    }
}

// send sensor info via MQTT
function sendMQTT(sensor) {
    var mqttHome = eConf.get('mqtt_home');
    mqttHome = (eConf.get('publish_type') == 'sonoff' ? eConf.get('sonoffPublish_prefix') : mqttHome);
    if (!mqttHome) {
        return;
    }

    var json = sensor.json
    json.offline = false
    const sensorName = eConf.get('sensors:' + sensor.ID)
    if (sensorName)
        console.log(sensorName, mqttHome + sensor.ID + '/json', JSON.stringify(json))
    else
        console.log(sensor.ID, mqttHome + sensor.ID + '/json', JSON.stringify(json))

    if (eConf.get('publish_type') == 'default') {
        mqttClient.publish(mqttHome + sensor.ID + '/json', JSON.stringify(json));
    } else if (eConf.get('publish_type') == 'sonoff') {
        publishSonoffSensorState(json);
    }
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
    const serverPost = eConf.get('serverPost');
    if (serverPost == null) {
        return;
    }

    var json = sensor.json
    json.offline = false

    var auth = "";
    var header = {};
    if (eConf.get('serverPostUser') != null && eConf.get('serverPostPassword') != null) {
        auth = 'Basic ' + Buffer.from(eConf.get('serverPostUser') + ':' + eConf.get('serverPostPassword')).toString('base64');
        header = { 'Authorization': auth };
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
if (locale != null) {
    sensors.setLocale(locale);
}

var lastSensorMessages = {};
try {
    sensorList = JSON.parse(fs.readFileSync('lastSensorMessages.json', 'utf8'));
    for (sensorID in sensorList) {
        buf = sensorList[sensorID].buffer;
        if (buf) {
            lastSensorMessages[sensorID] = sensors.CreateSensorObject(Buffer.from(buf.data));
            lastSensorMessages[sensorID].isOffline = sensorList[sensorID].isOffline
        }
    }
}
catch (err) {
    console.error(err);
    lastSensorMessages = {};
}

var lastWriteTimestamp = 0;

function processSensorData(buffer) {
    var sensor = sensors.CreateSensorObject(buffer);
    if (sensor) {
        // Is the transmit ID unchanged (= is it the same package as the last one?)
        if (lastSensorMessages[sensor.ID]) {
            const lastTx = lastSensorMessages[sensor.ID].tx;
            if (lastTx == sensor.tx) // then we ignore it!
                return;
        }

        sensor.isOffline = false;

        sendMQTT(sensor);   // send the sensor via MQTT
        sendPOST(sensor);   // send the sensor via JSON POST

        // check all sensors if they are considered offline
        // (no message within a given period)
        for (sensorID in lastSensorMessages) {
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
            if (lastSensorMessages[sensorID].isOffline != isOffline) {
                lastSensorMessages[sensorID].isOffline = isOffline;
                sendMQTTSensorOfflineStatus(lastSensorMessages[sensorID], isOffline);
            }
        }
        // remember this package as the new last one
        lastSensorMessages[sensor.ID] = sensor;

        // throttle writing to happen only once every 10s
        var currentTimestamp = Date.now() / 1000;
        if (lastWriteTimestamp + 10 <= currentTimestamp) {
            lastWriteTimestamp = currentTimestamp;
            fs.writeFile('lastSensorMessages.json',
                JSON.stringify(lastSensorMessages, null, 4), function (error) { });
        }
    }
}

// #############################################################

// configure the Mobile Alerts Gateway to use us as a proxy server, if necessary
const publicIPv4Adress = eConf.get('publicIPv4adress')
//In case NAT is used configuration can contain public IP -> Could contain docker system public IP
const proxyListenIp = publicIPv4Adress ? publicIPv4Adress : localIPv4Adress;

var gatewayConfigClass = require('./gatewayConfig');
var gatewayConfig = new gatewayConfigClass();
gatewayConfig.configureGateways(
    localIPv4Adress
    , proxyListenIp
    , proxyServerPort
    , eConf.get('gatewayID')
    , eConf.get('logGatewayInfo')
    , eConf.get('gatewayIp')
    , eConf.get('logfile')
    , eConf.get('mobileAlertsClodForward'),
    function (gatewayArr, servConfDict) {
        console.log('callback 1 reached');
        printGateways(gatewayArr);
        startProxy(servConfDict);
    }
);

function printGateways(gatewayConfigArrUDP) {
    console.log('found following gateways:')
    for (const [gatewayID, gatewayConfigDict] of Object.entries(gatewayConfigArrUDP)) {
        console.log(gatewayID.toString() + ':');
        for (const [gatewayConfigKey, gatewayConfigValue] of Object.entries(gatewayConfigDict)) {
            console.log(gatewayConfigKey + ' :  ' + gatewayConfigValue);
        }
    }
}
function startProxy(confDict) {
    console.log('starting proxy server...');

    // setup ourselves as a proxy server for the Mobile Alerts Gateway.
    // All 64-byte packages will arrive via this function
    const proxyServerExpressApp = require('./gatewayProxyServer')(
        confDict['ip'], confDict['port']
        , confDict['log'], confDict['cloudForward']
        , function (buffer) { processSensorData(buffer); });
}