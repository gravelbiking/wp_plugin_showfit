# Verifikation

Stand: 31.10.2026, Version 1.0.0. Die Grundprüfungen verwenden unabhängige synthetische Dateien. Zusätzlich wurde die Version lokal mit echten ROUVY- und Wahoo-ACE-FIT-Dateien des Nutzers geprüft; persönliche Trainingsdaten und Vorschauen sind nicht Teil des Plugin-/Quellcode-Pakets.

## Freigabe des Releases 1.0.0

Version 1.0.0 übernimmt den zuletzt vollständig geprüften Funktions- und Bibliotheksstand von 0.4.3. Die Versionsangaben und Release-Unterlagen sind aktualisiert; die ausführlichen Browser- und Echtdatenprüfungen unten stammen aus dem unmittelbar vorhergehenden Durchlauf von 0.4.3. Für die Release-Kennung werden die zwölf Node-Tests sowie Paketkonsistenz, Quellcode-/Lizenzvollständigkeit und der reproduzierbare Neuaufbau aus dem fertigen Installations-ZIP erneut geprüft. Die Laufzeit-Assets und fachlichen PHP-Quellen sind dabei bytegleich zum geprüften Stand.

## Bibliotheksaktualisierung in 0.4.3

- Aktuelle stabile npm-Versionen direkt aus der Registry abgeglichen: Leaflet 1.9.4, Chart.js 4.6.1, @kurkle/color 0.6.5 und esbuild 0.28.2 aktualisiert; die übrigen aktiven Bibliotheken sind bereits aktuell. Details in `DEPENDENCIES.md`.
- 12 Node-Tests bestehen: die bisherigen zehn FIT-/GPX-/TCX-Importerprüfungen und zwei zusätzliche Integrationsprüfungen von Chart.js mit der ausdrücklich überschriebenen aktuellen Color-Abhängigkeit. Geprüft werden unter anderem die gemeinsame Color-Klasse, Diagrammfarben, Hover-Farben, Alpha und Canvas-Gradienten/-Muster.
- 39 PHP-Daten-/Speicherprüfungen und 13 PHP-Geometrieprüfungen bestehen erneut mit der vorhandenen PHP-WASM-Laufzeit.
- Vollständiger WordPress-Browserdurchlauf mit 22 erfolgreichen Prüfungen erneut ausgeführt. Zusätzlich bestehen drei Gutenberg-Prüfungen einschließlich FIT-Import im Editor-Iframe sowie 13 Prüfungen des privaten Kartenmodus mit der echten aktualisierten Leaflet-Bibliothek. Diese reproduzierbaren Tests beantworten Kartenkacheln lokal.
- `tools/dependency-update-test.mjs` prüft zwei echte FIT-Dateien über die reguläre WordPress-Importoberfläche: ROUVY mit 1.414 Records und Wahoo ELEMNT ACE mit 9.675 Records. Originaldownloads sind bytegleich; die vollständigen decodierten Inhalte und alle Zeit-/GPS-/Höhen-/Sensorwerte entsprechen der Importerausgabe. Die browserseitig geladenen Bibliotheken melden Leaflet 1.9.4 und Chart.js 4.6.1.
- Echte OpenStreetMap-Kacheln werden erst nach dem Besucherklick geladen; deren Nutzung wurde vom Nutzer erlaubt. Strecke, Diagrammgeometrie, gemeinsame Messwertanzeige, Umschaltung Zeit/Distanz sowie Desktop- und 390-px-Mobilansicht bestehen ohne JavaScript-Fehler. ROUVY zeigt Höhe, Leistung, Herzfrequenz und Kadenz; die Wahoo-Datei zeigt die drei tatsächlich vorhandenen Kanäle Höhe, Herzfrequenz und Kadenz, ohne Leistung zu erfinden.
- Der dabei gefundene mobile Überlauf langer, aus Dateinamen übernommener Aktivitätstitel wurde durch zulässigen Zeilenumbruch behoben. Beide echten Aktivitäten bestehen danach den Mobiltest. Screenshots wurden lokal visuell geprüft.
- Testumgebung: isoliertes WordPress 6.8.3/Playground und Headless Google Chrome. Die PHP-Laufzeit meldet in der tatsächlichen WordPress-Systeminformation PHP 8.5.10. Für den größeren vollständigen Wahoo-Import wurden `WP_MEMORY_LIMIT` und `WP_MAX_MEMORY_LIMIT` in dieser Testumgebung ausdrücklich auf 1024M gesetzt; mit der ursprünglichen niedrigeren WordPress-Vorgabe schlug dieser große Import fehl. Dies ist kein ermittelter Mindestspeicherbedarf. Die produktiven Hosting-Limits wurden nicht verändert oder getestet.
- Frischer Plugin-Neuaufbau in einem separaten temporären Ordner ausschließlich mit den mitgelieferten Quellen, eigener `node_modules`-Installation und Plugin-Lockdatei. Alle vier geprüften erzeugten Assets stimmen byteweise mit dem Release-Build überein: Editor SHA-256 `a3b0a9022d79ea911c68287bee22a559b9e372d1e2eb25c2f56e2c2d8845ff6d`, Chart.js `615d12acaf4025b811b8524ceda511551e43a6a44423e643e81be3ebf76a9f6a`, Leaflet-JavaScript `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a`, Leaflet-CSS `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6`.
- Alle 349 bevorzugten Bibliotheksquelldateien wurden gegen das neue Quellenmanifest geprüft. Die Paketierung weist zusätzlich nicht erfasste oder fehlende Dateien zurück; Lizenzen wurden mit den Originalen aktualisiert.
- Erneuter OSV-Abgleich der 37 exakten Paket-/Versionspaare ohne Treffer. Der weiterhin veröffentlichte, umstrittene Leaflet-CVE wird davon getrennt in `DEPENDENCIES.md` dokumentiert und nicht als durch das Versionsupdate behoben dargestellt.

