import { Router } from 'express';
import { db } from '../db.js';
import type { Workshop } from '../types.js';

export const workshopsRouter = Router();

workshopsRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM workshops ORDER BY name ASC').all() as Workshop[]);
});

workshopsRouter.post('/', (req, res) => {
  const { name, address, distance_km, rating, phone } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const info = db
    .prepare('INSERT INTO workshops (name, address, distance_km, rating, phone) VALUES (?, ?, ?, ?, ?)')
    .run(name, address ?? null, distance_km ?? null, rating ?? null, phone ?? null);
  res.status(201).json(db.prepare('SELECT * FROM workshops WHERE id = ?').get(info.lastInsertRowid));
});

workshopsRouter.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM workshops WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const fields = ['name', 'address', 'distance_km', 'rating', 'phone'] as const;
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const key of fields) {
    if (key in (req.body ?? {})) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (updates.length) {
    values.push(req.params.id);
    db.prepare(`UPDATE workshops SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json(db.prepare('SELECT * FROM workshops WHERE id = ?').get(req.params.id));
});

workshopsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workshops WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
