# Gateway Binary Upload into the Cloud

The gateway sends data via a binary HTTP request to [http://www.data199.com/gateway/put](http://www.data199.com/gateway/put) (to be exact the data server, which is in the configuration). The `content-type` describes it as `application/octet-stream` and an additional header `http_identify` contains the following string: Gateway Serial + ":" + Gateway MAC + ":" + action code.

`http_identify: 80ABCDEF:006789ABCDEF:00` send during boot-up of the gateway.
`http_identify: 80ABCDEF:006789ABCDEF:C0` send during message transmission.

## Gateway block send during boot-up

The binary data send during boot-up always seems to be 15 bytes. All values are always big-endian, if endianness matters.

| Byte  | Meaning |
|-------|---------|
|  0    | byte, containing the size of the package (15 bytes) |
|  1    | 32-bit value containing the seconds since boot for the gateway, often around 7s |
|  5    | 6 bytes of the gateway ID |
|  11   | word, always 1? |
|  13   | word, always 50? |

## Sensor 64-byte data block format

The binary data to transfer the packages to the server is always a multiple of 64-byte blocks with each block containing one message from a sensor. Data that is non-urgent is buffered within the gateway to minimize the number of transfers to the cloud server, it seems to be send every 7 minutes. Only messages marked in the tx counter as events are send immediately. If such an event occurs, all buffered packages are also sent. Pressing the button on the gateway sends all data immediately, which is helpful for debugging.

Every 64-byte block has a simple 7-bit checksum. It is calculated by just summing up the first 63 bytes and storing the lower 7 bit in the last byte of the message. Bit 7 in the last byte is always 0. If the checksum is invalid, the server simply ignores the package, but still returns HTTP status 200 (= OK), probably to avoid the gateway sending a defect package over and over again.

### Offset 0: Package Header
| header | device ID | package length | sensor type |
|----|----|----|-----------|
|0xce|ID02|0x12|temperature|
|0xd2|ID01|0x16|teperature in + temperature cable |
|0xd2|ID03|0x16|temperature + humidity|
|0xd2|ID0F|0x16|temperature in + temperature out |
|0xd3|ID10|0x17|open/close sensor|
|0xd4|ID04|0x18|temperature + humidity + dry-contact|
|0xd6|ID06|0x1a|temperature + humidity + pool temperature|
|0xd8|ID0E|0x1c|temperature + humidity (with decimal place)|
|0xd9|ID12|0x1d|humidity average + temperature + humidity |
|0xda|ID05|0x1e|temperature out + tempereature in + humidity + air quality |
|0xda|ID07|0x1e|temperature in + humidity in + temperature out + humidity out|
|0xe1|ID08|0x25|rain|
|0xe2|ID0b|0x26|wind|
|0xea|ID11|0x2e|4 times temperature and humidity |

### Offset 1: UNIX UTC Timestamp
A 4 byte UNIX UTC timestamp when the data was received by the gateway.

### Offset 5: Package Length
Length of data within the whole package in bytes. It seems to be always be the same for the same header and device ID.

### Offset 6: Device ID
6 byte device ID, which matches the sensor MAC address. The first byte is the ID, which defines the content of the data.

### Offset 12: Data
Starting here is the sensor depended data.

| ID | Format of data |
|----|----------------|
| 01 | **Temperature sensor in/cable** |
|    |  0 word: tx counter |
|    |  2 word: current temperature |
|    |  4 word: current temperature cable |
|    |  6 word: previous temperature |
|    |  8 word: previous temperature cable |
| 02 | **Temperature sensor** |
|    |  0 word: tx counter |
|    |  2 word: current temperature |
|    |  4 word: previous temperature |
| 03 | **Temperature/Humidity sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: humidity |
|    |  6 word: previous temperature |
|    |  8 word: previous humidity |
| 04 | **Temperature/Humidity/Water Detector sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: humidity |
|    |  6 byte: wetness sensor |
|    |  7 word: previous temperature |
|    |  9 word: previous humidity |
|    | 11 byte: previous water sensor |
| 05 | **Air Quality Monitor [WL2000]** |
|    |  0 word: tx counter |
|    |  2 word: temperature out |
|    |  4 word: temperature in |
|    |  6 word: humidity in |
|    |  8 word: air quality (CO2) |
|    | 10 word: previous temperature out |
|    | 12 word: previous temperature in |
|    | 14 word: previous humidity in |
| 06 | **Temperature/Humidity/Pool sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: pool temperature |
|    |  6 word: humidity |
|    |  8 word: previous temperature |
|    | 10 word: previous pool temperature |
|    | 12 word: previous humidity |
| 07 | **Weather Station MA10410**|
|    |  0 word: tx counter |
|    |  2 word: temperature in |
|    |  4 word: humidity in |
|    |  6 word: temperature out |
|    |  8 word: humidity out |
|    | 10 word: previous temperature in |
|    | 12 word: previous humidity in |
|    | 14 word: previous temperature out |
|    | 16 word: previous humidity out |
| 08 | **Rain sensor** |
|    |  0 word: tx counter |
|    |  2 word: Bit 14-15: %10:rain seesaw to the left  |
|    |          Bit 14-15: %01:rain seesaw to the right  |
|    |          Bit 14-15: %00:2 hour idle timer, no movement detected |
|    |          Bit 0-13: temperature  |
|    |  4 word: seesaw movement counter = 0.25mm/m2 per count, e.g. 20 ticks = 5l/m2 rain - needs to be counted over a 1 hour period for normalization |
|    |  6 word: Bit 14-15: %00: probably unused  |
|    |          Bit 14-15: %01: Unit: hours (overflow after ~682 days)  |
|    |          Bit 14-15: %10: Unit: min (overflow after ~11 days)  |
|    |          Bit 14-15: %11: Unit: sec (overflow after ~4 hours)  |
|    |          Bit 0-13: Time value since the last event |
|    |  8 word: previous event time (lower 13 bits contain the time in seconds/minutes/hours/days since last event)  |
|    | 10 word: previous event time  |
|    | 12 word: previous event time  |
|    | 14 word: previous event time  |
|    | 16 word: previous event time  |
|    | 18 word: previous event time  |
|    | 20 word: previous event time  |
|    | 22 word: previous event time  |
| 09 | **Pro Temperature/Humidity/Ext.Temperature sensor** |
|    |  0 word: tx counter |
|    |  2 word: temperature |
|    |  4 word: ext. temperature |
|    |  6 word: humidity |
|    |  8 word: previous temperature |
|    | 10 word: previous ext. temperature |
|    | 12 word: previous humidity |
| 0a | **MA10860** |
|    |  0 word: tx counter |
|    |  2 word: Bit 15: Alarm 1 triggered |
|    |          Bit 14: Alarm 2 triggered |
|    |          Bit 13: Alarm 3 triggered |
|    |          Bit 12: Alarm 4 triggered |
|    |          Bit 11: unknown, always 0 |
|    |          Bit 10: unknown, always 0 |
|    |          Bit 0-9: Temperature without overflow and error bits |
| 0b | **Wind sensor** |
|    |  0 3-byte: tx counter (this tx counter is 3 bytes instead of 2 bytes!) |
|    |  3 long: Bit 28…31: wind direction (0 = N, 1 = NNO, 2 = NO, 3 = ONO, 4 = O, …, 12 = W, 13 = WNW, 14 = NW, 15 = NNW) |
|    |          Bit 27: unknown, always 0 |
|    |          Bit 26: unknown, always 0 |
|    |          Bit 25: Bit 8 for the wind speed (to have a 9 bit resolution) |
|    |          Bit 24: Bit 8 for the gust speed (to have a 9 bit resolution) |
|    |          Bit 15…23: wind speed in m/s, divide value by 10 |
|    |          Bit 8…15: gust speed in m/s, divide value by 10 |
|    |          Bit 0…7: typical 210, which multiplied by 2 equals 410s or 7 minutes, which is the duration since the last transmit) |
|    |  7 long: previous state |
|    | 11 long: previous state |
|    | 15 long: previous state |
|    | 19 long: previous state |
|    | 23 long: previous state |
| 0c | illegal sensor id |
| 0d | illegal sensor id |
| 0e | **Professional Thermo/Hygro sensor** |
|    | 0 word: tx counter |
|    | 2 word: temperature |
|    | 4 word: humidity with decimal place |
|    | 5 byte: unknown |
|    | 7 word: previous temperature |
|    | 9 word: previous humidity with decimal place |
|    | 10 byte: unknown |
|    | 11 word: previous temperature |
|    | 13 word: previous humidity with decimal place |
|    | 14 byte: unknown |
| 0f | **Weather Station** |
|    |  0 word: tx counter |
|    |  2 word: temperature in |
|    |  4 word: temperature out |
|    |  6 word: previous temperature in |
|    |  8 word: previous temperature out |
| 10 | **Door/Window sensor** (idle time: 6 hours) |
|    |  0 word: tx counter |
|    |  2 word: Bit 15: 0:Closed, 1:Open  |
|    |          Bit 13-14: %00: Unit: ?days?  |
|    |          Bit 13-14: %01: Unit: hours (overflow after ~341 days)  |
|    |          Bit 13-14: %10: Unit: min (overflow after ~5 days)  |
|    |          Bit 13-14: %11: Unit: sec (overflow after ~2 hours)  |
|    |          Bit 0-12: Time value  |
|    |  4 word: previous state (lower 12 bits contain the time in seconds/minutes/hours/days since last event) |
|    |  6 word: previous state |
|    |  8 word: previous state |
| 11 | **4 Thermo-hygro-sensors (TFA30.3060.01)** |
|    |  0 word: tx counter |
|    |  2 word: temperature sensor 1 |
|    |  4 word: humidity sensor 1 |
|    |  6 word: temperature sensor 2 |
|    |  8 word: humidity sensor 2 |
|    |  10 word: temperature sensor 3 |
|    |  12 word: humidity sensor 3 |
|    |  14 word: temperature in |
|    |  16 word: humidity in |
|    |  18 word: previous temperature sensor 1 |
|    |  20 word: previous humidity sensor 1 |
|    |  22 word: previous temperature sensor 2 |
|    |  24 word: previous humidity sensor 2 |
|    |  26 word: previous temperature sensor 3 |
|    |  28 word: previous humidity sensor 3 |
|    |  30 word: previous temperature in |
|    |  32 word: previous humidity in |
| 12 | **Humidity Guard (MA10230)** |
|    |  0 word: tx counter |
|    |  2 byte: 3h humidity average |
|    |  3 byte: 24h humidity average |
|    |  4 byte: 7d humidity average |
|    |  5 byte: 30d humidity average |
|    |  6 word: current temperature |
|    |  8 byte: current humidity |
|    |  9-16: unknown (pervious values?) |

