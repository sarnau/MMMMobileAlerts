#!/usr/bin/env node

const util = require('util');
var localeStr = null;

var Sensor = function () {};

// #############################################################
// Sensor classes
Sensor.prototype.setLocale = function(localeStrIn) {
  localeStr = localeStrIn;
}

// Function to create a sensor class based on the sensor ID
Sensor.prototype.CreateSensorObject = function(buffer) {
  if(buffer.length != 64) {
    console.error('### Packages size wrong', buffer);
    return undefined;
  }
  checksum = 0x00;
  for(i=0; i<63; ++i)
    checksum += buffer.readUInt8(i)
  if((checksum & 0x7f) != buffer.readUInt8(63)) {
    console.error('### Checksum error', buffer);
    return undefined;
  }

  try {
    // a copy of the first byte as the sensor ID
    const className = 'Sensor_ID'+buffer.toString('hex', 6, 7);
    sensor = eval('new '+className+'()');
  }
  catch(err) {
    sensor = new SensorBase();
  }
  try {
    return sensor.setup(buffer);
  }
  catch(err) {
    console.error(err);
    return undefined;
  }
}
module.exports = new Sensor();


// Base class for the sensor
function SensorBase() { }

// Main function
SensorBase.prototype.setup = function(buffer) {
  this.buffer = buffer;
  // extract the actual data from a package

  // identifies the type of the package,
  // however the first byte of the ID is typically used.
  //this.header = buffer.readUInt8(0);

  // UTC based timestamp when the measurement was taken
  this.unixTime_ms = new Date(buffer.readUInt32BE(1) * 1000);
  this.timestamp = new Date(this.unixTime_ms).toLocaleString(localeStr == null ? '' : localeStr);


  // length of the package, seems to be static in regards of the header
  this.packageLength = buffer.readUInt8(5);

  // illegal package, not enough data
  if(this.packageLength < 14+this.bufferSize())
    return undefined;

  // a copy of the first byte for easy access.
  this.sensorType = buffer.readUInt8(6);

  // store the timeout before a sensor becomes offline
  // (to avoid warning if some events were missed)
  this.timeoutInMinutes = this.transmitInterval() * 3.5;

  // at least 60 minutes of timeout per sensor
  if(this.timeoutInMinutes < 60)
    this.timeoutInMinutes = 60;

  // 6 byte sensor ID. The first byte is the ID, which identifies the type.
  this.ID = buffer.toString('hex', 6, 12).toLowerCase();

  //sensor type in the case of "0e" and "03" it is necessary due to the difference in the decimal point
  this.IDxx = buffer.toString('hex', 6, 7)

  // The TX value is 16 or 24 bit, based on the sensor ID.
  // This also changes the offset where the data starts
  this.getTXAndBufferOffset();

  this.json = this.generateJSON(buffer.slice(this.bufferOffset));
  this.json.id = this.ID;
  this.json.t = this.timestamp;
  this.json.ut = this.unixTime_ms / 1000;
  this.json.utms = this.unixTime_ms;
  this.json.battery = (((this.tx & 0x8000) == 0x8000) ? 'low' : 'ok');
  return this;
}

