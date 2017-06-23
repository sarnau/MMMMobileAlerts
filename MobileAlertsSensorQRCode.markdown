# QR Code on the sensors

Every sensor has a QR Code printed on it, or in the box (for the small window sensors), it looks like this one:

![QR Code](qrcode.png)

It contains three lines of ASCII text, with the lines separated by CR (ASCII 13):

1. serial number of the sensor
2. production date (day.month.year)
3. product name or version number.

Here is a small sample code that generates the QR Code:

```
    #!/usr/bin/python

    import qrcode

    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )

    sensorID = '091234567890'           # [0-9A-F]{12}
    productionDate = '01.02.2015'       # "dd.MM.yyyy"
    productCode = 'MA10320/103300'

    qr.add_data('\r'.join([sensorID,productionDate,productCode]))
    #qr.add_data('0A1234567890\r01.01.2015\rMA10860')
    #qr.add_data('031234567890\r01.01.2015\rMA10200/10210')
    #qr.add_data('101234567890\r01.01.2015\rV05i')
    qr.make(fit=True)

    img = qr.make_image()
    img.save("qrcode.png","PNG")
```