Die folgenden Abschnitte dokumentieren zusätzlich die bisherigen Prüfungen der Vorversionen.

## Automatische Datenprüfungen

- JavaScript-Importer: 10 erfolgreiche Tests. FIT-Ersteller und Creator-Gerät einschließlich Produktnamen; FIT mit mehr als 500 Records, mehrere FIT-Sessions/Runden, Indoor-FIT, echte Nullleistung, fehlende Sensoren, Enhanced Altitude, CRC-/Strukturfehler, GPX ohne Zeitstempel mit mehreren Tracks/Segmenten und Sensorextensions, Indoor-TCX mit mehreren Runden und fehlender Geschwindigkeit, DTD/Entitäten, falsche XML-Wurzeln und Dateigrenzen.
- Zusätzlicher Regressionstest für FIT-ArrayBuffers aus einem anderen JavaScript-Realm (Gutenberg-Iframe).
- PHP-Modell/Speicher/Metadaten: 39 Prüfungen. Vollständiger JS→PHP-Übergang, Sekunden statt Millisekunden, getrennte Dauer/Timerzeit, Entfernungsresets, fehlende Daten, Nullwerte, Zeitgewichtung, Sensorabdeckung, Arbeit, Timerereignisse, Datenlücken, doppelte Zeitstempel, Segmentgrenzen, Filterung öffentlicher Daten, numerische Validierung, bytegenauer Original-Roundtrip, Chunking und Rollback eines fehlgeschlagenen Reimports.
- PHP-Datenprüfungen unter PHP 7.4 und PHP 8.5.10 mit einer isolierten PHP-WASM-Laufzeit ausgeführt. PHP-Dateien zusätzlich auf Syntax geprüft.
- JavaScript-Quelldateien und Viewer auf Syntax geprüft; Editorbundle mit festgelegten Abhängigkeiten erfolgreich erstellt.
- Version 0.2.0: korrigierte `@kurkle/color`-Lizenz bytegleich zum mitgelieferten Original; Originalquellen aller sieben Laufzeitbibliotheken einschließlich ihrer bevorzugten Bearbeitungsformen, Versionen und Einzeldatei-Prüfsummen im Plugin-ZIP vorhanden.
- Frischer Installationsbuild ausschließlich mit den im Plugin enthaltenen `package.json`, `package-lock.json` und `src/` geprüft: `npm ci --ignore-scripts --offline` mit lokalem Paketcache und anschließender Editorbuild erfolgreich. Kein bereits vorhandener Projekt-`node_modules`-Ordner wurde für diesen Build verwendet.
- Zusätzlich das erzeugte Installations-ZIP in einen neuen Ordner entpackt und dort `npm ci --ignore-scripts --offline` und `npm run build` ausgeführt: Das Editorbundle wurde bytegenau reproduziert (SHA-256 `12c8a71813e14fe55e18e49ff3a1ec9da2bb56088ab8b674fe6571ca7cd8bba8`).

