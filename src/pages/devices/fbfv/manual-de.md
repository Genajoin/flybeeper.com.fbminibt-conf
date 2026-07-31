# FlyBeeper FANET Vario

![FlyBeeper FANET Vario — FANET-Transceiver und Variometer in einem Gehäuse mit Solarpanel](/manual-media/fbfv/01-intro.jpg)

## Handbuch

Das Gerät vereint zwei Funktionen: einen FANET-Funktransceiver und ein empfindliches Variometer mit Ton. Es sendet und empfängt FANET-Pakete ohne Internetverbindung, vertont Steigen und Sinken über den eigenen Piezosummer und dient gleichzeitig als Quelle barometrischer Höhe für Flug-Apps auf dem Smartphone. Die Energie liefert ein eingebauter Akku, der über ein Solarpanel nachgeladen wird.

### Lieferumfang

Das Gerät, eine Sicherungsschnur und eine Kurzanleitungskarte. Ein `USB-Type-C`-Kabel und eine Halterung gehören nicht dazu: jedes Kabel passt, und die Art der Befestigung wählt jeder passend zu seinem Gurtzeug.

Die Schnur wird durch die Durchgangsbohrung im oberen Teil des Gehäuses gezogen und am Gurtzeug oder am Cockpit befestigt — das Gerät wird außen getragen, und eine Sicherung kostet weniger als ein neues Gerät.

### Seriennummer

Die Seriennummer Ihres Exemplars ist das `FBFV.XXXX` auf dem Aufkleber, wobei `XXXX` für Ihr Gerät eindeutig ist. Dieselbe Nummer sendet das Gerät in der Bluetooth-Geräteliste: der Name, den Sie in der App auswählen, _ist_ seine Seriennummer. Sie müssen den Aufkleber also gar nicht suchen — schalten Sie das Gerät ein und sehen Sie nach, wie es sich auf dem Äther nennt.

Nennen Sie diese Nummer bei jeder Anfrage an den Support und im Garantiefall.

### Bedienung

An der unteren Stirnseite befinden sich Taste, LED und die `USB-Type-C`-Buchse. Neben der LED sitzt eine kleine Öffnung: durch sie tritt der Ton aus, und durch sie gelangt Luft zum Barometer. Es gibt nur eine Taste — alle Betriebsarten werden über die Haltedauer gewählt.

`Einschalten` — Taste drücken und **3 Sekunden halten**. Das Halten wird durchgehend von Ticks mit steigender Frequenz begleitet: Sie hören, wie lange noch zu halten ist. Nach Ablauf erklingt die Einschaltmelodie. Lassen Sie früher los, geht das Gerät stillschweigend wieder schlafen — eine zufällige Berührung in der Tasche oder im Rucksack weckt es nicht.

`Ausschalten` — im eingeschalteten Zustand die Taste dieselben 3 Sekunden halten. Zuerst Ticks, dann eine Melodie. Was genau passiert, entscheidet die Einstellung `Bluetooth schläft nie`:

- Einstellung aus (Standard) — vollständiges Ausschalten. Funk, Ton und Bluetooth-Advertising werden gestoppt, das Gerät geht in den Tiefschlaf mit Verbrauch im Mikroampere-Bereich. Das ist zugleich der Modus für Transport und längere Lagerung. Zurück geht es mit 3 Sekunden Tastendruck;
- Einstellung ein — Modus „verstummen". Das Gerät trennt die Bluetooth-Verbindung und schaltet Variometer und Ton stumm, **sendet aber weiter Advertising-Pakete**. Es bleibt sichtbar und lebt von selbst wieder auf, sobald Sie sich verbinden — oder beim nächsten langen Tastendruck.

`Lautstärke` — ein kurzer Druck schaltet die Stufe im Kreis weiter: 0 (still) → 1 → 2 → 3 → 0. Die neue Stufe wird durch entsprechend viele Pieptöne bestätigt; auf Stufe 0 bleibt das Gerät stumm. Besteht in diesem Moment keine Bluetooth-Verbindung, schaltet derselbe Druck das Advertising für 30 Sekunden auf die schnellste Rate — so findet das Telefon das Gerät schneller.

`Langen Druck abbrechen` — wenn Sie zu halten begonnen haben, die Ticks hören und es sich anders überlegen, lassen Sie einfach los. Die Lautstärke wird dabei **nicht** umgeschaltet: die Ticks waren schon zu hören, also gilt der Druck nicht mehr als kurz.

