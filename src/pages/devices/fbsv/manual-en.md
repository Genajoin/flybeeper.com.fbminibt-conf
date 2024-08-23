# FlyBeeper Sun Vario

## Manual

### Device Operation Modes

The device operates in four modes:

#### Connection Standby Mode

As soon as the battery voltage exceeds the minimum level, the device turns on and enters the Bluetooth connection standby mode.
Every 5 seconds, the device sends an advertising packet, allowing it to be discovered for connection initialization.
Between advertising packets, the device is in sleep mode.

#### External Pressure Sensor Mode

Bluetooth connection does not require pairing. The device name in the Bluetooth scan list starts with `FBSV`.
As soon as the device receives a connection request, periodic battery level measurement is activated and the LED starts blinking.
After establishing a connection, it is possible to read the battery level and subscribe to atmospheric pressure changes.
In the latter case, periodic reading of the barometric sensor data is activated at a frequency of 40 times per second.
The data is filtered, smoothed, and sent to the subscriber 10 times per second. In between, the device is in sleep mode.
When the Bluetooth connection is disconnected, the device returns to standby mode with periodic transmission of advertising packets.

#### Sound Variometer Mode

By pressing and holding the button, the device plays a melody and enters the sound variometer mode.
A single press of the button changes the volume level. There are 3 levels in total.
A double press and hold plays a melody, and the device enters silent mode.

#### Transportation Mode

For cases where the charge level is still high, but it is necessary to completely turn off the device, for example,
for air transportation. On the back panel, find the hole for the `Reset` button.
Press once and, 2 seconds after the LED blinks once, press again. To exit the mode, press the `Reset` button once.

### List of Flight Programs with Direct Support

- xcTrack v.0.9.11.10+
- SeeYou Navigator v.3.0.6+
- LK8000 v.7.4.19+
- Flyskyhy v.8.2+
- FlyMe
- TheFlightVario XC 2.38+
- maps.flybeeper.com

### Communication Protocol Description

This section is intended more for developers than for regular users.

The device operates using the BLE protocol without pairing and authorization. Changes to each parameter are available via subscription (descriptor 0x2902). All non-standard parameters have 128-bit UUIDs, descriptor 0x2901 with a textual parameter name, and descriptor 0x2904 with a description of the format, exponent, and unit of measurement. For convenience, their values are listed in the tables below.

Characteristics UUID for service `0x181A` ESS

| Name     | UUID   | Size   | Exponent | Unit   |
| -------- | ------ | ------ | -------- | ------ |
| Pressure | 0x2a6d | UINT32 | -1       | Pascal |

Characteristics UUID for service `0x180F` BAS

| Name            | UUID                                 | Size  | Exponent | Unit    |
| --------------- | ------------------------------------ | ----- | -------- | ------- |
| Battery level   | 0x2a19                               | UINT8 | 0        | Percent |
| Battery voltage | b0c889e8-16d2-45ef-b615-387f6bca2370 | INT16 | -3       | Volt    |

Characteristics UUID for service `0x180A` DevInfo

| Name              | UUID   | Size   | Value     |
| ----------------- | ------ | ------ | --------- |
| Model Number      | 0x2A24 | STRING | FBPS      |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.01      |

<router-link to="/devices/fbminibt">BACK</router-link>