### Value decoding

#### Tx Counter

| Bits  | Meaning |
|------|---------|
|  15  | 0: battery good, 1:battery low |
|  14  | 0: the transmission was triggered by the internal timer of the device e.g. for thermometers transmitting the temperature every 7 minutes or sensors sending every 2 hours a heartbeat |
|      | 1: the transmission was triggered by an event, like a battery change or the trigger of an alarm sensor or the button on the device |
| 0…13 | These bits are a counter that is incremented on every new event overflowing from 0x3fff back to 0x0000. It can be used to filter out duplicate messages on the receiver side. |


#### Temperature

| Bits  | Meaning |
|-------|---------|
|  15   | unknown, typically 0, but can be 1 |
|  14   | unknown, typically 0, but can be 1 |
|  13   | overflow (too hot for the sensor) and is displayed as "OFL°C" |
|  12   | sensor error occurred. It is represented as "---°C" |
|  11   | unknown, always seems to be 0. |
| 0…10  | temperature is a signed 11 bit value in 1/10°C.
|       | 0…1023 represents 0.0°C…102.3°C = value * 0.1 |
|       | 1024…2047 do represent -102.4°C…-0.1°C = (2048-value) * -0.1 |

A sensor error typically occurs if e.g. the water temperature sensor of the pool sensor is offline (e.g. no batteries). In this case the water temperature can't be reported.

#### Humidity

| Bits  | Meaning |
|-------|---------|
|  15   | unknown, typically 0, but can be 1 |
|  14   | unknown, typically 0, but can be 1 |
|  13   | unknown |
|  12   | unknown |
| 8…11  | unknown, typically a value of 10, on the MA10250PRO (Outdoor sensor) it is 0 |
|   7   | unknown (MA10230 average values 1= "--" (not calculated)) |
| 0…6   | humidity is a 7 bit value and read as % |

#### Humidity with decimal place

| Bits  | Meaning |
|-------|---------|
| 10-15 | unknown |
| 0…9   | humidity is a 10 bit value in 1/10% |

#### Air quality

| Bits  | Meaning |
|-------|---------|
| 8…15  | unknown |
|   8   | probably overflow |
| 0…7   | Counter for 50 ppm (e.g. 9 is 450 ppm) |

#### Wetness

| Bits  | Meaning |
|-------|---------|
|   7   | unknown, always 1 |
|   6   | unknown, always 0 |
|   5   | unknown, always 1 |
|   4   | unknown, always 0 |
|   3   | unknown, always 1 |
|   2   | unknown, always 0 |
|   1   | unknown, 0:dry, 1:wet |
|   0   | unknown, 0:wet, 1:dry |
