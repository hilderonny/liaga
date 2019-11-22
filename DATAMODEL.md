# Datenmodell

## player

Metadaten zu einem Spieler.

|Attribut|Typ|Beschreibung|
|---|---|---|
|ep|Ganzzahl|Gesamtzahl an Erfahrungspunkten|
|user|user|Referenz auf Benutzeraccount für ANmeldung|
|rubies|Ganzzahl|Momentane Anzahl Rubine im Besitz|

## quest

Beschreibung und Grunddaten zu Quests.

|Attribut|Typ|Beschreibung|
|---|---|---|
|description|Text|Aufgabenbeschreibung|
|relep|Dezimalzahl|Relative Anzahl von Erfahrungspunkten zum Spielerlevel|
|minlevel|Ganzzahl|Mindestlevel, den ein Spieler haben muss, um die Quest beginnen zu können|
|relrubies|Dezimalzahl|Relative Anzahl von Rubinen, die ein Spieler abhängig von seinem Level bekommt|


## playerquest

Quests, die derzeit von Spielern durchgeführt werden.