# FlyBeeper mini BT

## Manual

### Control

Power-on procedure: single click on the button with a circle, wait for the LED to flash, then press the button with a circle again and hold it until you hear a sound signal - the device is powered on.

Power-off procedure: press and hold the button with a circle until the LED stops flashing. After releasing the button, a power-off melody plays - the device is powered off.

Volume adjustment: when the device is on, press the "up" button to increase the volume or the "down" button to decrease the volume. Each press is accompanied by a sequence of tones. The number of tones indicates the volume level. The lowest level is silent. Important! If the device is paired with a smartphone via Bluetooth, this functionality does not work as the device switches to keyboard mode.

![Image](https://market.flybeeper.com/img/device/mini-bt/i1text.jpg)

### Operating Modes

The device operates in two modes. In normal mode, no constant Bluetooth connection is required to access barometer data and buttons. In HID keyboard mode, a connection with authentication and device pairing is required. In this mode, the device registers in the system as an external Bluetooth keyboard. The buttons are by default associated with the F1, F2, F3, and F4 keys. Important! In external keyboard mode, the on-screen keyboard will disappear in most Android applications. Button operation is possible in normal mode without pairing in some applications, such as maps.flybeeper.com. However, external keyboard mode is necessary for button operation in applications like xcTrack, xcSoar.

### Pairing Procedure

Let's go through the procedure using Android as an example. Turn on Bluetooth on Android and select FBminiBT from the list of available devices. Android will suggest the pairing process. Agree to it. A six-digit code will be displayed for pairing. On the device, press the button with a circle to accept or the button with a square to cancel pairing. Then press "Accept" on Android. Connection, disconnection, and pairing procedures are accompanied by sound signals. Important! After pairing, the buttons on the device no longer perform the volume control function. Only long pressing of the button with a circle to turn off the device works.

By default, an attempt to pair a variometer with a second device will fail. Therefore, starting from firmware version 0.12, removing the battery erases information about the paired device. This must be done in order to be able to pair the variometer with another device.

### Settings

All settings are made through the graphical interface on [the configurator's website](https://fbminibt-conf.flybeeper.com/). Go to the website with a device that has a Bluetooth module, such as a smartphone or laptop, or a PC with a Bluetooth module. Click Connect and select FBminiBT from the list. Keep the devices as close to each other as possible. Change any setting and click Apply.

Silent on the ground - when activated, the device memorizes the current pressure. The vario sound is triggered based on the `Buzzer Volume` when the pressure changes by an amount roughly equivalent to a 1.5-meter change in altitude.

LED blink by vario - the LED starts blinking more frequently as the vertical speed increases, but not less than the `Climb Tone On Threshold`.

UART Protocol - text data transmission protocol for programs using the old UART emulation channel. POV and PRS are supported. It can be turned off if modern reading via the GATT ESS service is enabled.

Buzzer Volume - ringing volume from 0 - off to 3 - maximum.

Climb Tone On Threshold - speed at which the variometer sound is activated.

Climb Tone Off Threshold - speed at the boundary of transition from threshold mode to normal variometer mode. In threshold mode, from `Climb Tone On Threshold` to `Climb Tone Off Threshold`, a short low-frequency signal is added to the normal variometer sound.

Sink Tone Off Threshold - speed at which the variometer is activated in sink mode.

Sink Tone On Threshold - speed at the boundary of transition from threshold mode to normal variometer mode. In threshold mode, from `Sink Tone On Threshold` to `Sink Tone Off Threshold`, a short low-frequency signal is added to the normal variometer sound.

Vario, Frequency, Cycle, Duty - a table describing curves of frequency (Hz), period (ms), and duty (%) dependence on vertical speed (cm/s).

![Image](https://market.flybeeper.com//img/device/mini-bt/i2diagr.png)

In the lower part of the configurator, in the "Simulate Vario" field, you can enter any variometer value and hear how the device will sound at a given vertical speed. All values are entered in cm/s.

<router-link to="/devices/fbminibt">BACK</router-link>