`Automatische Abschaltung` — ist die `Zeit bis zur automatischen Abschaltung` gesetzt, schaltet sich das Gerät nach dieser Zeit ohne Aktivität selbst ab. Ein Tastendruck und eine Bluetooth-Verbindung setzen den Zähler zurück, während einer aktiven Verbindung ist er angehalten. Der Wert 0 (Standard) deaktiviert die automatische Abschaltung.

Das Gerät spielt bei jedem Bluetooth-Verbinden und -Trennen eine kurze Melodie — das ist normal und bedeutet keinen Neustart.

### Platzierung

Das Gerät ist für die senkrechte Montage außen gedacht — am Schultergurt des Gurtzeugs, am Cockpit, am Rucksack. Im oberen Teil des Gehäuses, unter einem eigenen Deckel oberhalb des Solarpanels, sitzt die FANET-Antenne; im selben Block liegt die durchgehende Öffnung für eine Sicherungsleine.

![Montage am Schultergurt — Solarpanel nach außen, Antennenblock oben](/manual-media/fbfv/02-mount.jpg)

Für die Reichweite zählt genau die obere Gehäusehälfte: Drücken Sie sie nicht an Metallteile, Akkus oder den Körper des Piloten und lassen Sie etwas Freiraum um sie herum. Cockpit-Stoff ist funkdurchlässig und stört nicht, das Gerät muss also nicht über das Cockpit hinausragen.

Richten Sie das Solarpanel nach außen zum Licht. Auf die genaue Ausrichtung kommt es nicht an — die Leistung hat reichlich Reserve.

Die Öffnung an der Unterseite neben der LED darf weder überklebt noch verstopft werden: sie ist zugleich Schallöffnung des Summers und Luftweg zum Barometer. Eine verschlossene Öffnung dämpft den Ton und verfälscht die Variometerwerte.

### Laden

Das Gerät lädt auf zwei Wegen.

Über die `USB-Type-C`-Buchse — an einem gewöhnlichen Ladegerät oder einem Computeranschluss. Ladegeräte, die ausschließlich Power Delivery beherrschen, funktionieren nicht.

Über das Solarpanel — dauerhaftes Nachladen bei Tageslicht. Im normalen Flugbetrieb gleicht das Panel den Verbrauch aus und verlängert die Zeit zwischen zwei Ladungen an der Steckdose deutlich.

### Akku, Lagerung und Transport

Im Inneren sitzt ein Lithium-Polymer-Akku, für den die bei dieser Chemie üblichen Regeln gelten.

Laden Sie das Gerät, solange jemand in der Nähe ist, und lassen Sie es nicht über Nacht am Ladegerät. Halten Sie es unter 60 °C: ein geschlossenes Auto in der Sonne und das Armaturenbrett hinter der Windschutzscheibe sind genau dieser Fall. Laden Sie nicht bei Frost — unter 0 °C darf Lithium nicht geladen werden, lassen Sie das Gerät erst aufwärmen. Öffnen Sie das Gehäuse nicht, und durchstechen oder quetschen Sie den Akku nicht: die `USB-Type-C`-Buchse ist der einzige Servicezugang.

Wenn sich das Gehäuse aufbläht, das Gerät beim Laden heiß wird oder es riecht, brechen Sie den Ladevorgang ab, bringen Sie es von brennbarem Material weg und schreiben Sie uns.

Zur Lagerung und für den Transport muss das Gerät **vollständig ausgeschaltet** werden — langer Tastendruck bei ausgeschalteter Einstellung `Bei Bluetooth nicht einschlafen`; in diesem Zustand liegt der Verbrauch im Mikroampere-Bereich. Für Flugreisen verlangen die Vorschriften dasselbe: Geräte mit Lithium-Akku gehören ausgeschaltet ins Handgepäck, niemals in den aufgegebenen Koffer. Der Akku hat rund 900 mAh (etwa 3,4 Wh) und liegt damit weit unter allen Grenzwerten — eine Genehmigung der Fluggesellschaft ist nicht nötig.

Eine lange Lagerung übersteht ein halb geladener Akku am besten. Laden Sie das Gerät alle paar Monate nach oder legen Sie es einfach ins Tageslicht — Tiefentladung verkürzt die Lebensdauer. Ein vollständiges Entladen "zur Kalibrierung" ist nicht nötig.

### Verbinden und Trennen über Bluetooth

