# Verifikation

Stand: 01.11.2026, Version 1.1.0. Die bisherigen Grund- und Echtdatenprüfungen der veröffentlichten Versionen bleiben unten dokumentiert; persönliche Trainingsdaten und Vorschauen sind nicht Teil des Plugin-/Quellcode-Pakets.

## Release 1.1.0 und Rundentabelle

Die Rundentabelle ist jetzt in neuen und bisherigen Einbindungen ohne ausdrückliche Aktivierung ausgeschaltet. Der neue Blockschalter „Rundentabelle“ speichert `showLaps`; Shortcodes verwenden `laps="yes"`. Die Zeitspalte zeigt Bewegungszeit statt Timerzeit. Sie wird auch für alte Archive beim Lesen berechnet, ohne Originale oder vorhandene Timerwerte zu verändern.

Die Berechnung verwendet dieselben Kriterien wie die Aktivitätssumme: Distanzzuwachs beziehungsweise Geschwindigkeit, Timer-Stopp-/Start-Ereignisse und gültige Intervalle von höchstens 30 Sekunden innerhalb desselben Segments. Zeitgrenzen zwischen Messpunkten werden exakt geschnitten. Fehlende Bewegungsdaten oder Rundengrenzen ergeben unbekannte Bewegungszeit statt eines Ersatzes durch Timerzeit. Überlappende Runden werden unterstützt; die Berechnung scannt nicht für jede Runde die vollständige Messreihe.

Für den Release-Kandidaten bestanden 20 Node-Tests sowie unter PHP 7.4.33 insgesamt 50 Modell-/Speicherprüfungen, 28 Schaltungsprüfungen und 13 Privatmodusprüfungen. Die neuen Fälle prüfen Pausen innerhalb einer Runde, geschnittene/fractionale Rundengrenzen, Stillstand, überlappende Runden, unbekannte Werte, Aufzeichnungslücken und Sessions.

16 Browserprüfungen mit der echten FIT-Datei bestanden. Die Rundentabelle bleibt im Standard verborgen, lässt sich in Gutenberg und im Shortcode einschalten und bleibt nach Speichern/Neuladen erhalten. Die Bewegungszeit der echten Einzelrunde stimmt mit der Bewegungszeit der Aktivität überein und unterscheidet sich von ihrer Timerzeit. Vollständige Originaldatei, alle 4.515 Records, Schaltungsdaten, Datenschutzfilter und Pausenlinien bleiben geprüft. Die 13 bestehenden Anzeigeprüfungen bestanden ebenfalls.

Die Updaterklasse wurde vor ihrer ersten stabilen Veröffentlichung erneut geprüft: 91 lokale WordPress-/Installerprüfungen und acht native Browserprüfungen mit simulierten GitHub-Antworten bestanden. Falsche Pakete werden abgelehnt; ein gültiges simuliertes Update auf 2.0.0 erhält Originalarchive, Aktivitätsdaten und Einstellungen. Tatsächliche WordPress-Testlaufzeit: WordPress 7.1.4 / PHP 8.5.10. Die Tests verändern keine produktive Website und legen kein simuliertes öffentliches Release an.

Die Paketierung kontrolliert Versionskonsistenz, bevorzugte Bibliotheksquellen und Lizenzdateien, ZIP-Inhalte und Prüfsummen. Installations- und Quellcodepaket sowie Update-Metadaten gehören zu derselben Version 1.1.0. Persönliche FIT-Dateien und Vorschauen werden ausgeschlossen. Bei einem Update von 1.0.0 ist einmal die manuelle Installation erforderlich, weil 1.0.0 noch keinen Updater enthält.

Die zwölf Laufzeit-Assets wurden zusätzlich aus den bevorzugten Quellen im entpackten Installations-ZIP mit den installierten, gesperrten Abhängigkeiten neu gebaut. Alle zwölf Dateien reproduzieren sich bytegleich.

Die nachfolgenden Abschnitte dokumentieren die zuvor durchgeführten Einzelprüfungen des Arbeitsstands, aus dem 1.1.0 entstanden ist.

## Timer-Vorgabe, Bewegungszeit-Beschriftung und Pausenlinien in 1.0.1-dev

Timerzeit ist ohne eigene Vorgabe deaktiviert. Explizite Feldlisten, gespeicherte Blockauswahlen und eigene globale Vorgaben bleiben erhalten; im Beitragsblock kann die Timerzeit eingeschaltet werden. Die Beschriftung lautet im Backend, Editor und Frontend „Bewegungszeit“. Ihre Berechnung wurde nicht verändert.

