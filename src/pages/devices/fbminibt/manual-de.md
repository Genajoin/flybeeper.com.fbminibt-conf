# FlyBeeper mini BT

## Handbuch

### Bedienung

Einschaltprozedur: Drücken Sie die Taste mit dem Kreis einmal, warten Sie auf das Blinken der LED, drücken Sie die Taste mit dem Kreis erneut und halten Sie sie, bis ein Tonsignal erklingt — das Gerät ist eingeschaltet.

Ausschaltprozedur: Drücken und halten Sie die Taste mit dem Kreis, bis die LED aufhört zu blinken. Nach Loslassen der Taste spielt eine Abschaltmelodie — das Gerät ist ausgeschaltet.

Lautstärke ändern: Bei eingeschaltetem Gerät drücken Sie die „Pfeil-nach-oben"-Taste, um die Lautstärke zu erhöhen, oder „Pfeil-nach-unten", um sie zu verringern. Jeder Druck wird von einer Tonfolge begleitet. Die Anzahl der Töne gibt die Lautstärkestufe an. Die unterste Stufe ist lautlos. Wichtig! Wenn das Gerät per Bluetooth mit einem Smartphone gekoppelt ist, funktioniert diese Funktion nicht, da das Gerät in den Tastatur-Modus wechselt.

![Tastenbelegung — obere Taste erhöht die Lautstärke, untere senkt sie, Kreis schaltet ein, Quadrat bricht ab](/manual-media/fbminibt/finger-en.jpg)

### Betriebsmodi

Das Gerät arbeitet in zwei Modi. Im Normalmodus ist keine ständige Bluetooth-Verbindung nötig, um auf Barometerdaten und Tasten zuzugreifen. Im HID-Tastatur-Modus ist eine Verbindung mit Authentifizierung und Geräte-Pairing erforderlich. In diesem Modus registriert sich das Gerät im System als externe Bluetooth-Tastatur. Die Tasten sind standardmäßig den Tasten F1, F2, F3 und F4 zugeordnet. Wichtig! Im Modus „externe Tastatur" verschwindet in den meisten Android-Anwendungen die Bildschirmtastatur. Die Tasten funktionieren im Normalmodus ohne Pairing in einigen Anwendungen wie maps.flybeeper.com. Für die Tastennutzung in Anwendungen wie xcTrack oder xcSoar ist jedoch der externe Tastatur-Modus notwendig.

### Pairing-Vorgang

Wir gehen den Vorgang am Beispiel von Android durch. Schalten Sie Bluetooth auf Android ein und wählen Sie FBminiBT aus der Liste der verfügbaren Geräte. Android schlägt den Pairing-Vorgang vor. Stimmen Sie zu. Ein sechsstelliger Code wird zum Pairing angezeigt. Drücken Sie am Gerät die Taste mit dem Kreis zum Annehmen oder die Taste mit dem Quadrat zum Abbrechen. Drücken Sie dann auf Android „Bestätigen". Verbindungs-, Trennungs- und Pairing-Vorgänge werden von Tonsignalen begleitet. Wichtig! Nach dem Pairing dienen die Tasten am Gerät nicht mehr zur Lautstärkeregelung. Nur das lange Drücken der Taste mit dem Kreis zum Ausschalten funktioniert weiterhin.

Standardmäßig schlägt ein Versuch, das Variometer mit einem zweiten Gerät zu koppeln, fehl. Daher löscht ab Firmware-Version 0.12 das Entfernen des Akkus die Information über das gekoppelte Gerät. Dies muss getan werden, um das Variometer mit einem anderen Gerät koppeln zu können.

### Einstellungen

