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
app.use(cors());
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

ensureVapidConfigured();
scheduleReminderCron();

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Fahrzeug-Wartung backend listening on :${port}`);
});
