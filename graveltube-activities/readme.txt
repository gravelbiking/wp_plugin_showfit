=== GravelTube Activities ===
Tags: fit, gpx, tcx, cycling, training
Requires at least: 6.3
Requires PHP: 7.4
Tested up to: 6.8
Stable tag: 1.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Tourenkarte und Trainingsdiagramme für FIT, GPX und TCX mit vollständiger Datenspeicherung.

== Installation ==

1. Plugin-ZIP über Plugins > Installieren > Plugin hochladen installieren und aktivieren.
2. Aktivitäten > Importieren öffnen und eine Datei auswählen.
3. Aktivität prüfen und veröffentlichen.
4. Block GravelTube Aktivität oder [graveltube_activity id="123"] verwenden.

== Description ==

Speichert Originaldateien und vollständige importierte Messreihen in privaten WordPress-Metadaten.
Zeigt Tourenkarte, Höhenprofil und Diagramme für Leistung, Herzfrequenz und Kadenz.
FIT-Schaltungsdaten: Gangverlauf, Übersetzung und Schalthäufigkeit mit separater Datenfreigabe.
Unterstützt Indoor-Training, mehrere Sessions/Runden, Reimport und die Auswahl öffentlicher Messwerte.
Kartenkacheln werden von OpenStreetMap geladen. PHP zlib wird benötigt.
Ausführliche Architektur, Grenzen, Lizenzhinweise und Prüfungen: README.md, THIRD-PARTY.md, VALIDATION.md.

== External services ==

OpenStreetMap Foundation provides map tiles from https://tile.openstreetmap.org.
The service is disabled by default. An administrator must enable it under Activities > External maps.
Each visitor must then explicitly click to load a map for that view. No map requests happen beforehand.
IP address, browser information, website origin and requested map areas are sent to the provider.
FIT files and sensor values are not sent. No consent cookies or browser-storage entries are created.
Privacy policy: https://osmfoundation.org/wiki/Privacy_Policy
Tile usage terms: https://operations.osmfoundation.org/policies/tiles/
See PRIVACY.md for details and a description of local training-data storage.

== Source code ==

This ZIP includes PHP/JavaScript sources, package.json, package-lock.json, BUILD.md
and the preferred source forms of runtime libraries in source/vendor/.
The source/vendor/manifest.json records versions, fixed upstream references and checksums.
Build in the plugin directory with Node.js 20+: npm ci --ignore-scripts && npm run build.
All license and original author notices are included; see THIRD-PARTY.md and licenses/.

== Changelog ==

= 1.1.0 =
Rundentabelle standardmäßig aus; pro Beitrag aktivierbar. Bewegungszeit je Runde ersetzt die angezeigte Timerzeit.
Timerzeit standardmäßig ausschalten, manuelle Auswahl pro Beitrag erhalten; Beschriftung Bewegungszeit ohne Zusatz.
Höhe, Herzfrequenz und Kadenz bei erkannten Pausen horizontal fortführen und als Fortführung kennzeichnen; Originalwerte und Berechnungen unverändert.
Schaltungsdaten unter eigener beschrifteter Trennlinie anordnen.
Vorderes Schaltfeld und vordere Gangkurve bei vermuteter 1-fach-Schaltung automatisch ausblenden; manuelle Einzelwahl im Block und Shortcode.
Gangverlauf, Übersetzung und Schalthäufigkeit aus elektronischen FIT-Schaltmeldungen.
Vier konfigurierbare Schaltungsdatenfelder, drei Diagrammschalter und serverseitige Schaltungsfreigabe.
Bestehende vollständige FIT-Archive ohne erneuten Import auswertbar.
Start in Datum und Aufstieg in Höhenmeter/hm umbenannt; Abstieg in der Darstellung ausgeblendet.
GitHub-Updater für stabile Releases, native Updateanzeige und erneute Prüfung mit Cache.
Prüfung von Paketidentität, Systemanforderungen und SHA-256 vor der Installation.
Zusätzliche Update-Metadaten aus der Paketierung; Details in UPDATES.md.

