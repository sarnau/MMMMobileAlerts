# Mobile Alerts Devices

Here a list of all known products from Mobile Alerts. The product code is a marketing code, the ID is the format of the sensor data being transmitted (sensors with the same ID send data in the identical way)

| Product code | Device name      |
|--------------|------------------|
| MA10001      | START SET (MA10000 + MA10100) |
| MA10005      | START SET (MA10000 + TX47 (3 minutes) + WL2000) |
| MA10006      | START SET (MA10000 + TX45TH-IT (2 minutes) + MA10410) |
| MA10007      | Temperaturüberwachung (MA10000 + MA10320 + MA10100) |
| MA10008      | Special Set Hausüberwachung (MA10000 + MA10100 + 3 * MA10800) |
| MA10012      | Zusatzsensoren (MA10000 + MA10231 + MA10232) |
| MA10028      | Introduction Set (MA10000 + MA10000 + MA10100 + MA10350 + MA10800) |
| MA10029      | Aquarium Set (MA10000 + MA10100 + MA10101) |
| MA10050      | Internet Weather Center (MA10660 + MA10650 + MA10200) |

| Product code | ID   | Device name      | Accuracy | Transmission Rate |
|--------------|------|------------------|----------|-------------------|
| MA10000      | ID00 | Gateway          |          | |
| MA10120      | ID01 | Pro Temperature sensor with ext. cable probe | -29,9…+59,9 °C, ±1°C | 7 min |
| MA10100      | ID02 | Temperature sensor | -29.9°C…+59.9°C, ±1°C | 7 min |
| MA10101      | ID02 | Temperature sensor with cable probe | –29.9°C…+59.9°C | 7 min |
| MA10120      | ID09 | Pro Temperature sensor with cable probe | –29.9°C…+59.9°C ±1°C | 7 min |
| MA10200      | ID03 | Thermo-hygro-sensor | –39.9°C…+59.9°C, 20%…99%, ±4% | 7 min |
| MA10230      | ID12 | Indoor Climate Status | –39.9°C…+59.9°C, ±0.8°C, 1%…99%, ±3% | |
| MA10250      | ID03 | Thermo-Hygro Outdoor | –39.9°C…+59.9°C, ±1°C, 20%…99% ±5% | 7 min |
| MA10300      | ID03 | Thermo-hygro-sensor with cable probe | –39.9°C…+59.9°C, 20%…99%, ±4% | 7 min |
| MA10320      | ID09 | Pro Thermo-hygro-sensor with ext. cable probe | –39.9°C…+59.9°C, ±1°C, cable probe –50°C…+110°C, ±0,5°C, 20%…99% ±5% | 3.5 min |
| MA10350      | ID04 | Thermo-hygro-sensor with water detector | –39.9°C…+59.9°C, 20%…99%, ±4% | */7 min |
| MA10410      | ID07 | Weather Station | indoor: -9.9°C…+59.9°C ±1°C, 20%…95% ±4%, outdoor -39.9°C…+59.9°C ±1°C, outdoor 1%…99% ±4% | 6 min |
| MA10450      | ID0F | Weather Station | indoor: -9.9°C…+59.9°C ±1°C, outdoor -39.9°C…+59.9°C ±1°C | 7min |
| MA10650      | ID08 | Rain meter | 0mm/h…300mm/h, 0.258mm | during rain up to every second, or every 2 hours during idle |
| MA10660      | ID0B | Wind speed and wind direction display | wind and gusts: 0-50 m/s, ±5% or ±0.5 m/s, 0,02s gusts, direction 22,5° resolution | 6 min |
| MA10700      | ID06 | Thermo-hygro-sensor with pool sensor | –39.9°C…+59.9°C ±1°C, 20%…99%, ±4% Pool:0°C…+59.9°C ±1°C | |
| MA10800      | ID10 | Contact sensor | | state change, or every 6 hours during idle |
| MA10860      | ID0a | Sensor for acoustical observation of detectors | ? | ? |
| MA10900      | ID07 | Color Display Weather Station | indoor: -9.9°C…+59.9°C ±1°C, 1%…99% ±4%, outdoor -39.9°C…+59.9°C ±1°C, outdoor 1%…99% ±4% | 7 min |
| WL2000       | ID05 | Air quality monitor | indoor: -9.5°C…+59.9°C ±1°C, 20%…95% ±4%, outdoor -39.9°C…+59.9°C ±1°C, outdoor 1%…99%, CO²-equivalent: 450ppm…3950ppm ±50ppm | 7 min |
| TFA30.3312.02 | ID0E | Thermo-hygro-sensor | –40.0°C…+60.0°C, 0.0%…99.0% | ? |
| ?            | ID0F | Temperature sensor with ext. cable probe | | |
| TFA30.3060.01 | ID11 | 4 Thermo-hygro-sensors | indoor: -10°C…+60°C ±1°C, outdoor -40°C…+60°C ±1°C, 1%…99% ±3% | |

Each device has a unique device ID, which is 12 uppercase characters long. Every device within the range of the gateway is received by the gateway and forwarded to the internet, it technically is not necessary to know the ID, you can find it out by listening to the gateway.

The 12 characters are representing a 6 byte number, which is simply converted into a hexadecimal string.

The first byte is considered by Mobile Alerts the ID, like ID02 or ID08. This ID is defining the type of sensor which is transmitting and how the data is to be interpreted.

## Rain Meter Details

The rain meter is measuring rainfall in an 100cm2 area with a rocker counter, which flips over every 2.58ml. This will result in a theoretical resolution of 0.258mm/m2 – by very slowly adding a measured weight of water to the funnel and counting the switches, I would guess that the flip happens every 3ml-3.25ml, which means it reports between 10-30% too low. But as somebody said "Rain doesn't fall as accurate as we can measure it". It doesn't matter, because dust, etc. will have a greater impact on the measurement anyway. We want to know: (a) when does it rain, (b) did it rain a little or a lot. The sensor is sufficient for that.

Warning: because of it's battery power, it is not heated and therefore can't measure snow, hail or sleet.

## Factory Reset

Devices with a button can often be factory reset by holding it down until the segments fill completely.
