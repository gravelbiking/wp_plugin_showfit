# Herkunft der Ressourcen

| Komponente | Version | Herkunft | Lizenz |
|---|---|---|---|
| Show Fit File, Ausgangsprojekt | 1.2.7 | https://github.com/tevendale/ShowFitFile | GPL-2.0-or-later (Paketangabe); LICENSE beibehalten |
| Leaflet | 1.9.1 | Mitgeliefertes Originalpaket, https://github.com/Leaflet/Leaflet/tree/v1.9.1 | BSD-2-Clause, licenses/leaflet.txt |
| Chart.js | 4.4.0 | Mitgeliefertes Originalpaket, https://github.com/chartjs/Chart.js/tree/v4.4.0 | MIT, licenses/chartjs.txt; @kurkle/color-Hinweis im Bundle |
| @kurkle/color | 0.3.2 | Im Chart.js-Bundle enthalten | MIT, licenses/kurkle-color.txt |
| fit-file-parser | 6.2.7 | https://github.com/jimmykane/fit-parser | MIT, licenses/fit-file-parser.txt |
| buffer | 6.0.3 | npm, transitiv über fit-file-parser | MIT, licenses/buffer.txt |
| base64-js | 1.5.1 | npm, transitiv über buffer | MIT, licenses/base64-js.txt |
| ieee754 | 1.2.1 | npm, transitiv über buffer | BSD-3-Clause, licenses/ieee754.txt |

WordPress-eigene JavaScript-Pakete werden von der WordPress-Installation bereitgestellt. Es werden keine FontAwesome-, Kartenmarker- oder Noun-Project-Grafiken aus dem Originalplugin verwendet. Die mitgelieferten Leaflet-Bilder gehören zur Leaflet-Distribution.

Die Originalquellen der sieben mitgelieferten Laufzeitbibliotheken liegen unter `source/vendor/`. `source/vendor/manifest.json` nennt feste Git-Commits beziehungsweise npm-Integritätswerte, Archivherkunft und Einzeldatei-Prüfsummen. Die ursprünglichen Lizenzen sind auch dort enthalten. `licenses/kurkle-color.txt` ist eine unveränderte Kopie der Original-Lizenz zu Version 0.3.2; der zusätzliche 2023-Hinweis im Chart.js-Bundle bleibt ebenfalls erhalten.