Alle Einstellungen werden über die grafische Oberfläche [auf der Konfigurator-Webseite](https://fbminibt-conf.flybeeper.com/) vorgenommen. Rufen Sie die Seite mit einem Gerät auf, das ein Bluetooth-Modul hat, z. B. Smartphone, Laptop oder PC mit Bluetooth. Klicken Sie auf Verbinden und wählen Sie FBminiBT aus der Liste. Halten Sie die Geräte möglichst nah beieinander. Ändern Sie eine beliebige Einstellung und klicken Sie auf Anwenden.

`Silent on the ground` — bei Aktivierung merkt sich das Gerät den aktuellen Druck. Der Vario-Ton wird gemäß `Buzzer Volume` ausgelöst, wenn sich der Druck um einen Wert ändert, der etwa 1,5 m Höhenänderung entspricht.

`LED blink by vario` — die LED blinkt umso häufiger, je höher die Steigrate ist, jedoch nicht weniger als `Climb Tone On Threshold`.

`UART Protocol` — Textprotokoll zur Datenübertragung für Programme, die den alten UART-Emulationskanal verwenden. Unterstützt werden POV und PRS. Kann deaktiviert werden, wenn das moderne Lesen über den GATT-ESS-Dienst aktiviert ist.

`Duplication pressure data via UART emulation` — Druckdaten werden über zwei BLE-Charakteristiken übertragen. Die Hauptcharakteristik ist der ESS-Dienst. Die Reserve ist die UART-Emulation. Wenn eine Anwendung beide Charakteristiken abonniert, wird über die UART-Emulation nichts gesendet, um Duplikate zu vermeiden. Manche Anwendungen abonnieren jedoch alle möglichen Datenübertragungs-Charakteristiken, nutzen aber nur die Daten aus der UART-Emulation. Für solche Programme aktivieren Sie diese Option. Standardmäßig deaktiviert.

`Smooth frequency change` — innerhalb des Zyklus ändert sich die Tonfrequenz sanft entsprechend dem Vario-Wert, statt am Zyklusanfang festgelegt zu werden.

`Buzzer Volume` — Lautstärke des Summers von 0 (aus) bis 3 (maximal).

`Climb Tone On Threshold` — Geschwindigkeit, bei der der Variometer-Ton aktiviert wird.

`Climb Tone Off Threshold` — Geschwindigkeit an der Grenze des Übergangs vom Schwellenmodus zum normalen Variometer-Modus. Im Schwellenmodus, von `Climb Tone On Threshold` bis `Climb Tone Off Threshold`, wird dem normalen Vario-Sound ein kurzes, tieffrequentes Signal hinzugefügt.

`Sink Tone Off Threshold` — Geschwindigkeit, bei der das Variometer im Sinkflug-Modus aktiviert wird.

`Sink Tone On Threshold` — Geschwindigkeit an der Grenze des Übergangs vom Schwellenmodus zum normalen Variometer-Modus. Im Schwellenmodus, von `Sink Tone On Threshold` bis `Sink Tone Off Threshold`, wird dem normalen Vario-Sound ein kurzes, tieffrequentes Signal hinzugefügt.

`Vario averaging time` — Glättungszeitkonstante in Sekunden. Je höher, desto sanfter die Vario-Änderung, aber desto höher die Reaktionsverzögerung auf den Anstieg. 0,1 s standardmäßig ist reaktiv. 1 s für Glätte. Betrifft nur Ton und Vario-Anzeige. Hat keinen Einfluss auf die Druckmessung.

`End of climb hysteresis` — Differenz zwischen dem Auslösepunkt am Steigbeginn und am Steigende. Ermöglicht ein schnelles Abschalten des Tons am Steigende. Standard 0,2 m/s.

`Adaptation of the internal vario frequency` — die Tonfrequenz wird innerhalb des Vario-Zyklus angepasst, statt am Zyklusanfang fixiert zu sein. Macht den Klang ähnlich anderen Variometern. Standardmäßig aus.

`Vario, Frequency, Cycle, Duty` — Tabelle, die die Kurven der Frequenz (Hz), Periode (ms) und Duty (%) in Abhängigkeit von der Vertikalgeschwindigkeit (cm/s) beschreibt.

![Konfigurator — Audio-Kurve und Schwellen in der Browser-Oberfläche](/manual-media/fbminibt/settings.jpg)

Im unteren Teil des Konfigurators können Sie im Feld `Simulate Vario` einen beliebigen Vario-Wert eingeben und hören, wie das Gerät bei dieser Vertikalgeschwindigkeit klingt. Alle Werte werden in cm/s eingetragen.

### Liste der Flugprogramme mit direkter Unterstützung

- xcTrack v.0.9.11.10+
- SeeYou Navigator v.3.0.6+
- LK8000 v.7.4.19+
- Flyskyhy v.8.2+
- TheFlightVario XC 2.38+
- FlyMe
- maps.flybeeper.com

Bald:

- Flygaggle

### Beschreibung des Kommunikationsprotokolls

Dieser Abschnitt richtet sich eher an Entwickler als an normale Nutzer.

Das Gerät arbeitet nach dem BLE-Protokoll ohne Pairing und Autorisierung. Änderungen jedes Parameters sind per Subscription verfügbar (Deskriptor 0x2902). Alle nicht-standardmäßigen Parameter haben 128-Bit-UUIDs, Deskriptor 0x2901 mit dem textuellen Parameternamen und Deskriptor 0x2904 mit der Beschreibung von Format, Exponent und Maßeinheit. Der Übersicht halber sind ihre Werte in den folgenden Tabellen aufgeführt.

Charakteristiken-UUIDs für Dienst `0x181A` ESS

| Name        | UUID   | Size   | Exponent | Unit    |
| ----------- | ------ | ------ | -------- | ------- |
| Temperature | 0x2a6e | INT16  | -2       | Celcius |
| Pressure    | 0x2a6d | UINT32 | -1       | Pascal  |

Charakteristiken-UUIDs für Dienst `0x1819` LNS

| Name              | UUID                                 | Size  | Exponent | Unit |
| ----------------- | ------------------------------------ | ----- | -------- | ---- |
| Vario by pressure | b4df8385-d9d6-4037-b2ed-2e14e1f4fa27 | INT16 | -2       | m/s  |

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
| Model Number      | 0x2A24 | STRING | FBminiBT  |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.01      |

<route lang="yaml">
meta:
  layout: manual
</route>
