# Vollständiger Quellcode und Build

Dieses installierbare Plugin enthält seine Quellen und Build-Eingaben selbst. Ein zusätzlicher Webdienst oder ein versprochener späterer Download ist nicht erforderlich, um diese Dateien zu erhalten.

## Enthaltene Quellen

- `graveltube-activities.php`, `includes/`: PHP-Quellen.
- `src/`: bearbeitbare JavaScript-Quellen des Editors und der Importer.
- `assets/viewer.js`, `assets/viewer.css`: direkt ausgeführte, lesbare Frontend-Quellen.
- `package.json`, `package-lock.json`: Build-Befehl und exakt aufgelöste npm-Pakete.
- `scripts/build.mjs`: reproduzierbarer Build für Editor, Chart.js und lokale Leaflet-Assets.
- `source/vendor/`: bevorzugte Bearbeitungsformen der mitgelieferten Laufzeitbibliotheken, einschließlich TypeScript-/JavaScript-Quellen, benötigter Generator-/Build-Konfiguration und Original-Lizenzen. Dokumentation, Tests, Beispieldateien und fertige Fremd-Builds wurden bei den GitHub-Snapshots ausgelassen.
- `source/vendor/manifest.json`: Originalprojekte, Versionen, feste Commits beziehungsweise npm-Integritätswerte und SHA-256-Prüfsummen jeder enthaltenen Bibliotheksquelldatei.
- `LICENSE`, `licenses/`, `THIRD-PARTY.md`: Lizenztexte, Herkunft und Zuordnung.

## Frontend-Assets erstellen

Im entpackten Pluginordner mit Node.js ab Version 20 und npm:

```sh
npm ci --ignore-scripts
npm run build
```

Das erzeugt `assets/editor.js` aus `src/editor.js`, baut `assets/vendor/chart.js` aus dem unveränderten Original-Einstiegspunkt `source/vendor/chart.js/src/index.umd.ts` und kopiert die Leaflet-Distributionsdateien aus dem festgelegten npm-Paket nach `assets/vendor/leaflet/`. Alle Dateien sind bereits im Plugin enthalten; WordPress führt diesen Build nicht aus.

Chart.js 4.6.1 gibt upstream noch `@kurkle/color ^0.3.0` an. Eine ausdrückliche npm-Override-Regel legt die aktuelle stabile Version 0.6.5 fest. Die benötigten Farbhelfer-Schnittstellen werden im Projekt separat getestet; zusätzlich werden die tatsächlich erzeugten Diagramme im Browser geprüft. Es wird kein alter vorgefertigter Chart.js-UMD-Build mit eingebetteter älterer Farbbibliothek kopiert.

npm lädt beim ausdrücklich gestarteten `npm ci` die in der Lockdatei festgelegten Build-Werkzeuge und Paketfassungen. Diese Netzwerkkommunikation findet nicht im installierten WordPress-Plugin statt. Zum Lesen, Ändern oder Weitergeben des bereits enthaltenen Codes ist dieser Download nicht nötig.

Die mitgelieferten Leaflet-/Chart.js-Builds sind den Versionen in `THIRD-PARTY.md` und `DEPENDENCIES.md` zugeordnet. Ihre ursprünglichen Bearbeitungsquellen und Build-Konfigurationen liegen unter `source/vendor/leaflet/` beziehungsweise `source/vendor/chart.js/`; enthaltene Abhängigkeiten wie `@kurkle/color` haben eigene Unterordner. Die unveränderten Original-Dev-Lockdateien dokumentieren zusätzliche Upstream-Buildwege. Der oben beschriebene Plugin-Build verwendet ausschließlich die aktive Plugin-Lockdatei und installiert diese fremden Entwicklungsketten nicht.

Das zusätzliche vollständige Projektarchiv `graveltube-activities-1.0.0-source.zip` enthält außerdem die Testgeneratoren, PHP-/Browserprüfungen und die Release-Werkzeuge. Es ist für die Arbeit am gesamten Projekt vorgesehen; das installierbare Plugin-ZIP enthält bereits die zum Plugin gehörenden Bearbeitungsquellen und Build-Dateien.

## Weitergabe

Bei Veröffentlichung das vollständige Plugin-ZIP einschließlich dieses Dokuments und `source/vendor/` verteilen. Das optionale Projektarchiv sollte daneben für dieselbe Version angeboten werden. Lizenz- und Urheberhinweise beibehalten. Die Quellen werden dadurch zusammen mit jeder Plugin-Kopie geliefert; die Dokumentation benötigt keine erfundene Repository- oder Download-URL.
