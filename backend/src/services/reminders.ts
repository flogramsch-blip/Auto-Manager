import cron from 'node-cron';
import { db } from '../db.js';
import { broadcastNotification } from './push.js';
import type { Vehicle } from '../types.js';

function weeksBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 7);
}

export async function checkOdometerReminders(): Promise<{ checked: number; sent: number }> {
  const vehicles = db.prepare('SELECT * FROM vehicles').all() as Vehicle[];
  const now = new Date();
  let sent = 0;

  for (const vehicle of vehicles) {
    const lastReading = db
      .prepare('SELECT recorded_at FROM odometer_readings WHERE vehicle_id = ? ORDER BY recorded_at DESC LIMIT 1')
      .get(vehicle.id) as { recorded_at: string } | undefined;

    const baseline = new Date(lastReading?.recorded_at ?? vehicle.created_at);
    const elapsedWeeks = weeksBetween(baseline, now);
    const interval = vehicle.reminder_interval_weeks || 4;
    if (elapsedWeeks < interval) continue;

    const nextDueAt = new Date(baseline.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    const alreadySentForThisCycle =
      vehicle.last_reminder_sent_at && new Date(vehicle.last_reminder_sent_at) >= nextDueAt;
    if (alreadySentForThisCycle) continue;

    await broadcastNotification({
      title: 'km-Stand eintragen?',
      body: `${vehicle.name} · seit ${interval} Wochen kein Eintrag. Kurz die Tacho-km festhalten.`,
      url: `/fahrzeuge/${vehicle.id}`,
    });
    db.prepare('UPDATE vehicles SET last_reminder_sent_at = ? WHERE id = ?').run(now.toISOString(), vehicle.id);
    sent += 1;
  }

  return { checked: vehicles.length, sent };
}

export function scheduleReminderCron(): void {
  cron.schedule('0 9 * * *', () => {
    checkOdometerReminders().catch((err) => console.error('reminder cron failed', err));
  });
}
