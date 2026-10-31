# GravelTube Activities

Eigenständige Weiterentwicklung von **Show Fit File 1.2.7** für Touren und Training. Version 1.0.0, 31.10.2026.

## Installation und Verwendung

1. In WordPress unter **Plugins → Installieren → Plugin hochladen** die Datei `graveltube-activities-1.0.0.zip` auswählen und aktivieren.
2. Unter **Aktivitäten → Importieren** eine FIT-, GPX- oder TCX-Datei auswählen. Die Datei wird automatisch eingelesen, gespeichert und direkt auf derselben Seite angezeigt.
3. Alternativ unter **Aktivitäten → Aktivität anlegen** eine neue Aktivität anlegen und die Datei auswählen. Sie wird sofort als Entwurf gespeichert; ein eingegebener Titel bleibt erhalten, sonst wird ein vorhandener FIT-Aktivitäts- oder Workout-Name vorgeschlagen; ohne solchen Namen dient der Dateiname. Die Aktivität prüfen, die öffentlich erlaubten Messwerte auswählen und **Veröffentlichen** klicken. Neue Importe sind zunächst Entwürfe.
4. Bei Bedarf unter **Aktivitäten → Externe Karten** OpenStreetMap für die Website freigeben. Besucher laden die Karte danach für jede Ansicht ausdrücklich per Klick. Ohne Freigabe bleiben die Diagramme nutzbar.
5. Im Beitrag den Block **GravelTube Aktivität** einfügen und die Aktivität auswählen. Alternativ:

```text
[graveltube_activity id="123"]
```

Optional einzelne Darstellungen ausblenden:

```text
[graveltube_activity id="123" map="no" altitude="no" power="yes" heart_rate="yes" cadence="yes"]
```

Block und Shortcode greifen auf denselben Datensatz zu. Die ID steht im Aktivitätseditor beim Einbindungscode. Ein Import direkt im Block ist ebenfalls möglich; anschließend die Aktivität im Menü „Aktivitäten“ veröffentlichen.

## Datei auswählen und sofort anzeigen

In der Aktivitätsverwaltung startet die Dateiauswahl unmittelbar den Import. Ein zusätzlicher Import-/Ersetzen-Button und ein Neuladen der Seite sind nicht nötig. Danach erscheinen Datenfelder und Diagramme, die vorhandene Kartenfreigabe sowie der erkannte Aktivitätstyp und das Device. Geschützte Downloadlinks stehen ebenfalls sofort bereit. Die OpenStreetMap-Karte benötigt weiterhin die Website-Freigabe und den ausdrücklichen Besucherklick.

Eine neue Aktivität wird beim ersten erfolgreichen Einlesen als Entwurf gespeichert. Ein zuvor eingegebener Titel bleibt erhalten; ohne eigenen Titel wird ein vorhandener FIT-Aktivitätsname, danach ein Workout-Name und andernfalls der Dateiname verwendet. Bei einer weiteren Dateiauswahl im Aktivitätseditor werden die Messdaten derselben Aktivitäts-ID aktualisiert. Titel, Veröffentlichungsstatus und gespeicherte Freigaben bleiben erhalten. Während des Imports sind Dateiauswahl und Veröffentlichungsbuttons gesperrt. Fehlerhafte Dateien ändern den vorhandenen Datensatz und dessen Vorschau nicht; anschließend kann die Dateiauswahl erneut verwendet werden.

Auf der separaten Importseite wird jede ausgewählte Datei als neue Aktivität angelegt und unmittelbar angezeigt. Im Gutenberg-Beitragsblock funktioniert der Dateiupload wie bisher direkt nach der Auswahl.

## Titelvorschläge aus FIT-Dateien

Der Import verwendet diese Reihenfolge: **eigener eingegebener Titel → expliziter FIT-Aktivitätsname → FIT-Workout-Name → Dateiname ohne Dateiendung**. Die Vorschläge sind normale bearbeitbare WordPress-Titel. Ein vorhandener Titel wird beim Reimport nicht automatisch überschrieben.

In der Aktivitätsverwaltung erscheint der Vorschlag samt Herkunft, etwa „Workout-Name aus FIT“. Bei einem abweichenden eigenen oder bestehenden Titel setzt **Titelvorschlag übernehmen** den Vorschlag in das Titelfeld. Danach kann der Text frei geändert und die Aktivität wie gewohnt gespeichert werden. Auch bei bereits importierten FIT-Dateien wird der Vorschlag aus dem vollständigen gespeicherten Archiv ermittelt; ein erneuter Upload ist dafür nicht nötig.

