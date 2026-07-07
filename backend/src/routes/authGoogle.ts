import { Router } from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectGoogle,
} from '../services/googleCalendar.js';

export const authGoogleRouter = Router();

authGoogleRouter.get('/status', (_req, res) => {
  res.json(getConnectionStatus());
});

authGoogleRouter.get('/start', (_req, res) => {
  const url = getAuthUrl();
  if (!url) return res.status(400).json({ error: 'google_not_configured' });
  res.redirect(url);
});

authGoogleRouter.get('/callback', async (req, res) => {
  const code = req.query.code as string | undefined;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!code) return res.redirect(`${frontendUrl}/?google=error`);
  try {
    await handleOAuthCallback(code);
    res.redirect(`${frontendUrl}/?google=connected`);
  } catch (err) {
    console.error('google oauth callback failed', err);
    res.redirect(`${frontendUrl}/?google=error`);
  }
});

authGoogleRouter.post('/disconnect', (_req, res) => {
  disconnectGoogle();
  res.status(204).end();
});
