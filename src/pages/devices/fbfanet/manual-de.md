# FlyBeeper FANET

![FlyBeeper FANET — Bluetooth-gesteuerter Funktransceiver für FANET / ADS-L](/manual-media/fbfanet/01-intro.jpg)

## Handbuch

### Bedienung

**Einschaltprozedur:** Drücken Sie die Taste, warten Sie auf das Blinken der LED neben der Taste. Nach 2 Sekunden zeigt ein zweites Blinken an, dass das Gerät eingeschaltet ist. Das ist der Hauptbetriebsmodus für die ganze Saison. Der Standby-Verbrauch ist minimal, sodass das Gerät monatelang eingeschaltet bleiben kann. Wenn das Gerät bereits eingeschaltet ist, setzt ein Tastendruck die aktuelle Bluetooth-Verbindung zurück (falls vorhanden) und aktiviert für 2 Minuten häufige Bluetooth-Advertising-Pakete, um die Verbindung zum Gerät zu erleichtern. Nach 2 Minuten sinkt die Frequenz dieser Pakete. Eine Verbindung ist weiterhin möglich, dauert aber länger.

**Ausschaltprozedur (Transportmodus):** Drücken Sie die Taste, warten Sie auf das Blinken der LED. Drücken Sie innerhalb von 2 Sekunden erneut, bis zum zweiten Blinken. Bleibt das zweite Blinken aus, ist das Gerät ausgeschaltet. Dieser Modus wird für Transport und Langzeitlagerung verwendet. In diesem Modus sendet das Gerät keinerlei Funksignale und hat minimalen Energieverbrauch.

### Platzierung

Das Gerät sollte vertikal montiert werden. Die Leistung der Solarzelle ist reichlich bemessen, daher gibt es keine besonderen Anforderungen an ihre Ausrichtung. Die Antenne sitzt in der oberen Hälfte des Gehäuses über der Solarzelle. Ihr Strahlungsdiagramm bündelt die Leistung senkrecht zur Ebene der Solarzelle, mit weniger Leistung zu den Seiten und minimaler Leistung nach oben/unten. Für maximale Antenneneffizienz halten Sie zwischen der oberen Hälfte des Geräts und anderen Geräten Abstand ein.

Bei der Montage am Cockpit muss der obere Teil des Geräts nicht über das Cockpit hinausragen. Cockpits bestehen üblicherweise aus funkdurchlässigem Stoff und behindern den Betrieb des Geräts nicht.

### Laden

Das Gerät verfügt über einen `USB Type C`-Anschluss und eine Solarzelle.

**USB-Laden:** Unterstützt die meisten einfachen Ladegeräte außer Power Delivery. Der Ladestrom beträgt höchstens 500 mA.

**Solar-Laden:** Liefert einen Strom von bis zu 20 mA. Die Betriebsdauer in diesem Modus ist bei normaler Nutzung nur durch die Lebensdauer der Bauteile begrenzt.

### Bluetooth-Verbindung und -Trennung

Das Gerät muss eingeschaltet sein, d. h. nicht im Transportmodus. Ein Pairing über das Betriebssystem ist für die Verbindung nicht nötig. Das Gerät wird per Bluetooth von einer externen Anwendung gesteuert. Starten Sie einfach die unterstützte Anwendung und suchen Sie nach Bluetooth-Geräten in der Umgebung mit dem Namen FBFANET. Halten Sie die Geräte möglichst nah beieinander. Wenn Sie mehrere FBFANET-Geräte entdecken, wählen Sie das mit dem stärksten Signal. Zur Beschleunigung der Suche drücken Sie die Taste am Gerät einmal — das aktiviert zwei Minuten lang einen Modus mit hoher Sendefrequenz der Advertising-Pakete.

Das Gerät trennt sich automatisch beim Beenden der Anwendung und wechselt in den Standby-Modus für die nächste Verbindung.

### Liste der Flug-Apps

- LK8000 v.7.4.19+: Liest und sendet FANET-Pakete. Position, Wetterstationen.
- xcTrack v.0.9.11.10+: Unterstützt Lesen von Texten über das FNNGB-Protokoll. Direktes Lesen/Senden in Umsetzung.
- SeeYou Navigator v.3.0.6+: Unterstützt Lesen von Texten über das FBFAN-Protokoll. Direktes Lesen/Schreiben ist nur möglich, wenn Nutzer den Naviter-Support kontaktieren.

Erläuterung: Wenn das Programm Lesen über das Textprotokoll FNNGB, FBFAN oder FNF unterstützt, sehen Sie allen FANET-Verkehr ohne Internetverbindung auf der Karte. Andere Piloten sehen Sie jedoch nicht. Damit Ihre Position gesendet wird, müssen die Entwickler dieser Anwendung diese Funktion mit Hilfe der untenstehenden Informationen implementieren.

