import { Router } from 'express';
import { db } from '../db.js';
import type { MaintenanceItem } from '../types.js';
import { upsertCalendarEventForItem, deleteCalendarEventForItem } from '../services/googleCalendar.js';

export const maintenanceRouter = Router();

maintenanceRouter.post('/vehicles/:vehicleId/maintenance', (req, res) => {
  const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'vehicle_not_found' });

  const { category, label, status, due_date, due_km, appointment_at, location, workshop_id, cost, paid } = req.body ?? {};
  if (!category || !label) return res.status(400).json({ error: 'category_and_label_required' });

  const info = db
    .prepare(
      `INSERT INTO maintenance_items (vehicle_id, category, label, status, due_date, due_km, appointment_at, location, workshop_id, cost, paid)
       VALUES (@vehicle_id, @category, @label, @status, @due_date, @due_km, @appointment_at, @location, @workshop_id, @cost, @paid)`
    )
    .run({
      vehicle_id: Number(req.params.vehicleId),
      category,
      label,
      status: status ?? 'due_soon',
      due_date: due_date ?? null,
      due_km: due_km ?? null,
      appointment_at: appointment_at ?? null,
      location: location ?? null,
      workshop_id: workshop_id ?? null,
      cost: cost ?? null,
      paid: paid ? 1 : 0,
    });

  const item = db.prepare('SELECT * FROM maintenance_items WHERE id = ?').get(info.lastInsertRowid) as MaintenanceItem;
  res.status(201).json(item);
});

const PATCHABLE = [
  'category', 'label', 'status', 'due_date', 'due_km',
  'appointment_at', 'location', 'workshop_id', 'cost', 'paid',
] as const;

maintenanceRouter.patch('/maintenance/:id', async (req, res) => {
  const existing = db.prepare('SELECT * FROM maintenance_items WHERE id = ?').get(req.params.id) as MaintenanceItem | undefined;
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const updates: string[] = [];
  const values: unknown[] = [];
  for (const key of PATCHABLE) {
    if (key in (req.body ?? {})) {
      updates.push(`${key} = ?`);
      values.push(key === 'paid' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (updates.length) {
    values.push(req.params.id);
    db.prepare(`UPDATE maintenance_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  let item = db.prepare('SELECT * FROM maintenance_items WHERE id = ?').get(req.params.id) as MaintenanceItem;

  if (req.body?.syncCalendar) {
    try {
      const eventId = await upsertCalendarEventForItem(item);
      if (eventId) {
        db.prepare('UPDATE maintenance_items SET google_event_id = ? WHERE id = ?').run(eventId, item.id);
        item = db.prepare('SELECT * FROM maintenance_items WHERE id = ?').get(req.params.id) as MaintenanceItem;
      }
    } catch (err) {
      console.error('calendar sync failed', err);
    }
  }

  res.json(item);
});

maintenanceRouter.delete('/maintenance/:id', async (req, res) => {
  const item = db.prepare('SELECT * FROM maintenance_items WHERE id = ?').get(req.params.id) as MaintenanceItem | undefined;
  if (item) {
    try { await deleteCalendarEventForItem(item); } catch (err) { console.error(err); }
  }
  db.prepare('DELETE FROM maintenance_items WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
