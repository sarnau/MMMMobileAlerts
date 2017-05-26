#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import binascii
import struct
import logging
import datetime

log = logging.getLogger(__name__)

class MASensorBase():
    @staticmethod
    def createSensorObject(data):
        if len(data) != 64:
            log.warning('### Packages size wrong: %s' % binascii.hexlify(data));
            return None

        # The 64-byte package has a 7-bit checksum, which is stored in the last byte
        calcChecksum = sum(bb for bb in data[:-1])
        if (calcChecksum & 0x7f) != data[-1]:
            log.warning('### Checksum error: %s' % binascii.hexlify(data));
            # The Cloud Server seems to ignore a wrong checksum and simply returns 200 OK.
            # This avoids resending the same broken package endlessly by the gateway.
            return None

        sensor = None
        get_class = lambda x: globals()[x]
        className = 'MASensor_ID%2.2x' % data[6]   # a copy of the first byte as the sensor ID
        try:
            sensor = get_class(className)(data)
        except KeyError:
            log.warning("Unknown sensor: " + className)
        return sensor

    def __init__(self, data):
        self._data = data
        header,unitTime,packageLength,ID, = struct.unpack('>BLB6s', self._data[:12])
        self.header = header            # identifies the type of the package, however the first byte of the ID is typically used.
        self.timestamp = datetime.datetime.fromtimestamp(unitTime) # UTC based timestamp when the measurement was taken
        self.packageLength = packageLength  # length of the package, seems to be static in regards of the header
        self.ID = str(binascii.hexlify(ID), 'ascii')  # 6 byte sensor ID. The first byte is the ID, which identifies the type.
        self.sensorType = self._data[6] # a copy of the first byte of the ID for easy access.
        self.timeoutInMinutes = int(self.transmitInterval() * 3.5) # store the timeout before a sensor becomes offline (to avoid warning if some events were missed)
        if self.timeoutInMinutes < 60:
            self.timeoutInMinutes = 60  # at least 60 minutes of timeout per sensor
        if self.packageLength < 14+self.bufferSize(): # illegal package, not enough data
            return None
        self.sensorinfoname = self.name() + ' Sensor [%s]' % (self.ID)
        self.setupTXAndBufferOffset()
        self.parseValues(self._data[self.bufferOffset:])
#        log.info(str(binascii.hexlify(self._data[self.bufferOffset:self.packageLength]), 'ascii'))

    # default implementation for unknown sensors
    def name(self) -> str:
        return 'Unknown'
    def bufferSize(self) -> int:
        ''' no data for an unknown sensor '''
        return 0
    def setupTXAndBufferOffset(self):
        self.tx, = struct.unpack('>H', self._data[12:14])
        self.bufferOffset = 14
    def transmitInterval(self) -> int:
        ''' offline timeout in minutes '''
        return 24 * 60 # 24h
    def parseValues(self,buffer):
        pass
    def __repr__(self):
        return '%s' % (self.sensorinfoname)

    # value converters, shared by all sensors
    def convertTemperature(value: int) -> float:
        if value & 0x2000:  # overflow, temperature too hot for the sensor to detect.
            return 9999
        if value & 0x1000:  # illegal value from the sensor, e.g. sensor not available (e.g. a pool sensor)
            return -9999
        if value & 0x0400:  # negative temperatures
            return -(0x800 - (value & 0x7ff)) / 10
        return (value & 0x7ff) / 10

    def convertHumidity(value: int) -> int:
        return value & 0x7f # values: 0%…100%        

    def convertWetness(value: int) -> bool:
        if value & 1:
            return False    # dry
        else:
            return True     # wet
            
    def convertOpenState(value: int) -> bool:
        if value & 0x8000:
            return True     # open
        else:
            return False    # closed

    def convertEventTime(value: int, timeScaleBitOffset: int) -> int:
        timeScaleFactor = (value >> timeScaleBitOffset) & 3 # 2 bits at the top contain the time-scale factor
        value = value & ((1 << timeScaleBitOffset) - 1)
        if timeScaleFactor == 0: # days
            return value * 60 * 60 * 24
        elif timeScaleFactor == 1: # hours
            return value * 60 * 60
        elif timeScaleFactor == 2: # minutes
            return value * 60
        elif timeScaleFactor == 3: # seconds
            return value


class MASensor_ID02(MASensorBase):
    def name(self):
        return 'Temp'
    def bufferSize(self):
        return 4
    def transmitInterval(self):
        return 7
    def parseValues(self,buffer):
        value1, = struct.unpack('>H', buffer[0:2])
        self.temperature = MASensorBase.convertTemperature(value1)
    def __repr__(self):
        return '%s : %.1f°C' % (self.sensorinfoname, self.temperature)