### Betriebsmodi

Dieser Abschnitt richtet sich eher an Entwickler als an normale Nutzer.

Das Gerät arbeitet in zwei Modi — Empfang und Senden von Funkpaketen. Der Empfangsmodus wird aktiviert, wenn Sie Benachrichtigungen der entsprechenden Bluetooth-Charakteristik abonnieren. Der Sendemodus wird aktiviert, sobald ein Byte-Array in dieselbe Charakteristik geschrieben wird. Die Größe des Byte-Arrays für Empfang oder Senden ist auf 40 Byte begrenzt.

Dienst-UUID: `0x1819`

| Name        | UUID                                 | Size        |
| ----------- | ------------------------------------ | ----------- |
| RADIO_TX_RX | fec81438-cb89-4c37-93d0-badfced4376e | UINT8 array |

Das Gerät hat einen Einkanal-Funktransmitter. Das heißt, es kann zu einem bestimmten Zeitpunkt nur entweder senden oder empfangen — auf einer mit den aktuellen Einstellungen gewählten Frequenz. Eine externe Anwendung kann jedoch die Frequenz wechseln und so abwechselndes Hören und Senden auf verschiedenen Frequenzen ermöglichen. Damit lässt sich ein Multi-Protokoll-Modus realisieren.

Charakteristiken-UUIDs für Dienst `0x180F` BAS

| Name            | UUID                                 | Size  | Exponent | Unit    |
| --------------- | ------------------------------------ | ----- | -------- | ------- |
| Battery level   | 0x2a19                               | UINT8 | 0        | Percent |
| Battery voltage | b0c889e8-16d2-45ef-b615-387f6bca2370 | INT16 | -3       | Volt    |

Charakteristiken-UUIDs für Dienst `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` Nordic UART. Dieser Dienst ist aus Kompatibilitätsgründen vorhanden und wegen seines höheren Energieverbrauchs nicht für neue Entwicklungen empfohlen.

| Name | UUID                                 | Size        |
| ---- | ------------------------------------ | ----------- |
| TX   | 6E400003-B5A3-F393-E0A9-E50E24DCCA9E | UINT8 array |

Wenn die Charakteristik `fec81438-cb89-4c37-93d0-badfced4376e` des Dienstes `0x1819` nicht abonniert ist, werden je nach Einstellung `fanet_uart_protocol` Strings im Format `FNNGB`, `FBFAN` oder `FNF` in `TX` geschrieben.

Charakteristiken-UUIDs für Dienst `0x180A` DevInfo

| Name              | UUID   | Size   | Value     |
| ----------------- | ------ | ------ | --------- |
| Model Number      | 0x2A24 | STRING | FBFANET   |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.01      |

### Einstellungen

Normalerweise verwaltet alle Einstellungen eine externe Anwendung. Der Nutzer kann sie jedoch auch über die grafische Oberfläche des Konfigurators ändern. Sie benötigen ein Gerät mit Bluetooth-Modul, z. B. Smartphone, Laptop oder PC mit Bluetooth. Gehen Sie auf die [Einstellungsseite](https://fbminibt-conf.flybeeper.com/settings). Klicken Sie auf `Connect` und wählen Sie `FBFANET` aus der Liste. Halten Sie die Geräte möglichst nah beieinander. Ändern Sie einen Parameter und klicken Sie auf `Apply`.

| Name                | UUID                                 | Size   | Values                                                                |
| ------------------- | ------------------------------------ | ------ | --------------------------------------------------------------------- |
| frequency           | 8d8e8809-4697-41fc-8ee2-ca0b999354ec | UINT32 | 868200000\* - EU, 920800000 - US, 866200000 - IN, 923200000 - KR (Hz) |
| bandwidth           | f19422e2-982a-4954-9a75-b38927236a59 | INT8   | 1\* — 250, 2 — 500 (kHz)                                              |
| coding_rate         | 17a95752-3c12-438f-9244-4f4612a1ab49 | INT8   | 1\* — 4/5, 2 — 4/6, 3 — 4/7, 4 — 4/8                                  |
| datarate            | 108b855f-11cd-4bc5-adee-eafce49bc77a | INT8   | 7\* - SF_7, 8 - SF_8, 9 - SF_9, 10 - SF_10, 11 - SF_11, 12 - SF_12    |
| tx_power            | 8ef0c42e-adb6-4897-b9c9-6fe93143faf4 | INT8   | -9 (min), 14\*, 22 (max) (dBm)                                        |
| fanet_uart_protocol | 9d9a9cd9-65ed-4d73-91ad-20cfdb5dbbba | INT8   | 1-FNNGB, 2-FBFAN, 3-FNF                                               |

`*` — Standardwerte

<route lang="yaml">
meta:
  layout: manual
</route>