= 1.0.0 =
Erstes stabiles Release mit vollständiger FIT-/GPX-/TCX-Speicherung, Tourenkarte und Trainingsdiagrammen.
ROUVY-/Zwift-/Outdoor-Farben, Device-Anzeige, konfigurierbare Datenfelder und FIT-Titelvorschläge.
Outdoor-Privatmodus mit 500-Meter-Ausblendung und ausdrückliche OpenStreetMap-Freigabe.
Enthält den in 0.4.3 geprüften Funktions- und Bibliotheksstand sowie sämtliche Quellcode- und Lizenzdateien.

= 0.4.3 =
Leaflet 1.9.4, Chart.js 4.6.1, @kurkle/color 0.6.5 und esbuild 0.28.2.
Reproduzierbarer Build aller Frontend-Assets mit vollständigen Originalquellen und aktualisierten Lizenzen.

= 0.4.2 =
FIT-Aktivitäts- und Workout-Namen als bearbeitbare Titelvorschläge verwenden; Ersatz durch Dateinamen.
Eigene Titel und vorhandene Titel bei Reimport beibehalten; Vorschlag separat übernehmbar.
Vorschläge auch für bestehende FIT-Archive anzeigen und nur berechtigten Bearbeitern ausgeben.


= 0.4.1 =
Dateien direkt nach Auswahl automatisch einlesen, speichern und anzeigen; kein zusätzlicher Button.
Vorschau, Gerätehinweis und geschützte Downloadlinks ohne Neuladen der Aktivität aktualisieren.
Neue Aktivitäten als Entwurf speichern; eigene Titel und vorhandene Freigaben erhalten.
Während des Imports weitere Uploads und Veröffentlichungsbuttons sperren; Fehler erlauben erneute Auswahl.


= 0.4.0 =
Privater Outdoor-Kartenmodus: globale Vorgabe plus pro Block überschreibbare Auswahl.
GPS der ersten/letzten 500m und Start-/Zielumgebung serverseitig ausblenden, auch bei Rundtouren.
Keine Start-/Ziel- und Rundenmarker im Privatmodus; dokumentierender Hinweis unter der Karte.
Vollständige Trainingsdaten und private Originalarchive beibehalten.
GPS-Abrufe an gespeicherte öffentliche Einbindungen binden; keine GPS-Ausgabe ohne gültigen Kontext.


= 0.3.1 =
Device bei ROUVY und Zwift automatisch ausblenden; im Block weiterhin manuell einschaltbar.
Datenfeld in Device umbenennen. Manuelle Geräteanzeige separat speichern und bei Wechsel der Aktivitätsart beibehalten.
Schalter zur Rückkehr auf automatische Vorgaben; Shortcodes unterstützen device="show|hide|auto".
Start zeigt nur noch das Datum dd.mm.yyyy, ohne Uhrzeit. Vollständige Zeitstempel bleiben erhalten.


= 0.3.0 =
Automatische Vorschläge für ROUVY, Zwift, Outdoor und Indoor aus FIT-Ersteller-/Sessiondaten.
Manuelle Aktivitätsart pro Aktivität und Beitragsblock; blasse App-Farben für Datenfelder.
Aufnahmegerät aus Creator-Metadaten, ohne gekoppelte Sensoren oder Seriennummern.
Dreizehn einzeln schaltbare Datenfelder im Block und globale Vorgaben unter Aktivitäten > Anzeige.
Startzeit im festen Format tt.mm.jjjj, hh:mm in der Website-Zeitzone.


= 0.2.0 =
Correct original @kurkle/color license, bundle editing/build sources and pinned vendor sources.
Add disabled-by-default website approval and per-view visitor consent for OpenStreetMap.
Use canonical tile URL, origin-only referrer and complete map attribution.
Add service/privacy documentation and a WordPress privacy-policy text suggestion.


= 0.1.1 =
Präzise FIT-Sessiondauer statt verkürzter Dauer zwischen erstem und letztem Messpunkt.

= 0.1.0 =
Eigenständige Weiterentwicklung von Show Fit File 1.2.7 mit neuer Datenspeicherung,
gemeinsamem Block-/Shortcode-Renderer und korrigierter Zeit-/GPS-Verarbeitung.