Höhe, Herzfrequenz und Kadenz führen bei belegten Aufzeichnungspausen oder erkanntem Stillstand den letzten bekannten Wert horizontal weiter. Nur Anzeige-Punkte werden ergänzt. Diese Abschnitte sind gestrichelt und im Diagrammzeiger als „fortgeführt“ gekennzeichnet. Neue echte Messwerte bleiben erhalten. Fehlende Werte während der Fahrt, Segmentgrenzen, Leistung und GPS-Strecke bleiben von dieser Ergänzung ausgenommen. Sind vor einer Pause bereits Sensorwerte ausgefallen, beginnt die Fortführung erst innerhalb der belegten Pause; die vorherige Lücke bleibt sichtbar. Die öffentliche Antwort ergänzt ausschließlich relative Pausenintervalle, keine rohen Timer-/Gerätemeldungen.

- 20 Node-Tests bestanden, darunter sieben gezielte Diagrammprüfungen für lange und kurze Pausen, Stillstand ohne Timerereignisse, unklare Lücken, Sessiongrenzen, unveränderte reale Messpunkte, fehlende Sensorwerte vor/innerhalb einer Pause, offene Endpausen, erhaltene Spitzen beim Reduzieren und unveränderte Kartensegmente.
- 44 PHP-Modell-/Speicherprüfungen unter PHP 7.4.33 bestanden. Geprüft werden zusätzlich die ausgeschaltete Timer-Vorauswahl, explizite Aktivierung, relative Stopp-/Start-Intervalle, Begrenzung am Aktivitätsbeginn und offene Endpausen. Die bisherigen Zeit-/Mittelwert-/Speicherprüfungen bestehen weiterhin; alle Plugin-PHP-Dateien sind unter PHP 7.4 syntaktisch gültig.
- 15 Browserprüfungen mit der echten FIT-Datei bestanden. Alle acht längeren Aufzeichnungspausen werden in Höhe, Herzfrequenz und Kadenz horizontal fortgeführt, einschließlich der Pausen mit bereits fehlenden Kadenzwerten. Das tatsächliche Chart.js-Rendering erzeugt gestrichelte Segmente. Der Zeiger zeigt in der Pause die fortgeführten Werte und die Zeit innerhalb der Pause. Die 4.515 Originalmesspunkte, Originalbytes und 183 erfassten hinteren Schaltwechsel bleiben unverändert.
- Die 13 Anzeige-Browserprüfungen bestehen erneut. Timerzeit ist im Standard ausgeschaltet, wird über den Gutenberg-Schalter pro Beitrag eingeschaltet und bleibt nach Speichern/Neuladen sowie späteren Änderungen der globalen Vorgabe sichtbar. Andere Standardeinbindungen zeigen sie nicht. Der kurze Bewegungszeit-Name ist in Einstellungen und Frontend geprüft. Datenfeldgruppen, Device-/1-fach-Automatik und Mobilansicht bleiben erhalten.
- Die portable Vorschau und ein vergrößerter Pausenausschnitt wurden erzeugt; der Pausenausschnitt wurde visuell geprüft. Keine Browser-JavaScriptfehler, keine PHP-Fehler im lokalen Protokoll und keine externen Kartenkacheln im Test. Tatsächliche Browser-Testlaufzeit: WordPress 7.1.4, PHP 8.5.10, 512 MiB PHP-Speicher.

Keine Veröffentlichung und keine Änderung der produktiven Website. Persönliche Dateien und Vorschaubilder verbleiben unter `.test-output/gearing/` und sind nicht Bestandteil der Pakete.

## 1-fach-Automatik und getrennte Schaltungsfelder in 1.0.1-dev

Die allgemeinen Datenfelder und die Schaltungsdatenfelder haben getrennte Raster. Eine horizontale Linie mit der mittigen Beschriftung „Schaltungsdaten“ trennt die darunter stehenden Schaltungsfelder ab. Ohne sichtbare Schaltungsfelder wird auch dieser Bereich entfernt.

Die API ergänzt einen 1-fach-Anzeigevorschlag aus den tatsächlich erfassten vorderen Gangstellungen und Zähnezahlen. Ohne vordere Daten bleibt die Einordnung unbekannt. Mehrere Stellungen/Zähnezahlen, beobachtete vordere Wechsel oder eine Stellung größer als eins schließen den Vorschlag aus. Nur eine verwendete vordere Stellung beweist keine vollständige Hardwarekonfiguration; der Editor erklärt diese Grenze.