// Helper function
SensorBase.prototype.round = function(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

SensorBase.prototype.convertTemperature = function(value) {
  // overflow, temperature too hot for the sensor to detect.
  if (value & 0x2000) return 9999;
  // illegal value from the sensor
  if (value & 0x1000) return -9999;
  // negative values: -102.4°C…-0.1°C
  if (value & 0x400) return this.round((0x800 - (value & 0x7ff)) * -0.1, 1);
  // positive values: 0.1°C…102.3°C
  return this.round((value & 0x7ff) * 0.1, 1);
}

SensorBase.prototype.temperaturAsString = function(temp) {
  var tempStr = temp;
  // illegal sensor value
  if(tempStr < -1000) tempStr = '---';
  // overflow, temperature too hot
  else if(tempStr > 1000) tempStr = 'OLF';
  return tempStr.toString() + '°C'
}


SensorBase.prototype.convertHumidity = function(value) {
  // values: 0%…100%
  if (this.IDxx=="0e") {
  // "0e" for precision of one decimal place
  return this.round((value & 0x7ff) * 0.1, 1);
  }else {
  // default precision
  return value & 0x7f ;
  }
}

SensorBase.prototype.humidityAsString = function(humidity) {
  return humidity.toString() + '%'
}


SensorBase.prototype.convertAirPressure = function(value) {
  return value / 10.0;
}

SensorBase.prototype.airPressureAsString = function(pressure) {
  return pressure.toString() + ' hPa'
}


SensorBase.prototype.convertAirquality = function(value) {
  // values: 450…3950ppm
  value = value & 0xfff;
  if(value > 79)
  	return 'OLF';
  return (value & 0x7f) * 50;
}

SensorBase.prototype.airqualityAsString = function(airquality) {
  return airquality.toString() + 'ppm'
}


SensorBase.prototype.convertWetness = function(value) {
  if(value & 1) return false;   // dry
  return true;          // wet
}

SensorBase.prototype.convertOpenState = function(value) {
  if(value & 0x8000) return true; // Open
  return false;         // Closed
}


SensorBase.prototype.convertEventTime = function(value, timeScaleBitOffset) {
  // 2 bits at the top contain the time-scale factor
  const timeScaleFactor = (value >> timeScaleBitOffset) & 3;
  value = value & ((1 << timeScaleBitOffset) - 1);
  if(timeScaleFactor == 0) {       // days
    return value * 60 * 60 * 24;
  } else if(timeScaleFactor == 1) {  // hours
    return value * 60 * 60;
  } else if(timeScaleFactor == 2) {  // minutes
    return value * 60;
  } else if(timeScaleFactor == 3) {  // seconds
    return value;
  }
}

// Default implementation for all but the wind sensor: tx is 16 bits wide.
SensorBase.prototype.getTXAndBufferOffset = function() {
  this.tx = this.buffer.readUInt16BE(12);
  this.bufferOffset = 14;
};

// Default description output for a sensor
SensorBase.prototype.description = function() {
  return this.unixTime.toISOString() + ' ' + this.ID
         + ' (' + this.name+ ') ' + this.debugString()
}

// no data for an unknown sensor
SensorBase.prototype.bufferSize = function() {
  return 0;
}

// offline timeout in minutes
SensorBase.prototype.transmitInterval = function() {
  return 24 * 60; // 24h
}

// Process the data, for a non specified class this does nothing
SensorBase.prototype.generateJSON = function(buffer) {
  return {};
}

// Convert the sensor data into a nice string.
// For unknown sensors this is just a hexdump of the data
SensorBase.prototype.debugString = function() {
  return this.buffer.toString('hex', this.bufferOffset, this.packageLength);
}

// =============================================================
// Specialized Sensor classes

// ID01: Pro Temperature sensor with ex. cable probe (MA10120)
function Sensor_ID01() { }
util.inherits(Sensor_ID01, SensorBase);
Sensor_ID01.prototype.bufferSize = function () {
    return 8;
}
Sensor_ID01.prototype.transmitInterval = function () {
    return 7;
}
Sensor_ID01.prototype.generateJSON = function (buffer) {
    return {
        'temperature': [
            this.convertTemperature(buffer.readUInt16BE(0))
            , this.convertTemperature(buffer.readUInt16BE(4))],
        'temperatureExt': [this.convertTemperature(buffer.readUInt16BE(2))
            , this.convertTemperature(buffer.readUInt16BE(6))]
    };
}
Sensor_ID01.prototype.debugString = function () {
    return this.temperaturAsString(this.json.temperature[0])
        + ' ' + this.temperaturAsString(this.json.temperatureExt[0])
}

// ID02: Temperature sensor
function Sensor_ID02() {}
util.inherits(Sensor_ID02, SensorBase);
Sensor_ID02.prototype.bufferSize = function() {
  return 4;
}
Sensor_ID02.prototype.transmitInterval = function() {
  return 7;
}
Sensor_ID02.prototype.generateJSON = function(buffer) {
  return { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(0))
                            , this.convertTemperature(buffer.readUInt16BE(2))]
                            };
}
Sensor_ID02.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0])
}


