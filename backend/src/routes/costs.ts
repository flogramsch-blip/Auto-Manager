import { Router } from 'express';
import { db } from '../db.js';

export const costsRouter = Router();

interface CostRow {
  id: number;
  vehicle_id: number;
  vehicle_name: string;
  category: string;
  label: string;
  status: string;
  cost: number;
  paid: 0 | 1;
  due_date: string | null;
  appointment_at: string | null;
}

costsRouter.get('/', (req, res) => {
  const year = String(req.query.year ?? new Date().getFullYear());

  const rows = db
    .prepare(
      `SELECT m.id, m.vehicle_id, v.name as vehicle_name, m.category, m.label, m.status, m.cost, m.paid, m.due_date, m.appointment_at
       FROM maintenance_items m
       JOIN vehicles v ON v.id = m.vehicle_id
       WHERE m.cost IS NOT NULL
         AND (strftime('%Y', COALESCE(m.appointment_at, m.due_date)) = ?)
       ORDER BY COALESCE(m.appointment_at, m.due_date) ASC`
    )
    .all(year) as CostRow[];

  let paid = 0;
  let planned = 0;
  const monthly: Record<string, number> = {};
  for (const row of rows) {
    const amount = row.cost ?? 0;
    if (row.paid) paid += amount;
    else planned += amount;
    const dateStr = row.appointment_at ?? row.due_date;
    if (dateStr) {
      const month = dateStr.slice(5, 7);
      monthly[month] = (monthly[month] ?? 0) + amount;
    }
  }

  res.json({
    year,
    kpis: { paid, planned, forecast: paid + planned },
    items: rows,
    monthly,
  });
});