`frontShiftsVisibility` und `frontGearVisibility` erlauben jeweils `auto`, `show`, `hide`. In Automatik werden das vordere Schaltfeld und die vordere Gangkurve bei 1-fach-Vorschlag ausgeblendet. Explizite manuelle Einblendung hat Vorrang vor automatischer Ausblendung und der Feldvorauswahl; beide Anzeigen bleiben unabhängig schaltbar und auf Automatik zurücksetzbar. Die vollständigen Daten bleiben gespeichert.

- 28 Schaltungsprüfungen unter PHP 7.4.33 bestanden, einschließlich konstanter vorderer Stellung zwei, fehlender vorderer Daten und unterschiedlicher Kettenblätter über Sessions. Die bisherigen 39 Modell-/Speicherprüfungen sowie PHP-Syntaxprüfung unter PHP 7.4 bestehen.
- 13 Schaltungs-Browserprüfungen bestanden: echte FIT-Datei erneut importiert, 1-fach-Ausblendung auf der Kasernenrunde, 183 unveränderte hintere Wechsel, gruppierte Datenfelder und beschriftete Linie unter dem allgemeinen Raster. Unabhängige Ein-/Aus-Kombinationen, manuelle Priorität trotz abgeschaltetem Feldstandard und ungültige Moduswerte sind geprüft. Shortcode-Modi und ausdrückliche Feldlisten funktionieren.
- Die beiden Gutenberg-Schalter wurden über die Oberfläche eingeschaltet, gespeichert und nach Neuladen im Editor sowie Frontend geprüft. Die getrennten Automatik-Resetbuttons stellen die automatische Ausblendung wieder her. Eine unabhängig erzeugte 2-fach-FIT zeigt standardmäßig das vordere Schaltfeld und beide Gangkurven.
- Die 13 bisherigen Anzeige-Browserprüfungen bestehen ebenfalls: globale Feldvorgaben, gespeicherte Ausnahmen, Device-Automatik, Farben, Datum und ausgeblendeter Abstieg bleiben erhalten.
- Portable HTML-Vorschau und Desktop-/Mobilbilder aktualisiert. Desktopansicht visuell geprüft; kein mobiler Überlauf, keine Browser-JavaScriptfehler und keine PHP-Fehler im lokalen Protokoll. Die tatsächliche lokale Testlaufzeit meldet WordPress 7.1.4, PHP 8.5.10 und 512 MiB PHP-Speicher. Keine externen Kartenkacheln angefragt.

Der Stand bleibt unveröffentlicht; GitHub und die produktive Website wurden nicht verändert. Persönliche Trainingsdaten und Vorschaudateien verbleiben unter `.test-output/gearing/` und sind von den Paketen ausgeschlossen.

## Elektronische Schaltung in 1.0.1-dev

- 23 gezielte PHP-Prüfungen unter PHP 7.4.33: Anfangszustände, wiederholte Meldungen, schnelle und gleichzeitige Wechsel vorne/hinten, Zähneverhältnis, Minutenfenster, Durchschnitt einschließlich Pausen, unbekannte Zähnezahlen und FIT-Sentinelwerte, gepackte Meldungen, Zeitreihenfolge, Sessiongrenzen und spätere Sessions ohne Gangdaten, interpolierte Distanz, Dauer null und begrenzte Diagrammfenster bei sehr langen Aktivitäten. Öffentliche Schaltungsfreigabe und unveränderte private Archive sind geprüft.
- 13 Node-Tests bestehen einschließlich eines unabhängig erzeugten FIT mit ausschließlich gepackten Schaltmeldungen und mehreren Wechseln innerhalb desselben Zeitstempels. Die bisherigen 39 Modell-/Speicherprüfungen und 13 Privatmodusprüfungen bestehen ebenfalls.
- Neun neue Browserprüfungen über die reguläre WordPress-Importoberfläche mit einer echten Wahoo-ELEMNT-ACE-Datei: alle 4.515 Messpunkte und Originalbytes erhalten, 185 Rohmeldungen ausgewertet, 183 beobachtete Wechsel hinten und kein Wechsel vorne; Übersetzungen und Fenstersummen unabhängig geprüft. Vollständige Altarchive funktionieren ohne Reimport oder Migration.
- In dieser Datei sind Höhe, Herzfrequenz und Kadenz vorhanden; zusammen mit den drei Schaltungsdiagrammen werden sechs Diagramme angezeigt. Nicht vorhandene Leistung wird nicht erfunden. Zeit-/Distanzumschaltung und gemeinsamer Diagrammzeiger funktionieren. Öffentliche API und Frontend berücksichtigen die serverseitige Schaltungsfreigabe; der private Kartenmodus bleibt wirksam.
- Die 13 bestehenden Darstellungs-Browserprüfungen bestehen erneut und decken jetzt 16 Datenfelder ab. Globale Vorgaben für die vier Schaltungsfelder, deren Blockausnahmen sowie die drei neuen Diagrammschalter werden über die Oberfläche betätigt und nach Speichern/Neuladen geprüft. Datumsformat, Farben, Device-Automatik und ausgeblendeter Abstieg bleiben erhalten.
- Lokale portable HTML-Vorschau sowie Desktop-/Mobilbilder erzeugt, Desktopbild visuell geprüft. Kein mobiler Seitenüberlauf und keine Browser-JavaScriptfehler. Die Kartenfreigabe bleibt vor dem Laden sichtbar; im automatisierten Schaltungstest werden keine Kartenkacheln angefragt. Die tatsächliche WordPress-Testlaufzeit meldet WordPress 7.1.4, PHP 8.5.10 und 512 MiB PHP-Speicher. Keine PHP-Fehler im lokalen Fehlerprotokoll.

