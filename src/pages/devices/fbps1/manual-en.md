# FlyBeeper Pressure Sensor

## Manual

### Control

The device has no controls. After installing the power battery, the device is ready for connection. Reset is done by briefly removing the battery.

### Operating Modes

The device operates in two modes. Immediately after installing the battery, the device enters Bluetooth connection standby mode. Every 5 seconds, the device broadcasts an advertising packet, allowing it to be detected for connection initiation. During intervals between advertising packets, the device sleeps. Once the device receives a connection request, periodic battery level measurement is activated. Connection does not require a pairing procedure. After establishing a connection, the battery level can be read, and subscription to changes in atmospheric pressure can be made. In the latter case, periodic reading of data from the barometric sensor is activated at a frequency of 40 times per second. The data is filtered, smoothed, and sent to the subscriber 10 times per second. During intervals, the device sleeps. Upon disconnecting the Bluetooth connection, the device returns to the standby mode with periodic broadcasting of advertising packets.

### Configuration

You can test the device through the graphical interface. You need device with Bluetooth, such as a smartphone, laptop, or computer with a Bluetooth module. Press Connect and select FbPs1 from the list. Keep the devices as close to each other as possible.

At the current point, the device does not have accessible settings, but new firmware updates will include the ability to change the sensor polling frequency and data transmission frequency.

<router-link to="/devices/fbps1">BACK</router-link>