Explizite Aktivitätsnamen werden aus den Aktivitäts-/Sessionmeldungen gelesen; für Workouts wird insbesondere `wkt_name` ausgewertet. Leere oder nach Bereinigung leere Werte werden übersprungen. Bei mehreren Namen wird der erste passende Name verwendet. Geräte-, Sportprofil- und reine Streckennamen werden nicht als Aktivitätstitel eingesetzt. Die Quelle und alternative Namen bleiben im geschützten Archiv erhalten. Vorschläge und Herkunftsdateinamen werden nur berechtigten Bearbeitern über die API ausgegeben; öffentlich erscheint nur der gewählte Titel.

## Aktivitätsart, Device und Datenfelder

Im Beitragsblock zeigt das Dropdown **Aktivitätsart** zunächst **Automatisch**. Der Vorschlag berücksichtigt den Dateiersteller (ROUVY/VirtualTraining oder Zwift), ausdrückliche Indoor-/Virtual-Sessionangaben und danach Garmin/Wahoo beziehungsweise vorhandene GPS-Koordinaten. Garmin/Wahoo ohne Indoor-Kennzeichnung werden als Outdoor vorgeschlagen; dieser Vorschlag ist keine sichere Feststellung. Virtuelle Strecken können ebenfalls GPS enthalten. Wähle bei Bedarf ROUVY, Zwift, Outdoor, Indoor / andere App oder Nicht zugeordnet. Die Auswahl wird für diesen Block gespeichert und ist auch nach Veröffentlichung änderbar.

**ROUVY** färbt die Datenfelder blass lila, **Zwift** blass orange und **Outdoor** blass hellgrün. Der ausgeschriebene Aktivitätstyp ist zusätzlich als Datenfeld verfügbar. Unter Aktivitäten → Aktivität bearbeiten kann eine Aktivitätsart als Vorgabe für alle automatischen Einbindungen festgelegt werden. Eine explizite Auswahl im Beitragsblock hat Vorrang; ein Reimport behält die manuelle Aktivitätsvorgabe.

Das Feld **Device** nutzt den FIT-Dateiersteller und den als Creator markierten Geräteeintrag. Gekoppelte Leistungsmesser, Trainer und Pulssensoren werden nicht als Device verwendet. Explizite Produktnamen und bekannte Produktkennungen werden angezeigt, etwa Wahoo ELEMNT ACE oder Garmin Edge 840. Fehlen Modellinformationen, erscheint der Hersteller mit „Modell unbekannt“ beziehungsweise „Nicht angegeben“. Bei einer von einer App aufgezeichneten Datei kann das Device die App selbst sein. Seriennummern und Geräte-IDs werden nicht in diese öffentliche Anzeige übernommen. Für vorhandene FIT-Importe erfolgt die Erkennung aus dem bereits gespeicherten Roharchiv; kein erneuter Import ist erforderlich.

In der Block-Seitenleiste unter **Datenfelder** lassen sich Aktivitätsart, Device, Start, Distanz, Gesamtdauer, Timerzeit, Bewegungszeit, Aufstieg, Abstieg, durchschnittliche Leistung, Herzfrequenz, Kadenz und mechanische Arbeit einzeln deaktivieren. Die globale Vorauswahl aktiviert zunächst alle 13 Felder. Das Device wird bei ROUVY und Zwift automatisch ausgeblendet, bei anderen Aktivitätsarten folgt es der gespeicherten Feldauswahl. Fehlende Messkanäle erzeugen keine erfundenen Werte. Karte und Diagramme haben eigene Schalter.

Unter **Aktivitäten → Anzeige** legt ein Administrator die Vorgaben für neu eingefügte Blöcke fest. Der Block speichert eine eigene Kopie dieser Auswahl; spätere Änderungen der Plugin-Vorgaben ändern bestehende Auswahlen nicht. **Plugin-Vorgaben übernehmen** setzt den geöffneten Block auf die beim Öffnen des Editors geltenden Vorgaben zurück. Bereits vorhandene Blöcke ohne gespeicherte Feldauswahl und Shortcodes zeigen weiterhin alle verfügbaren Felder; beim ersten Bearbeiten übernimmt ein solcher Block die aktuellen Vorgaben. Ausblenden im Block betrifft die Darstellung; für die öffentliche Datenfreigabe weiterhin die Aktivitätseinstellungen verwenden.