Das Gerät muss eingeschaltet sein. Ein Koppeln (Pairing) über das Betriebssystem ist nicht nötig — die Verbindung stellt die App selbst her. Starten Sie ein unterstütztes Programm oder diesen Konfigurator, scannen Sie nach Geräten und wählen Sie das mit dem Namen `FBFV.XXXX`, wobei `XXXX` die letzten vier Zeichen der Kennung Ihres Exemplars sind. Halten Sie die Geräte nahe beieinander. Sehen Sie mehrere, wählen Sie das mit dem stärksten Signal.

Das Gerät nimmt **eine** Verbindung zur Zeit an. Solange eine andere App es belegt, sehen weitere Versuche wie langes Warten aus — schließen Sie die andere App oder warten Sie, bis sie die Verbindung trennt.

Taucht das Gerät zu lange nicht auf, drücken Sie einmal seine Taste: das Advertising schaltet für 30 Sekunden auf die schnellste Rate und fällt danach schrittweise auf die sparsame zurück. Verbinden ist in jedem Modus möglich, der sparsame braucht nur etwas länger.

Die Trennung erfolgt automatisch beim Verlassen der App. Das Gerät arbeitet eigenständig weiter: es vertont das Variometer und empfängt FANET.

### Firmware-Update

Die Firmware wird direkt aus diesem Konfigurator aktualisiert — über dieselbe Bluetooth-Verbindung, die bereits offen ist. Öffnen Sie die [Firmware-Liste](/update/firmware/fbfv), verbinden Sie sich mit dem Gerät und drücken Sie „Aktualisieren". Das Gerät startet selbst neu; lassen Sie es während des Updates in Ruhe und in der Nähe des Telefons.

Der Bootloader prüft die Signatur des Images, und eine neue Firmware wird im „Test"-Modus installiert — sie bestätigt sich selbst erst, wenn sie erfolgreich gestartet ist. Ein fehlgeschlagenes Update wird automatisch auf die vorherige Version zurückgerollt.

Web Bluetooth steht in Safari unter iOS nicht zur Verfügung — nutzen Sie dort den Browser Bluefy oder die App nRF Connect Device Manager mit der zuvor heruntergeladenen Datei `app_update.<Version>.bin`.

### Liste der Flugprogramme mit direkter Unterstützung

- LK8000 v.7.4.19+ (volle Unterstützung FANET + Druck)
- xcTrack v.0.9.11.10+ (statischer Druck, FANET-Empfang)
- SeeYou Navigator v.3.0.6+ (statischer Druck, FANET-Empfang)
- Flyskyhy v.8.2+ (statischer Druck)
- FlyMe (statischer Druck)
- TheFlightVario XC 2.38+ (statischer Druck)
- maps.flybeeper.com (volle Unterstützung FANET + Druck)

Hinweis: Kann ein Programm nur das Textprotokoll FNNGB, FBFAN oder FNF lesen, sehen Sie den gesamten FANET-Verkehr ohne Internetverbindung auf der Karte, andere Piloten sehen Sie jedoch nicht. Damit Ihre Position gesendet wird, müssen die Entwickler der App direkt mit der FANET-Charakteristik arbeiten — siehe den Abschnitt unten.

### Beschreibung des Kommunikationsprotokolls

Dieser Abschnitt richtet sich eher an Entwickler als an normale Nutzer.

Das Gerät arbeitet über BLE ohne Kopplung und Autorisierung. Werte stehen per Benachrichtigung zur Verfügung (Deskriptor 0x2902). Alle nicht standardisierten Charakteristiken haben eine 128-Bit-UUID, den Deskriptor 0x2901 mit Klartextnamen und 0x2904 mit Format, Exponent und Einheit.

Charakteristiken-UUIDs des Dienstes `0x181A` ESS

| Name        | UUID   | Size   | Exponent | Unit    |
| ----------- | ------ | ------ | -------- | ------- |
| Temperature | 0x2a6e | INT16  | -2       | Celcius |
| Pressure    | 0x2a6d | UINT32 | -1       | Pascal  |

Charakteristiken-UUIDs des Dienstes `0x1819` LNS

| Name              | UUID                                 | Size        | Exponent | Unit |
| ----------------- | ------------------------------------ | ----------- | -------- | ---- |
| Vario by pressure | b4df8385-16d2-4037-b2ed-2e14e1f4fa27 | INT16       | -2       | m/s  |
| RADIO_TX_RX       | fec81438-cb89-4c37-93d0-badfced4376e | UINT8 array |          |      |

