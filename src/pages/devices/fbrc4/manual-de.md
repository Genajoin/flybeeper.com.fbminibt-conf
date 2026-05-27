# FlyBeeper Remote Control 4

## Handbuch

### Betriebsmodi

Das Gerät arbeitet in mehreren Modi.

**Erster Modus: Bluetooth-Standby**

In diesem Modus sendet das Gerät alle 4 Sekunden ein Advertising-Paket, sodass es zur Verbindungsinitiierung gefunden werden kann. Zwischen den Advertising-Paketen schläft das Gerät. Die Dauer dieses Modus ist nur durch den Batteriestand begrenzt. Der Energieverbrauch ist minimal, sodass das Gerät die ganze Flugsaison in diesem Modus arbeiten kann.

**Zweiter Modus: aktive Verbindung**

Sobald das Gerät eine Verbindungsanfrage erhält, aktiviert es den zweiten Modus. Der Gerätename ist FBRC4. Nach dem Verbindungsaufbau lassen sich der Batteriestand lesen und Sensorwertänderungen abonnieren. In diesem Fall werden die benötigten Sensoren periodisch ausgelesen. Dazwischen schläft das Gerät. Beim Trennen der Bluetooth-Verbindung kehrt es in den Standby-Modus mit periodischer Advertising-Aussendung zurück.

**Reconnect-Modus**

Wenn die Verbindung verloren geht, wechselt das Gerät für einige Minuten in einen Modus mit erhöhter Advertising-Frequenz, was ein schnelles Wiederverbinden ermöglicht. Dieser Modus wird auch direkt nach Batteriewechsel aktiviert. So lässt sich die erste Verbindungsprozedur in Ihrer Anwendung beschleunigen.

### Bedienelemente

Das Gerät hat 4 taktile Tasten, die ausschließlich zur Zustandsübermittlung dienen. Die Tasten steuern das Gerät selbst nicht. Zum Reset entnehmen Sie die Batterie kurz.

Beim Entnehmen der Batterie werden auch die Pairing-Informationen für den HID-Tastatur-Modus zurückgesetzt. Der Pairing-Vorgang muss wiederholt werden; zuvor sollte das Gerät auf dem Smartphone entkoppelt werden. Auf diesem Weg lässt es sich auch mit einem anderen Smartphone/Tablet/PC neu koppeln.

### Konfiguration