Im Block lässt sich **Device** ausdrücklich einschalten oder ausschalten. Diese manuelle Wahl wird getrennt von der automatischen Vorgabe gespeichert und bleibt auch beim Wechsel der Aktivitätsart sowie nach Speichern und Neuladen erhalten. **Device automatisch steuern** hebt die manuelle Wahl wieder auf. **Plugin-Vorgaben übernehmen** setzt die Feldauswahl und die Geräteanzeige auf die automatischen Vorgaben zurück. Ohne gespeicherte manuelle Gerätewahl gilt die neue ROUVY-/Zwift-Ausblendung auch für bereits vorhandene Einbindungen. Die Geräteinformation selbst bleibt gespeichert und in der Aktivitätsverwaltung verfügbar.

Das Feld **Start** zeigt ausschließlich das Datum als **dd.mm.yyyy**, zum Beispiel `31.10.2026`, in der unter WordPress → Einstellungen → Allgemein eingestellten Zeitzone. Die vollständigen Zeitstempel bleiben für Speicherung und Diagramme erhalten.

Shortcodes unterstützen zusätzlich `type`, `device="auto|show|hide"` und eine durch Kommas getrennte Positivliste der Datenfelder. `device="show"` blendet das Device auch bei ROUVY und Zwift ein. Eine ausdrücklich angegebene Feldliste mit `device` zählt ebenfalls als manuelle Auswahl:

```text
[graveltube_activity id="123" type="rouvy" fields="activityType,device,start,distance,avgPower,avgHeartRate,avgCadence"]
```

Die Feldschlüssel stehen in `includes/class-presentation.php`. Ohne `fields` werden alle verfügbaren Felder mit automatischer Geräteausblendung für ROUVY/Zwift gezeigt. `type="auto"` übernimmt die Aktivitätsvorgabe beziehungsweise den Vorschlag.

## Privater Outdoor-Kartenmodus

Unter **Aktivitäten → Anzeige → Privater Outdoor-Kartenmodus** lässt sich der Privatmodus als globale Vorgabe ein- oder ausschalten. Bei der ersten Installation beziehungsweise einem Upgrade ist diese neue Vorgabe **ausgeschaltet**. Bereits vorhandene Aktivitätsblöcke übernehmen sie automatisch, solange keine ausdrückliche Ausnahme gespeichert ist.

Im Beitragsblock unter **Privater Kartenmodus → Outdoor-Privatmodus** gibt es drei Möglichkeiten: **Plugin-Vorgabe**, **Ein – Start und Ziel ausblenden** und **Aus – vollständige Strecke zeigen**. Die ausdrückliche Blockauswahl hat Vorrang und bleibt nach Speichern erhalten. Die globale Vorgabe wird bei jedem Datenabruf neu ausgewertet. ROUVY, Zwift und Indoor-Aktivitäten bleiben von dieser Option unberührt; maßgeblich ist die für die Einbindung gewählte Aktivitätsart.

Der aktive Modus entfernt die GPS-Koordinaten der ersten und letzten 500 Meter aus der öffentlichen Ansicht. Zusätzlich bleiben sämtliche Punkte im 500-Meter-Bereich um den ursprünglichen Start und das Ziel verborgen, auch bei späterem Vorbeifahren auf einer Rundtour. Die Entfernung entlang der aufgezeichneten GPS-Strecke wird ohne Sprünge zwischen Segmenten und ohne Überbrücken großer Aufzeichnungslücken berechnet. Der erste sichtbare Messpunkt kann deshalb weiter als 500 Meter vom Start entfernt sein. Ist keine ausreichend lange sichtbare Strecke übrig, bleiben die Trainingsdiagramme trotzdem verfügbar.

Es gibt dann keine Start-/Zielmarker und keine Rundenpositionen auf der Karte. Ausgeblendete Koordinaten werden bereits auf dem Server entfernt und können auch über den Diagrammzeiger nicht eingeblendet werden. **Originaldatei, alle Messpunkte, vollständige Zeitstempel und Trainingswerte bleiben im geschützten Archiv erhalten.** Unter der Karte steht:

