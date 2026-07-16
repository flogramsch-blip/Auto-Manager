# Projektbeschreibung: Auto-Manager + Family-Dashboard

Diese Datei fasst zusammen, was gebaut wurde, warum, wo es läuft und welche
Entscheidungen bewusst getroffen wurden. Gedacht als Gedächtnisstütze — z.B. um in
einer neuen Claude-Code-Sitzung schnell wieder anzudocken, falls etwas verloren geht
oder weitergebaut werden soll.

## Worum es geht

Zwei zusammenspielende Web-Apps für zuhause (Familie Gramsch):

1. **Auto-Manager** — Fahrzeug-Wartungsplaner. Verwaltet mehrere Fahrzeuge (Autos,
   Motorrad), TÜV/Ölwechsel/Inspektion-Termine, Kilometerstände, Kosten, Werkstätten,
   mit Google-Kalender-Sync und Push-Erinnerungen fürs Kilometerstand-Eintragen.
2. **Family-Dashboard** — Wand-Dashboard fürs Android-Tablet im Kiosk-Modus (Wetter,
   Familienkalender, Smart-Home/Shelly-Geräte, ÖPNV, Müllabfuhr, Musik). Zeigt
   Auto-Manager als **dritte, vollständig eingebettete Seite** (nicht per iframe,
   sondern nativ im selben React-Programm mitgerendert), damit Wischen zwischen den
   Seiten überall auf dem Bildschirm funktioniert.

Auto-Manager ist eigenständig nutzbar (z.B. vom Handy) UND läuft als native Kopie
innerhalb von Family-Dashboard auf dem Wand-Tablet mit.

## Herkunft

Auto-Manager entstand aus einem Claude-Design-Wireframe-Export
(`Fahrzeug-Wartung Wireframes.dc.html`, siehe `project/`-Ordner und `chats/`-Transkripte
im Repo) und wurde daraus als echte App implementiert. Family-Dashboard existierte
bereits als eigenständiges React-Projekt und wurde um die Auto-Manager-Einbettung
erweitert.

## Wo es läuft

Seit der Konsolidierung läuft **alles auf dem Ubuntu-Rechner** (24/7, ähnlich zuverlässig
wie die NAS). Die NAS ist nur noch optionales Backup-Ziel, nicht mehr Live-Host.

- **Ubuntu-Rechner** (läuft auch Home Assistant):
  - **Auto-Manager** (Frontend + Backend + SQLite), per Docker Compose. Frontend unter
    `http://<ubuntu-ip>:8080` (u.a. fürs Handy). Backend nicht mehr im LAN
    veröffentlicht — nur intern im geteilten Docker-Netzwerk `familie-net` erreichbar.
  - **Family-Dashboard** (Frontend + **eigenes Backend**, Node.js), per Docker Compose,
    unter `http://<ubuntu-ip>:3080`. Das Dashboard-Backend spricht Home Assistant,
    Wetter (Open-Meteo), ÖPNV (VBB), Müll (ICS), Google-Kalender und Sonos an. Die
    eingebettete Auto-Manager-Seite erreicht dessen Backend intern über `familie-net`
    (`http://auto-manager-backend:4000`).
  - **Home Assistant** (nativ auf dem Host): steuert die Shelly-Geräte. Das
    Dashboard-Backend erreicht es über `host.docker.internal:8123` mit einem
    langlebigen Zugriffstoken.
- **Synology NAS (DS423+)**: nur noch Backup-Ziel (siehe `scripts/backup-to-nas.sh` im
  Family-Dashboard-Repo).
- **Android-Tablet**: zeigt Family-Dashboard über den **Fully Kiosk Browser** im
  Kiosk-Modus an.

## Repos

- `github.com/flogramsch-blip/Auto-Manager` — Fahrzeugverwaltung (eigenständig)
- `github.com/flogramsch-blip/Family-Dashboard` — Wand-Dashboard, enthält unter
  `src/auto-manager/` eine **eingebettete Kopie** von Auto-Managers Frontend-Code
  (siehe „Wichtige Design-Entscheidung: keine iframe-Einbettung" unten, warum es eine
  Kopie statt eines geteilten Pakets ist)

