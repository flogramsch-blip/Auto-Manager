import { Router } from 'express';
import { db } from '../db.js';
import type { Vehicle, MaintenanceItem, OdometerReading, DocumentRow } from '../types.js';

export const vehiclesRouter = Router();

const itemsForVehicle = db.prepare(
  `SELECT * FROM maintenance_items WHERE vehicle_id = ? ORDER BY
     CASE status WHEN 'overdue' THEN 0 WHEN 'due_soon' THEN 1 WHEN 'planned' THEN 2 ELSE 3 END,
     COALESCE(due_date, appointment_at) ASC`
);
const readingsForVehicle = db.prepare(
  `SELECT * FROM odometer_readings WHERE vehicle_id = ? ORDER BY recorded_at ASC`
);
const documentsForVehicle = db.prepare(
  `SELECT * FROM documents WHERE vehicle_id = ? ORDER BY uploaded_at DESC`
);

function hydrate(vehicle: Vehicle) {
  return {
    ...vehicle,
    items: itemsForVehicle.all(vehicle.id) as MaintenanceItem[],
    readings: readingsForVehicle.all(vehicle.id) as OdometerReading[],
    documents: documentsForVehicle.all(vehicle.id) as DocumentRow[],
  };
}

vehiclesRouter.get('/', (_req, res) => {
  const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id ASC').all() as Vehicle[];
  res.json(vehicles.map(hydrate));
});

vehiclesRouter.get('/:id', (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) as Vehicle | undefined;
  if (!vehicle) return res.status(404).json({ error: 'not_found' });
  res.json(hydrate(vehicle));
});

vehiclesRouter.post('/', (req, res) => {
  const { name, plate, type, driver, odometer_km, reminder_interval_weeks } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const info = db
    .prepare(
      `INSERT INTO vehicles (name, plate, type, driver, odometer_km, reminder_interval_weeks)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, plate ?? null, type ?? 'Auto', driver ?? null, odometer_km ?? null, reminder_interval_weeks ?? 4);
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(info.lastInsertRowid) as Vehicle;
  res.status(201).json(hydrate(vehicle));
});

const PATCHABLE = ['name', 'plate', 'type', 'driver', 'odometer_km', 'reminder_interval_weeks', 'photo_url'] as const;

vehiclesRouter.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) as Vehicle | undefined;
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const updates: string[] = [];
  const values: unknown[] = [];
  for (const key of PATCHABLE) {
    if (key in (req.body ?? {})) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (updates.length) {
    values.push(req.params.id);
    db.prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) as Vehicle;
  res.json(hydrate(vehicle));
});

vehiclesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
