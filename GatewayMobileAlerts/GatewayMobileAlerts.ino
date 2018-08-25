/*
 This is a Mobile Alerts to UDP gateway (used e.g. for the Loxone Miniserver). It reconfigures a Mobile Alerts Ethernet
to use this Arduino as a proxy server. This way all messages are sent to the Arudino instead of the internet.

Requirements:
- Arduino Mega 2560 (or clone). The smaller ones do not have enough memory.
- an Ethernet Adapter           

The server settings below have to be adjusted. In this example I am using a FRITZ!Box and use it's NTP server. The UDP destination
and port are the receivers of the ASCII messages in the form of:

sensorID.variableName=variableValue

Example:
031234567890.temperature=27.3

WARNING: not all Mobile Alerts sensors are supported. See below.


Written my Markus Fritze, 2018.

 This code is in the public domain.
 */

#define DEBUG 0

#define NTP_SERVER      "192.168.178.1"
#define UDP_DESTINATION "192.168.178.32"
#define UDP_PORT        9800


#include <SPI.h>         // needed for Arduino versions later than 0018
#include <Ethernet.h>
#include <EthernetUdp.h>         // UDP library from: bjoern@cs.stanford.edu 12/30/2008
#include <NTPClient.h>
#include <avr/wdt.h>

// Enter a MAC address and IP address for your controller below.
// The IP address will be dependent on your local network:
byte mac[] = { 0x06, 0x48, 0x5e, 0x00, 0x00, 0x02 };

EthernetUDP ntpUDP;
NTPClient timeClient(ntpUDP, NTP_SERVER);

// This is the UDP port used by the Mobile Alerts Gateway
// for the configuration
const unsigned int PORT = 8003;
// all communication with the gateways are broadcasts
const IPAddress BROADCAST_ADDR(255,255,255,255);

// Find any available gateway in the local network
#define FIND_GATEWAYS 1
// Find a single available gateway in the local network
#define FIND_GATEWAY 2
// Request the configuration of the gateway
#define GET_CONFIG 3
// Set a new configuration. It takes a few seconds for the gateway
// to do the update
#define SET_CONFIG 4
// A reboot takes about 10s for the gateway to be back up again
#define REBOOT 5

// this message only contains the command, a NUL ID and the size
#define FIND_GATEWAYS_SIZE 0x0a
// this message only contains the command, a Mobile-Alert Gateway ID
// and the size
#define FIND_GATEWAY_SIZE 0x0a
// The get config has a 5 extra bytes: an unknown byte (always zero?) and
// the current IP address of the gateway. Both are not used for setting the
// config.
#define GET_CONFIG_SIZE 0xba
#define SET_CONFIG_SIZE 0xb5
// this message only contains the command, a Mobile-Alert Gateway ID
// and the size
#define REBOOT_SIZE 0x0a


static const uint8_t findGatewaysCommand[FIND_GATEWAYS_SIZE] = { FIND_GATEWAYS>>8,FIND_GATEWAYS,  0x00,0x00,0x00,0x00,0x00,0x00, FIND_GATEWAYS_SIZE>>8,FIND_GATEWAYS_SIZE };

const int proxy_server_port = 80;
EthernetServer server(proxy_server_port);

// An EthernetUDP instance to let us send and receive packets over UDP
EthernetUDP Udp;

// If something fails, we reboot the Arduino
static void reboot()
{
#if DEBUG
  Serial.println(F("### REBOOT ###"));
#endif
  wdt_disable();
  wdt_enable(WDTO_15MS);
  while (1) {}
}


#if DEBUG
void printIPAddress()
{
  Serial.print(F("# Local IP address: "));
  for (byte thisByte = 0; thisByte < 4; thisByte++) {
    // print the value of each byte of the IP address:
    Serial.print(Ethernet.localIP()[thisByte], DEC);
    if(thisByte < 3)
      Serial.print('.');
  }
  Serial.println();
}
#endif


