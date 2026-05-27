# FlyBeeper True Air Speed

## Handbuch

### Betriebsmodi

Das Gerät arbeitet in mehreren Modi.

Der erste Modus ist Bluetooth-Verbindungs-Standby. Alle 4 Sekunden sendet das Gerät ein Advertising-Paket, sodass es zur Verbindungsinitiierung gefunden werden kann. Zwischen den Advertising-Paketen schläft das Gerät. Die Dauer dieses Modus ist nur durch den Batteriestand begrenzt. Der Energieverbrauch ist minimal, sodass das Gerät die ganze Flugsaison in diesem Modus arbeiten kann.

Sobald das Gerät eine Verbindungsanfrage erhält, aktiviert es den zweiten Modus. Die Verbindung erfordert kein vorheriges System-Pairing. Sie können sofort die Flug-App starten und über deren Oberfläche verbinden. Der Gerätename ist FBTAS. Nach dem Verbindungsaufbau lassen sich der Batteriestand lesen und Sensorwertänderungen abonnieren. In diesem Fall werden die benötigten Sensoren periodisch ausgelesen. Dazwischen schläft das Gerät. Beim Trennen der Bluetooth-Verbindung kehrt es in den Standby-Modus mit periodischer Advertising-Aussendung zurück.

Reconnect-Modus: Wenn die Verbindung verloren geht, wechselt das Gerät für einige Minuten in einen Modus mit erhöhter Advertising-Frequenz, um ein schnelles Wiederverbinden zu ermöglichen. Dieser Modus wird auch direkt nach Drücken der Reset-Taste aktiviert. So lässt sich die erste Verbindungsprozedur in Ihrer Anwendung beschleunigen.

Es gibt einen Transportmodus, in dem das Gerät dauerhaft schläft und keinerlei Bluetooth-Daten sendet. Dieser Modus wird beim Lufttransport oder bei der Langzeitlagerung zwischen Saisons verwendet. Es ist der Modus mit dem geringsten Energieverbrauch.

### Platzierung

![FlyBeeper TAS — Pitotrohr und Leitwerk richten das Gerät unter der Gurtbank in den Luftstrom aus](/manual-media/fbtas/03-mount.jpg)

#### Für Gleitschirme

Die Standardposition ist an der Gurtbank an einer 1 m langen Schnur unter dem Piloten am Karabiner. Das Leitwerk sorgt für automatische Ausrichtung in den Luftstrom. Die Schnurlänge sollte das Gerät weit genug von der Gurtbank entfernen, um den Einfluss des komprimierten Luftstroms zu vermeiden. Unzureichender Abstand führt zu Geschwindigkeitsanzeigen, die höher als die tatsächlichen sind. Geringes Gewicht und niedrige Frontalfläche helfen dem Gerät, den Pendel-Effekt effektiv zu unterdrücken; bei zu langer Schnur können jedoch unerwünschte Schwingungen auftreten.

Bei nicht-standardmäßigen Positionen, z. B. an der Heckverkleidung der Gurtbank, ist die Kompression/Expansion des Luftstroms zu berücksichtigen. Diese Variation hängt auch von der Geschwindigkeit ab und beeinflusst die Anzeigen.

#### Für Drachenflieger

Es sollte ein spezielles Befestigungselement statt des Leitwerks verwendet werden, das das Gerät am Rahmen des Drachens parallel zur Flügelebene fixiert. Platzieren Sie das Gerät nicht zu nah am Flügel in der Kompressionszone des Luftstroms.

### Bedienung

Das Gerät hat keine Bedienelemente außer der Reset-Taste. Es ist außer im Transportmodus immer verbindungsbereit.

Um den Transportmodus zu verlassen, drücken Sie die Reset-Taste einmal. Die Taste ist klein und befindet sich 1 mm vom Gehäuserand entfernt. Seien Sie vorsichtig. Verwenden Sie einen dünnen Holz- oder Plastikstift, um nicht versehentlich ungeschützte Kontakte zu überbrücken.

Zur Aktivierung des Transportmodus drücken Sie die Reset-Taste einmal und drücken Sie sie nach 1–2 Sekunden erneut. Bei erfolgreichem Eintritt in den Transportmodus können Sie das Gerät per Bluetooth nicht erkennen oder verbinden.

### Laden

Die finale Version verfügt über eine eingebaute Solarzelle und benötigt keine andere Lademethode. Empfehlung: vor Gebrauch 1 Stunde im Freien laden.

Der Prototyp hat einen `USB Type C`-Anschluss zum Laden. Er unterstützt nur einfache Ladegeräte, die konstant 5 V liefern, z. B. USB-Anschlüsse an PCs. Smart-Lader und `PD` werden nicht unterstützt.