class MASensor_ID03(MASensorBase):
    def name(self):
        return 'Temp/Hum'
    def bufferSize(self):
        return 8
    def transmitInterval(self):
        return 7
    def parseValues(self,buffer):
        value1,value2, = struct.unpack('>HH', buffer[0:4])
        self.temperature = MASensorBase.convertTemperature(value1)
        self.humidity = MASensorBase.convertHumidity(value2)
    def __repr__(self):
        return '%s : %.1f°C %d%%' % (self.sensorinfoname, self.temperature, self.humidity)

class MASensor_ID04(MASensorBase):
    def name(self):
        return 'Temp/Hum/Water'
    def bufferSize(self):
        return 10
    def transmitInterval(self):
        return 7
    def parseValues(self,buffer):
        value1,value2,value3, = struct.unpack('>HHB', buffer[0:5])
        self.temperature = MASensorBase.convertTemperature(value1)
        self.humidity = MASensorBase.convertHumidity(value2)
        self.isWet = MASensorBase.convertWetness(value3)
    def __repr__(self):
        return '%s : %.1f°C %d%% wet:%d' % (self.sensorinfoname, self.temperature, self.humidity, self.isWet)

class MASensor_ID06(MASensorBase):
    def name(self):
        return 'Temp/Humidity/Pool'
    def bufferSize(self):
        return 12
    def transmitInterval(self):
        return 7
    def parseValues(self,buffer):
        value1,value2,value3, = struct.unpack('>HHH', buffer[0:6])
        self.temperature = MASensorBase.convertTemperature(value1)
        self.waterTemperature = MASensorBase.convertTemperature(value2)
        self.humidity = MASensorBase.convertHumidity(value3)
    def __repr__(self):
        return '%s : %.1f°C %d%% %.1f°C' % (self.sensorinfoname, self.temperature, self.humidity, self.waterTemperature)

class MASensor_ID08(MASensorBase):
    def name(self):
        return 'Rain'
    def bufferSize(self):
        return 22
    def transmitInterval(self):
        return 2 * 60
    def parseValues(self,buffer):
        value1,value2,value3, = struct.unpack('>HHH', buffer[0:6])
        self.temperature = MASensorBase.convertTemperature(value1 & 0x3fff)
        self.isRaining = (value1 & 0xc000) != 0 # reset after 2 hours
        self.eventCounter = MASensorBase.convertTemperature(value2)
        self.lastEvent = MASensorBase.convertEventTime(value3, 14)
    def __repr__(self):
        return '%s : %.1f°C %d %ds isRaining:%d' % (self.sensorinfoname, self.temperature, self.eventCounter, self.lastEvent, self.isRaining)

class MASensor_ID09(MASensorBase):
    def name(self):
        return 'Pro Temp/Hum/Ext.Temp'
    def bufferSize(self):
        return 12
    def transmitInterval(self):
        return 3.5
    def parseValues(self,buffer):
        value1,value2,value3, = struct.unpack('>HHH', buffer[0:6])
        self.temperature = MASensorBase.convertTemperature(value1)
        self.extTemperature = MASensorBase.convertTemperature(value2)
        self.humidity = MASensorBase.convertHumidity(value3)
    def __repr__(self):
        return '%s : %.1f°C %d%% %.1f°C' % (self.sensorinfoname, self.temperature, self.humidity, self.extTemperature)

class MASensor_ID0a(MASensorBase):
    def name(self):
        return 'Signal'
    def bufferSize(self):
        return 1    # 1 is actually wrong, because there are at least 2 bytes in the buffer
    def transmitInterval(self):
        return 6 * 60
    def parseValues(self,buffer):
        value, = struct.unpack('>H', buffer[0:2])
        self.temperature = MASensorBase.convertTemperature(value & 0xfff)
        self.alarm_1 = (value & 0x8000) == 0x8000
        self.alarm_2 = (value & 0x4000) == 0x4000
        self.alarm_3 = (value & 0x2000) == 0x2000
        self.alarm_4 = (value & 0x1000) == 0x1000
    def __repr__(self):
        return '%s : %.1f°C AL1:%d AL2:%d AL3:%d AL4:%d' % (self.sensorinfoname, self.temperature, self.alarm_1, self.alarm_2, self.alarm_3, self.alarm_4)