## Technischer Aufbau

**Auto-Manager**
- Frontend: React + Vite + TypeScript, React Router, eigenes CSS-Designsystem
  (handschriftliche „Kalam"-Skizzenoptik, hell) in `frontend/src/styles/global.css`
- Backend: Node.js + Express + TypeScript, SQLite (`better-sqlite3`), REST-API unter
  `/api/*`
- Google Calendar OAuth (optional, für echten Kalender-Sync beim Buchen)
- Web Push (VAPID) für die 4-Wochen-Kilometerstand-Erinnerung
- Deployment: Docker Compose, zwei Container (`backend`, `frontend`/nginx), ein
  benanntes Volume für SQLite-Datenbank + hochgeladene Dokumente

**Family-Dashboard**
- Frontend: React + Vite (JavaScript, kein TypeScript), eigenes CSS-Designsystem
  („Bahnhofs-Klappanzeigen"-Optik, dunkel) in `src/styles/tokens.css` +
  `components.css`
- **Backend: Node.js + Express (JavaScript, ESM)** in `backend/`. Spricht Home Assistant
  (WebSocket), Open-Meteo, VBB (transport.rest), ICS-Müllkalender (node-ical),
  Google-Kalender (googleapis) und Sonos (@svrooij/sonos). Keine Datenbank — die
  gesamte ortsgebundene Konfiguration liegt in `backend/data/settings.json`, editierbar
  über ein Einstellungs-Overlay (Zahnrad ⚙️) im Dashboard. Live-Updates gehen per
  Server-Sent-Events ans Tablet.
- **Konfigurierbarkeit:** Kein Ort/keine IP/kein Termin steht mehr im Code — alles wird
  im Dashboard eingetragen (siehe `docs/EINZUGSTAG.md`). Jedes Widget hat einen
  „nicht konfiguriert"-Zustand; nichts stürzt ab, wenn HA/eine Quelle fehlt.
- **Gerätesteuerung über Home Assistant:** HA verwaltet die Shellys; das Backend mappt
  HA-Entities auf das Dashboard-Gerätemodell (settings.ha.entities). Rollladen-Semantik
  ist invertiert (Dashboard-pct 100 = zu, HA current_position 100 = offen).
- Deployment: Docker Compose, zwei Container (`dashboard`/nginx + `backend`). nginx
  reicht `/api` intern ans Backend weiter (SSE-tauglich), kein Backend-Port im LAN.
  HA läuft nativ auf dem Host (`extra_hosts: host.docker.internal:host-gateway`).

## Wichtige Design-Entscheidungen (und warum)

- **Kein Login, kein Passwort.** Bewusst für „einfach im Heimnetz nutzbar“. Setzt
  voraus, dass die App nie ins Internet exponiert wird (siehe Sicherheits-Abschnitt in
  `docs/SETUP.md` bei Auto-Manager) und dass das WLAN vertrauenswürdig ist
  (Gäste-WLAN-Isolierung empfohlen).
- **Keine iframe-Einbettung, sondern natives Mitrendern.** Erster Versuch war ein
  iframe — Wischen auf der eingebetteten Fläche hat dabei nicht funktioniert (iframes
  sind ein eigener Browser-Kontext, Touch-Events kommen im Elternfenster nicht an).
  Deshalb läuft Auto-Managers Code jetzt als Kopie direkt im Family-Dashboard-Build
  mit. **Konsequenz:** Änderungen an Auto-Manager (Features, Bugfixes) müssen bei
  Bedarf manuell auch in `Family-Dashboard/src/auto-manager/` nachgezogen werden —
  es gibt keine automatische Synchronisierung zwischen den beiden Repos.
- **Eingebettete Kopie im Dunkel-Design, eigenständige App bleibt hell.** Auf Wunsch
  nur die Wand-Tablet-Ansicht ans Dashboard-Design angepasst; wenn man Auto-Manager
  z.B. vom Handy aus separat öffnet, sieht es weiterhin wie ursprünglich (helle
  Skizzenoptik) aus. Technisch über CSS-Variablen gelöst, die je nach Kontext
  (`.am-embed`-Wrapper oder eigenständig) unterschiedliche Werte annehmen.
- **CORS eingeschränkt (`ALLOWED_ORIGINS`), keine Login-Pflicht als Ausgleich.**
  Backend akzeptiert Browser-Anfragen nur von bekannten Frontend-Adressen. Schützt vor
  bösartigen Webseiten, nicht vor direktem Zugriff im selben Netz — dafür ist die
  Synology-Firewall-Einschränkung auf Port 4000 gedacht (nur vom Ubuntu-Rechner aus
  erreichbar), siehe `docs/SETUP.md`.

## Zwei nicht ganz offensichtliche Bugs, die dabei gefunden/behoben wurden

Falls beim Weiterbauen ähnliche Layout-Probleme auftauchen:

1. **`#root` ohne `height:100%`**: Family-Dashboards App füllte den Bildschirm nur,
   weil der Seiteninhalt zufällig immer genug Höhe hatte, um ihn „auszubeulen“ — nicht
   weil `height:100%`-Regeln tatsächlich griffen. Erst bei der (kürzeren)
   Auto-Manager-Seite fiel das auf (Seite blieb winzig). Fix: `html, #root { height:
   100%; }` in `tokens.css`.
2. **`overflow-x: auto` lässt Flex-Elemente auf 0 kollabieren.** Laut CSS-Spezifikation
   setzt jedes `overflow` außer `visible` die automatische Mindestgröße eines
   Flex-/Grid-Elements auf 0. Auto-Managers Tableiste hatte `overflow-x:auto`
   (eigentlich nur fürs mobile Scrollen gedacht) und schrumpfte dadurch im
   eingebetteten Kontext auf 2 Pixel Höhe zusammen. Fix: entfernt (war ohnehin toter
   Code, da die Leiste auf Mobilgeräten sowieso durch eine Bottom-Nav ersetzt wird).

## Offene Punkte / mögliche nächste Schritte

- **Erledigt:** Family-Dashboard hat jetzt ein echtes Backend (Home Assistant, Wetter,
  ÖPNV, Müll, Google-Kalender, Sonos), alles ortsgebundene konfigurierbar. Home
  Assistant ist über das Dashboard-Backend angebunden.
- **Am Einzugstag noch zu tun:** Werte im Dashboard eintragen (Ort, Haltestellen,
  Müll-ICS-Link, WLAN, Sonos-IPs, Geräte-Zuordnung) und Google-Kalender einmalig
  verbinden — Schritt-für-Schritt in `Family-Dashboard/docs/EINZUGSTAG.md`.
- **Datenmigration NAS→Ubuntu** (Auto-Manager-Volume) läuft nach
  `Umzug-Anleitung.md` (separat geliefert). Danach NAS als Backup via
  `scripts/backup-to-nas.sh`.
- Bewusst NICHT gebaut (kein echter Bedarf): Türklingel-Kamera-Overlay bleibt Demo;
  „Weitere Räume"/Sonos-Gruppen nur rudimentär.
- Falls sich die Netzwerk-Situation ändert (Zugriff von unterwegs gewünscht): dann
  zwingend eine echte Anmeldung nachrüsten, nicht einfach Ports nach außen freigeben.
- Performance-Verbesserungen (Lazy-Loading, Hintergrund-Refresh, Asset-Caching,
  nächtlicher Kiosk-Reload) sind umgesetzt.

## Wie man wieder andockt

Für eine neue Claude-Code-Sitzung reicht im Prinzip: diese Datei zeigen + Zugriff auf
die beiden GitHub-Repos geben (`flogramsch-blip/Auto-Manager` und
`flogramsch-blip/Family-Dashboard`). Beide Repos haben eine README mit
Installationsanleitung; Auto-Manager zusätzlich `docs/SETUP.md` mit Google/Push/
Sicherheits-Details.
