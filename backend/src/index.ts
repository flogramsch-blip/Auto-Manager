import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { maintenanceRouter } from './routes/maintenance.js';
import { odometerRouter } from './routes/odometer.js';
import { workshopsRouter } from './routes/workshops.js';
import { documentsRouter } from './routes/documents.js';
import { costsRouter } from './routes/costs.js';
import { authGoogleRouter } from './routes/authGoogle.js';
import { pushRouter } from './routes/push.js';
import { scheduleReminderCron } from './services/reminders.js';
import { ensureVapidConfigured } from './services/push.js';

const app = express();

// Nur bekannte Frontends dürfen per Browser zugreifen (eigenes Frontend + ggf.
// eingebettete Kopien wie Family-Dashboard). Schützt zwar nicht vor direkten
// Zugriffen im selben Netzwerk (dafür braucht es die NAS-Firewall, siehe
// docs/SETUP.md), verhindert aber, dass eine beliebige Webseite im Hintergrund
// im Browser Anfragen an die API schickt.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin nicht erlaubt (siehe ALLOWED_ORIGINS)'));
      }
    },
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/vehicles', vehiclesRouter);
app.use('/api', maintenanceRouter);
app.use('/api', odometerRouter);
app.use('/api', documentsRouter);
app.use('/api/workshops', workshopsRouter);
app.use('/api/costs', costsRouter);
app.use('/api/auth/google', authGoogleRouter);
app.use('/api/push', pushRouter);

// Generische Fehlerantwort statt Stacktrace/Dateipfaden nach außen (z.B. bei
// abgelehntem CORS-Origin).
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(403).json({ error: 'forbidden' });
});

ensureVapidConfigured();
scheduleReminderCron();

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Fahrzeug-Wartung backend listening on :${port}`);
});
