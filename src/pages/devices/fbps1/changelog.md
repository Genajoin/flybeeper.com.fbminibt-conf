# FlyBeeper Pressure Sensor

<a btn href="https://flybeeper.com/fbps1/app_update.0.04.bin" download>Download last firmware</a>
<TheUpdate />

## Changelog

**Version:** 0.04 | **Date:** 19.05.2024 | [**Download**](https://flybeeper.com/fbps1/app_update.0.04.bin)

- _Hibernate mode:_ Mode for transportation and long-term storage. For hardware 0.4+ double-clicking the reset button with a pause of 1-2 seconds between clicks switch the device into deep sleep and stops sending advertisements. The device is no longer available for connection. To put the device into operating mode, you must press the reset button once again.
- _Bugfix battery life:_ For some unknown reason, the BLE connection mode (firmware 0.03) did not execute the command to switch to the mode of rarely sending advertising packets. Advertising packets were sent with very high frequency providing instant detection on the one hand, but drained the battery very quickly while waiting for a connection. Fixed. The radio power has also been slightly reduced, which will also reduce power consumption and slightly reduce the detection radius.

**Version:** 0.03 | **Date:** 07.05.2024 | ⚠️**WARNING** ⚠️contains a bug

- _BLE connect mode:_ Faster Bluetooth connection immediately after turning on the power or press _reset_ button or after disconnecting. The mode is active for 5 minutes. Allows you to quickly find a device or reconnect.
- _Bugfix pressure sensor:_ The device turns on, but the pressure is read as 0. Added delay for sensor preparation.
- _Increasing battery life:_ - disabling unused MC features.

**Version:** 0.02 | **Date:** 12.02.2024 | [**Download**](https://flybeeper.com/fbps1/app_update.0.02.bin)

- _Battery voltage by bluetooth:_ New battery characteristic available to notify.