> Der genaue Start und das Ziel sind aus Sicherheitsgründen hier ausgeblendet.

Shortcode-Beispiele:

```text
[graveltube_activity id="123" type="outdoor" private_map="on"]
[graveltube_activity id="123" type="outdoor" private_map="off"]
[graveltube_activity id="123" private_map="inherit"]
```

Die vollständige Strecke ist weiterhin öffentlich, wenn dieselbe Aktivität in einer anderen freigegebenen Einbindung ausdrücklich ohne Privatmodus gezeigt wird. Bereits zuvor veröffentlichte oder heruntergeladene GPS-Daten werden durch die neue Einstellung nicht zurückgerufen.

### Öffentliche Datenschnittstelle und Einbindungen

Kartenabrufe sind an eine gespeicherte Einbindung in einem öffentlich erreichbaren, nicht passwortgeschützten Beitrag gebunden. Die Schnittstelle prüft deren gespeicherte Aktivitätsart und Privatmodus; Änderungen an URL-Parametern schalten den Schutz nicht aus. Ohne gültigen Beitragskontext liefert ein anonymer Abruf nur Trainingsdaten ohne GPS. Das gilt auch für direkte Abrufe von `/gta/v1/activities/{id}`. Der normale Block und Shortcode ergänzen den Kontext automatisch. Für vollständige GPS-Freigaben muss der Autor des einbindenden Beitrags Bearbeitungsrechte an der Aktivität haben. Fremde Autoren können durch eine zusätzliche Einbindung keine vertraulichen Koordinaten freigeben. Geschützte Original-/Archivdownloads bleiben für berechtigte Bearbeiter verfügbar.

## Funktionen

- FIT, GPX und TCX mit sämtlichen importierten Messpunkten; keine Reduktion der gespeicherten Zeitreihen auf 500 Punkte.
- GPS-unabhängige Erfassung von Leistung, Herzfrequenz und Kadenz; Indoor-Einheiten funktionieren ohne Karte.
- Mehrere FIT-Sessions und Runden, alle GPX-Tracks/-Segmente einschließlich erster Punkte, TCX-Runden und Segmente.
- Tourenkarte mit Start, Ziel und vorhandenen Rundenpositionen; Höhenprofil und Trainingsdiagramme für Leistung, Puls und Kadenz.
- Wahl zwischen Zeit- und Distanzachse. Ohne Zeit und Distanz wird der Messpunktindex verwendet. Gemeinsamer Diagrammzeiger mit Kartenposition.
- Zeitgewichtete Mittelwerte, Sensordatenabdeckung und erfasste mechanische Arbeit; getrennte Gesamt-, Timer- und geschätzte Bewegungszeit.
- Vollständige Originaldatei und vollständiges Datenarchiv als Download für berechtigte Bearbeiter.
- Reimport ersetzt eine Aktivität unter derselben ID. Ansichten enthalten keine dauerhaft gecachten HTML-/Karten-IDs.

## Vollständige Speicherung und Öffentlichkeit

Originalbytes, normalisierte Datensätze und vollständige FIT-Decoderausgabe werden komprimiert und in 256-KiB-Blöcken als private WordPress-Post-Metadaten gespeichert. Dazu gehören im FIT-Archiv bekannte Felder, sämtliche Rohmeldungen und nicht zugeordnete Felder einschließlich ihrer Wire-Bytes. Bei XML bleibt das vollständige Original erhalten; nur die dokumentierten Felder werden für die Anzeige normalisiert. Fehlende Sensorwerte bleiben `null`; echte 0 W bleiben 0 W. Originaldaten werden nicht geglättet, interpoliert oder für die Karte reduziert.

Die Kartenlinie und Diagrammpunkte können ausschließlich **für die Anzeige** reduziert werden. Das Datenarchiv enthält weiterhin alle Messpunkte. Speicherung und Dateiaustausch werden über ein zuletzt aktualisiertes Manifest abgeschlossen; ein fehlgeschlagener Reimport lässt den bisherigen Datensatz bestehen.

