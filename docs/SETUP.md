# Setup: Google Calendar OAuth, Web Push, and NAS deployment

This app has two optional integrations that need one-time setup: **Google Calendar sync**
(OAuth) and **push notifications** (VAPID keys). Without them the app still works fully —
Google chips show "nicht konfiguriert" and push falls back to being unavailable — but
booking a maintenance appointment won't create a real calendar event, and the 4-week
km-Stand reminder won't reach your phone.

## 1. Google Calendar OAuth credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new
   project (or reuse one you already have).
2. **APIs & Services → Library** → enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: *External* is fine for personal use (add yourself as a test user), or
     *Internal* if you use Google Workspace.
   - Scopes: none need to be added here manually; the app requests
     `https://www.googleapis.com/auth/calendar.events` at login time.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URI: `http://<your-nas-ip-or-domain>:<FRONTEND_PORT>/api/auth/google/callback`
     (e.g. `http://192.168.1.50:8080/api/auth/google/callback`, matching whatever you set
     `FRONTEND_PORT`/`FRONTEND_URL` to in your `.env`). For local dev this is
     `http://localhost:4000/api/auth/google/callback` (the backend serves it directly
     when not running through the nginx proxy — check `backend/.env.example`).
5. Copy the generated **Client ID** and **Client Secret** into your `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://<your-nas-ip-or-domain>:8080/api/auth/google/callback
   ```
6. Restart the backend. Open the app → the top-right chip changes to "Google Kalender ·
   verbinden" → click it, sign in, grant calendar access. It should then show
   "Google · verbunden".

Booking a maintenance appointment (in the Buchen flow) now also creates/updates an event
on your **primary** Google Calendar.

## 2. Web Push (VAPID keys)

Push notifications (the 4-week km-Stand reminder) use the standard Web Push protocol,
which needs a VAPID key pair — generated once, not tied to any external account.

```bash
cd backend
npm install   # if not already done
npm run generate-vapid
```

This prints a `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` pair — put both (plus a contact
`VAPID_SUBJECT`, e.g. `mailto:you@example.com`) into your `.env`.

After restarting the backend, open the app on your phone/desktop, expand a vehicle card,
and click **"🔔 Push aktivieren"**. Your browser will ask for notification permission —
accept it. The backend checks every vehicle once a day (09:00 server time) and sends a
push if its last odometer reading is older than its configured reminder interval
(default 4 weeks, adjustable per vehicle in the Übersicht).

Note: Web Push requires HTTPS in production (browsers exempt `localhost`). If you expose
the NAS deployment outside your LAN, put it behind a reverse proxy with TLS (e.g. a
Synology reverse proxy entry, or Caddy/Traefik) for push and Google OAuth to work from
outside.

## 3. Running locally without Docker

```bash
# Backend
cd backend
cp .env.example .env   # fill in Google/VAPID values, or leave blank
npm install
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api to :4000
```

## 4. Deploying on a Synology NAS via Docker Compose

