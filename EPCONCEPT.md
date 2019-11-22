# Erfahrungspunktekonzept

Erfahrungspunkte für Quests werden abhängig vom Level gewährt, sodass der Fortschritt, dein die Quest für einen Level bringt, immer gleich ist. Eine Quest bringt beispielsweise "5%" Levelfortschritt. Kann theoretisch auch > 100% sein, wenn die Quest besonders schwer ist. Damit wird dann ein Level übersprungen.

In jedem Level muss man mehr EPs sammeln. Ich nehme dazu den Faktor `1,1`. Das sieht wichtig aus und ist nicht glatt. Intuitiv bestimmt. Für den Aufstieg von Level 0 zu LEvel 1 werden 10 EPs benötigt. Für 1 auf 2 dann 11 EPs. Bei 99 > 100 bräuchte man damit etwa 13.000.000 EPs.

Die Scwellen-EPs werden in der [Excel Datei](epcalculator.xlsx) ausgerechnet und in einem Lookup-Feld in `App.epthresholds` clientseitig fest definiert, wobei der Index den Level und der Wert die EPs, die für das Level notwendig sind, darstellen.