Originale werden nicht in einem öffentlich zugänglichen Uploadordner abgelegt. Sie liegen in der WordPress-Datenbank und gehören damit auch zu deren Backups. Die öffentliche Schnittstelle liefert weder Originale noch Rohmeldungen oder Herkunftsdateinamen. Unter „Öffentliche Messwerte“ deaktivierte GPS-/Sensorwerte werden auch aus API-Daten, Zusammenfassungen und Runden entfernt. Der private Kartenmodus entfernt zusätzlich die geschützten GPS-Koordinaten aus der jeweiligen öffentlichen Antwort. Andere Block-/Shortcode-Optionen ändern nur die sichtbare Darstellung.

Eine veröffentlichte Aktivität ist öffentlich abrufbar. Wird sie wieder zum Entwurf, benötigen API und Darstellung Bearbeitungsrechte. Datenantworten haben `Cache-Control: private, no-store`; ein vorgeschalteter Cache sollte `/wp-json/gta/v1/` ebenfalls nicht zwischenspeichern. Die API prüft den Status bei jedem Abruf.

## Zeit- und Berechnungsregeln

- Alle normalisierten Zeiten sind Unix-Sekunden in UTC; Geschwindigkeit bleibt m/s, Distanz m, Leistung W, Puls bpm und Kadenz rpm. Die Anzeige rechnet die Distanz in km um.
- Gesamtdauer übernimmt die präzise FIT-Sessiondauer. Bei mehreren Sessions wird die Zeitspanne von frühestem Sessionbeginn bis zum letzten präzisen Sessionende verwendet, einschließlich Pausen und Übergängen. Fehlen solche Angaben, dient die Zeitspanne der aufgezeichneten Zeitstempel als Ersatz.
- Timerzeit verwendet die Summe vorhandener Session-Timerzeiten. Fehlen sie, wird die abgedeckte Recordzeit angezeigt und als „aus Messpunkten“ gekennzeichnet.
- Bewegungszeit ist eine Schätzung aus Distanzzuwachs oder Geschwindigkeit über 0,5 m/s. Ohne verwertbare Bewegungsdaten bleibt sie unbekannt. Es gibt keine Division numerischer Sekundendifferenzen durch 1.000.
- Für Durchschnittsleistung, Puls, Kadenz und Arbeit gilt der Wert des vorherigen Messpunkts bis zum nächsten (zeitgewichtete Rechteckintegration). Fehlende Werte, Segmentwechsel, nichtpositive Zeitabstände, Timerpausen und Lücken über 30 s zählen nicht zur Sensordatenabdeckung. Der letzte Punkt erhält keine erfundene Folgedauer. Session-Timerzeit und gemessene Sensorabdeckung können deshalb voneinander abweichen.
- FIT-Timer-Stop-/Start-Ereignisse werden berücksichtigt. GPX besitzt keine verbindliche Pausendefinition. Datenlücken werden nicht als Pause oder Nullleistung aufgefüllt.
- Vorhandene FIT-Auf-/Abstiegssummen werden übernommen. Andernfalls werden Höhenänderungen innerhalb der Segmente aufsummiert, ohne Höhenrauschfilter. Das ist keine barometrisch korrigierte Höhenmeterberechnung.
- Die Karte und die Diagramme verbinden getrennte Segmente bzw. erkannte große Aufzeichnungslücken nicht miteinander. GPS-/Diagrammzeiger werden über die ursprünglichen Records zugeordnet.

## Voraussetzungen und Grenzen

- WordPress mindestens 6.3, PHP mindestens 7.4 mit **zlib**, moderner Browser.
- Import maximal **20 MiB Originaldatei**, **80 MiB decodiertes JSON** und **300.000 Records**. PHP-`upload_max_filesize`, `post_max_size` und `memory_limit` müssen zu den Daten passen; für größere Imports mindestens 128 MiB POST-Limit und 512 MiB PHP-Speicher einplanen. Hosting-Limits können darunter liegen und müssen angepasst werden.
- FIT-Prüfung verwendet `fit-file-parser` 6.2.7 mit CRC-Prüfung, strikter Strukturprüfung und vollständiger Rohdatenerhaltung. Ein FIT mit mehreren Sessions wird unterstützt. Aneinandergehängte vollständige FIT-Dateien müssen getrennt importiert werden. Fehlerhafte Dateien werden abgewiesen.
- GPX unterstützt Tracks, Tracksegmente und Routen sowie gängige Erweiterungen `hr`, `cad`, `power`, `speed`. TCX unterstützt Activity/Lap/Trackpoint, HeartRateBpm, Cadence und ActivityExtension Speed/Watts/RunCadence. Fehlende Kanäle werden nicht erfunden. XML mit DTD oder eigenen Entitäten wird abgewiesen.
- Import erfolgt im Browser; der Server validiert Typen, Grenzen, Format und Messdatenmodell und berechnet die Zusammenfassung neu. Es gibt keinen Node-Dienst auf dem WordPress-Server.
- Kartenkacheln werden erst nach Website-Freigabe und ausdrücklichem Besucherklick direkt von OpenStreetMap geladen. Es gibt keine GeoNames-Zeitzonenabfrage und keinen fest eingebauten fremden API-Benutzernamen.
- Keine Garmin-/Strava-Synchronisation, keine FTP-/Zonen-/NP-/TSS-Berechnung in dieser ersten Version.
- Alte `yft/showfitfile`-Blöcke und `[showfitfile]`-Shortcodes werden bewusst nicht überschrieben. Originale über den neuen Import übernehmen und Beiträge anschließend auf den neuen Block umstellen. Ohne alte Originaldateien können dort bereits verworfene Sensordaten nicht rekonstruiert werden.