1. Install **Container Manager** (Synology's Docker UI) from Package Center, or use SSH
   with the Docker CLI directly if enabled.
2. Copy this repository onto the NAS (e.g. via `git clone` over SSH, or File Station).
3. In the repo root, copy `.env.example` to `.env` and fill in:
   - `FRONTEND_URL` / `FRONTEND_PORT` — the NAS's LAN IP/hostname and the port you want
     to expose (default `8080`).
   - `BACKEND_PORT` — the backend's API port (default `4000`), published to the host
     so other apps on your LAN can reach it too (e.g. if you embed Auto-Manager into
     another dashboard, as documented in the Family-Dashboard project).
   - `ALLOWED_ORIGINS` — **important if you embed this into another app**: list every
     frontend origin allowed to call the API, comma-separated (your own frontend's
     `FRONTEND_URL` plus e.g. Family-Dashboard's address). If you update an existing
     deployment and skip this, only your own frontend keeps working — the embedded
     copy elsewhere will silently stop loading data until you add its origin here. See
     "Sicherheit" below for why this exists.
   - Google and VAPID values from steps 1–2 above.
4. From the repo root (via SSH):
   ```bash
   docker compose up -d --build
   ```
   This builds the backend (Node/Express/SQLite) and frontend (React, served by nginx)
   images and starts both, with a named volume (`wartung-data`) persisting the SQLite
   database and uploaded documents across restarts/updates.
5. Open `http://<nas-ip>:8080` in a browser.
6. To update after pulling new code: `docker compose up -d --build` again — the data
   volume is untouched.

If you'd rather manage containers through the Container Manager UI instead of SSH, you
can import `docker-compose.yml` there directly ("Project" → "Create" → "Import
docker-compose.yml").

## 5. Sicherheit — worauf du achten solltest

Diese App hat **keine Anmeldung/kein Passwort** — das war eine bewusste Entscheidung für
"einfach im eigenen Haushalt nutzbar", bedeutet aber: **jeder, der die Adresse in deinem
WLAN erreicht, kann alle Fahrzeugdaten sehen und ändern.** Das ist für ein privates
Heimnetz ein akzeptables Risiko, aber du solltest ein paar Dinge sicherstellen:

1. **Nichts davon soll aus dem Internet erreichbar sein.** Docker/`docker-compose.yml`
   öffnet Ports nur in deinem **lokalen** Netzwerk (WLAN/LAN zuhause) — das macht von
   sich aus **nichts** im Internet sichtbar. Das würde nur passieren, wenn zusätzlich:
   - dein Router eine **Port-Weiterleitung** für Port `8080` oder `4000` eingerichtet hat
     (Router-Oberfläche → meist "Portfreigabe" oder "Port Forwarding" genannt), oder
   - **UPnP** am Router aktiv ist und irgendein Gerät sich selbst eine Freigabe
     eingerichtet hat, oder
   - Synologys **"Externer Zugriff"/QuickConnect** (DSM → Systemsteuerung → Externer
     Zugriff) für diese Ports konfiguriert wurde.

   Prüfe kurz in deiner Router-Oberfläche und unter DSM → Systemsteuerung → Externer
   Zugriff, ob dort etwas für Port 8080/4000 eingetragen ist — falls ja, entfernen. Diese
   App braucht nie einen Zugriff von außerhalb deines Zuhauses.

2. **Den neu geöffneten Datenbank-Port (`BACKEND_PORT`, Standard 4000) zusätzlich
   einschränken**, falls du ihn nur für die Family-Dashboard-Einbettung brauchst — er
   muss dann nur von *einem* bestimmten Gerät erreichbar sein, nicht vom ganzen Netz:
   - DSM → **Systemsteuerung → Sicherheit → Firewall** → Firewall-Profil bearbeiten →
     **Regel erstellen**.
   - Port: benutzerdefiniert, `4000`, TCP.
   - Quell-IP: die IP-Adresse deines Family-Dashboard-Rechners eintragen (z.B.
     `192.168.1.60`).
   - Aktion: **Erlauben** — und sicherstellen, dass darunter eine Regel steht, die
     denselben Port für alle anderen Absender **ablehnt** (bei den meisten
     DSM-Firewall-Profilen ist "alles andere verweigern" bereits die Voreinstellung,
     wenn keine passende Erlauben-Regel greift — im Zweifel nachschauen oder mich
     fragen).
   - Falls du den Port gar nicht für eine Einbettung brauchst: `BACKEND_PORT` einfach
     leer lassen bzw. die `ports:`-Zeile für den Backend-Dienst in `docker-compose.yml`
     entfernen — dann ist die API wie ursprünglich nur für das eigene Frontend
     erreichbar, nicht fürs restliche Netz.

3. **CORS ist jetzt eingeschränkt** (`ALLOWED_ORIGINS`, siehe Schritt 4 oben) — das
   verhindert, dass eine beliebige Webseite in einem Browser in deinem Netz im
   Hintergrund Anfragen an die API schickt. Wichtig zu wissen: das schützt **nicht**
   vor direktem Zugriff (z.B. über ein Kommandozeilen-Programm) von einem Gerät, das
   ohnehin schon in deinem Netz ist — dafür ist Punkt 2 (Firewall) die eigentliche
   Absicherung.

4. **Gäste-WLAN**: falls Gäste-Geräte im selben Netzwerk wie NAS/Ubuntu-Rechner landen
   (viele Router trennen Gäste-WLAN nicht wirklich vom Hauptnetz, sofern man es nicht
   explizit als "isoliert" konfiguriert), können auch Gäste die App erreichen. In den
   meisten Router-Einstellungen gibt es eine Option wie "Gäste vom Heimnetz isolieren" —
   empfehlenswert zu aktivieren, unabhängig von dieser App.

### Notes on your existing setup

- **Home Assistant**: not integrated in this build — the km-reminder uses standard Web
  Push instead. If you'd like reminders routed through Home Assistant's notification
  service instead (e.g. to reuse existing phone-notification automations), that would be
  a follow-up change to `backend/src/services/push.ts`.
- **Family dashboard**: this app is intentionally standalone so it can be reviewed/run on
  its own. Embedding it as a feature/button inside your existing dashboard project is a
  separate integration step best done in a session that has that project's code
  available.