Der Funk arbeitet in zwei Betriebsarten — Empfang und Senden. Der Empfang wird durch das Abonnieren der Benachrichtigungen der Charakteristik `fec81438-cb89-4c37-93d0-badfced4376e` aktiviert, das Senden durch das Schreiben eines Byte-Arrays in dieselbe Charakteristik. Das Array ist auf 40 Byte begrenzt. Der Sender ist einkanalig: zu einem Zeitpunkt empfängt oder sendet das Gerät auf einer Frequenz mit den aktuellen Einstellungen. Eine App kann die Frequenz wechseln und abwechselnd verschiedene Kanäle abhören — so entsteht ein Multiprotokoll-Betrieb.

Charakteristiken-UUIDs des Dienstes `0x180F` BAS

| Name            | UUID                                 | Size  | Exponent | Unit    |
| --------------- | ------------------------------------ | ----- | -------- | ------- |
| Battery level   | 0x2a19                               | UINT8 | 0        | Percent |
| Battery voltage | b0c889e8-16d2-45ef-b615-387f6bca2370 | INT16 | -3       | Volt    |

Charakteristiken-UUIDs des Dienstes `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` Nordic UART. Der Dienst existiert aus Kompatibilitätsgründen mit älteren Apps und wird für Neuentwicklungen nicht empfohlen — er ist deutlich energiehungriger.

| Name | UUID                                 | Size        |
| ---- | ------------------------------------ | ----------- |
| TX   | 6E400003-B5A3-F393-E0A9-E50E24DCCA9E | UINT8 array |

Solange die Charakteristik `fec81438-cb89-4c37-93d0-badfced4376e` nicht abonniert ist, wird in `TX` eine Zeichenkette im Format `FNNGB`, `FBFAN` oder `FNF` geschrieben — abhängig von der Einstellung `fanet_uart_protocol`. Der Druck wird als `PRS`- oder `POV`-Zeichenkette gesendet — abhängig von der Einstellung `uart_protocols`.

Charakteristiken-UUIDs des Dienstes `0x180A` DevInfo

| Name              | UUID   | Size   | Value     |
| ----------------- | ------ | ------ | --------- |
| Model Number      | 0x2A24 | STRING | FBFV      |
| Manufacturer Name | 0x2A29 | STRING | FlyBeeper |
| Firmware Revision | 0x2A26 | STRING | 0.24.0    |
| Hardware Revision | 0x2A27 | STRING | 1         |

Firmware-Updates laufen über das SMP-Protokoll (MCUmgr) — Dienst `8d53dc1d-1db7-4cd3-868b-8a527460aa84`, Charakteristik `da2e7828-fbce-4e01-ae9e-261174997c48`.

### Einstellungen

Normalerweise verwaltet eine externe App die Einstellungen, Sie können sie aber auch von Hand in diesem Konfigurator ändern. Drücken Sie `Verbinden`, wählen Sie `FBFV.XXXX` aus der Liste und halten Sie die Geräte nahe beieinander. Ändern Sie einen Parameter und drücken Sie `Anwenden`.

Einstellungen des FANET-Funks:

| Name                | UUID                                 | Size   | Values                                                                |
| ------------------- | ------------------------------------ | ------ | --------------------------------------------------------------------- |
| frequency           | 8d8e8809-4697-41fc-8ee2-ca0b999354ec | UINT32 | 868200000\* — EU, 920800000 — US, 866200000 — IN, 923200000 — KR (Hz) |
| bandwidth           | f19422e2-982a-4954-9a75-b38927236a59 | INT8   | 1\* — 250, 2 — 500 (kHz)                                              |
| coding_rate         | 17a95752-3c12-438f-9244-4f4612a1ab49 | INT8   | 1\* — 4/5, 2 — 4/6, 3 — 4/7, 4 — 4/8                                  |
| datarate            | 108b855f-11cd-4bc5-adee-eafce49bc77a | INT8   | 7\* — SF_7, 8 — SF_8, 9 — SF_9, 10 — SF_10, 11 — SF_11, 12 — SF_12    |
| tx_power            | 8ef0c42e-adb6-4897-b9c9-6fe93143faf4 | INT8   | -9 (min), 14\*, 22 (max) (dBm)                                        |
| fanet_uart_protocol | 9d9a9cd9-65ed-4d73-91ad-20cfdb5dbbba | INT8   | 1\* — FNNGB, 2 — FBFAN, 3 — FNF                                       |

`*` — Standardwerte

Einstellungen für Ton und Variometer:

