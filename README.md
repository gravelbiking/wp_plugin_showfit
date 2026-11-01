# GravelTube Activities

WordPress-Plugin für FIT-, GPX- und TCX-Aktivitäten mit Tourenkarte und Trainingsdiagrammen. **Version 1.1.0** entwickelt **Show Fit File 1.2.7 von Stuart Tevendale** eigenständig weiter.

## Installation und Updates

[Plugin-ZIP 1.1.0 herunterladen](https://github.com/gravelbiking/wp_plugin_showfit/releases/download/v1.1.0/graveltube-activities-1.1.0.zip) und in WordPress unter **Plugins → Installieren → Plugin hochladen** installieren oder damit aktualisieren.

**Version 1.0.0 benötigt einmal dieses manuelle Update.** Ab 1.1.0 ist die GitHub-Updaterklasse enthalten und bietet zukünftige stabile Releases über die normalen WordPress-Updates an. Automatische Installationen werden nicht erzwungen. Aktivitäten und Originalarchive bleiben erhalten.

Voraussetzungen: WordPress ab 6.3, PHP ab 7.4 mit zlib, moderner Browser. Die ZIP-Datei des gesamten Repositorys ist ein Entwicklungsprojekt; zur WordPress-Installation das oben verlinkte Plugin-ZIP verwenden.

## Funktionen

- Vollständige private Speicherung von Originaldateien, Messpunkten und FIT-Rohmeldungen. Dateiauswahl startet sofort den Import und die Vorschau.
- Tourenkarte, Höhenprofil und Trainingsdiagramme für Leistung, Herzfrequenz und Kadenz, soweit Messwerte vorhanden sind.
- Elektronische Schaltung: Gangverlauf, Übersetzung und Schalthäufigkeit mit getrennten Schaltungsdatenfeldern. Bei vermuteter 1-fach-Schaltung werden vorderes Schaltfeld und vordere Kurve automatisch ausgeblendet; beide sind manuell aktivierbar.
- Rundentabelle standardmäßig aus, pro Beitrag einschaltbar. Bewegungszeit je Runde wird aus Messpunkten und Pausen berechnet.
- Individuelle Datenfelder und globale Vorgaben, ROUVY-/Zwift-/Outdoor-Farben, Device-Anzeige und bearbeitbare FIT-Titelvorschläge.
- Horizontale, gekennzeichnete Fortführung von Höhe, Herzfrequenz und Kadenz bei erkannten Pausen; Originaldaten und Mittelwerte unverändert.
- Optionaler Outdoor-Privatmodus mit 500-Meter-Schutz für Start und Ziel, global und pro Beitrag konfigurierbar.
- OpenStreetMap erst nach Website-Freigabe und ausdrücklichem Besucherklick.

## Quellen und Entwicklung

Das installierbare ZIP enthält PHP-/JavaScript-Quellen, Build-Dateien, Lizenzen und die bevorzugten Quellen der Laufzeitbibliotheken unter `graveltube-activities/source/vendor/`. Das zusätzliche [Quellcodepaket 1.1.0](https://github.com/gravelbiking/wp_plugin_showfit/releases/download/v1.1.0/graveltube-activities-1.1.0-source.zip) enthält das vollständige Projekt einschließlich Tests und Werkzeugen.

Im Projektverzeichnis mit Node.js 20+ und Python 3:

```sh
npm ci --ignore-scripts
npm run build
npm test
php graveltube-activities/tests/activity-test.php
python3 tools/package.py
```

Browserprüfungen unter `tools/` benötigen eine isolierte lokale WordPress-Testinstallation, Playwright und Chrome. Persönliche Trainingsdateien, Vorschauen, lokale Gesprächs-/Analyseberichte und installierte `node_modules` sind nicht Bestandteil des Repositorys oder der Release-Pakete.

## Dokumentation und Lizenz

- [Verwendung und Architektur](graveltube-activities/README.md)
- [Änderungen in 1.1.0](graveltube-activities/RELEASE.md)
- [Prüfungen und Grenzen](graveltube-activities/VALIDATION.md)
- [Build und Quellcodebereitstellung](graveltube-activities/BUILD.md)
- [GitHub-Updater und Paketprüfung](graveltube-activities/UPDATES.md)
- [Datenspeicherung, Kartenfreigabe und Privatmodus](graveltube-activities/PRIVACY.md)
- [Bibliotheken und Sicherheitsabgleich](graveltube-activities/DEPENDENCIES.md)
- [Urheber- und Drittanbieterhinweise](graveltube-activities/THIRD-PARTY.md)

**GPL-2.0-or-later**, siehe [LICENSE](LICENSE). Die ursprünglichen Hinweise auf Stuart Tevendale sowie die Lizenzen der Bibliotheken bleiben erhalten. Keine behauptete offizielle Verbindung zu den genannten Herstellern oder App-Anbietern.