## WordPress und Browser

Isolierte WordPress-6.8.3-Installation mit PHP 8.3, SQLite-Integration von WordPress Playground und Headless Google Chrome. Getestet wurden:

- Aktivierung des Plugins über das WordPress-Backend.
- Echter Browser-FIT-Import mit Datei-Upload, privater Datenhaltung und Entwurfsstatus.
- Ablehnung anonymer Entwurfsabfragen und Importanfragen.
- Entwurfsvorschau mit Karte und vier Diagrammen.
- Geschützter Originaldownload, bytegleich mit der Ausgangsdatei, und JSON-Archiv mit allen Records und FIT-Rohmeldungen.
- Veröffentlichung und öffentliche API mit korrigierten Zeitwerten ohne Roharchiv.
- Zwei Shortcodes und ein Gutenberg-Block derselben Aktivität auf einer Seite: drei eigene Karten und zwölf Diagramme, eindeutige Container-IDs.
- Diagramm-Hover, Umschaltung zwischen Zeit-/Distanzachse und Darstellung bei 390 px Breite ohne Seitenüberlauf.
- Serverseitige Entfernung nicht freigegebener Herzfrequenzwerte.
- Reimport unter gleicher ID mit neuer Indoor-Datei: vier neue statt acht alter Messpunkte, keine alte Karte, beibehaltene Freigabeeinstellungen.
- GPX- und TCX-Upload über die tatsächliche Browser-/Serverschnittstelle.
- Gutenberg-Block im Editor-Iframe, gespeicherte Aktivitäts-ID sowie Import einer neuen FIT-Datei direkt im Block.
- Version 0.3.0: erneut 22 erfolgreiche Prüfungen im bisherigen vollständigen Browserdurchlauf. Darunter Website-Freigabe über die echte Settings-API, keine OpenStreetMap-Anfrage bei deaktiviertem Dienst, nach bloßer Website-Aktivierung oder nach Ablehnung; Laden nur nach Besucherklick für die konkrete Ansicht; Schließen der Karte und erneute Freigabe nach Neuladen der Seite; kanonischer Kachelhost, Referrer und sichtbare Attribution. Die Testkacheln wurden im Browser lokal beantwortet; es wurden dabei keine Anfragen an den echten Kartendienst geschickt.

Für reproduzierbare Browserprüfungen werden OpenStreetMap-Kacheln durch ein transparentes Testbild ersetzt; Kartengeometrie, Marker, Einpassung und Größenänderung laufen mit der echten Leaflet-Bibliothek. Der Kachelserver selbst ist damit kein getesteter Bestandteil.

## Anzeigeprüfung in 0.3.1

Ein zusätzlicher vollständiger Browserdurchlauf hat 13 erfolgreiche Prüfungen:

- Alle 13 Datenfelder standardmäßig eingeschaltet; Speichern globaler Vorgaben über die echte WordPress-Settings-API.
- ROUVY-, Zwift- und Wahoo-ACE-FIT-Dateien mit unabhängigen synthetischen Creator-Metadaten über die Importoberfläche eingelesen und veröffentlicht.
- Startdatum `dd.mm.yyyy` ohne Uhrzeit einschließlich Vergleich gegen die Website-Zeitzone Europe/Berlin.
- Manuelle Aktivitätszuordnung am Datensatz bleibt nach Speichern und Reimport erhalten.
- Neue Gutenberg-Blöcke übernehmen globale Vorgaben; Dropdown und einzelne Feldschalter bleiben nach tatsächlichem Speichern und Neuladen des Beitrags erhalten.
- Spätere globale Änderungen überschreiben bestehende Blockauswahlen nicht.
- Frontend zeigt pro Block eigene Aktivitätsart und eigene Feldauswahl, einschließlich vollständig ausgeblendeter Datenfelder und alter Blöcke ohne Feldauswahl.
- Datenfeld-Hintergründe für ROUVY lila, Zwift orange, Outdoor hellgrün; keine OpenStreetMap-Anfrage ohne Besucherklick. Alle Diagramme bleiben nutzbar.
- Desktop- und Mobilansicht bei 390 px ohne Seitenüberlauf und ohne JavaScript-Fehler; Screenshots visuell geprüft.

Die 11 zusätzlichen PHP-Prüfungen sichern unter anderem ab, dass gekoppelte Sensoren nie als Aufnahmegerät dienen, Indoor-Sessionangaben vor Geräte-/GPS-Heuristiken gelten, Seriennummern nicht an die öffentliche Präsentation gelangen und globale Vorgaben auch sämtliche Felder ausschalten können.

Zusätzlich wurden die Ersteller-/Gerätemetadaten zweier echter FIT-Dateien aus dem Training-Ordner mit dem Parser gelesen und durch die neue PHP-Erkennung verarbeitet: ROUVY wird als ROUVY vorgeschlagen, die Wahoo-Datei als Outdoor mit Aufnahmegerät „Wahoo ELEMNT ACE“. Diese persönlichen Quelldateien und Testmetadaten werden nicht mitgeliefert.

## Device-Vorgaben in 0.3.1

Acht zusätzliche Browserprüfungen mit `tools/device-visibility-test.mjs` bestehen:

- Automatische Ausblendung für ROUVY und Zwift, auch in bestehenden Blöcken ohne neue manuelle Vorgabe; Outdoor folgt der Feldauswahl.
- Ausdrückliches Ein-/Ausschalten hat Vorrang vor automatischer Artzuordnung und globaler Vorauswahl. Unbekannte Moduswerte fallen auf Automatik zurück.
- Entsprechende Shortcode-Optionen und ausdrücklich angegebene Feldlisten.
- Blockeditor zeigt den passenden Schalterzustand für erkannte und manuell ausgewählte Aktivitätsarten. Andere Feldschalter lösen keine manuelle Device-Auswahl aus.
- Manuelle Device-Auswahl bleibt bei Artwechsel, nach Speichern/Neuladen und im öffentlichen Frontend erhalten.
- Rückkehr zur automatischen Steuerung stellt die passenden Vorgaben wieder her.
- Keine JavaScript-Fehler.

Das Datenfeld heißt im Frontend, Block und in der Verwaltung „Device“. „Start“ zeigt nur das Datum; die zugrunde liegenden vollständigen Zeitstempel bleiben erhalten. Die bestehenden 13 Anzeigeprüfungen und 39 PHP-Prüfungen wurden für 0.3.1 erneut ausgeführt, ebenso die 10 Importer-Tests. Die lokale echte FIT-Vorschau wurde mit dem neuen Renderer aktualisiert: ROUVY ohne Device-Feld, Wahoo mit Device-Feld, beide mit Datum ohne Uhrzeit. Alle sieben vorhandenen Diagramme bleiben nutzbar, ohne externe Kartenanfragen.

## Privater Outdoor-Kartenmodus in 0.4.0

