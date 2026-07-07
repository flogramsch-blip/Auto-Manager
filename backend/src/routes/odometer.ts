import { Router } from 'express';
import { db } from '../db.js';
import type { OdometerReading } from '../types.js';

export const odometerRouter = Router();

odometerRouter.get('/vehicles/:vehicleId/odometer', (req, res) => {
  const readings = db
    .prepare('SELECT * FROM odometer_readings WHERE vehicle_id = ? ORDER BY recorded_at ASC')
    .all(req.params.vehicleId) as OdometerReading[];
  res.json(readings);
});

odometerRouter.post('/vehicles/:vehicleId/odometer', (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.vehicleId) as
    | { id: number; odometer_km: number | null }
    | undefined;
  if (!vehicle) return res.status(404).json({ error: 'vehicle_not_found' });

  const { value, recorded_at } = req.body ?? {};
  if (typeof value !== 'number' || value <= 0) return res.status(400).json({ error: 'value_required' });

  const recordedAt = recorded_at ?? new Date().toISOString();
  const info = db
    .prepare('INSERT INTO odometer_readings (vehicle_id, value, recorded_at) VALUES (?, ?, ?)')
    .run(req.params.vehicleId, value, recordedAt);

  if (vehicle.odometer_km == null || value > vehicle.odometer_km) {
    db.prepare('UPDATE vehicles SET odometer_km = ? WHERE id = ?').run(value, req.params.vehicleId);
  }

  const reading = db.prepare('SELECT * FROM odometer_readings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(reading);
});
