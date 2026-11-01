# Bibliotheken in Version 1.1.0

Der Bibliotheksstand ist gegenüber Version 1.0.0 unverändert. Die nachfolgende Versions- und Sicherheitsprüfung wurde am 31.10.2026 durchgeführt.

Stand 31.10.2026. Die stabilen npm-`latest`-Versionen wurden direkt über die öffentliche Registry geprüft. Alpha-, Beta- und Entwicklungsversionen wurden nicht gewählt.

| Bibliothek | Version | Einsatz | Änderung gegenüber 0.4.2 |
|---|---|---|---|
| fit-file-parser | 6.2.7 | FIT-Import im Editor | Bereits aktuell |
| buffer | 6.0.3 | FIT-Binärdaten im Browser | Bereits aktuell |
| base64-js | 1.5.1 | Abhängigkeit von buffer | Bereits aktuell |
| ieee754 | 1.2.1 | Abhängigkeit von buffer | Bereits aktuell |
| Leaflet | 1.9.4 | Tourenkarte | Von 1.9.1 aktualisiert |
| Chart.js | 4.6.1 | Trainingsdiagramme | Von 4.4.0 aktualisiert |
| @kurkle/color | 0.6.5 | Farben innerhalb des Chart.js-Bundles | Von 0.3.2 aktualisiert |
| esbuild | 0.28.2 | Ausschließlich Build | Von 0.25.12 aktualisiert |
| @xmldom/xmldom | 0.9.12 | Ausschließlich Node-Tests | Bereits aktuell |
| playwright | 1.64.1 | Ausschließlich Browsertests | Bereits aktuell |
| playwright-core | 1.64.1 | Transitive Browserautomatisierung | Bereits aktuell |

Die optionalen `@esbuild/*`-Pakete sind ebenfalls auf 0.28.2 festgelegt. Sie stellen dieselbe native Build-Anwendung für verschiedene Betriebssysteme/CPUs bereit. Lizenzen und Herkunft der sieben ausgelieferten Laufzeitbibliotheken: `THIRD-PARTY.md`, `licenses/` und `source/vendor/manifest.json`. WordPress lädt keine dieser Entwicklungswerkzeuge.

Chart.js verwendet über eine ausdrückliche npm-Override-Regel @kurkle/color 0.6.5 statt seines upstream angegebenen Bereichs `^0.3.0`. Das Bundle wird aus den unveränderten Chart.js-Originalquellen erstellt. Die benötigten APIs werden durch `tests/chart-compat.test.js` und die tatsächlichen Diagramme im WordPress-Browser geprüft. Beide aktiven npm-Lockdateien legen denselben Abhängigkeitsstand fest.

## Sicherheitsabgleich

Die erneute OSV-Abfrage aller 37 exakten npm-Paket-/Versionspaare am 31.10.2026 ergab keine Versions-Treffer. Der nachfolgend separat geprüfte Leaflet-CVE ist in diesem Ergebnis nicht enthalten.

Die Versionsupdates beseitigen nicht automatisch jeden Eintrag, der einen Bibliotheksnamen nennt. Insbesondere beschreibt [CVE-2025-69993](https://www.cve.org/CVERecord?id=CVE-2025-69993) Leaflet bis einschließlich 1.9.4. Die [Leaflet-Maintainer widersprechen der Einstufung](https://github.com/Leaflet/Leaflet/issues/10214); der CVE-Eintrag bleibt veröffentlicht. Der Fork übergibt keine FIT-Inhalte an HTML-Popups. Seine Tooltips enthalten feste Start-/Ziel-/Rundenbeschriftungen. Die beschriebene Voraussetzung wurde in dieser Einbindung nicht gefunden. Das Update auf 1.9.4 wird deshalb nicht als Fix dieses CVE ausgegeben.

[CVE-2020-7746](https://www.cve.org/CVERecord?id=CVE-2020-7746) betrifft Chart.js vor 2.9.4; 4.6.1 liegt außerhalb des Bereichs. [CVE-2025-59288](https://www.cve.org/CVERecord?id=CVE-2025-59288) betrifft Playwright vor 1.55.1; 1.64.1 liegt außerhalb des Bereichs. Die zuvor einzeln geprüften 22 xmldom-CVEs betreffen andere Versionen als 0.9.12.

esbuild 0.28.2 liegt auch oberhalb der in den zusätzlichen GHSA-Hinweisen genannten Fix-Versionen 0.25.0 beziehungsweise 0.28.1. Der Plugin-Build verwendet die npm-/Node-CLI, keinen Deno-Download und keinen Entwicklungsserver.

Die produktive WordPress-/PHP-Installation und ihre bereitgestellten Pakete, etwa `wp-element`/React, werden durch dieses Update nicht verändert. Deren konkrete Versionsstände benötigen einen eigenen Abgleich. Fehlende veröffentlichte CVE-Treffer sind kein Nachweis allgemeiner Fehlerfreiheit.
