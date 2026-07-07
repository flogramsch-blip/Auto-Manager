import { Router } from 'express';
import { getPublicKey, saveSubscription, removeSubscription, broadcastNotification } from '../services/push.js';
import { checkOdometerReminders } from '../services/reminders.js';

export const pushRouter = Router();

pushRouter.get('/public-key', (_req, res) => {
  const key = getPublicKey();
  if (!key) return res.status(503).json({ error: 'push_not_configured' });
  res.json({ publicKey: key });
});

pushRouter.post('/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return res.status(400).json({ error: 'invalid_subscription' });
  }
  saveSubscription(sub);
  res.status(201).json({ ok: true });
});

pushRouter.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body ?? {};
  if (endpoint) removeSubscription(endpoint);
  res.status(204).end();
});

pushRouter.post('/test', async (_req, res) => {
  await broadcastNotification({ title: 'Fahrzeug-Wartung', body: 'Test-Benachrichtigung ✓' });
  res.json({ ok: true });
});

pushRouter.post('/check-reminders', async (_req, res) => {
  const result = await checkOdometerReminders();
  res.json(result);
});
