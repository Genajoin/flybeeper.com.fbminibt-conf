# FlyBeeper Remote Control 4

<a btn href="https://flybeeper.com/fbrc4/app_update.0.05.bin" download>Download last firmware</a>
<TheUpdate />

## Changelog

**Version:** 0.05 | **Date:** 01.06.2024 | [**Download**](https://flybeeper.com/fbrc4/app_update.0.05.bin)

- _Dynamic Tx power control:_ The application implements a peripheral advertising with varying Tx power. It is a repeatedly descending staircase pattern ranging from -4 dBm to -20 dBm where the Tx power levels decrease every 10s. Upon successful connection, the connection RSSI strength is being monitored and the Tx power of the peripheral device is modulated per connection accordingly such that energy is being saved depending on how powerful the RSSI of the connection is.
- _BLE connect mode:_ Faster Bluetooth connection immediately after turning on the power or after disconnecting the connection. The mode is active for 2 minutes. Allows you to quickly find a device or reconnect.
- _Deactivate HID keyboard:_ Config option. Allow you to use buttons as HID keyboard in operating system. Requires binding. HID active by default.
- _System update:_ The operating system update. Oh yes, a RTOS operates inside this small device.

**Version:** 0.04 | **Date:** 12.02.2024 | [**Download**](https://flybeeper.com/fbrc4/app_update.0.04.bin)

- _Battery voltage by bluetooth:_ New battery characteristic available to notify.
