# GravelTube Activities 1.1.0

Release 1.1, 01.11.2026. Weiterentwicklung des veröffentlichten Stands 1.0.0.

## Änderungen

- Rundentabelle standardmäßig ausgeblendet; im Beitragsblock unter „Karte und Diagramme → Rundentabelle“ oder im Shortcode mit `laps="yes"` einschaltbar. Ihre Zeitspalte zeigt die aus Messpunkten und Timerpausen berechnete **Bewegungszeit je Runde**. Unbekannte Bewegungszeit bleibt unbekannt.
- Elektronische Schaltung: Gangverlauf, Übersetzung und Schalthäufigkeit; getrennte Schaltungsdatenfelder. Bei vermuteter 1-fach-Schaltung sind das vordere Schaltfeld und die vordere Kurve automatisch ausgeblendet und einzeln manuell aktivierbar.
- Timerzeit standardmäßig aus; das Datenfeld „Bewegungszeit“ trägt keinen Zusatz. „Datum“ und „Höhenmeter/hm“ ersetzen die bisherigen Beschriftungen, Abstieg ist ausgeblendet.
- Höhe, Herzfrequenz und Kadenz werden in erkannten Pausen horizontal fortgeführt und als Fortführung gekennzeichnet. Originaldaten und Mittelwerte bleiben unverändert.
- Native GitHub-Updatefunktion mit Cache, Kompatibilitätsprüfung und Paketprüfung einschließlich SHA-256. Keine erzwungenen automatischen Updates.

Vollständige Quellen, bevorzugte Bibliotheksquellen und ursprüngliche Lizenz-/Urheberhinweise sind enthalten. Persönliche Trainingsdateien und Vorschauen gehören nicht zum Release. Der Bibliotheksstand bleibt gegenüber 1.0.0 unverändert; die damalige Versions-/Sicherheitsprüfung ist in `DEPENDENCIES.md` dokumentiert.

## Installation und Update

`graveltube-activities-1.1.0.zip` in WordPress unter **Plugins → Installieren → Plugin hochladen** installieren beziehungsweise das vorhandene Plugin damit aktualisieren. Version **1.0.0 enthält noch keine GitHub-Updaterklasse** und benötigt deshalb dieses eine manuelle Update. Ab Version 1.1.0 können spätere stabile GitHub-Releases über WordPress angeboten werden. Die Website wird durch die Veröffentlichung dieses Releases nicht automatisch verändert.

Gespeicherte Aktivitäten und Originalarchive bleiben erhalten. Neue Darstellungsdaten werden beim Lesen auch aus bestehenden vollständigen Archiven abgeleitet; kein Reimport erforderlich.

## Release-Dateien

- `graveltube-activities-1.1.0.zip`: Installation einschließlich Bearbeitungsquellen und Lizenzen.
- `graveltube-activities-1.1.0-source.zip`: vollständiges Entwicklungsprojekt einschließlich Tests und Werkzeugen.
- `graveltube-activities-update.json`: Update-Metadaten mit Paketadresse und Prüfsumme.
- `graveltube-activities-1.1.0-SHA256SUMS.txt`: Prüfsummen der beiden ZIPs und Update-Metadaten.

Prüfungen und praktische Grenzen: `VALIDATION.md`. Updateprotokoll: `UPDATES.md`.

# Veröffentlichungspaket 1.0.0

## Release 1.0.0

Erste stabile Veröffentlichung von GravelTube Activities. Enthalten sind vollständige Speicherung von FIT-, GPX- und TCX-Dateien, Tourenkarten und Trainingsdiagramme für Leistung, Herzfrequenz und Kadenz. Aktivitätstyp, Device-Anzeige, Datenfelder, FIT-Titelvorschläge und der private Outdoor-Kartenmodus sind konfigurierbar. OpenStreetMap wird erst nach Website-Freigabe und Besucherklick geladen.

Dieses Release übernimmt den vollständig geprüften Funktionsstand von 0.4.3. Die Versionsangaben und Veröffentlichungsunterlagen sind auf 1.0.0 vereinheitlicht; es gibt keine neue Datenmigration. Die bekannten Test- und Hostinggrenzen bleiben in `VALIDATION.md` dokumentiert.

## Enthaltener Bibliotheksstand aus 0.4.3

Aktuelle stabile Bibliotheken: Leaflet 1.9.4, Chart.js 4.6.1, @kurkle/color 0.6.5 und esbuild 0.28.2. FIT-Parser 6.2.7, buffer 6.0.3, base64-js 1.5.1, ieee754 1.2.1, @xmldom/xmldom 0.9.12 sowie Playwright/playwright-core 1.64.1 sind bereits aktuell.

Lange Aktivitätstitel aus Dateinamen brechen in schmalen Ansichten um. Import, Karten und Diagramme wurden erneut mit echten ROUVY- und Wahoo-ACE-Dateien geprüft. Vollständige Ergebnisse und die verwendeten Test-Speichergrenzen stehen in `VALIDATION.md`.

Leaflet und Chart.js sind jetzt ebenfalls in beiden npm-Lockdateien festgelegt. Das Chart.js-Bundle wird aus den unveränderten bevorzugten Originalquellen mit @kurkle/color 0.6.5 erstellt. Die bewusste npm-Override-Auswahl wird durch Farbhelfer- und Browserprüfungen abgesichert. Quellenmanifest, Einzeldatei-Prüfsummen und Original-Lizenztexte sind aktualisiert.

## Weiterhin enthalten seit 0.4.2

FIT-Aktivitäts- und Workout-Namen werden als bearbeitbare Titelvorschläge übernommen, mit Dateiname als Ersatz. Eigene eingegebene oder bestehende Titel behalten Vorrang. Ein separater Vorschlag mit Übernahmebutton bleibt auch bei bestehenden Importen verfügbar. Private Vorschläge und Herkunftsdateinamen werden nicht an anonyme Besucher ausgegeben.

