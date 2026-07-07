# Km-Stand Erinnerungserweiterung

_Started 2026-07-07 16:27 UTC_

---

## User

erweiterung

km-Stand regelmäßig eintragen + Push-Erinnerung alle 4 Wochen (3a Übersicht)

km-Erinnerung mobil (4a)

## Assistant

_[tool: read_file]_

I'll add a new turn (5) at the top with two options: the km-Stand tracking + 4-week push reminder in the 3a Übersicht (desktop), and the km reminder mobile screens (4a style).

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fertig. Neuer Turn **5** ganz oben mit zwei Optionen:

- **5a** (Desktop, 3a-Übersicht): km-Modul in der Fahrzeugkarte — aktueller Stand, Eingabefeld + „+500/+1.000"-Chips, 6-Monats-Trend, Verbrauchs-Schnitt für die Ölservice-Prognose und ein Push-Erinnerungsblock mit 4-Wochen-Intervall + nächstem Termin.
- **5b** (mobil, 4a-Stil): Push auf dem Sperrbildschirm („km-Stand eintragen?") und der Eintrag-Screen mit Stepper, letztem Wert, Erinnerungs-Toggle (alle 4 Wochen) und Bottom-Nav.

## User

Hinterlasse für Claude code die notiz, dass die namen der personen die die fahrzeuge fahren anpassbar sein sollen

## Assistant

_[tool: write_file]_

Notiz in `CLAUDE.md` hinterlegt: die Fahrer-Namen der Fahrzeuge (aktuell fest als „Anna"/„Tom") sollen pro Fahrzeug editierbar sein.

