import webpush from 'web-push';
import { db } from '../db.js';
import type { PushSubscriptionRow } from '../types.js';

let configured = false;

export function ensureVapidConfigured(): boolean {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export function getPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function saveSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): void {
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  ).run(sub.endpoint, sub.keys.p256dh, sub.keys.auth);
}

export function removeSubscription(endpoint: string): void {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export async function broadcastNotification(payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!ensureVapidConfigured()) {
    console.warn('VAPID keys not configured - skipping push send:', payload.title);
    return;
  }
  const subs = db.prepare('SELECT * FROM push_subscriptions').all() as PushSubscriptionRow[];
  const json = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          removeSubscription(sub.endpoint);
        } else {
          console.error('push send failed', err);
        }
      }
    })
  );
}