// ID03: Temperature/Humidity sensor
function Sensor_ID03() {}
util.inherits(Sensor_ID03, SensorBase);
Sensor_ID03.prototype.bufferSize = function() {
  return 8;
}
Sensor_ID03.prototype.transmitInterval = function() {
  return 7;
}
Sensor_ID03.prototype.generateJSON = function(buffer) {
  return { 'temperature': [
                          this.convertTemperature(buffer.readUInt16BE(0))
                        , this.convertTemperature(buffer.readUInt16BE(4))],
       'humidity': [   this.convertHumidity(buffer.readUInt16BE(2))
                     , this.convertHumidity(buffer.readUInt16BE(6))] };
}
Sensor_ID03.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0])
                    + ' ' + this.humidityAsString(this.json.humidity[0])
}


// ID04: Temperature/Humidity/Water Detector sensor
function Sensor_ID04() {}
util.inherits(Sensor_ID04, SensorBase);
Sensor_ID04.prototype.bufferSize = function() {
  return 10;
}
Sensor_ID04.prototype.transmitInterval = function() {
  return 7;
}
Sensor_ID04.prototype.generateJSON = function(buffer) {
  return { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(0))
                          , this.convertTemperature(buffer.readUInt16BE(5))],
       'humidity': [ this.convertHumidity(buffer.readUInt16BE(2))
                   , this.convertHumidity(buffer.readUInt16BE(7))],
       'isWet': [ this.convertWetness(buffer.readUInt8(4))
                , this.convertWetness(buffer.readUInt8(9))] };
}
Sensor_ID04.prototype.debugString = function() {
  const isWet = sensor.json.isWet[0];
  if(isWet) {
    statusStr = 'WET'
  } else {
    statusStr = 'DRY'
  }
  return this.temperaturAsString(this.json.temperature[0])
    + ' ' + this.humidityAsString(this.json.humidity[0]) + ' ' + statusStr
}


// ID05: Air Quality sensor WL 2000 with outside sensor
function Sensor_ID05() {}
util.inherits(Sensor_ID05, SensorBase);
Sensor_ID05.prototype.bufferSize = function() {
  return 16;
}
Sensor_ID05.prototype.transmitInterval = function() {
  return 7;
}
Sensor_ID05.prototype.generateJSON = function(buffer) {
  return {
       'temperatureExt': [ this.convertTemperature(buffer.readUInt16BE(0))
                         , this.convertTemperature(buffer.readUInt16BE(8))],
       'temperature': [ this.convertTemperature(buffer.readUInt16BE(2))
                      , this.convertTemperature(buffer.readUInt16BE(10))],
       'humidity': [ this.convertHumidity(buffer.readUInt16BE(4))
                   , this.convertHumidity(buffer.readUInt16BE(12))],
       'airquality': [ this.convertAirquality(buffer.readUInt16BE(6))
                   , this.convertAirquality(buffer.readUInt16BE(14))] }
}
Sensor_ID05.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0]) + ' ' +
  	     this.temperaturAsString(this.json.temperatureExt[0]) + ' ' +
         this.humidityAsString(this.json.humidity[0]) + ' ' +
         this.airqualityAsString(this.json.airquality[0]) + ' ' + statusStr
}


// ID06: Temperature/Humidity/Pool sensor
function Sensor_ID06() {}
util.inherits(Sensor_ID06, SensorBase);
Sensor_ID06.prototype.bufferSize = function() {
  return 12;
}
Sensor_ID06.prototype.transmitInterval = function() {
  return 7;
}
Sensor_ID06.prototype.generateJSON = function(buffer) {
  return { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(0))
                          , this.convertTemperature(buffer.readUInt16BE(6))],
       'waterTemperature': [ this.convertTemperature(buffer.readUInt16BE(2))
                           , this.convertTemperature(buffer.readUInt16BE(8))],
       'humidity': [ this.convertHumidity(buffer.readUInt16BE(4))
                   , this.convertHumidity(buffer.readUInt16BE(10))] }
}
Sensor_ID06.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0])
    + ' ' + this.humidityAsString(this.json.humidity[0])
    + ' H₂O:' + this.temperaturAsString(this.json.waterTemperature[0])
}


