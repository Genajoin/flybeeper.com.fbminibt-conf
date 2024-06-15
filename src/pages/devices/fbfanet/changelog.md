# FlyBeeper FANET

<a btn href="https://flybeeper.com/fbfanet/app_update.0.02.bin" download>Download last firmware</a>
<TheUpdate />

## Changelog

**Version:** 0.02 | **Date:** 11.06.2024 | [**Download**](https://flybeeper.com/fbfanet/app_update.0.02.bin)

- _FANET UART protocol:_ Added data transfer protocols via serial connection emulation. Allows you to display information about FANET traffic on application maps that support one of the following protocols FNNGB, FBFAN and FNF.
- _Hibernate mode:_ Mode for transportation and long-term storage. Double-clicking the reset button with a pause of 1-2 seconds between clicks switch the device into deep sleep and stops sending advertisements. The device is no longer available for connection. To put the device into operating mode, you must press the reset button once again.
- _Increased battery life:_ Reduced the number of Bluetooth advertising packets sent. The total battery life according to the real test is more than 200 hours at maximum volume and without BLE connection.
- _BLE connect mode:_ Faster Bluetooth connection immediately after turning on the power or after disconnecting the connection. The mode is active for 5 minutes. Allows you to quickly find a device or reconnect.
- _System update:_ The operating system update. Oh yes, a RTOS operates inside this small device.

**Version:** 0.01 | **Date:** 07.05.2024 | [**Download**](https://flybeeper.com/fbfanet/app_update.0.01.bin)

- _Send and receive radio packets:_ The device can notify via bluetooth a new received radio packet. You can write via bluetooth a byte array to send it via the radio.
- _User defined radio settings:_ frequency, data rate, coding rate, bandwidth, TX power.
- _Battery life:_ - Notification the percent of battery life via bluetooth.
