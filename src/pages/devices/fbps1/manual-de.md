# FlyBeeper Pressure Sensor

![FlyBeeper Pressure Sensor — immer verfügbarer externer Bluetooth-Barometer](/manual-media/fbps1/overview.png)

## Handbuch

### Bedienung

Das Gerät hat keine Bedienelemente. Nach Einsetzen der Batterie ist es verbindungsbereit. Ein Reset erfolgt durch kurzes Entnehmen der Batterie.

### Betriebsmodi

Das Gerät arbeitet in zwei Modi. Direkt nach dem Einsetzen der Batterie geht das Gerät in den Bluetooth-Verbindungs-Standby-Modus. Alle 5 Sekunden sendet es ein Advertising-Paket, sodass es zur Verbindungsinitiierung gefunden werden kann. Zwischen den Advertising-Paketen schläft das Gerät. Sobald das Gerät eine Verbindungsanfrage erhält, wird eine periodische Batteriestand-Messung aktiviert. Eine Verbindung erfordert kein Pairing. Nach Verbindungsaufbau lassen sich der Batteriestand lesen und Änderungen des Atmosphärendrucks abonnieren. Letzteres aktiviert eine periodische Datenerfassung am barometrischen Sensor mit 40 Hz. Die Daten werden gefiltert, geglättet und 10-mal pro Sekunde an den Abonnenten gesendet. Dazwischen schläft das Gerät. Beim Trennen der Bluetooth-Verbindung kehrt es in den Standby-Modus mit periodischer Advertising-Aussendung zurück.

### Konfiguration

Sie können das Gerät über die grafische Oberfläche testen. Sie benötigen ein Gerät mit Bluetooth, z. B. Smartphone, Laptop oder Computer mit Bluetooth-Modul. Klicken Sie auf Connect und wählen Sie FbPs1 aus der Liste. Halten Sie die Geräte möglichst nah beieinander.

Aktuell hat das Gerät keine zugänglichen Einstellungen, aber zukünftige Firmware-Updates werden die Änderung von Abfragefrequenz des Sensors und Datenübertragungsfrequenz erlauben.

### Liste der Flugprogramme mit direkter Unterstützung

- xcTrack v.0.9.11.10+
- SeeYou Navigator v.3.0.6+
- LK8000 v.7.4.19+
- Flyskyhy v.8.2+
- FlyMe
- TheFlightVario XC 2.38+
- maps.flybeeper.com

Bald:

- Flygaggle

### Beschreibung des Kommunikationsprotokolls

Dieser Abschnitt richtet sich eher an Entwickler als an normale Nutzer.

Das Gerät arbeitet nach dem BLE-Protokoll ohne Pairing und Autorisierung. Änderungen jedes Parameters sind per Subscription verfügbar (Deskriptor 0x2902). Alle nicht-standardmäßigen Parameter haben 128-Bit-UUIDs, Deskriptor 0x2901 mit Parametername und Deskriptor 0x2904 mit der Beschreibung von Format, Exponent und Maßeinheit. Die Werte sind in den folgenden Tabellen aufgeführt.

Charakteristiken-UUIDs für Dienst `0x181A` ESS

| Name        | UUID   | Size   | Exponent | Unit    |
| ----------- | ------ | ------ | -------- | ------- |
| Temperature | 0x2a6e | INT16  | -2       | Celcius |
| Pressure    | 0x2a6d | UINT32 | -1       | Pascal  |

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