void setup() {
#if DEBUG
  Serial.begin(115200);
  Serial.println(F("# Booting"));
#endif

  // start the Ethernet connection:
  if (Ethernet.begin(mac) == 0) {
#if DEBUG
    Serial.println(F("# Failed to configure Ethernet using DHCP"));
#endif
    // no point in carrying on, so do nothing forevermore:
    delay(100);
    reboot();
  }
#if DEBUG
  printIPAddress();
  Serial.println(F("Binding UDP..."));
#endif
  Udp.begin(PORT); // UDP is only used for sending
#if DEBUG
  Serial.println(F("Binding HTTP Proxy..."));
#endif
  server.begin(); // start the HTTP proxy server
#if DEBUG
  Serial.println(F("Binding NTP..."));
#endif
  timeClient.begin();
  delay(500);
}


#if DEBUG
static void PrintHex8(const uint8_t *data, uint8_t length) // prints 8-bit data in hex with leading zeroes
{
    int boffset=0;
    for (int line=0; boffset<length; line++) {
        for (int offset=0; boffset<length && offset<16; ++offset) {
            if ((data[boffset] & 0xf0) == 0x00) {
                Serial.print('0');
            } 
            Serial.print(data[boffset],HEX);
            Serial.print(' ');
            boffset++;
        }
        Serial.println();
    }
}
#endif


// used to switch between Proxy config mode and HTTP Proxy mode
static bool broadcastResponse = false;

void udp_config_server()
{
#if DEBUG
  Serial.println(F("Search Mobile-Alerts Gateway..."));
#endif
  // search for MobileAlert gateways, it should reply with it's configuration
  Udp.beginPacket(BROADCAST_ADDR, PORT);
  Udp.write(findGatewaysCommand, sizeof(findGatewaysCommand));
  Udp.endPacket();
  delay(250);

  // if there's data available, read a packet
  int packetSize = Udp.parsePacket();
  if (packetSize) {
    uint8_t udpPacketBuffer[GET_CONFIG_SIZE];
    Udp.read(udpPacketBuffer, GET_CONFIG_SIZE);
    uint8_t mbBuffer[GET_CONFIG_SIZE];
    memmove(mbBuffer, udpPacketBuffer,  GET_CONFIG_SIZE);
    // did we receive the configuration?
    if(packetSize == GET_CONFIG_SIZE
       && (mbBuffer[0] == (GET_CONFIG>>8)) && (mbBuffer[1] == GET_CONFIG)
       && (mbBuffer[8] == (GET_CONFIG_SIZE>>8)) && (mbBuffer[9] == GET_CONFIG_SIZE)) {
#if DEBUG
      for (int offset=2; offset<8; ++offset) {
          if ((mbBuffer[offset] & 0xf0) == 0x00) {
              Serial.print(' ');
          } 
          Serial.print(mbBuffer[offset],HEX);
      }
      Serial.print(' ');
#endif
      IPAddress remote = Udp.remoteIP();
#if DEBUG
      for (int i = 0; i < 4; i++) {
        Serial.print(remote[i], DEC);
        if (i < 3) {
          Serial.print('.');
        }
      }
      Serial.println();
#endif
      broadcastResponse = true;
      // Is the MobileAlerts gateway already configured correctly (pointing to the Arduino
      // with the correct port)
      IPAddress addr = Ethernet.localIP();
      char addrStr[3*4+3+1];
      sprintf(addrStr, "%d.%d.%d.%d", addr[0], addr[1], addr[2], addr[3]);
      if(!mbBuffer[0x72] // proxy inactive?
        || ((mbBuffer[0xb4]<<8)|mbBuffer[0xb5]) != proxy_server_port // port not matching
        || strncmp(addrStr, (char*)mbBuffer+0x73, strlen(addrStr))) { // server name not matching?
#if DEBUG
        Serial.println(F("# Update Proxy"));
#endif
        // build the set config reply by moving data from the get config
        mbBuffer[1] = SET_CONFIG;
        mbBuffer[9] = SET_CONFIG_SIZE;
        memmove(mbBuffer+0x0a, mbBuffer+0x0f, GET_CONFIG_SIZE-0x0f);
        mbBuffer[0x6d] = true; // proxy on
        strcpy((char*)mbBuffer+0x6e, addrStr);
        mbBuffer[0xaf] = proxy_server_port >> 8;
        mbBuffer[0xb0] = proxy_server_port & 0xff;
        // send the assembled package
        Udp.beginPacket(remote, PORT);
        Udp.write(mbBuffer, SET_CONFIG_SIZE);
        Udp.endPacket();
        // then reboot the MobileAlerts gateway
        mbBuffer[1] = REBOOT;
        mbBuffer[9] = REBOOT_SIZE;
        Udp.beginPacket(remote, PORT);
        Udp.write(mbBuffer, REBOOT_SIZE);
        Udp.endPacket();
      } else {
#if DEBUG
        Serial.println(F("# Found"));
#endif
      }
    }
  }
}

