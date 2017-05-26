#!/usr/bin/env node

// Our Proxy server app to receive all data from the Mobile Alerts Gateway

module.exports = function(index) {
  // Find local IPv4 addresses to make the first
  // one our address for the proxy server
  function localIPv4Adresses() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
      if (k.indexOf('ppp') >= 0) {
        continue
      }
      for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
          addresses.push(address.address);
        }
      }
    }
    return addresses;
  }

  // use the first available IPv4 address
  const localIPv4Addresses = localIPv4Adresses();
  return localIPv4Addresses[index];
};