// ID07: Weather Station MA 10410
function Sensor_ID07() {}
util.inherits(Sensor_ID07, SensorBase);
Sensor_ID07.prototype.bufferSize = function() {
  return 16;
}
Sensor_ID07.prototype.transmitInterval = function() {
  return 6;
}
Sensor_ID07.prototype.generateJSON = function(buffer) {
  return { 'in': { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(0))
                                  , this.convertTemperature(buffer.readUInt16BE(8))],
                   'humidity': [ this.convertHumidity(buffer.readUInt16BE(2))
                               , this.convertHumidity(buffer.readUInt16BE(10))] },
           'out': { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(4))
                                   , this.convertTemperature(buffer.readUInt16BE(12))],
                    'humidity': [ this.convertHumidity(buffer.readUInt16BE(6))
                                , this.convertHumidity(buffer.readUInt16BE(14))] }
  }
}
Sensor_ID07.prototype.debugString = function() {
  return 'IN: ' + this.temperaturAsString(this.json.in.temperature[0])
    + ' ' + this.humidityAsString(this.json.in.humidity[0])
    + ' OUT:' + this.temperaturAsString(this.json.out.temperature[0])
    + ' ' + this.humidityAsString(this.json.out.humidity[0])
}


// ID08: Rain sensor
function Sensor_ID08() {}
util.inherits(Sensor_ID08, SensorBase);
Sensor_ID08.prototype.bufferSize = function() {
  return 22;
}
Sensor_ID08.prototype.transmitInterval = function() {
  return 2 * 60;
}
Sensor_ID08.prototype.generateJSON = function(buffer) {
  return { 'temperature': [this.convertTemperature(buffer.readUInt16BE(0))],
       'eventCounter': buffer.readUInt16BE(2),
       'eventTimes': [ this.convertEventTime(buffer.readUInt16BE(4), 14)
                     , this.convertEventTime(buffer.readUInt16BE(6), 14)
                     , this.convertEventTime(buffer.readUInt16BE(8), 14)
                     , this.convertEventTime(buffer.readUInt16BE(10), 14)
                     , this.convertEventTime(buffer.readUInt16BE(12), 14)
                     , this.convertEventTime(buffer.readUInt16BE(14), 14)
                     , this.convertEventTime(buffer.readUInt16BE(16), 14)
                     , this.convertEventTime(buffer.readUInt16BE(18), 14)
                     , this.convertEventTime(buffer.readUInt16BE(20), 14) ] };
}
Sensor_ID08.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0])
}


// ID09: Pro Temperature/Humidity/Ext.Temperature sensor (MS10320PRO)
function Sensor_ID09() {}
util.inherits(Sensor_ID09, SensorBase);
Sensor_ID09.prototype.bufferSize = function() {
  return 12;
}
Sensor_ID09.prototype.transmitInterval = function() {
  return 3.5;
}
Sensor_ID09.prototype.generateJSON = function(buffer) {
  return { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(0))
                          , this.convertTemperature(buffer.readUInt16BE(6))],
       'temperatureExt': [ this.convertTemperature(buffer.readUInt16BE(2))
                         , this.convertTemperature(buffer.readUInt16BE(8))],
       'humidity': [ this.convertHumidity(buffer.readUInt16BE(4))
                    , this.convertHumidity(buffer.readUInt16BE(10))] }
}
Sensor_ID09.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0])
    + ' ' + this.humidityAsString(this.json.humidity[0])
    + ' Ext:' + this.temperaturAsString(this.json.temperatureExt[0])
}


// ID0a: Alarmgeber MA10860 für Gefahrenmelder
function Sensor_ID0a() {}
util.inherits(Sensor_ID0a, SensorBase);
Sensor_ID0a.prototype.bufferSize = function() {
  // 1 is actually wrong, because there are at least 2 bytes in the buffer
  return 1;
}
Sensor_ID0a.prototype.transmitInterval = function() {
  return 6 * 60;
}
Sensor_ID0a.prototype.generateJSON = function(buffer) {
  const alarmFlag = buffer.readUInt8(0);  // The top 4 bits are the alarm flags
  const al1 = (alarmFlag & 0x80) == 0x80;
  const al2 = (alarmFlag & 0x40) == 0x40;
  const al3 = (alarmFlag & 0x20) == 0x20;
  const al4 = (alarmFlag & 0x10) == 0x10;
  return { 'temperature': [
         // Overflow and underflow is not supported
         this.convertTemperature(buffer.readUInt16BE(0) & 0xfff) ],
       'alarm': [ al1,al2,al3,al4 ] };
}
Sensor_ID0a.prototype.debugString = function() {
  statusStr = ''
  if(sensor.json.alarm[0]) {
    statusStr += 'AL1 '
  }
  if(sensor.json.alarm[1]) {
    statusStr += 'AL2 '
  }
  if(sensor.json.alarm[2]) {
    statusStr += 'AL3 '
  }
  if(sensor.json.alarm[3]) {
    statusStr += 'AL4 '
  }
  return this.temperaturAsString(this.json.temperature[0]) + ' ' + statusStr
}


