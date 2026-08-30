## Changelog

**Version:** 0.28.3 | **Date:** 30.08.2026 | [**Download**](/firmware/fbfv/app_update.0.28.3.bin)

- _Over-the-air update fixed:_ versions 0.28.1 and 0.28.2 could not be installed on this device over the air — the file was transferred, the new firmware started, and the device came back on the old version. Two separate causes, both fixed: memory was full to the brim after the ADS-L module was enabled and the firmware could not write its own confirmation (3 KB freed); and the hardware watchdog, which keeps running through the software reset that starts an update, fired inside the bootloader's image check right after the swap finished. The watchdog window is now 6 seconds. On firmware older than this version the configurator installs the update in permanent mode to get past that watchdog.
- _Quiet on the ground now follows the ground:_ the reference pressure is re-taken every 10 seconds while you stand, so barometer drift no longer looks like a take-off, and a device switched on down in the valley and carried up to launch treats the launch as the ground after a minute. A take-off is a climb of 2 metres from that reference; a landing is a minute of stillness within half a metre.
- _FANET v2 command channel:_ a dedicated Bluetooth service for the app — transmit with a tag and confirmation, region profile (EU868), power, counters, and RSSI/SNR of received frames. The v1 channel is unchanged.
- _ADS-L transmission:_ scheduled transmission in the Direct slot by the device's UTC clock, with listen-before-talk and channel alternation. Our frames are now seen by third-party receivers — the sync word was missing its leading byte and other equipment ignored us.
- _Radio ownership:_ receive commands no longer reconfigure the chip on top of an active ADS-L transmission (subscribing, reconnecting or sleeping during one).
- _Correct FANET coordinates:_ the decoder now follows the specification exactly.
- _No self switch-off after an update:_ the double-reset window now only counts a press of the button. The reboot that follows an over-the-air update is a software one, and it could previously be mistaken for a button press — a device could go to sleep by itself right after updating.

**Version:** 0.26.0 | **Date:** 19.08.2026 | [**Download**](/firmware/fbfv/app_update.0.26.0.bin)

- _Power-on confirmation now actually works:_ A short press could still switch the device on. The hold check ran only after the radio stack was up — by then a brief touch was long over and the device booted as if the button had never been checked. The device now recognises a button wake-up from the hardware reset reason, so a touch shorter than the hold is refused and it goes straight back to sleep.
- _Ticks during the power-on hold are audible again:_ The buzzer got its volume setting only after the countdown had finished, so the amplifier stayed silent while you were holding the button.
- _Lower idle current:_ The internal DC/DC regulator of the nRF52 is now enabled. Measured on a live device: 298 → 236 µA, 21 % less. The choke has been on the board from the start; the firmware had simply never switched the regulator on.
- _Barometer polling follows the volume:_ The sensor stops being polled when the sound is off and nobody is subscribed. Polling the barometer is the single most expensive thing the device does, and it no longer runs for nothing.
- _Battery reading:_ Refreshed every 5 minutes instead of every 10 while connected.
- _Auto power-off floor:_ The inactivity timeout can no longer be set below 5 minutes.

**Version:** 0.24.0 | **Date:** 27.07.2026 | [**Download**](/firmware/fbfv/app_update.0.24.0.bin)

- _Power-on confirmation:_ The device powers on only after the button is held for 3 seconds — an accidental touch in a pocket no longer wakes it. The hold is accompanied by ticks with a rising rate, so you hear how much longer to hold. Release earlier and the device goes straight back to sleep.
- _Audible feedback while holding:_ Ticks during the button hold and during boot. The LED sits right next to the button and gets covered by your finger, so the countdown is duplicated by sound.
- _Long-press cancel:_ Release the button after the ticks have started and the volume no longer switches. Previously you got a volume change while reaching to switch the device off and changing your mind.
- _Smooth melodies:_ The power-on and power-off melodies no longer break up. They used to be interrupted by flash writes (settings save, image confirm), which stall the CPU on nRF52.
- _Reliable power-off:_ The buzzer is stopped synchronously right before deep sleep. An unfinished melody can no longer keep the device awake with the PWM running — the state where it looked switched off but kept draining the battery.
- _Auto power-off by inactivity:_ Configurable timeout — the device switches itself off when it is neither connected nor touched. 0 disables it.
- _Long-press modes:_ What a long press does is decided by the "Bluetooth never sleep" setting: full power-off, or "go silent but keep advertising" so the device is revived by simply reconnecting.
- _Faster connection:_ The Bluetooth advertising interval in the economical mode is down from 3.5 s to 1.28 s, and after power-on, a disconnect or a button press the device advertises at 100–150 ms for 30 seconds. Phones find it noticeably faster.
- _Radio and Bluetooth stability:_ Outgoing notifications moved to a dedicated queue. A sleeping phone on a degraded link could previously stall the whole Bluetooth stack — the device looked frozen with the LED stuck on until reconnect.
- _LED indication fix:_ The receive LED no longer stays lit after a disconnect.
- _Update protection:_ The build no longer publishes images that are unsuitable for over-the-air updates.