`Summerlautstärke` — Stufe von 0 (aus) bis 3 (Maximum), Standard 1. Derselbe Parameter wird durch kurzen Tastendruck weitergeschaltet.

`Beginn des Steigens` — Vertikalgeschwindigkeit, oberhalb derer der Steigton einsetzt. Standard 0,05 m/s.

`Beginn des Sinkens` — Vertikalgeschwindigkeit, bei der der Sinkton einsetzt. Standard -2,5 m/s.

`Steigflug-Hysterese` — um wie viel früher der Ton am Ende des Steigens verschwindet, gemessen an der Einschaltschwelle. Standard 0,25 m/s.

`Vario-Durchschnittszeit` — zusätzliche Glättung. Wirkt nur auf den Ton, nicht auf den über Bluetooth übertragenen Druck. Standard 0,1 s.

`Sanfte Frequenzänderung` — die Frequenz passt sich innerhalb eines Variozyklus an, statt zu dessen Beginn festgelegt zu werden. Der Klang ähnelt dann Variometern mit gleitend ansteigendem Ton. Standardmäßig aus.

`Am Boden still` — das Gerät merkt sich beim Einschalten den aktuellen Druck und schaltet den Ton erst frei, nachdem sich die Höhe um etwa 1,5 Meter geändert hat.

`Vario, Frequenz, Zyklus, Tastverhältnis` — eine Tabelle aus zwölf Punkten, die Frequenz (Hz), Periode (ms) und Tastverhältnis (%) der Vertikalgeschwindigkeit (cm/s) zuordnet. Die Punkte werden direkt im Diagramm per Ziehen bearbeitet.

`Vario simulieren` — geben Sie eine beliebige Vertikalgeschwindigkeit ein und hören Sie, wie das Gerät dabei klingt. Die Lautstärke muss dafür über null liegen.

`Ende des kleinen Steigens` und `Ende des kleinen Sinkens` — Grenzen des Grenzwertmodus (veraltete Parameter, aus Kompatibilitätsgründen erhalten).

Einstellungen für Verhalten und Energie:

`UART-Protokoll` — Textprotokoll zur Druckübertragung für Programme, die die alte UART-Emulation nutzen. Unterstützt werden `PRS` und `POV`. Es lässt sich abschalten (0), wenn die App den Druck über den ESS-Dienst liest.

`Datenverdopplung im UART-Emulator` — der Druck wird sowohl über ESS als auch über die UART-Emulation gesendet. Sind beide Charakteristiken abonniert, schweigt UART normalerweise, um Daten nicht doppelt zu senden; aktivieren Sie diesen Parameter für Apps, die alles abonnieren, aber nur UART auswerten.

`LED-Blinken nach Vario` — die LED blinkt umso schneller, je höher die Vertikalgeschwindigkeit ist.

`Bluetooth schläft nie` — legt fest, was ein langer Tastendruck bewirkt: aus bedeutet vollständiges Ausschalten, ein bedeutet „verstummen, aber erreichbar bleiben" (siehe „Bedienung").

`Zeit bis zur automatischen Abschaltung` — in Sekunden, 0 deaktiviert die automatische Abschaltung.

### Support und Garantie

Fragen, Anmerkungen und alles, was schiefgelaufen ist — in den Chat [t.me/flybeeperchat](https://t.me/flybeeperchat) oder per E-Mail an [flybeeper@alpisto.eu](mailto:flybeeper@alpisto.eu). Neuigkeiten zur Firmware stehen im Kanal [t.me/flybeeper](https://t.me/flybeeper). Nennen Sie dabei die Seriennummer `FBFV.XXXX` und die Firmware-Version — beides steht im Bereich `Update firmware` des Konfigurators.

Die Garantie beträgt nach slowenischem und europäischem Recht zwei Jahre: kostenlose Reparatur oder Austausch. Rückgabe — 14 Tage ab Erhalt ohne Angabe von Gründen, die Erstattung erfolgt innerhalb von 14 Tagen nach Eingang des Geräts bei uns. Abwicklung über [market.flybeeper.com](https://market.flybeeper.com) oder per derselben E-Mail.

Nicht abgedeckt sind mechanische Beschädigungen, ein geöffnetes Gehäuse und die Folgen improvisierter Ladeversuche. Firmware-Updates sind ausdrücklich erlaubt und berühren die Garantie nicht — den Rückfall auf die vorherige Version leistet der Bootloader selbst.

Verkauf: Alpisto d.o.o., Slowenien.

<route lang="yaml">
meta:
  layout: manual
</route>
