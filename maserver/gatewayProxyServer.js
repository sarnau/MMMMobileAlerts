#!/usr/bin/env node

// Our Proxy server as an express app to receive all data from the
// Mobile Alerts Gateway.
// Each received package is forwarded into the processSensorData function

module.exports = function(localIPv4Adress,proxyServerPort
                         ,logfile,processSensorData) {

  const express = require('express');
  const bodyParser = require('body-parser');
  const getRawBody = require('raw-body');
  const fs = require('fs');

  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));

  // send a standard reply back to the Gateway.
  function sendReplyPackageFromServer(data,res) {

    var buf = new Buffer(24);
    buf.writeUInt32BE(420, 0);
    buf.writeUInt32BE(0, 4);
    // UTC seconds since 1.1.1970
    buf.writeUInt32BE(Math.floor(Date.now() / 1000), 8);
    buf.writeUInt32BE(0, 12);
    // Monday, 07-Jun-82 08:42:40 UTC - maybe the birthday of the author
    // of the code? He would be 35 years old in 2017.
    buf.writeUInt32BE(0x1761D480, 16);
    buf.writeUInt32BE(15, 20);

    res.status(200) // HTTP OK Status
    res.setHeader('content-type', 'application/octet-stream');
    res.end(buf);
  }

  // handle sensor data
  function processSensorDataByServer(data,res) {
    const sensorBlockSize = data.length;
    // each package is exactly 64 bytes long, including the checksum
    const packageSize = 64;

    // one data block can contain several sensor packages.
    for (var offset = 0; offset < sensorBlockSize; offset += packageSize) {
    // log all packages in a logfile as a whole for future debugging
    if(logfile) {
      fs.appendFile(logfile, data.toString('hex', offset, offset + packageSize)
                                           + '\n', function (err) { });
    }

    // The 64-byte package has a 7-bit checksum,
    // which is stored in the last byte
    calcChecksum = 0;
    for (var index=0; index<packageSize-1; index++) {
      calcChecksum += data.readUInt8(offset + index);
    }
    if((calcChecksum & 0x7f) != data.readUInt8(offset + packageSize - 1)) {
      console.log('### Checksum error: ',data.toString('hex', offset,
                                                      offset + packageSize));
      // The Cloud Server seems to ignore a wrong checksum and simply
      // returns 200 OK.
      // This avoids resending the same broken package over-and-over again
      // by the gateway. The server will still have to ignore the package.
      continue
    }

    if(processSensorData) {
      const sensorDataBuf = new Buffer(packageSize);
      data.copy(sensorDataBuf, 0, offset, offset+packageSize);
      processSensorData(sensorDataBuf);
    }
    }
    // confirm to the gateway, that we successfully received the sensor data.
    // Without doing that, the gateway will send more and more date every time.
    sendReplyPackageFromServer(data,res);
  }

  // Register the PUT request
  app.put('/gateway/put', function(req, res) {
    if(!req.headers.http_identify) {
      res.status(400)   // HTTP Bad Request Status
      res.end('http_identify header is missing');
      return;
    }

    const headerData = req.headers.http_identify.toLowerCase().split(':');
    const gatewayInfo = { serialnumber: headerData[0]
                        , mac: headerData[1]
                        , requestType: parseInt(headerData[2],16) };

    getRawBody(req, { length: req.headers['content-length'] }
      , function(err, buf) {
      if(err) {
      res.status(500);
      return;
      }
      switch (gatewayInfo.requestType) {
      case 0x00:  // During boot we only send back the default
                  // reply containing the current UTC time
        const bootRecord = {
          packageLength: buf.readUInt8(0),   // package length (15 bytes)
          upTime: buf.readUInt32BE(1),       // number of seconds since power-up
          ID: buf.toString('hex', 5, 11).toLowerCase(),  // ID of the gateway
          unknown1: buf.readUInt16BE(11),    // always 1?
          unknown50: buf.readUInt16BE(13),   // always 50?
        };
        sendReplyPackageFromServer(buf,res);
        break;
      case 0xC0:  // This request is used to upload sensor data into the cloud
        processSensorDataByServer(buf,res);
        break;
      }
    });
  });

  app.listen(proxyServerPort, localIPv4Adress, function() { });
  return app;
};
