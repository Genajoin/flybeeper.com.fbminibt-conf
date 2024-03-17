# FlyBeeper mini BT

<a btn href="https://flybeeper.com/minibt/app_update.0.16.bin" download>Download last firmware</a>

## Changelog

**Version:** x.xx | **Date:** in the future | Use [polling](https://t.me/flybeeperchat/32) to vote for your favorite new feature

- _Bluetooth never sleep:_ Config option allowing the application to connect at any time without touch interaction with the device. The device switches to active mode after Bluetooth connection and goes back to passive mode after disconnection. It sends advertising every 5 seconds in passive mode. Battery life is 4 years in passive mode. The device is always ready.
- _Decrease pressure sensor polling frequency:_ In silent mode to increase battery life.
- _Automatically reduce the buzzer volume:_ When the ambient temperature drops to zero to reduce current consumption and prevent shutdown.
- _Set correction factor for ambient temperature:_ For correct calculation of residual battery capacity.

**Version:** 0.17 | **Date:** 18.03.2024 | [**Download**](https://flybeeper.com/minibt/app_update.0.17.bin)

- _Optimization of the buzzer volume setting mode:_ Reducing battery consumption by 20% during pauses between beeps.
- _Duplication pressure data via UART emulation:_ New config option. Pressure data is transmitted through two BLE characteristics. The main characteristic is the ESS service. Reserve - emulation UART. If an application subscribes to both characteristics, then no data is sent through the UART emulation to avoid data duplication. However, some applications subscribe to all possible data transfer characteristics, but only use data from the UART emulation characteristic. For such programs, you must activate this option. The default is disabled.

**Version:** 0.16 | **Date:** 19.02.2024 | [**Download**](https://flybeeper.com/minibt/app_update.0.16.bin)

- _Battery voltage by bluetooth:_ New battery characteristic available to notify.
- _Stop battery charge measurement:_ Reduce power consumption in off mode and bluetooth disconnected mode.
- _Double filtration:_ The first filter on pressure, the second on vario. The result is a smoother pressure output via Bluetooth.
- _Vario by bluetooth:_ New vario characteristic available to notify.
- _Vario averaging time:_ Config option. Smoothing response vario to pressure changes. Has no effect on pressure data (vario only).
- _Power off timeout:_ Config option. The time after which the device will automatically turn off.
- _New settings storage:_ A unified settings system for all FlyBeeper devices.
- _Deactivate HID keyboard:_ Config option. Highly recommend set this checkbox if you not use buttons now. HID keyboard is deprecated.
- _Default buzzer curves changed:_ More duty in sinking.
- _Fix duplication data:_ Stopping data transfer via Nordic UART service if app subscribe to ESS. Eliminates duplication of data in xcTrack. Reduces energy consumption.

**Version:** 0.15 | **Date:** -- | beta testing fail

**Version:** 0.14 | **Date:** 28.12.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.14.bin)

- _Play power on sound immediately after timeout:_ Not wait button release.
- _Silent on ground mode:_ Config option. Change altitude on 1.5 meters activate vario sound.
- _Led blinking frequency by vario:_ Config option.

**Version:** 0.13 | **Date:** 15.12.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.13.bin)

- _Support SPL06 pressure sensor:_ For hardware version 1.6. Precision 2 cm.
- _Fast method of altitude calculation:_ By table.
- _Block hardware buttons normal functionality:_ Only if BT paired and HID keyboard active; BT connected and AIO service notification started.
- _Long press 3 second power on:_ Instead of double click and hold. To easily turn on the power. Fix power on by click once.

**Version:** 0.12 | **Date:** 12.11.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.12.bin)

- _Bluetooth pairing process fix:_ The device is paired once. To pair with another device, you need to remove and reinsert the battery.
- _Buttons press:_ Beep.

**Version:** 0.11 | **Date:** 11.10.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.11.bin)

- _Battery discharge curve fix._
- _Buttons freeze fix._

**Version:** 0.10 | **Date:** 30.09.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.10.bin)

- _Turn on the power with a round button:_ Short press, pause for 1 second until the LED goes out, press again and hold for more than 1 second until the sound signal sounds.
- _Turn off the power by holding the round button:_ For more than 2.5 seconds until the sound signal.
- _LED indication of Power On/Off mode._
- _Saving pairing information._

**Version:** 0.09 | **Date:** 28.09.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.9.bin)

- _HID keyboard._
- _Keyless authorization by power button._
- _Ringtones:_ Connected, disconnected, paired, cancel.
- _Volume control by buttons:_ Up and down.

**Version:** 0.08 | **Date:** 26.09.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.8.bin)

- _Zero mode climb and sink._
- _Set volume via web-app fix._

**Version:** 0.07 | **Date:** 23.09.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.7.bin)

- _Settings structure._
- _Table approximation fix._
- _POV format fix._

**Version:** 0.06 | **Date:** 20.09.2023 | [**Download**](https://flybeeper.com/minibt/app_update.0.6.bin)

- _BLE settings._
- _MD filter._
- _Simulation._
