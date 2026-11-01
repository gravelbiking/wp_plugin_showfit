# GitHub-Updates

Version 1.1.0, 01.11.2026.

Die eigene Klasse `includes/class-github-updater.php` verbindet das aktive Plugin mit den normalen WordPress-Updatefunktionen. Updatequelle ist ausschließlich das öffentliche Repository `gravelbiking/wp_plugin_showfit`. Ein GitHub-Token und eine weitere Bibliothek sind nicht erforderlich.

## Verhalten in WordPress

- Die normale WordPress-Updateprüfung liest das neueste veröffentlichte stabile GitHub-Release. Entwürfe, Pre-Releases und Versionsnamen mit Beta-/Dev-Zusätzen werden nicht als Update angeboten. Änderungen auf einem Branch allein sind keine Updates.
- Erfolgreiche Antworten werden zwölf Stunden zwischengespeichert, Fehler für 15 Minuten. Ein GitHub-Ausfall oder eine API-Begrenzung erzeugt kein Update und unterbricht keine Aktivitätsdarstellung.
- Unter **Plugins** kann ein Benutzer mit Updateberechtigung **GitHub-Update prüfen** auswählen. Der mit einem WordPress-Nonce geschützte Vorgang leert die betreffenden Caches und stößt die normale Prüfung erneut an.
- Neue Versionen erscheinen mit der normalen WordPress-Aktualisierungsmeldung. Die Detailansicht enthält Version, Systemanforderungen und als Text behandelte Release-Notizen.
- Die Klasse erzwingt keine automatischen Installationen. Die WordPress-Einstellung für automatische Plugin-Updates bleibt maßgeblich.
- Die Routine läuft, solange das Plugin aktiviert ist. Die bereits veröffentlichte Version 1.0.0 enthält noch keinen Updater: Version 1.1.0 muss daher einmal manuell installiert werden.

## Release-Dateien

Vor einer ausdrücklich freigegebenen Veröffentlichung die stabile Version konsistent in Plugin-Kopf, `GTA_VERSION`, `block.json`, Plugin-`package.json`/Lockdatei und Readme eintragen. Dann im Projektverzeichnis ausführen:

```sh
python3 tools/package.py
```

Das erzeugt für die gewählte Version:

1. `graveltube-activities-VERSION.zip`: das installierbare Plugin mit vollständigen Bearbeitungsquellen und Lizenzen.
2. `graveltube-activities-VERSION-source.zip`: das vollständige Entwicklungsprojekt einschließlich Testwerkzeugen.
3. `graveltube-activities-update.json`: Versionsnummer, minimale WordPress-/PHP-Version, getestete WordPress-Version, genaue Paket-URL und SHA-256 des installierbaren ZIPs. Diese Werte werden aus den aktuellen Paketdateien erzeugt.
4. `graveltube-activities-VERSION-SHA256SUMS.txt`: Prüfsummen der beiden Archive und der Update-Datei.

Alle vier Dateien gehören als Assets zu demselben GitHub-Release mit Tag `vVERSION`. Ein nackter Git-Tag oder das automatisch von GitHub erstellte Repository-Quellcode-ZIP genügt nicht. Release-Dateien nach der Veröffentlichung nicht ersetzen; Korrekturen erhalten eine neue Version. Das Release 1.1.0 verwendet den Tag `v1.1.0` und diese vier Assets.

## Paketprüfung

Ein neueres Release wird nur mit genau einer passenden Update-Datei und genau einem passenden installierbaren ZIP verwendet. Dateinamen, Repository, Release-Tag, Version, Plugin-Identität und Kompatibilitätsangaben müssen zusammenpassen. Andere Hosts, HTTPS-Abstufungen und nicht erwartete Downloads werden abgewiesen. Legitime GitHub-Asset-CDN-Weiterleitungen sind zulässig.

Vor dem Entpacken werden Dateigröße und SHA-256 kontrolliert. Wenn GitHub zusätzliche Asset-Prüfsummen liefert, müssen auch diese passen. Vor dem Austausch des vorhandenen Pluginordners werden außerdem der Ordnername sowie Version, Updatequelle und Anforderungen im Plugin-Kopf geprüft. Die Installation selbst übernimmt der WordPress-Upgrader. Ein Paket mit abweichender Prüfsumme oder falscher Identität wird nicht installiert.

Die Prüfsummen schützen die Integrität der heruntergeladenen Pakete. Sie sind keine unabhängige Signatur des Herausgebers: Veröffentlichungsrechte am GitHub-Repository bleiben Teil der Vertrauensgrundlage.

## Verbindungen und Daten

Die Prüfungen werden vom WordPress-Server zu `api.github.com` und für Update-Dateien zu GitHub beziehungsweise dessen Asset-CDN aufgebaut. GitHub erhält dabei unter anderem die Server-IP und einen User-Agent mit dem Namen und der installierten Version dieses Updaters. Die Klasse fügt weder Website-URL noch Benutzerkennungen, Zugangstoken oder Trainingsdaten hinzu. FIT-Dateien und Aktivitätsarchive werden dafür nicht übertragen. Details stehen auch in `PRIVACY.md`.
