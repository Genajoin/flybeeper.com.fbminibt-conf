# FlyBeeper Remote Control 4

## Manual

### Operating Modes

The device operates in two modes. Immediately after installing the battery, the device enters Bluetooth standby mode. Every 5 seconds, the device sends an advertising packet, thanks to which it can be detected for connection initialization. Between advertising packets, the device is in sleep mode. As soon as the device receives a connection request, periodic battery level measurement is activated. Connection does not require a pairing procedure. After establishing a connection, you can read the battery level and subscribe to button state changes. When Bluetooth connection is disconnected, the device returns to standby mode with periodic transmission of advertising packets.

### Controls

The device has 4 tactile buttons, but they are only used to transmit their state. Buttons do not affect standby mode and do not control the device itself. The device can be reset by briefly removing the battery.

### Configuration

You can test the device through the graphical interface. You need device with Bluetooth, such as a smartphone, laptop, or PC with Bluetooth. Click Connect and select FbPs1 from the list. Keep the devices as close as possible.

Currently, the device does not have available settings. However, in future firmware updates, there will be an option to activate HID mode, which is supported by a large amount of software but requires a higher level of connection, including the pairing procedure.

<router-link to="/devices/fbrc4">BACK</router-link>