static char udpBuffer[128]; // UDP buffer to send a reply
static char sensorID[6*2+1]; // ASCII string of the MobileAlerts sensor
char floatBuf[10]; // buffer for float to ASCII formatting

void sendUTPpacket() {
  Udp.beginPacket(UDP_DESTINATION, UDP_PORT);
  Udp.write(udpBuffer, strlen(udpBuffer));
  Udp.endPacket();
}

// Format and send a standard temperature
static void sendTemperature(int temp, const char *key)
{
  double tempF;
  // overflow, temperature too hot for the sensor to detect.
  if (temp & 0x2000) tempF = 9999;
  // illegal value from the sensor - sensor not found
  else if (temp & 0x1000) tempF = -9999;
  // negative values: -102.4°C…-0.1°C
  else if (temp & 0x400) tempF = (0x800 - (temp & 0x7ff)) * -0.1;
  // positive values: 0.1°C…102.3°C
  else tempF = (temp & 0x7ff) * 0.1;
  dtostrf(tempF, 4, 1, floatBuf);
#if DEBUG
  Serial.print(key);Serial.print(F(" = "));Serial.println(floatBuf);
#endif
  sprintf(udpBuffer, "%s.%s=%s\n", sensorID, key, floatBuf);
  sendUTPpacket();
}

// Format and send a standard humidity (1% resolution)
static void sendHumidity(int humidity, const char *key)
{
  if(humidity & 0x80)
    humidity = -1;
  else
    humidity &= 0x7f;
#if DEBUG
  Serial.print(key);Serial.print(F(" = "));Serial.println(humidity);
#endif
  sprintf(udpBuffer, "%s.%s=%d\n", sensorID, key, humidity);
  sendUTPpacket();
}

// Format and send a professional sensor humidity (0.1% resolution)
static void sendHumidity01(int humidity, const char *key)
{
  double humidityF = (humidity & 0x3ff) * 0.1;
  dtostrf(humidityF, 4, 1, floatBuf);
#if DEBUG
  Serial.print(key);Serial.print(F(" = "));Serial.println(floatBuf);
#endif
  sprintf(udpBuffer, "%s.%s=%s\n", sensorID, key, humidityF);
  sendUTPpacket();
}

// Format and send the air quality from the Air Quality sensor WL 2000
static void sendAirQuality(int aq, const char *key)
{
  aq &= 0xff;
  if(aq > 79)
    aq = 9999;
  else
    aq = (aq & 0x7f) * 50;
#if DEBUG
  Serial.print(key);Serial.print(F(" = "));Serial.println(aq);
#endif
  sprintf(udpBuffer, "%s.%s=%d\n", sensorID, key, aq);
  sendUTPpacket();
}

// Send an alarm (Water, Rain, Sound or the Door/Window sensor)
static void sendAlarm(int alarm, const char *key)
{
#if DEBUG
  Serial.print(key);Serial.print(F(" = "));Serial.println(alarm);
#endif
  sprintf(udpBuffer, "%s.%s=%d\n", sensorID, key, alarm);
  sendUTPpacket();
}