- 13 neue PHP-Geometrieprüfungen unter PHP 7.4 und PHP 8.5: mindestens 500 Meter an beiden Enden, Rundtouren mit erneutem Vorbeifahren, kurze Strecken, Segment-/Zeitlücken, fehlende und unvollständige GPS-Werte, Rundenpositionen, globale Vorgaben und explizite Ausnahmen. Originalarrays, sämtliche Trainingswerte und Zusammenfassungen bleiben erhalten.
- Bestehende 39 Modell-/Speicherprüfungen sowie 10 JavaScript-Importer-Tests bestehen weiterhin.
- Der bisherige vollständige Browserdurchlauf besteht mit 22 Prüfungen, einschließlich drei unabhängiger Karten, OSM-Zustimmung, privater Archive, Reimport und Mobilansicht.
- 13 zusätzliche Browserprüfungen mit echter GPX-Importoberfläche, gespeichertem vollständigem Original und einer 3,3-km-Teststrecke. Kontrolliert werden serverseitig bereinigte GPS-Punkte, unveränderte Trainingswerte, globale Vorgabe bei bestehenden Ansichten, Ein-/Aus-Ausnahmen, gespeicherte Gutenberg-Auswahl, verschachtelte/wiederverwendete Blöcke, maskierte Shortcodes und unveränderte ROUVY-/Zwift-Karten.
- Manipulierte Typ-/Privatmodusparameter, fehlende oder erfundene Beitragskontexte, fremde Autoren und unveröffentlichte beziehungsweise entfernte Beitragskontexte geben keine geschützten GPS-Koordinaten frei.
- Auf der echten Leaflet-Karte werden keine Start-/Zielmarker erzeugt; der Diagrammzeiger stellt ausgeblendete Startpositionen nicht wieder her. Der verlangte Hinweis steht nach dem Laden unter der Karte. Screenshot visuell geprüft. OSM-Kacheln werden in diesen Prüfungen lokal beantwortet.

Zusätzlich wurde die neue Serverfilterung auf die bereits lokal importierten Daten der echten Wahoo-ACE-Tour angewandt: Alle 9.675 Trainingsmesspunkte bleiben erhalten; von 9.675 GPS-Punkten bleiben 9.433 öffentlich sichtbar. Kein sichtbarer Punkt liegt näher als 500 Meter am ursprünglichen Start oder Ziel. Persönliche Dateien und Ergebnisdaten sind nicht Bestandteil der Archive.

## Automatischer Dateiimport in 0.4.1

Neun gezielte Browserprüfungen mit `tools/automatic-import-test.mjs` bestehen:

- Neue Aktivität über die normale WordPress-Oberfläche angelegt: Dateiauswahl startet ohne weiteren Klick den Import und zeigt alle Diagramme und die Kartenfreigabe unmittelbar, ohne Seitenwechsel.
- Auto-Entwurf wird unter gleicher ID als regulärer Entwurf gespeichert; ohne eigenen Titel wird der Dateiname verwendet.
- Während des Uploads sind die Dateiauswahl und Veröffentlichungsbuttons gesperrt und der Ladezustand wird angezeigt.
- Geräte-/Herkunftsvorschlag und geschützte Downloadlinks erscheinen direkt. Originaldownload ist bytegleich; anonyme Besucher können den Entwurf nicht abrufen.
- Eine weitere Auswahl aktualisiert dieselbe Vorschau und ID, ohne Titel, Veröffentlichungsstatus, Aktivitätsart oder Sensorfreigaben zurückzusetzen.
- Ungültige FIT-Dateien melden einen Fehler und lassen vorherige Daten und Diagramme erhalten. Danach sind die Eingaben wieder verfügbar; eine korrigierte Datei gleichen Namens lässt sich erneut einlesen.
- Eigene Titel vor dem ersten Upload bleiben erhalten und werden gespeichert.
- Auch die separate Importseite zeigt die Aktivität nach der Auswahl unmittelbar ohne Importbutton.
- Keine JavaScript-Fehler; Screenshot der direkten Vorschau visuell geprüft.

Alle bisherigen Browserwerkzeuge verwenden jetzt die Dateiauswahl als Importauslöser. Der vollständige bisherige Browserdurchlauf besteht erneut mit 22 Prüfungen. PHP-Quelldateien wurden zusätzlich auf Syntax unter PHP 7.4 geprüft; die zehn Importer-Tests bestehen weiterhin.

## FIT-Titelvorschläge in 0.4.2

13 Browserprüfungen mit `tools/title-suggestion-test.mjs` bestehen, einschließlich der echten Wahoo-ACE-Datei:

- Workout-Name aus einer unabhängig erzeugten gültigen FIT-Datei wird ohne eigenen Titel als bearbeitbarer WordPress-Titel verwendet. Sonderzeichen und Ampersands erscheinen als Klartext.
- Ein vor dem Upload eingegebener eigener Titel hat Vorrang; der FIT-Vorschlag bleibt separat verfügbar.
- Übernehmen, freie Änderung, Speichern und Neuladen; bestehender eigener Titel bleibt beim Reimport erhalten.
- Anonyme Antworten enthalten den gewählten Titel, aber keine privaten Vorschläge oder Herkunftsdateinamen.
- Dateiname als Ersatz, expliziter Aktivitätsname vor Workout-Name, Überspringen leerer/Markup-Werte und Unterstützung decodierter Namenslisten.
- Geräte-, Sportprofil- und Streckennamen werden nicht als Aktivitätsnamen verwendet.
- Automatische Importseite und direkte Block-/API-Importe folgen derselben Priorität.
- Echte Wahoo-ACE-Datei über die normale Dateioberfläche importiert: Titelvorschlag entspricht dem gespeicherten Workout-Namen; sämtliche 9.675 Messpunkte bleiben erhalten. Drei vorhandene Diagrammkanäle werden angezeigt, ohne fehlende Leistung zu erfinden.
- Keine JavaScript-Fehler. Screenshot der Titelvorschläge und der direkten Vorschau visuell geprüft.

Die zehn Importer-Tests bestehen weiterhin, alle PHP-Quelldateien sind unter PHP 7.4 syntaktisch gültig. Persönliche Ausgangsdateien und Screenshots werden nicht mitgeliefert.

## Praktische Grenzen der Prüfung

### Zusätzlicher Test mit einer echten FIT-Datei

Die Originaldatei wurde über die reguläre Browser-Importoberfläche in einer lokalen WordPress-Testinstallation eingelesen. Alle Records einschließlich GPS, Zeitstempel, Höhe, Leistung, Herzfrequenz, Kadenz und ursprünglicher Distanz wurden mit der Decoderausgabe verglichen. Der geschützte Originaldownload wurde byteweise mit der Quelldatei abgeglichen. Zeitgewichtete Sensor-Mittelwerte wurden unabhängig aus den Original-Zeitintervallen nachgerechnet.

Dieser Test deckte einen Präzisionsfehler bei der Gesamtdauer auf: Der Abstand zwischen erstem und letztem Record kann kürzer als die tatsächliche Sessiondauer sein. Version 0.1.1 verwendet vorhandene präzise Sessiondauern und bei mehreren Sessions deren gesamte Zeitspanne. Zwei zusätzliche PHP-Regressionstests sichern dieses Verhalten ab.

Karte und alle Trainingsdiagramme wurden zusätzlich mit echten OpenStreetMap-Kacheln sowie synchronisiertem Diagrammzeiger geprüft. Das Laden dieser Kacheln wurde vom Nutzer ausdrücklich erlaubt. Private Ergebnisdateien und Screenshots liegen ausschließlich im ignorierten lokalen Testausgabeordner.

### Weiterhin nicht abgedeckt

Die konkrete produktive WordPress-Seite, deren Theme, Hosting-Limits und zusätzliche Plugins wurden nicht verändert oder getestet. Eine sehr große Dateisammlung, jeder Gerätehersteller und jedes mögliche FIT-Developer-Feld sind nicht durch diese Beispieldateien abgedeckt. Für unbekannte Felder bleiben Originalbytes und FIT-Rohmeldungen erhalten. Die Website kann mit dem ZIP installiert und anschließend mit eigenen Dateien überprüft werden.

Testwerkzeuge und synthetische Dateigeneratoren liegen im separaten Quellcode-Projektpaket. Die WordPress-Installationsdatei enthält die Bearbeitungsquellen und Build-Eingaben einschließlich Bibliotheksquellen, aber keine persönlichen Testdaten, installierten `node_modules`-Ordner oder Browserwerkzeuge.