// ID0b: Wind sensor
function Sensor_ID0b() {}
util.inherits(Sensor_ID0b, SensorBase);
Sensor_ID0b.prototype.bufferSize = function() {
  return 4;
}
Sensor_ID0b.prototype.transmitInterval = function() {
  return 2 * 60;
}
Sensor_ID0b.prototype.getTXAndBufferOffset = function() {
  // The wind sensor has a 3 byte tx value
  this.tx = this.buffer.readUInt32BE(12) >> 8;
  this.bufferOffset = 15;
};
Sensor_ID0b.prototype.generateJSON = function(buffer) {
  const dir = (buffer.readUInt8(0) >> 4)
  const dirTable = ['N','NNE','NE','ENE'
                  , 'E','ESE','SE','SSE'
                  , 'S','SSW','SW','WSW'
                  , 'W','WNW','NW','NNW']
  const overFlowBits = buffer.readUInt8(0) & 3
  // Both speeds are 9 bit values, with the highest bit
  // being stored in the lowest bits of the first byte
  return { 'directionDegree': dir * (360.0/16.0),   // 22.5 degree per value
       'direction': dirTable[dir],
       'windSpeed': this.round(((((overFlowBits & 2) >> 1) << 8)
                                 + buffer.readUInt8(1)) * 0.1,1),
       'gustSpeed': this.round((((overFlowBits & 1) << 8)
                                 + buffer.readUInt8(2)) * 0.1,1),
       'lastTransmit': buffer.readUInt8(3) * 2 // seconds since last transmit
       }
}
Sensor_ID0b.prototype.debugString = function() {
  return this.json.direction
         + ' ' + this.json.windSpeed + 'm/s '
         + this.json.gustSpeed + 'm/s'
}


// ID10: Door/Window sensor
function Sensor_ID10() {}
util.inherits(Sensor_ID10, SensorBase);
Sensor_ID10.prototype.bufferSize = function() {
  return 8;
}
Sensor_ID10.prototype.transmitInterval = function() {
  return 6 * 60;
}
Sensor_ID10.prototype.generateJSON = function(buffer) {
  return { 'isOpen': [this.convertOpenState(buffer.readUInt16BE(0))
                    , this.convertOpenState(buffer.readUInt16BE(2))
                    , this.convertOpenState(buffer.readUInt16BE(4))
                    , this.convertOpenState(buffer.readUInt16BE(6)) ],
       'eventTimes': [this.convertEventTime(buffer.readUInt16BE(0), 13)
                    , this.convertEventTime(buffer.readUInt16BE(2), 13)
                    , this.convertEventTime(buffer.readUInt16BE(4), 13)
                    , this.convertEventTime(buffer.readUInt16BE(6), 13) ] }
}
Sensor_ID10.prototype.debugString = function() {
  const isOpen = this.json.isOpen[0];
  if(isOpen) {
    statusStr = 'OPEN'
  } else {
    statusStr = 'CLOSED'
  }
  return statusStr
}

// ID11: WeatherStation (MA10410)
function Sensor_ID11() { }
util.inherits(Sensor_ID11, SensorBase);
Sensor_ID11.prototype.bufferSize = function () {
    return 32;
}
Sensor_ID11.prototype.transmitInterval = function () {
    return 7;
}
Sensor_ID11.prototype.generateJSON = function (buffer) {

    return {
        'temperature1': [this.convertTemperature(buffer.readUInt16BE(0)), this.convertTemperature(buffer.readUInt16BE(16))],
        'humidity1': [this.convertHumidity(buffer.readUInt16BE(2)), this.convertHumidity(buffer.readUInt16BE(18))],
        'temperature2': [this.convertTemperature(buffer.readUInt16BE(4)), this.convertTemperature(buffer.readUInt16BE(20))],
        'humidity2': [this.convertHumidity(buffer.readUInt16BE(6)), this.convertHumidity(buffer.readUInt16BE(22))],
        'temperature3': [this.convertTemperature(buffer.readUInt16BE(8)), this.convertTemperature(buffer.readUInt16BE(24))],
        'humidity3': [this.convertHumidity(buffer.readUInt16BE(10)), this.convertHumidity(buffer.readUInt16BE(26))],
        'temperatureIN': [this.convertTemperature(buffer.readUInt16BE(12)), this.convertTemperature(buffer.readUInt16BE(28))],
        'humidityIN': [this.convertHumidity(buffer.readUInt16BE(14)), this.convertHumidity(buffer.readUInt16BE(30))]
    };
}