// Process a full package
static void processPackage(const uint8_t *package)
{
//  PrintHex8(package, 64);
//  uint8_t header = package[0]; // weird unknown header, depends on the type of the sensor
  // seconds since 1.1.1970 - UNIX standard
  unsigned long unixTime = (unsigned long)package[1] << 24L;
  unixTime |= (unsigned long)package[2] << 16L;
  unixTime |= (unsigned long)package[3] << 8L;
  unixTime |= (unsigned long)package[4];
  uint8_t packageLength = package[5]; // length of the package in bytes, up to 63 is possible
  uint8_t sensorType = package[6]; // also: first byte of the sensor ID
  sprintf(sensorID, "%2.2x%2.2x%2.2x%2.2x%2.2x%2.2x", package[6], package[7], package[8], package[9], package[10], package[11]);
#if DEBUG
//  Serial.print(F("Header : 0x"));Serial.println(header, HEX);
  Serial.print(F("SensorID:"));Serial.print(sensorID);
//  Serial.print(F("  UNIXTime:0x"));Serial.print(unixTime, HEX);
//  Serial.print(F("  PackageLength:"));Serial.println(packageLength, DEC);
  Serial.print(F(" RAW:"));PrintHex8(package+12, packageLength-12);
#endif
  // Offset behind the header, where the data starts
  int offset = 14;
  switch(sensorType) {
  case 0x02: // ID02: Temperature sensor
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    break;
  case 0x03: // ID03: Temperature/Humidity sensor
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    sendHumidity((package[offset+2]<<8)|package[offset+3],"humidity");
    break;
  case 0x04: // ID04: Temperature/Humidity/Water Detector sensor
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    sendHumidity((package[offset+2]<<8)|package[offset+3],"humidity");
    sendAlarm((package[offset+4] & 1) == 0,"isWet");
    break;
  case 0x05: // ID05: Air Quality sensor WL 2000 with outside sensor
    sendTemperature((package[offset]<<8)|package[offset+1],"temperatureExt");
    sendTemperature((package[offset+2]<<8)|package[offset+3],"temperature");
    sendHumidity((package[offset+4]<<8)|package[offset+5],"humidity");
    sendAirQuality((package[offset+6]<<8)|package[offset+7],"airquality");
    break;
  case 0x06: // ID06: Temperature/Humidity/Pool sensor
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    sendTemperature((package[offset+2]<<8)|package[offset+3],"waterTemperature");
    sendHumidity((package[offset+4]<<8)|package[offset+5],"humidity");
    break;
  case 0x07: // ID07: Weather Station MA10410
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    sendHumidity((package[offset+2]<<8)|package[offset+3],"humidity");
    sendTemperature((package[offset+4]<<8)|package[offset+5],"temperatureExt");
    sendHumidity((package[offset+6]<<8)|package[offset+7],"humidityExt");
    break;
  case 0x08: // ID08: Rain sensor (not fully supported)
    sendTemperature(((package[offset]<<8)|package[offset+1]) & 0x3fff,"temperatureExt");
    sendAlarm(true, "alarm");
    break;
  case 0x09: // ID09: Pro Temperature/Humidity/Ext.Temperature sensor (MS10320PRO)
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    sendTemperature((package[offset+2]<<8)|package[offset+3],"temperatureExt");
    sendHumidity((package[offset+4]<<8)|package[offset+5],"humidity");
    break;
  case 0x0a: // ID0a: Alarmgeber MA10860 für Gefahrenmelder
    sendAlarm((package[offset] & 0x80) == 0x80, "alarm1");
    sendAlarm((package[offset] & 0x40) == 0x40, "alarm2");
    sendAlarm((package[offset] & 0x20) == 0x20, "alarm3");
    sendAlarm((package[offset] & 0x10) == 0x10, "alarm4");
    break;
//  case 0x0b: // ID0b: Wind sensor (not supported)
//    break;
  case 0x0e: // ID0e: Professional Thermo/Hygro sensor (TFA30.3312.02)
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    sendHumidity01((package[offset+4]<<8)|package[offset+5],"humidity");
    break;
  case 0x0f: // ID0f: Weather Station
    sendTemperature((package[offset]<<8)|package[offset+1],"temperature");
    sendTemperature((package[offset+2]<<8)|package[offset+3],"temperatureExt");
    break;
  case 0x10: // ID10: Door/Window sensor
    sendAlarm((package[offset] & 0x80) == 0x80, "isOpen");
    break;
  case 0x12: // ID12: Humidity Guard (MA10230)
    sendHumidity(package[offset+0],"avg3hhumidity");
    sendHumidity(package[offset+1],"avg24hhumidity");
    sendHumidity(package[offset+2],"avg7dhumidity");
    sendHumidity(package[offset+3],"avg30dhumidity");
    sendTemperature((package[offset+4]<<8)|package[offset+5],"temperature");
    sendHumidity((package[offset+6]<<8)|package[offset+7],"humidity");
    break;
  }
}

