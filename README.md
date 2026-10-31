# GravelTube Activities

Displays FIT files in a WordPress post – with tour maps and training charts.

WordPress-Plugin für FIT-, GPX- und TCX-Aktivitäten. **Version 0.4.3** ist eine eigenständige Weiterentwicklung von **Show Fit File 1.2.7** von Stuart Tevendale.

## Funktionen

- Vollständige Speicherung von Originaldateien und Messpunkten in geschützten WordPress-Metadaten.
- Dateiauswahl startet automatisch den Import und zeigt die Aktivität unmittelbar an.
- Tourenkarte, Höhenprofil sowie Diagramme für Leistung, Puls und Kadenz.
- Automatische ROUVY-/Zwift-/Outdoor-Vorschläge, passende Farben, Device-Anzeige und einzeln konfigurierbare Datenfelder.
- Bearbeitbare Titelvorschläge aus FIT-Aktivitäts-/Workout-Namen; eigene Titel haben Vorrang.
- Optionaler Outdoor-Privatmodus mit 500-Meter-Schutz für Start und Ziel, global und pro Beitrag konfigurierbar.
- OpenStreetMap erst nach Website-Freigabe und ausdrücklichem Besucherklick.

## Installations-ZIP erstellen

Das Repository enthält bereits die fertigen JavaScript-Dateien und sämtliche Bearbeitungsquellen. Mit Python 3 im Projektverzeichnis:

```sh
python3 tools/package.py
```

Anschließend `dist/graveltube-activities-0.4.3.zip` in WordPress unter **Plugins → Installieren → Plugin hochladen** auswählen und aktivieren. WordPress ab 6.3, PHP ab 7.4 mit zlib und ein moderner Browser werden benötigt.

Die ZIP-Datei des gesamten GitHub-Repositories ist ein Entwicklungsprojekt. Für die WordPress-Installation wird das oben erzeugte Plugin-ZIP verwendet.

## Quellcode und Entwicklung

| Pfad | Inhalt |
| --- | --- |
| [`graveltube-activities/`](graveltube-activities/) | Installierbares Plugin mit PHP-/JavaScript-Quellen und lokalen Laufzeitbibliotheken |
| [`graveltube-activities/source/vendor/`](graveltube-activities/source/vendor/) | Bevorzugte Bibliotheksquellen, Original-Lizenzen und Herkunftsmanifest |
| [`graveltube-activities/tests/`](graveltube-activities/tests/) | Synthetische FIT-/XML-Fixtures und Datenprüfungen |
| [`tools/`](tools/) | WordPress-Browserprüfungen, Paketierung und Quellcode-Werkzeuge |

Frontend-Assets mit Node.js ab Version 20 neu erstellen:

```sh
cd graveltube-activities
npm ci --ignore-scripts
npm run build
```

Importer-Tests im Projektverzeichnis ausführen:

```sh
npm ci --ignore-scripts
npm test
```

Die Browserwerkzeuge benötigen eine lokale WordPress-Testinstallation, Playwright und Chrome. Testdateien werden synthetisch unter `.test-output/` erzeugt. Persönliche Trainingsdateien, Vorschauen, lokale Analyseberichte und installierte `node_modules` sind nicht Bestandteil dieses Repositories.

## Dokumentation und Lizenz

- [Verwendung, Architektur und Grenzen](graveltube-activities/README.md)
- [Aktuelle Bibliotheken und Sicherheitsabgleich](graveltube-activities/DEPENDENCIES.md)
- [Vollständiger Quellcode und Build](graveltube-activities/BUILD.md)
- [Datenspeicherung, Kartenfreigabe und Privatmodus](graveltube-activities/PRIVACY.md)
- [Prüfungen und praktische Testgrenzen](graveltube-activities/VALIDATION.md)
- [Lizenz- und Urheberhinweise](graveltube-activities/THIRD-PARTY.md)

**GPL-2.0-or-later**, siehe [LICENSE](LICENSE). Die Hinweise auf Stuart Tevendale als ursprünglichen Autor sowie die jeweiligen Lizenzen der mitgelieferten Bibliotheken bleiben erhalten. Es besteht keine behauptete offizielle Verbindung zu deren Autoren oder den genannten Geräte- und App-Herstellern.
