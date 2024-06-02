# FlyBeeper Remote Control 4

## Instructions

### Operating Modes

The device operates in several modes.

**First Mode: Bluetooth Standby**

In this mode, the device sends an advertising packet every 4 seconds, allowing it to be detected for connection initialization. Between advertising packets, the device remains in sleep mode. The duration of this mode is limited only by the battery level. The power consumption is minimal, allowing the device to operate in this mode throughout the entire flying season.

**Second Mode: Active Connection**

When the device receives a connection request, it activates the second mode. The device name is FBRC4. Once connected, it is possible to read the battery level and subscribe to sensor value changes. In this case, periodic data reading from the necessary sensors is activated. The device remains in sleep mode between intervals. When the Bluetooth connection is disconnected, the device returns to standby mode with periodic advertising packet transmission.

**Reconnection Mode**

If the connection is lost, the device switches to a mode with an increased frequency of advertising packets for a few minutes, enabling a quick reconnection. This mode also activates immediately after changing the battery. This can be used to expedite the first connection procedure in your application.

### Controls

The device features 4 tactile buttons, which are solely used to transmit their state. These buttons do not control the device itself. To reset the device, briefly remove the battery.

When the battery is removed, the paired device information in HID keyboard mode is also reset. The pairing process needs to be repeated, and the device should be unpaired on the smartphone first. This is also the method to re-pair with another smartphone/tablet/PC.

### Configuration

You can test the device through the graphical interface of the [configurator](https://fbminibt-conf.flybeeper.com/settings). You need a Bluetooth-enabled device, such as a smartphone, laptop, or PC with a Bluetooth module. Click `Connect` and select `FBRC4` from the list. Keep the devices as close to each other as possible. On the `cockpit` page, you can see changes when pressing the FBRC4 buttons. On the `settings` page, you can find and modify the following settings:

- `hid_keyboard_off`: This is the external HID keyboard mode. After changing this setting and pressing `Apply`, you need to remove and reinsert the battery. If this flag is not set, HID will be activated, and the connection will require the standard device pairing procedure through the operating system interface. Remember, the device never turns off. You need to manually disconnect through the operating system interface after use. Otherwise, the operating system will keep the connection open and reconnect if it is lost, gradually draining the battery. If your application supports reading button states through the AIOS service, HID should be disabled by activating this setting. This will extend battery life.

- `char_button1,2,3,4`: These are the HID button codes for each of the buttons in HID keyboard mode. By default, the buttons are assigned the key codes F1, F2, F3, and F4.
  HID key codes do not correspond to ASCII codes. For code references, see tables 5 and 6 in the [Bluetooth HID Profile](https://cdn.sparkfun.com/datasheets/Wireless/Bluetooth/RN-HID-User-Guide-v1.0r.pdf).

### List of flight programs

- xcTrack (HID)
- xcSoar (HID)
- LK8000 (HID)

### Communication Protocol Description

This section is intended more for developers than for regular users.

The device operates using the BLE protocol. Pairing and authorization are required only if the `hid_keyboard_off` setting is not active. Changes to each parameter are available via subscription (descriptor 0x2902). All custom parameters have a 128-bit UUID, descriptor 0x2901 with the parameter's text name, and 0x2904 with the description of the format, exponent, and unit of measurement. For convenience, their values are listed in the tables below.

Characteristics UUID of the service `0x1815` AIOS. The device has 4 buttons. This is defined in descriptor 0x2909 Number of Digitals. Each two bits represent the state of one button starting from the least significant bit. 0b00000001 means button 1 is pressed; if all buttons are pressed simultaneously, the value will be 0b01010101. This means the entire array fits in one byte. Only the states 0b00 (released) and 0b01 (pressed) are used. For more information about the states, see the Automation IO Service 1.0 Specification (section 3.1.1). Notifications are sent on change, meaning a separate notification for pressing and releasing a button. This allows for detecting long clicks, double clicks, and simultaneous holding of multiple buttons.

| Name    | UUID   | Size        |
| ------- | ------ | ----------- |
| Buttons | 0x2A56 | UINT8 array |

Characteristics UUID for service `0x180F` BAS

| Name            | UUID                                 | Size  | Exponent | Unit    |
| --------------- | ------------------------------------ | ----- | -------- | ------- |
| Battery level   | 0x2a19                               | UINT8 | 0        | Percent |
| Battery voltage | b0c889e8-16d2-45ef-b615-387f6bca2370 | INT16 | -3       | Volt    |

Characteristics UUID for service `0x180A` DevInfo

| Name              | UUID   | Size   | Value     |
| ----------------- | ------ | ------ | --------- |
| Model Number      | 0x2A24 | STRING | FBRC4     |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.01      |

The device settings are available for reading and writing in the service 904baf04-5814-11ee-8c99-0242ac120000. Each setting has an individual 128-bit UUID and descriptors 0x2901 and 0x2904.

| Name             | UUID                                 | Size  | Value | Unit    |
| ---------------- | ------------------------------------ | ----- | ----- | ------- |
| hid_keyboard_off | 86591053-2856-4f25-a35c-b753f0deea8f | UINT8 | 0     | Boolean |
| char_button1     | ee5e99d1-6d7d-4d5a-9aaf-f76be25a6db8 | UINT8 | 0x3A  | keychar |
| char_button2     | 221af4c6-0695-4e21-ba9b-12fdd6612800 | UINT8 | 0x3B  | keychar |
| char_button3     | 46cbd27b-57d8-421c-8ff6-9ec75e3515d4 | UINT8 | 0x3C  | keychar |
| char_button4     | 5b975063-9256-4bdf-bd8c-d6c1688902d2 | UINT8 | 0x3D  | keychar |

<router-link to="/devices/fbrc4">BACK</router-link>