Testwerkzeug: `tools/gearing-preview-test.mjs`; lokale persönliche Ergebnisse ausschließlich unter `.test-output/gearing/`. Pluginstand bleibt **1.0.1-dev und unveröffentlicht**. Keine Änderung an GitHub oder der produktiven Website, keine neuen Bibliotheken oder externen Dienste.

## Datenfeldbeschriftungen in 1.0.1-dev

„Start“ heißt jetzt „Datum“, „Aufstieg“ heißt „Höhenmeter/hm“. Die Aufstiegssumme steht als Zahl unter der bereits mit der Einheit versehenen Beschriftung. Das Datenfeld „Abstieg“ wird in der Darstellung und Feldauswahl ausgeblendet; gespeicherte Abstiegswerte bleiben vollständig erhalten. Interne Schlüssel und Zeitstempel werden nicht umbenannt, damit vorhandene Feldauswahlen weiter gelten.

Bei dieser Beschriftungsänderung bestanden die 39 PHP-Modell-/Speicherprüfungen mit zwölf verfügbaren Datenfeldern. Die spätere Schaltungserweiterung ergänzt vier weitere Felder. Der vollständige Darstellungstest besteht erneut mit 13 Browserprüfungen: Plugin-Einstellungen und Blockeditor tragen die neuen Beschriftungen, das öffentliche Frontend zeigt „Datum“ und „Höhenmeter/hm“, und selbst ein älterer Block mit ausdrücklich gespeichertem `descent: true` zeigt keine Abstiegskarte. Datumsformat, gespeicherte Ausnahmen, Farben, Diagramme und Mobilansicht bleiben geprüft. Keine Browser-JavaScriptfehler.

## GitHub-Updater in 1.0.1-dev