## Weiterhin enthalten seit 0.4.1

Die Dateiauswahl startet automatisch das Einlesen und Speichern. Vorschau, Gerätehinweis und Downloadlinks erscheinen ohne Neuladen der Seite; der irreführende Button „Daten ersetzen“ entfällt. Neue Aktivitäten werden nach dem ersten erfolgreichen Import als Entwurf gespeichert. Weitere Dateien aktualisieren dieselbe Aktivität, ohne Titel oder Freigaben zu überschreiben. Fehler lassen bestehende Daten und Vorschauen erhalten.

## Weiterhin enthalten seit 0.4.0

Privater Outdoor-Kartenmodus mit globaler Vorgabe und gespeicherten Ausnahmen pro Beitragseinbindung. Serverfilter entfernen mindestens die ersten/letzten 500 GPS-Meter und die Start-/Zielumgebung; Rundenpositionen und Start-/Zielmarker werden unterdrückt. Unter der Karte steht der gewünschte Sicherheitshinweis. Trainingsdaten und Originalarchive bleiben vollständig erhalten.

Die neue globale Vorgabe ist zunächst aus. Ein-/Ausschalten unter Aktivitäten → Anzeige; im Block unter Privater Kartenmodus jeweils Plugin-Vorgabe, Ein oder Aus wählen. Bestehende Blöcke ohne Ausnahme folgen der Vorgabe. GPS-Antworten sind an gespeicherte öffentliche Beitragskontexte gebunden; direkte anonyme API-Abfragen liefern Trainingsdaten ohne GPS. Bereits freigegebene Karten bleiben in ihren gültigen Beitragskontexten nutzbar.

## Funktionen seit 0.3.0

- FIT-Herkunftsvorschläge mit manueller Auswahl pro Aktivität und Beitragsblock.
- Blass lila ROUVY-, orange Zwift- und hellgrüne Outdoor-Datenfelder; Device statt gekoppelter Sensoren.
- 13 einzeln schaltbare Datenfelder und persistente globale Vorgaben für neue Blöcke.
- Festes Startdatum `dd.mm.yyyy` in der Website-Zeitzone.
- Metadaten werden auch aus vorhandenen FIT-Archiven gelesen. Originaldateien und gespeicherte Messdaten werden nicht verändert.

## Weiterhin enthaltene Lizenz- und Kartenkorrekturen

Die in der Lizenzprüfung von Version 0.1.1 genannten konkreten offenen Punkte sind in diesem Paket bearbeitet:

1. `licenses/kurkle-color.txt` entspricht unverändert der Original-Lizenz von Version 0.6.5, einschließlich „Copyright (c) 2018-2024 Jukka Kurkela“.
2. Jedes installierbare Plugin-ZIP liefert die PHP-/JavaScript-Quellen, npm-Build-Eingaben und die bevorzugten Quellformen der Laufzeitbibliotheken mit. Die festgehaltenen Quellenstände und Prüfsummen stehen in `source/vendor/manifest.json`; der Build ist in `BUILD.md` dokumentiert.
3. OpenStreetMap ist standardmäßig gesperrt. Nach Website-Freigabe in „Aktivitäten → Externe Karten“ entscheidet jeder Besucher je Ansicht per Klick über das Laden. Ablehnung und Schließen sind möglich; es gibt keine dauerhafte Entscheidung im Browserspeicher. Die Karten nutzen den kanonischen Kachelhost, Browser-Caching, einen originbeschränkten Referrer und die vollständige OSM-Attribution. `PRIVACY.md` beschreibt den Dienst und die Datenübertragung; WordPress erhält einen anpassbaren Datenschutz-Textvorschlag.

Die ursprünglichen Autoren-/Lizenzhinweise des Ausgangsprojekts und der Bibliotheken bleiben enthalten. Die eigene Produktbezeichnung lautet GravelTube Activities; es wird keine offizielle Verbindung oder Unterstützung durch deren Autoren behauptet.

## Weitergabe

- `graveltube-activities-1.0.0.zip`: installierbares Plugin mit Bearbeitungsquellen und Build-Dateien.
- `graveltube-activities-1.0.0-source.zip`: vollständiges Entwicklungsprojekt, zusätzlich mit Tests und Release-Werkzeugen.
- `graveltube-activities-1.0.0-SHA256SUMS.txt`: Integritätswerte beider Archive.

Das vollständige Plugin-ZIP verteilen und das Projektarchiv für dieselbe Version daneben anbieten. Es sind keine persönlichen Trainingsdateien, Vorschauen oder lokalen Gesprächs-/Analyseberichte enthalten. Die Quellen kommen mit jeder Plugin-Kopie; das Entwicklungsprojekt steht zusätzlich auf https://github.com/gravelbiking/wp_plugin_showfit bereit.

## Upgrade und Betrieb

Die Aktivitätsdaten bleiben beim Upgrade erhalten. Nach dem Upgrade Website-/CDN- und Browser-Caches für Plugin-Assets und Seiten leeren, damit die neue Freigabeoberfläche geladen wird. Bei Neuinstallationen ist die OpenStreetMap-Website-Freigabe ausgeschaltet. Eine bereits gespeicherte Freigabe bleibt beim Upgrade erhalten. Die Datenschutzhinweise an den eigenen Websitebetrieb anpassen.

Dieses Paket ist für die Veröffentlichung der beschriebenen Version vorbereitet. Eine Aufnahme in das WordPress.org-Verzeichnis erfolgt durch dessen separates Review; dieses Dokument ist keine Zusage einer Verzeichniszulassung oder eine allgemeine rechtliche Konformitätsgarantie.