Sensor_ID11.prototype.debugString = function () {
    return this.temperaturAsString(this.json.temperatureIN[0])
        + ' ' + this.humidityAsString(this.json.humidityIN[0])
}

// ID12: Humidity Guard (MA10230)
function Sensor_ID12() {}
util.inherits(Sensor_ID12, SensorBase);
Sensor_ID12.prototype.bufferSize = function() {
  return 15;
}
Sensor_ID12.prototype.transmitInterval = function() {
  return 10;
}
Sensor_ID12.prototype.generateJSON = function(buffer) {
  return { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(4)) ],
           'humidity': [ this.convertHumidity(buffer.readUInt8(6)) ],
           'averangehumidity': {
             '3h': this.convertHumidity(buffer.readUInt8(0)),
             '24h': this.convertHumidity(buffer.readUInt8(1)),
             '7d': this.convertHumidity(buffer.readUInt8(2)),
             '30d': this.convertHumidity(buffer.readUInt8(3))
           }
  };
}
Sensor_ID12.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0])
  + ' ' + this.humidityAsString(this.json.humidity[0])  
  + ' 3h: ' + this.humidityAsString(this.json.out.averangehumidity["3h"])
  + ' 24h: ' + this.humidityAsString(this.json.out.averangehumidity["24h"])
  + ' 7d: ' + this.humidityAsString(this.json.out.averangehumidity["7d"])
  + ' 30d: ' + this.humidityAsString(this.json.out.averangehumidity["30d"]);
}

// ID18: Air pressure monitor
function Sensor_ID18() {}
util.inherits(Sensor_ID18, SensorBase);
Sensor_ID18.prototype.bufferSize = function() {
  return 8;
}
Sensor_ID18.prototype.getTXAndBufferOffset = function() {
  // The air pressure monitor has a 3 byte tx value
  this.tx = this.buffer.readUInt32BE(12) >> 8;
  this.bufferOffset = 15;
};
Sensor_ID18.prototype.transmitInterval = function() {
  return 6;
}
Sensor_ID18.prototype.generateJSON = function(buffer) {
  return { 'temperature': [ this.convertTemperature(buffer.readUInt16BE(0)) ],
            'humidity': [ this.convertHumidity(buffer.readUInt8(2)) ],
            'airPressure': [ this.convertAirPressure(buffer.readUInt16BE(3)) ], 
         };
}
Sensor_ID18.prototype.debugString = function() {
  return       this.temperaturAsString(this.json.temperature[0])
       + ' ' + this.humidityAsString(this.json.humidity[0])
       + ' ' + this.airPressureAsString(this.json.airPressure[0])
}

// ID0e: Temperature/Humidity sensor (decimal precision humidity)
function Sensor_ID0e() {}
util.inherits(Sensor_ID0e, SensorBase);
Sensor_ID0e.prototype.bufferSize = function() {
  return 8;
}
Sensor_ID0e.prototype.transmitInterval = function() {
  return 7;
}
Sensor_ID0e.prototype.generateJSON = function(buffer) {
  return { 'temperature': [
                          this.convertTemperature(buffer.readUInt16BE(0))
                        , this.convertTemperature(buffer.readUInt16BE(5))],
       'humidity': [   this.convertHumidity((buffer.readUInt16BE(2)))
                     , this.convertHumidity((buffer.readUInt16BE(7)))] };
}
Sensor_ID0e.prototype.debugString = function() {
  return this.temperaturAsString(this.json.temperature[0])
                    + ' ' + this.humidityAsString(this.json.humidity[0])
}
