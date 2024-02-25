# FlyBeeper True Air Speed

## Manual

### Operating Modes

The device operates in two modes. The first is the Bluetooth standby mode. Every 5 seconds, the device sends an advertising packet, thanks to which it can be detected for connection initialization. Between advertising packets, the device is in sleep mode. As soon as the device receives a connection request, periodic battery level measurement is activated. Connection does not require a pairing procedure. After establishing a connection, you can read the battery level and subscribe to changes in sensor values. In the latter case, periodic reading of data from the necessary sensors is activated. The device is in sleep mode between intervals. When Bluetooth connection is disconnected, the device returns to standby mode with periodic transmission of advertising packets.

### Control

The device has no controls except for the reset button. The device is always ready to connect.

### Settings

You can test the device through the graphical interface. You need a device with Bluetooth, such as a smartphone, laptop, or PC with Bluetooth. Click Connect and select FBTAS from the list. Keep the devices as close as possible to each other.

Currently, the device does not have available settings, but in future firmware updates, there will be an opportunity to change the sensor polling frequency and data transmission frequency.

<router-link to="/devices/fbtas">BACK</router-link>
