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

### Notes on your existing setup

- **Home Assistant**: not integrated in this build — the km-reminder uses standard Web
  Push instead. If you'd like reminders routed through Home Assistant's notification
  service instead (e.g. to reuse existing phone-notification automations), that would be
  a follow-up change to `backend/src/services/push.ts`.
- **Family dashboard**: this app is intentionally standalone so it can be reviewed/run on
  its own. Embedding it as a feature/button inside your existing dashboard project is a
  separate integration step best done in a session that has that project's code
  available.
