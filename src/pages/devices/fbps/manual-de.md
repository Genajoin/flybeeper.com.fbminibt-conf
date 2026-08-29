# FlyBeeper Baro

> Diese Anleitung gilt für den **FlyBeeper Baro** und seinen Vorgänger, den **FlyBeeper Pressure Sensor (FBPS1)**: gleiche Elektronik, gleiche Firmware. Der einzige Unterschied ist die Taste — der Baro hat eine, der FBPS1 nicht.

![FlyBeeper Baro — immer verfügbarer externer Bluetooth-Barometer](/manual-media/fbps/overview.png)

## Handbuch

### Bedienung

**FlyBeeper Baro (rundes Gehäuse).** Es gibt eine Taste, und sie hat zwei Aufgaben:

- **Ein Druck** weckt das Gerät und lässt es eine Zeit lang häufig senden, sodass das Telefon es in einer Sekunde findet und nicht auf das nächste Advertising-Paket wartet. Derselbe Druck holt das Gerät aus dem Lagermodus zurück.
- **Ein Doppeldruck** mit 1–2 Sekunden Pause versetzt es in den Tiefschlaf: das Senden hört auf, eine Verbindung ist nicht möglich, der Verbrauch geht gegen null. Das ist der Modus für Transport und lange Lagerung; ein Druck holt es zurück.

**FlyBeeper Pressure Sensor (FBPS1, der Vorgänger).** Er hat überhaupt keine Taste: das Gerät ist verbindungsbereit, sobald die Batterie eingesetzt ist, und ein Reset erfolgt durch kurzes Entnehmen der Batterie. Alles Übrige — Betriebsmodi, Druckdaten, Firmware-Updates — ist bei beiden Geräten gleich.

Sonst wird das Gerät durch nichts bedient: kein Display, keine LED, kein Ton — das alles übernimmt die Flug-App.

### Betriebsmodi

Das Gerät arbeitet in zwei Modi. Direkt nach dem Einsetzen der Batterie geht das Gerät in den Bluetooth-Verbindungs-Standby-Modus. Alle 5 Sekunden sendet es ein Advertising-Paket, sodass es zur Verbindungsinitiierung gefunden werden kann. Zwischen den Advertising-Paketen schläft das Gerät. Sobald das Gerät eine Verbindungsanfrage erhält, wird eine periodische Batteriestand-Messung aktiviert. Eine Verbindung erfordert kein Pairing. Nach Verbindungsaufbau lassen sich der Batteriestand lesen und Änderungen des Atmosphärendrucks abonnieren. Letzteres aktiviert eine periodische Datenerfassung am barometrischen Sensor mit 40 Hz. Die Daten werden gefiltert, geglättet und 10-mal pro Sekunde an den Abonnenten gesendet. Dazwischen schläft das Gerät. Beim Trennen der Bluetooth-Verbindung kehrt es in den Standby-Modus mit periodischer Advertising-Aussendung zurück.

### Konfiguration

Sie können das Gerät über die grafische Oberfläche testen. Sie benötigen ein Gerät mit Bluetooth, z. B. Smartphone, Laptop oder Computer mit Bluetooth-Modul. Klicken Sie auf Connect und wählen Sie FBPS aus der Liste (die vier Zeichen nach dem Punkt stammen aus der Geräte-ID). Halten Sie die Geräte möglichst nah beieinander.

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