## Quellcode und Entwicklung

Jede Plugin-Kopie enthält PHP-/JavaScript-Quellen, `package.json`, `package-lock.json` und die bevorzugten Bibliotheksquellen unter `source/vendor/`. **[BUILD.md](BUILD.md)** dokumentiert den Build unmittelbar im Pluginordner. Die Original-Lizenzen und festgehaltenen Quellenstände werden mitgeliefert; es ist kein erst später zu ergänzender Repository-Link nötig.

Das zusätzliche Quellcode-Projektarchiv enthält auch Testgeneratoren, Browser-/PHP-Prüfungen und Paketierungswerkzeuge. Im Projektwurzelverzeichnis dieses Archivs:

```sh
npm ci --ignore-scripts
npm run build
npm test
php graveltube-activities/tests/activity-test.php
python3 tools/package.py
```

Node.js 20+ genügt für Build und JavaScript-Tests. Der PHP-Test benötigt vorher `npm test`, das die unabhängigen Beispieldateien im ignorierten Ordner `.test-output` erzeugt. Browserprüfung: eine isolierte WordPress-Installation mit Plugin unter `http://127.0.0.1:9412`, Benutzer `admin`/`password`, danach `node tools/browser-test.mjs`. Der Browser-Test verwendet eine eigene Headless-Chrome-Sitzung und verändert nur diese Testinstallation. Den Browserpfad bei Bedarf an das Betriebssystem anpassen.

`node tools/real-fit-preview.mjs /pfad/zur/aktivitaet.fit` prüft eine eigene Datei in derselben lokalen Testinstallation und erstellt Vorschauen. Dieser Vorschautest lädt reguläre OpenStreetMap-Kacheln. Original-/Messdaten bleiben lokal; der Kartendienst erhält die angefragten Kartenausschnitte. Die Ergebnisse liegen in `.test-output/real-fit/` und werden beim Paketieren ausgeschlossen.

## Herkunft und Lizenzen

Ausgangspunkt: [tevendale/ShowFitFile](https://github.com/tevendale/ShowFitFile), Version 1.2.7, Commit `eda1b8f2b4da1bf77b5399eb8c73a472b34454d0`, Copyright Stuart Tevendale 2018–2026. Die gemeinsame Idee der Import-/Kartenansicht und die mitgelieferten Leaflet-/Chart.js-Ressourcen wurden übernommen; Speicherung, Importadapter, WordPress-Integration und Renderer wurden am 31.10.2026 neu implementiert. Neue Arbeiten: Pascal Kurschildgen, erstellt mit Codex.

Plugin-Code: GPL-2.0-or-later, siehe `LICENSE`. Drittkomponenten behalten ihre eigenen Lizenzen; siehe `THIRD-PARTY.md` und `licenses/`. Das Garmin SDK wird nicht mitgeliefert. Der Fork verwendet einen MIT-lizenzierten FIT-Parser.

Deaktivieren löscht keine Aktivitäten. Endgültiges Löschen einer Aktivität im WordPress-Papierkorb entfernt über WordPress auch ihre privaten Metadaten und Archive. Ein automatisches Löschen sämtlicher Trainingsdaten bei Plugin-Deinstallation ist nicht vorgesehen.