uint8_t respBuffer[24] = { 0x00,0x00,0x01,0xa4, 0,0,0,0, 0x5a,0x99,0x70,0x85, 0,0,0,0, 0x17,0x61,0xd4,0x80, 0x00,0x00,0x00,0x0f };
static uint8_t mobileAlertPacket[64];
static char req_str[128];

static void http_proxy_server()
{
  // listen for incoming clients
  EthernetClient client = server.available();
  if (!client) 
    return;
//  Serial.println(F("# Connect"));

  // an http request ends with a blank line
  bool currentLineIsBlank = true;
  int req_str_index = 0;
  long data_length = 0;

  while (client.connected()) 
  {
    if (!client.available())
      continue;
    char c = client.read();
    if(c == '\r') continue; // always ignore CR, the Gateway is guranteed to send CR/LF

    req_str[req_str_index] = c;
    if(req_str_index < sizeof(req_str)-1) {
      req_str_index++;
    }

    if (c == '\n' && currentLineIsBlank) {
      int packetFill = 0;
      while(data_length-- > 0)
      {
        while(client.connected() && !client.available())
          ;
        int val = client.read();
        if(val < 0)
          break;
        mobileAlertPacket[packetFill++] = val;
        // full package received? Then test the checksum
        if(packetFill == 64) {
          char checksum = 0;
          for(int index=0; index<63; ++index) {
            checksum += mobileAlertPacket[index];
          }
          if((checksum & 0x7f) == mobileAlertPacket[63]) { // ignore packages with a defect checksum
            processPackage(mobileAlertPacket);
          }
          packetFill = 0;
        }
      }
#if DEBUG
      if(packetFill == 15) {
        Serial.println(F("# Boot-Up package"));
      } else if(packetFill != 0) {
        Serial.println(F("# Incomplete package"));
      }
#endif
      strcpy(req_str, "HTTP/1.1 200 OK\r\n"
                      "Content-Length: 24\r\n" // the reply is always 24 bytes long
                      "Content-Type: application/octet-stream\r\n"
                      "Connection: close\r\n"
                      "\r\n");
      // the important part is informing the MobileAlerts gateway about the current time
      unsigned long unixtime = timeClient.getEpochTime();
      if(unixtime) {
        respBuffer[8] = (unixtime >> 24) & 0xff;
        respBuffer[9] = (unixtime >> 16) & 0xff;
        respBuffer[10] = (unixtime >> 8) & 0xff;
        respBuffer[11] = unixtime & 0xff;
      } else {
#if DEBUG
        Serial.println(F("NTP missing"));
#endif
      }
      int len = strlen(req_str);
      memcpy(req_str+len, respBuffer, sizeof(respBuffer));
      client.write(req_str, len+sizeof(respBuffer));
      break;
    }

    if (c == '\n') { // you're starting a new line
      currentLineIsBlank = true;
      if(!strncmp(req_str, "Content-Length: ", 16)) {
        req_str[req_str_index] = 0;
        data_length = atol(req_str+16);
      }
      req_str_index = 0;
    } else { // any other character on the current line
      currentLineIsBlank = false;
    }
  }

  // give the web browser time to receive the data
  delay(1);
  // close the connection:
  client.stop();
//  Serial.println(F("# Disconnect"));
}


void loop() {
  timeClient.update();
  if(!broadcastResponse) {
    udp_config_server();
  } else {
    http_proxy_server();
  }
}