- 91 Prüfungen in einer isolierten echten WordPress-Installation mit lokal simulierten GitHub-Antworten bestanden. Die tatsächlich ausgeführte Laufzeit meldet WordPress 7.1.4 und PHP 8.5.10. Für diesen Test wurde kein GitHub-Release angelegt oder verändert.
- Prüfung über die nativen WordPress-Hooks und den echten `Plugin_Upgrader`: Entdeckung einer neueren stabilen Version, passendes Installations-ZIP und Update-Metadaten, zwölfstündiger Erfolgscache, Fehlercache und ausdrückliches Leeren. Das bestehende Release 1.0.0 ohne Update-Metadaten erzeugt kein falsches Update und keinen Fehler.
- Entwürfe, Pre-Releases, ungültige Tags/JSON-Antworten, Netzfehler, HTTP 403/404, übergroße Antworten/Pakete, fehlende oder doppelte Assets, Quellcode-ZIP statt Installations-ZIP, fremde Download-Adressen, manipulierte Prüfsummen, widersprüchliche Versionen/Plugin-Identitäten und fehlende Systemanforderungen werden abgewiesen.
- Jede Weiterleitung wird geprüft; fremde Hosts, HTTP-Abstufungen, eingebettete Zugangsdaten und Weiterleitungsschleifen werden abgewiesen. Die legitime GitHub-Asset-CDN-Weiterleitung liefert ein geprüftes temporäres ZIP. Der User-Agent enthält keine Website-URL; ein GitHub-Token wird nicht verwendet.
- Die Detaildaten enthalten WordPress-/PHP-Anforderungen und als Text maskierte Release-Notizen. Unpassende WordPress-/PHP-Versionen sperren den Download. Abfragen und Installationen anderer Plugins, Übersetzungen und manuelle Plugin-Installationen werden nicht übernommen.
- Manipuliertes ZIP, falsche Plugin-Kopfversion und falscher Paketordner brechen über die echten Installer-Hooks ab, bevor der installierte Pluginstand ersetzt wird. Auch der WordPress-Sammelupdatepfad mit seinem abweichenden Hook-Kontext prüft die ZIP-Prüfsumme.
- Ein gültiges simuliertes Update auf 2.0.0 wird vom echten WordPress-Upgrader installiert. Vollständige Aktivitäts-/Originalarchive, Metadaten, globale Privatmodus-Vorgabe und Datenfeld-Vorgaben bleiben erhalten; der Updatecache wird danach geleert. Die Ausgangsquellen befinden sich außerhalb des installierten Testordners und werden nicht überschrieben.
- Acht zusätzliche Prüfungen mit `tools/updater-browser-test.mjs` bestanden: normaler Updatehinweis im Backend, noncegeschützter Prüf-Link, erneute Prüfung und Cache, Ablehnung fehlender Nonces sowie eines Redakteurs ohne Updateberechtigung, natives Detailfenster mit maskierten Release-Notizen und tatsächliche Installation über die WordPress-AJAX-/Sammelupdatefunktion. Nach Neuladen meldet das aktive Testplugin Version 2.0.0; die Einstellung für automatische Updates bleibt unverändert. Keine Browser-JavaScriptfehler.
- Die bisherigen zwölf Node-Tests, 39 PHP-Modell-/Speicherprüfungen und 13 PHP-Privatmodusprüfungen bestehen weiterhin. Die Aktualisierungsklasse verändert die Importer und Diagramm-Assets nicht.
- Die lokale Paketierung erzeugt das neue Update-Manifest aus den tatsächlichen Kopf-/Readme-Angaben und dem SHA-256 des erzeugten ZIPs. Version, Plugin-Pfad, Paketadresse, Systemanforderungen und Prüfsumme wurden abgeglichen. Pakete mit Dev-Kennung werden vom Updater nicht als stabiles Release akzeptiert.

Die HTTP-Testantworten und simulierten Updatepakete liegen ausschließlich im ignorierten lokalen Testausgabeordner. Die produktive Website und GitHub wurden für diese Prüfungen nicht verändert. Die virtuelle Umgebung testet das direkte lokale WordPress-Dateisystem; eine zusätzliche FTP-/SSH-Installation und ein vollständiges Versionsmatrix-Testing sind nicht Bestandteil dieses Durchlaufs.

## Updatertests wiederholen

`npm test` erzeugt zunächst die synthetischen FIT-/XML-Fixtures. Danach erzeugt `python3 tools/prepare-updater-test.py` die Wegwerf-Pakete und Blueprints unter `.test-output/updater/`. Die separat installierte WordPress-Playground-CLI führt den Blueprint aus; zum Beispiel mit angepasstem CLI-Pfad:

```sh
node /pfad/zur/playground-cli/cli.js run-blueprint \
  --define FS_METHOD direct \
  --define-bool DISABLE_WP_CRON true \
  --define-bool WP_HTTP_BLOCK_EXTERNAL true \
  --mount="$PWD/.test-output/updater/original:/candidate" \
  --mount="$PWD/.test-output/updater/fixtures:/fixtures" \
  --blueprint="$PWD/.test-output/updater/blueprint.json"
```

Für die zusätzlichen Browsertests denselben Wegwerfaufbau als lokalen Playground-Server mit `ui-blueprint.json` starten und `GTA_TEST_URL=http://127.0.0.1:PORT node tools/updater-browser-test.mjs` ausführen. Ausschließlich diesen isolierten Testaufbau verwenden: Die Test-MU-Datei ersetzt dort GitHub-Anfragen durch Fixtures. `tests/updater-ui-fixtures.php` wird nicht in das installierbare Plugin-ZIP aufgenommen.

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