### Konfiguration

Sie können das Gerät über die grafische Oberfläche des [Konfigurators](https://fbminibt-conf.flybeeper.com/settings) testen und konfigurieren. Sie benötigen ein Gerät mit Bluetooth, z. B. Smartphone, Laptop oder PC mit Bluetooth. Klicken Sie auf `Connect` und wählen Sie `FBTAS` aus der Liste. Halten Sie die Geräte möglichst nah beieinander. Ändern Sie einen Parameter und klicken Sie auf `Apply`. Auf der Registerkarte `Cockpit` sehen Sie alle vom Gerät gesendeten Daten in Echtzeit.

`Pitot K factor (o.e.)` — Kalibrierungskoeffizient, der den konstruktiven Druckverlust im Pitotrohr und im Weg zum Differenzdrucksensor berücksichtigt. Eine Erhöhung erhöht IAS und TAS proportional. Nutzen Sie den [TAS-Kalibrierungs-Service](https://flybeeper.com/utils/tas-calibration/).

`Differential Pressure offset, Pa` — Offset des Differenzdrucksensors gegenüber ruhender Luft. Standardmäßig 0, da der Standardsensor eine automatische Kalibrierung hat. In einigen experimentellen Geräteversionen kann es jedoch nötig sein, den Offset anzupassen, um Sensor-Drift zu kompensieren.

### Liste der Flugprogramme mit direkter Unterstützung

- xcTrack v.0.9.11.10+
- SeeYou Navigator v.3.0.6+
- LK8000 v.7.4.19+

### Beschreibung des Kommunikationsprotokolls

Dieser Abschnitt richtet sich eher an Entwickler als an normale Nutzer.

Das Gerät arbeitet nach dem BLE-Protokoll ohne Pairing und Autorisierung. Änderungen jedes Parameters sind per Subscription verfügbar (Deskriptor 0x2902). Alle nicht-standardmäßigen Parameter haben 128-Bit-UUIDs, Deskriptor 0x2901 mit Parametername und Deskriptor 0x2904 mit Format, Exponent und Maßeinheit. Die Werte sind in den folgenden Tabellen aufgeführt.

Charakteristiken-UUIDs für Dienst `0x1819` LNS

| Name                  | UUID                                 | Size  | Exponent | Unit   |
| --------------------- | ------------------------------------ | ----- | -------- | ------ |
| Differential pressure | 234337bf-f931-4d2d-a13c-07e2f06a0240 | INT16 | -1       | Pascal |
| Indicated airspeed    | 234337bf-f931-4d2d-a13c-07e2f06a0248 | INT16 | -1       | km/h   |
| True airspeed         | 234337bf-f931-4d2d-a13c-07e2f06a0249 | INT16 | -1       | km/h   |

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

Charakteristiken-UUIDs für Dienst `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` Nordic UART. Dieser Dienst ist aus Kompatibilitätsgründen vorhanden und wegen seines höheren Energieverbrauchs nicht für neue Entwicklungen empfohlen.

| Name | UUID                                 | Size        |
| ---- | ------------------------------------ | ----------- |
| TX   | 6E400003-B5A3-F393-E0A9-E50E24DCCA9E | UINT8 array |

Wenn die Charakteristik 0x2a6d des Dienstes 0x181A nicht abonniert ist, wird ein String mit dem Druckwert im PRS-Format in TX geschrieben.

Wenn die Charakteristiken 234337bf-f931-4d2d-a13c-07e2f06a0248 oder 234337bf-f931-4d2d-a13c-07e2f06a0249 des Dienstes 0x1819 nicht abonniert sind, wird ein String mit dem TAS-Wert im Format $LXWP0 in TX geschrieben.

Charakteristiken-UUIDs für Dienst `0x180A` DevInfo

| Name              | UUID   | Size   | Value     |
| ----------------- | ------ | ------ | --------- |
| Model Number      | 0x2A24 | STRING | FBTAS     |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.01      |

Die Geräteeinstellungen sind zum Lesen und Schreiben im Dienst 904baf04-5814-11ee-8c99-0242ac120000 verfügbar. Jede Einstellung hat eine individuelle 128-Bit-UUID und die Deskriptoren 0x2901 und 0x2904.

| Name                         | UUID                                 | Size  | Exponent | Unit   |
| ---------------------------- | ------------------------------------ | ----- | -------- | ------ |
| Pitot K factor               | 904baf04-5814-11ee-8c99-0242ac120201 | INT16 | -3       | o.e.   |
| Diffirencial Pressure offset | 904baf04-5814-11ee-8c99-0242ac120202 | INT16 | -1       | Pascal |

<route lang="yaml">
meta:
  layout: manual
</route>
