## Changelog

**Version:** 0.28.3 | **Date:** 30.08.2026 | [**Download**](/firmware/fbsv/app_update.0.28.3.bin)

- _Quiet on the ground now follows the ground:_ the reference pressure is re-taken every 10 seconds while you stand, so barometer drift no longer looks like a take-off, and a device switched on down in the valley and carried up to launch treats the launch as the ground after a minute. A take-off is a climb of 2 metres from that reference; a landing is a minute of stillness within half a metre.
- _Over-the-air update made robust:_ the hardware watchdog keeps running through the software reset that starts an update and could fire inside the bootloader's image check right after the swap finished, sending the device back to the old version. Its window is now 6 seconds. On firmware older than this version the configurator installs the update in permanent mode to get past that watchdog.
- _More headroom for updates:_ the Bluetooth transfer buffer was trimmed, which frees 3 KB of memory. Updating takes slightly longer and is more reliable.
- _"Silent on the ground" now really is silent:_ the setting used to stop the vario from being updated instead of muting the sound, so the last value stayed frozen and the buzzer kept sounding it. After landing on a descent the device would keep beeping descent without stopping. Now the sound is muted while the readings continue as usual.
- _No self switch-off after an update:_ the double-reset window now only counts a press of the button. The reboot that follows an over-the-air update is a software one, and it could previously be mistaken for a button press — a device could go to sleep by itself right after updating.

**Version:** 0.26.0 | **Date:** 19.08.2026 | [**Download**](/firmware/fbsv/app_update.0.26.0.bin)

- _Power-on confirmation:_ The device powers on only after the button is held for 3 seconds — an accidental touch in a pocket no longer wakes it. The hold is accompanied by ticks with a rising rate, so you hear how much longer to hold. Release earlier and the device goes straight back to sleep.
- _Lower idle current:_ The internal DC/DC regulator of the nRF52 is now enabled. Measured on a live rev 8 device: 298 → 236 µA, 21 % less. The choke has been on the board from the start; the firmware had simply never switched the regulator on.
- _Barometer polling follows the volume:_ The sensor stops being polled when the sound is off and nobody is subscribed. Polling the barometer is the single most expensive thing the device does, and it no longer runs for nothing.
- _Audible feedback while holding:_ Ticks during the button hold and during boot. The LED sits right next to the button and gets covered by your finger, so the countdown is duplicated by sound.
- _Long-press cancel:_ Release the button after the ticks have started and the volume no longer switches. Previously you got a volume change while reaching to switch the device off and changing your mind.
- _Smooth melodies:_ The power-on and power-off melodies no longer break up. They used to be interrupted by flash writes (settings save, image confirm), which stall the CPU on nRF52.
- _Reliable power-off:_ The buzzer is stopped synchronously right before deep sleep. An unfinished melody can no longer keep the device awake with the PWM running — the state where it looked switched off but kept draining the supercapacitor.
- _Auto power-off by inactivity:_ Configurable timeout — the device switches itself off when it is neither connected nor touched. 0 disables it, and the shortest timeout that can be set is 5 minutes.
- _Long-press modes:_ What a long press does is decided by the "Bluetooth never sleep" setting: full power-off, or "go silent but keep advertising" so the device is revived by simply reconnecting.
- _Battery reading:_ Refreshed every 5 minutes instead of every 10 while connected.
- _Faster connection:_ The Bluetooth advertising interval in the economical mode is down from 3.5 s to 1.28 s, and after power-on, a disconnect or a button press the device advertises at 100–150 ms for 30 seconds. Phones find it noticeably faster.
- _Bluetooth stability:_ Outgoing notifications moved to a dedicated queue. A sleeping phone on a degraded link could previously stall the whole Bluetooth stack — the device looked frozen until reconnect.
- _New barometer supported:_ SPL07-003 is recognised alongside SPL06-001 — required for board revision 8.
- _Update protection:_ The build no longer publishes images that are unsuitable for over-the-air updates.
