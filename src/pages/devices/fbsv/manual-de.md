# FlyBeeper Sun Vario

![FlyBeeper Sun Vario — solarbetriebenes Variometer mit Superkondensator-Speicher](/manual-media/fbsv/01-overview.jpg)

## Handbuch

### Betriebsmodi des Geräts

Das Gerät arbeitet in vier Modi:

#### Verbindungs-Standby-Modus

Sobald die Akkuspannung den Mindestwert übersteigt, schaltet sich das Gerät ein und geht in den Bluetooth-Verbindungs-Standby-Modus.
Alle 5 Sekunden sendet es ein Advertising-Paket, sodass es zur Verbindungsinitiierung gefunden werden kann.
Zwischen den Advertising-Paketen schläft das Gerät.

#### Externer-Drucksensor-Modus

Die Bluetooth-Verbindung erfordert kein Pairing. Der Gerätename in der Bluetooth-Scan-Liste beginnt mit `FBSV`.
Sobald das Gerät eine Verbindungsanfrage erhält, wird eine periodische Batteriestand-Messung aktiviert und die LED beginnt zu blinken.
Nach dem Verbindungsaufbau lassen sich der Batteriestand lesen und Änderungen des Atmosphärendrucks abonnieren.
Letzteres aktiviert eine periodische Datenerfassung am barometrischen Sensor mit 40 Hz.
Die Daten werden gefiltert, geglättet und 10-mal pro Sekunde an den Abonnenten gesendet. Dazwischen schläft das Gerät.
Beim Trennen der Bluetooth-Verbindung kehrt es in den Standby-Modus mit periodischer Advertising-Aussendung zurück.

#### Klang-Variometer-Modus

Durch langes Drücken der Taste spielt das Gerät eine Melodie und wechselt in den Klang-Variometer-Modus.
Ein einzelner Tastendruck ändert die Lautstärkestufe. Es gibt insgesamt 3 Stufen.
Ein erneutes Drücken und Halten spielt eine Melodie, und das Gerät wechselt in den lautlosen Modus.

#### Transportmodus

Für Fälle, in denen der Ladestand noch hoch ist, das Gerät aber komplett ausgeschaltet werden muss, z. B.
für den Lufttransport. Auf der Rückseite finden Sie die Öffnung für die Taste `Reset`.
Drücken Sie einmal und drücken Sie 2 Sekunden nach dem einmaligen Blinken der LED erneut. Zum Verlassen des Modus drücken Sie `Reset` einmal.

### Liste der Flugprogramme mit direkter Unterstützung

- xcTrack v.0.9.11.10+
- SeeYou Navigator v.3.0.6+
- LK8000 v.7.4.19+
- Flyskyhy v.8.2+
- FlyMe
- TheFlightVario XC 2.38+
- maps.flybeeper.com

### Beschreibung des Kommunikationsprotokolls

Dieser Abschnitt richtet sich eher an Entwickler als an normale Nutzer.

Das Gerät arbeitet nach dem BLE-Protokoll ohne Pairing und Autorisierung. Änderungen jedes Parameters sind per Subscription verfügbar (Deskriptor 0x2902). Alle nicht-standardmäßigen Parameter haben 128-Bit-UUIDs, Deskriptor 0x2901 mit Parametername und Deskriptor 0x2904 mit Format, Exponent und Maßeinheit. Die Werte sind in den folgenden Tabellen aufgeführt.

Charakteristiken-UUIDs für Dienst `0x181A` ESS

| Name     | UUID   | Size   | Exponent | Unit   |
| -------- | ------ | ------ | -------- | ------ |
| Pressure | 0x2a6d | UINT32 | -1       | Pascal |

Charakteristiken-UUIDs für Dienst `0x180F` BAS

| Name            | UUID                                 | Size  | Exponent | Unit    |
| --------------- | ------------------------------------ | ----- | -------- | ------- |
| Battery level   | 0x2a19                               | UINT8 | 0        | Percent |
| Battery voltage | b0c889e8-16d2-45ef-b615-387f6bca2370 | INT16 | -3       | Volt    |

Charakteristiken-UUIDs für Dienst `0x180A` DevInfo

| Name              | UUID   | Size   | Value     |
| ----------------- | ------ | ------ | --------- |
| Model Number      | 0x2A24 | STRING | FBPS      |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.01      |

<route lang="yaml">
meta:
  layout: manual
</route>