Sie können das Gerät über die grafische Oberfläche des [Konfigurators](https://fbminibt-conf.flybeeper.com/settings) testen. Sie benötigen ein Bluetooth-fähiges Gerät, z. B. Smartphone, Laptop oder PC mit Bluetooth-Modul. Klicken Sie auf `Connect` und wählen Sie `FBRC4` aus der Liste. Halten Sie die Geräte möglichst nah beieinander. Auf der Seite `cockpit` sehen Sie Änderungen beim Drücken der FBRC4-Tasten. Auf der Seite `settings` finden und ändern Sie folgende Einstellungen:

- `hid_keyboard_off`: Externer HID-Tastatur-Modus. Nach Ändern und `Apply` Batterie kurz entnehmen und wieder einsetzen. Ist das Flag nicht gesetzt, ist HID aktiv und die Verbindung erfordert das übliche System-Pairing. Beachten Sie: Das Gerät schaltet sich nie aus. Sie müssen die Verbindung nach Gebrauch manuell über das Betriebssystem trennen. Sonst hält das System die Verbindung offen, baut sie bei Abbruch wieder auf und entlädt nach und nach den Akku. Unterstützt Ihre Anwendung das Lesen der Tastenzustände über den AIOS-Dienst, sollten Sie HID durch Aktivieren dieser Einstellung deaktivieren. Das verlängert die Akkulaufzeit.

- `char_button1,2,3,4`: HID-Tastencodes für jede der Tasten im HID-Tastatur-Modus. Standardmäßig sind den Tasten die Tastencodes F1, F2, F3 und F4 zugeordnet.
  HID-Tastencodes entsprechen nicht den ASCII-Codes. Code-Referenzen finden Sie in den Tabellen 5 und 6 des [Bluetooth-HID-Profils](https://cdn.sparkfun.com/datasheets/Wireless/Bluetooth/RN-HID-User-Guide-v1.0r.pdf).

### Liste der Flugprogramme

- xcTrack (HID)
- xcSoar (HID)
- LK8000 (HID)

### Beschreibung des Kommunikationsprotokolls

Dieser Abschnitt richtet sich eher an Entwickler als an normale Nutzer.

Das Gerät arbeitet nach dem BLE-Protokoll. Pairing und Autorisierung sind nur erforderlich, wenn die Einstellung `hid_keyboard_off` nicht aktiv ist. Änderungen jedes Parameters sind per Subscription verfügbar (Deskriptor 0x2902). Alle nicht-standardmäßigen Parameter haben 128-Bit-UUIDs, Deskriptor 0x2901 mit Parametername und Deskriptor 0x2904 mit Format, Exponent und Maßeinheit. Die Werte sind in den folgenden Tabellen aufgeführt.

Charakteristiken-UUIDs des Dienstes `0x1815` AIOS. Das Gerät hat 4 Tasten. Das ist im Deskriptor 0x2909 „Number of Digitals" definiert. Je zwei Bit repräsentieren den Zustand einer Taste, beginnend mit dem niedrigstwertigen Bit. 0b00000001 bedeutet, Taste 1 ist gedrückt; sind alle Tasten gleichzeitig gedrückt, ergibt sich 0b01010101. Damit passt das gesamte Array in ein Byte. Es werden nur die Zustände 0b00 (losgelassen) und 0b01 (gedrückt) verwendet. Mehr Informationen zu den Zuständen finden Sie in der Automation IO Service 1.0 Specification (Abschnitt 3.1.1). Benachrichtigungen werden bei Änderung gesendet, also je eine separate Benachrichtigung für Drücken und Loslassen. So lassen sich lange Klicks, Doppelklicks und das gleichzeitige Halten mehrerer Tasten erkennen.

| Name    | UUID   | Size        |
| ------- | ------ | ----------- |
| Buttons | 0x2A56 | UINT8 array |

Charakteristiken-UUIDs für Dienst `0x180F` BAS

| Name            | UUID                                 | Size  | Exponent | Unit    |
| --------------- | ------------------------------------ | ----- | -------- | ------- |
| Battery level   | 0x2a19                               | UINT8 | 0        | Percent |
| Battery voltage | b0c889e8-16d2-45ef-b615-387f6bca2370 | INT16 | -3       | Volt    |

Charakteristiken-UUIDs für Dienst `0x180A` DevInfo

| Name              | UUID   | Size   | Value     |
| ----------------- | ------ | ------ | --------- |
| Model Number      | 0x2A24 | STRING | FBRC4     |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.01      |

Die Geräteeinstellungen sind zum Lesen und Schreiben im Dienst 904baf04-5814-11ee-8c99-0242ac120000 verfügbar. Jede Einstellung hat eine individuelle 128-Bit-UUID und die Deskriptoren 0x2901 und 0x2904.

| Name             | UUID                                 | Size  | Value | Unit    |
| ---------------- | ------------------------------------ | ----- | ----- | ------- |
| hid_keyboard_off | 86591053-2856-4f25-a35c-b753f0deea8f | UINT8 | 0     | Boolean |
| char_button1     | ee5e99d1-6d7d-4d5a-9aaf-f76be25a6db8 | UINT8 | 0x3A  | keychar |
| char_button2     | 221af4c6-0695-4e21-ba9b-12fdd6612800 | UINT8 | 0x3B  | keychar |
| char_button3     | 46cbd27b-57d8-421c-8ff6-9ec75e3515d4 | UINT8 | 0x3C  | keychar |
| char_button4     | 5b975063-9256-4bdf-bd8c-d6c1688902d2 | UINT8 | 0x3D  | keychar |

<route lang="yaml">
meta:
  layout: manual
</route>
