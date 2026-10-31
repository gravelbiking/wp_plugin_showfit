# OpenStreetMap und Trainingsdaten

## Freigabe

Der Kartendienst ist nach Installation und nach einem Upgrade ohne vorherige Freigabeeinstellung deaktiviert. Administratoren können ihn unter **Aktivitäten → Externe Karten** freigeben. Das erzeugt noch keine Kartenanfragen von Besuchern.

Jede Kartenansicht erklärt den externen Dienst und bietet „OpenStreetMap laden“ und „Ohne Karte fortfahren“ an. Vor dem Laden wird weder eine Leaflet-Karte noch eine Kachelebene initialisiert. Nach „Karte schließen“ wird die Karteninstanz entfernt. Bereits abgeschickte Anfragen können nicht zurückgenommen werden. Erneutes Laden der Seite oder eine weitere Aktivitätsansicht benötigt einen neuen Klick.

Für diese Freigabe setzt das Plugin keine Cookies und schreibt keine Entscheidung in `localStorage` oder `sessionStorage`. Es gibt keine automatische Einwilligung durch Scrollen, Diagramm-Hover oder das Importieren einer Datei. Die Website-Freigabe wird als WordPress-Option gespeichert und ist nur mit Administratorrechten änderbar.

## Externer Dienst

- Anbieter: OpenStreetMap Foundation, Vereinigtes Königreich.
- Zweck: Hintergrundkarten für die freigegebene GPS-Strecke.
- URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- An den Anbieter gehen insbesondere IP-Adresse, Browserinformationen, Zeitpunkt der Anfrage, Website-Ursprung als Referrer und angefragte Kartenausschnitte. Letztere können Rückschlüsse auf die dargestellte Strecke zulassen.
- Originaldateien, Leistungswerte, Herzfrequenz, Kadenz und das vollständige Aktivitätsarchiv werden nicht an OpenStreetMap gesendet.
- Kartenkacheln können nach normalen HTTP-Cache-Regeln im Browser zwischengespeichert werden. Es gibt keine Vorab- oder Offline-Kartendownloads.
- Datenschutzerklärung: https://osmfoundation.org/wiki/Privacy_Policy
- Nutzungsrichtlinie der Kartenkacheln: https://operations.osmfoundation.org/policies/tiles/
- Lizenz-/Urheberinformationen: https://www.openstreetmap.org/copyright

## Schutz von Start und Ziel

Der private Outdoor-Kartenmodus ist unter Aktivitäten → Anzeige global vorwählbar und in jeder gespeicherten Beitragseinbindung übersteuerbar. Die neue globale Vorgabe ist anfangs ausgeschaltet. Bei aktivem Modus entfernt der Server die GPS-Koordinaten der ersten und letzten 500 Meter und aller Punkte im 500-Meter-Bereich um die ursprünglichen Endpunkte aus der öffentlichen Antwort. Auch Rundenpositionen werden dabei entfernt. Die vollständigen Originaldaten bleiben im geschützten Archiv und dessen Backups erhalten.

Die Karte zeigt keine Start-/Zielmarker für diese Ansicht; Diagramm-Hover erhält für die geschützten Bereiche keine Position. Der Hinweis „Der genaue Start und das Ziel sind aus Sicherheitsgründen hier ausgeblendet.“ dokumentiert dies unter der Karte. Die OpenStreetMap-Freigabe bleibt zusätzlich erforderlich. Das Ausblenden der Route verhindert nicht, dass die Hintergrundkarte auch das weitere Gebiet um die sichtbare Strecke enthält.

Die öffentliche API verwendet ausschließlich die in einem freigegebenen Beitrag gespeicherten Einstellungen und die aktuelle globale Vorgabe. Anonyme Aufrufe ohne gültigen Einbindungskontext erhalten keine GPS-Koordinaten. Eine andere Einbindung mit ausdrücklich ausgeschaltetem Modus kann die vollständige Strecke weiterhin veröffentlichen. Bereits vorher veröffentlichte oder heruntergeladene Daten lassen sich damit nicht zurückholen. Die Option schützt die genannten Streckenbereiche und ist keine Zusage vollständiger Anonymität einer gesamten Tour.

## Lokale Speicherung

Trainingsdateien und vollständige Datensätze liegen in der WordPress-Datenbank und ihren Backups. Neue Importe sind Entwürfe. Öffentliche Messwerte und GPS-Daten werden an der Aktivität ausgewählt; Originale und vollständige Archive bleiben auf Bearbeiter beschränkt. Endgültiges Löschen einer Aktivität entfernt deren Metadaten über WordPress; Backups haben eigene Löschfristen des Betreibers.

Unter **Einstellungen → Datenschutz** stellt das Plugin einen Textvorschlag bereit. Der Betreiber muss seine Datenschutzhinweise an seine konkrete Installation, die Zwecke der Veröffentlichung von Trainingsdaten und weitere eingesetzte Dienste anpassen. Das Plugin verspricht keine automatische rechtliche Konformität.
