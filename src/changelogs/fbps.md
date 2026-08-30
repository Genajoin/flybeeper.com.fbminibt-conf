## Changelog

**Version:** 0.28.3 | **Date:** 30.08.2026 | [**Download**](/firmware/fbps/app_update.0.28.3.bin)

- _Quiet on the ground now follows the ground:_ the reference pressure is re-taken every 10 seconds while you stand, so barometer drift no longer looks like a take-off, and a device switched on down in the valley and carried up to launch treats the launch as the ground after a minute. A take-off is a climb of 2 metres from that reference; a landing is a minute of stillness within half a metre.
- _Over-the-air update made robust:_ the hardware watchdog keeps running through the software reset that starts an update and could fire inside the bootloader's image check right after the swap finished, sending the device back to the old version. Its window is now 6 seconds. On firmware older than this version the configurator installs the update in permanent mode to get past that watchdog.
- _More headroom for updates:_ the Bluetooth transfer buffer was trimmed, which frees 3 KB of memory. Updating takes slightly longer and is more reliable.

**Version:** 0.28.1 | **Date:** 29.08.2026 | [**Download**](/firmware/fbps/app_update.0.28.1.bin)

- _Rebuilt on the shared FlyBeeper firmware base:_ the device now runs the same firmware family as the rest of the line instead of its own separate branch. It keeps its own signing key, so this update installs over the air on units already in the field, and firmware from other FlyBeeper devices still cannot be flashed onto it by mistake.
- _Power off by double reset:_ two presses of the button with about a second between them switch the device off; a single press turns it back on. The window flag now only counts a press of the button itself, so inserting a fresh battery can no longer switch the device off right after it starts.
- _Faster to find:_ after power-on or a button press the device advertises rapidly for 30 seconds, then settles into the economical 1.28 s interval — roughly two years from a CR2032.
- _Pressure output without extra lag:_ the Butterworth filter is disabled on this device. It exists for computing vario by differentiation; a device that only reports pressure gained nothing from it but delay. Median filtering and averaging before each notification remain.

**Version:** 0.04 | **Date:** 19.05.2024 | [**Download**](/firmware/fbps/app_update.0.4.0.bin)

- _Hibernate mode:_ Mode for transportation and long-term storage. For hardware 0.4+ double-clicking the reset button with a pause of 1-2 seconds between clicks switch the device into deep sleep and stops sending advertisements. The device is no longer available for connection. To put the device into operating mode, you must press the reset button once again.
- _Bugfix battery life:_ For some unknown reason, the BLE connection mode (firmware 0.03) did not execute the command to switch to the mode of rarely sending advertising packets. Advertising packets were sent with very high frequency providing instant detection on the one hand, but drained the battery very quickly while waiting for a connection. Fixed. The radio power has also been slightly reduced, which will also reduce power consumption and slightly reduce the detection radius.

**Version:** 0.03 | **Date:** 07.05.2024 | ⚠️**WARNING** ⚠️contains a bug

- _BLE connect mode:_ Faster Bluetooth connection immediately after turning on the power or press _reset_ button or after disconnecting. The mode is active for 5 minutes. Allows you to quickly find a device or reconnect.
- _Bugfix pressure sensor:_ The device turns on, but the pressure is read as 0. Added delay for sensor preparation.
- _Increasing battery life:_ - disabling unused MC features.

**Version:** 0.02 | **Date:** 12.02.2024 | [**Download**](/firmware/fbps/app_update.0.2.0.bin)

- _Battery voltage by bluetooth:_ New battery characteristic available to notify.
