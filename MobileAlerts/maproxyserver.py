#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
from aiohttp import web
import binascii
import struct
import time
import logging
import masensor

log = logging.getLogger(__name__)

@asyncio.coroutine
def put_request(request):
    http_identify = request.headers['http_identify']
    if not http_identify:
        return web.Response(body=b'http_identify header is missing', status=500, content_type='application/octet-stream')
    serialnumberStr,macStr,requestTypeStr = http_identify.lower().split(':')
    requestType = int(requestTypeStr, 16)

    body = yield from request.content.read()
    try:
        binaryData = binascii.unhexlify(body)  # for debug purposes we allow a hex string to be send
    except:
        binaryData = body

    log.debug('Mobile-Alerts-Gateway: '+macStr)

    if requestType == 0x00: # During boot we only send back the default reply containing the current UTC time
        packageLength,upTime,ID,unknown1,unknown50 = struct.unpack('>BL6sHH', binaryData)
        log.info(packageLength,upTime,ID,unknown1,unknown50)
        pass
    elif requestType == 0xc0: # This request is used to upload sensor data into the cloud
        for package in [binaryData[i:i+64] for i in range(0, len(binaryData), 64)]:
            sensor = masensor.MASensorBase.createSensorObject(package)
            if sensor:
                log.debug('%s - %5d: %s' % (sensor.timestamp, sensor.tx, sensor))
        pass
    else:
        return web.Response(body=b'Wrong request 0x%x type' % requestType, status=500, content_type='application/octet-stream')

    # send a standard reply back to the Gateway.
    #  0.. 3: 420
    #  4.. 7: 0
    #  8..11: UTC seconds since 1.1.1970
    # 12..15: 0
    # 16..19: Monday, 07-Jun-82 08:42:40 UTC - maybe the birthday of the author of the code? He would be 35 years old in 2017.
    # 20..23: 15
    buffer = struct.pack('>LLLLLL', 420, 0, int(time.time()), 0, 0x1761D480, 15)
    return web.Response(body=buffer, status=200, content_type='application/octet-stream')

logging.basicConfig(level=logging.DEBUG)

app = web.Application()
app.router.add_put('/gateway/put', put_request)
web.run_app(app, host='192.168.178.21', port=8080)

#loop = asyncio.get_event_loop()
#f = loop.create_server(app.make_handler(), '127.0.0.1', 8080)
#srv = loop.run_until_complete(f)
#print('serving on', srv.sockets[0].getsockname())
#try:
#    loop.run_forever()
#except KeyboardInterrupt:
#    pass