class MASensor_ID0b(MASensorBase):
    def name(self):
        return 'Wind'
    def bufferSize(self):
        return 4
    def setupTXAndBufferOffset(self):
        value, = struct.unpack('>L', self._data[12:16])
        self.tx = value >> 8  # the value is only 24 bits wide, so we remove the lower 8
        self.bufferOffset = 15
    def transmitInterval(self):
        return 2 * 60
    def parseValues(self,buffer):
        value1,value2,value3,value4, = struct.unpack('>BBBB', buffer[0:4])
        DIR_TABLE = ['N','NNE','NE','ENE', 'E','ESE','SE','SSE', 'S','SSW','SW','WSW', 'W','WNW','NW','NNW']
        dir = value1 >> 4
        overFlowBits = value1 & 3 # Both speeds are 9 bit values, with the highest bit being stored in the lowest bits of the first byte
        self.directionDegree = dir * (360.0/16.0)   # 22.5 degree per value
        self.direction = DIR_TABLE[dir]
        self.windSpeed = ((((overFlowBits & 2) >> 1) << 8) + value2) / 10.0
        self.gustSpeed = (((overFlowBits & 1) << 8) + value3) / 10.0
        self.lastTransmit = value4 * 2 # seconds since last transmit
    def __repr__(self):
        return '%s : %d°/%s speed:%.1fm/s gust:%.1fm/s %ds' % (self.sensorinfoname, self.directionDegree, self.direction, self.windSpeed, self.gustSpeed, self.lastTransmit)

class MASensor_ID10(MASensorBase):
    def name(self):
        return 'Door/Window'
    def bufferSize(self):
        return 8
    def transmitInterval(self):
        return 6 * 60
    def parseValues(self,buffer):
        value, = struct.unpack('>H', buffer[0:2])
        self.isOpen = MASensorBase.convertOpenState(value)
        self.eventCounter = MASensorBase.convertEventTime(value, 13)
    def __repr__(self):
        return '%s : open:%d counter:%d' % (self.sensorinfoname, self.isOpen, self.eventCounter)

def main():
    sensorCache = {}
    logging.basicConfig(level=logging.DEBUG)
    with open('testdata.log') as f:
        for line in f.readlines():
            binaryData = binascii.unhexlify(line.strip())
            sensor = MASensorBase.createSensorObject(binaryData)
            #if sensor.ID in sensorCache:
            #    print(sensor.timestamp - sensorCache[sensor.ID].timestamp)
            sensorCache[sensor.ID] = sensor
            lastTime = sensor.timestamp
            log.debug('%s - %5d: %s' % (sensor.timestamp, sensor.tx, sensor))
    knownSensors = {
        "02208d6f34cf": "Guest Room",
        "026832992f08": "Electric Room",
        "02683e4d7461": "Heating Room",
        "0268f7970c6f": "Heater",
        "026921d6ff95": "Cold Room",
        "026d19a4ecad": "--- Temp & External",

        "033831964a19": "Test Temp",
        "033bc6934256": "Outdoor [Pro]",
        "037adb6dbee2": "Master Bath",
        "037b4250634b": "Bar",
        "037c00e5f406": "Outdoor",
        "037c4e212811": "Markus Office",
        "037d6439fa29": "Guest Bath",
        "037e223bab28": "Luggage Room",
        "037e5286e517": "Master Bedroom",
        "037f23bdb02d": "Livingroom",
        "037f7372d2e6": "Spa",

        "042bb8fab19c": "Laundry Room",

        "06011ef68134": "Pool (old)",
        "0600bae14ded": "Pool",

        "080696b2755e": "Rain",

        "09135d48269a": "Pro Temp Sensor",

        "0a21478b44f6": "Sound Sensor",

        "0b5b28d23283": "Wind",

        "1000c1c55b5e": "Living Back L",
        "10028e37bb8e": "Test Sensor 1",
        "1002c30b6e0e": "Living Main L",
        "1003199e1d49": "--- Markus Office",
        "1003c719f02b": "Test Sensor 3",
        "1003cb0223ad": "Test Sensor 4",
        "1006db250dd0": "Living Main R",
        "100870551033": "Dining Room",
        "1008c249cce9": "Test Sensor 5",
        "100ac306e328": "Test Sensor 2",
        "1077e8c7a45f": "Living Back R",
        "107aef688653": "Master Bed Top"
    }
    print('#' * 40)
    sensorList = []
    for id in set(knownSensors).union(set(sensorCache)):
        name = '[%s]' % id
        if id in knownSensors:
            name = knownSensors[id]
        if id in sensorCache:
            sensorList.append('%8s %s %s' % ((lastTime - sensorCache[id].timestamp), id, name))
        else:
            sensorList.append('99:99:99 %s %s' % (id, knownSensors[id]))
    for line in sorted(sensorList):
        print(line)

if __name__=='__main__':
    main()
