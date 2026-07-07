import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'wartung.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plate TEXT,
  type TEXT NOT NULL DEFAULT 'Auto',
  driver TEXT,
  photo_url TEXT,
  odometer_km REAL,
  reminder_interval_weeks INTEGER NOT NULL DEFAULT 4,
  last_reminder_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'due_soon',
  due_date TEXT,
  due_km REAL,
  appointment_at TEXT,
  location TEXT,
  workshop_id INTEGER REFERENCES workshops(id) ON DELETE SET NULL,
  cost REAL,
  paid INTEGER NOT NULL DEFAULT 0,
  google_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS odometer_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  value REAL NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workshops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  distance_km REAL,
  rating REAL,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as n FROM vehicles').get() as { n: number }).n;
  if (count > 0) return;

  const insertWorkshop = db.prepare(
    `INSERT INTO workshops (name, address, distance_km, rating, phone) VALUES (?, ?, ?, ?, ?)`
  );
  const meyer = insertWorkshop.run('Autohaus Meyer', 'Fuhlsbüttler Str. 12, Hamburg', 2.4, 4.6, '040 123456').lastInsertRowid as number;
  const tuevNord = insertWorkshop.run('TÜV Nord Station', 'Barmbeker Markt 3, Hamburg', 3.1, 4.3, '040 987654').lastInsertRowid as number;
  insertWorkshop.run('ATU Barmbek', 'Hamburger Str. 50, Hamburg', 3.8, 4.1, '040 555222');

  const insertVehicle = db.prepare(
    `INSERT INTO vehicles (name, plate, type, driver, odometer_km, reminder_interval_weeks) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const golf = insertVehicle.run('VW Golf VII', 'HH-AB 1234', 'Auto', 'Anna', 84200, 4).lastInsertRowid as number;
  const octavia = insertVehicle.run('Škoda Octavia', 'HH-CD 5678', 'Auto', 'Tom', 41900, 4).lastInsertRowid as number;
  const bmw = insertVehicle.run('BMW R 1250 GS', 'HH-MR 088', 'Motorrad', 'Anna', 31400, 4).lastInsertRowid as number;

  const insertItem = db.prepare(
    `INSERT INTO maintenance_items (vehicle_id, category, label, status, due_date, due_km, appointment_at, location, workshop_id, cost, paid)
     VALUES (@vehicle_id, @category, @label, @status, @due_date, @due_km, @appointment_at, @location, @workshop_id, @cost, @paid)`
  );

  insertItem.run({ vehicle_id: golf, category: 'tuev', label: 'TÜV / HU', status: 'overdue', due_date: '2026-06-30', due_km: null, appointment_at: null, location: null, workshop_id: null, cost: null, paid: 0 });
  insertItem.run({ vehicle_id: golf, category: 'oil', label: 'Ölwechsel', status: 'due_soon', due_date: '2026-08-15', due_km: 85000, appointment_at: null, location: null, workshop_id: null, cost: null, paid: 0 });
  insertItem.run({ vehicle_id: golf, category: 'inspection', label: 'Inspektion', status: 'planned', due_date: '2026-09-18', due_km: null, appointment_at: '2026-09-18T09:00:00', location: 'Autohaus Meyer', workshop_id: meyer, cost: 340, paid: 0 });
  insertItem.run({ vehicle_id: golf, category: 'oil', label: 'Ölwechsel', status: 'done', due_date: '2026-03-01', due_km: null, appointment_at: '2026-03-01T00:00:00', location: null, workshop_id: null, cost: 89, paid: 1 });
  insertItem.run({ vehicle_id: golf, category: 'tuev', label: 'HU/AU', status: 'done', due_date: '2024-08-01', due_km: null, appointment_at: '2024-08-01T00:00:00', location: null, workshop_id: null, cost: 133, paid: 1 });

  insertItem.run({ vehicle_id: octavia, category: 'tuev', label: 'TÜV / HU', status: 'planned', due_date: '2026-10-14', due_km: null, appointment_at: '2026-10-14T11:30:00', location: 'TÜV Nord', workshop_id: tuevNord, cost: null, paid: 0 });
  insertItem.run({ vehicle_id: octavia, category: 'oil', label: 'Ölwechsel', status: 'done', due_date: '2026-03-01', due_km: null, appointment_at: '2026-03-01T00:00:00', location: null, workshop_id: null, cost: null, paid: 1 });
  insertItem.run({ vehicle_id: octavia, category: 'inspection', label: 'Inspektion', status: 'due_soon', due_date: '2026-11-01', due_km: null, appointment_at: null, location: null, workshop_id: null, cost: 78, paid: 0 });

  insertItem.run({ vehicle_id: bmw, category: 'tuev', label: 'TÜV / HU', status: 'planned', due_date: '2026-08-22', due_km: null, appointment_at: '2026-08-22T10:00:00', location: 'TÜV Nord', workshop_id: tuevNord, cost: 133, paid: 1 });
  insertItem.run({ vehicle_id: bmw, category: 'oil', label: 'Ölwechsel', status: 'due_soon', due_date: '2026-09-01', due_km: null, appointment_at: null, location: null, workshop_id: null, cost: null, paid: 0 });
  insertItem.run({ vehicle_id: bmw, category: 'inspection', label: 'Inspektion', status: 'done', due_date: '2026-04-01', due_km: null, appointment_at: '2026-04-01T00:00:00', location: null, workshop_id: null, cost: null, paid: 1 });

  const insertReading = db.prepare(
    `INSERT INTO odometer_readings (vehicle_id, value, recorded_at) VALUES (?, ?, ?)`
  );
  const golfTrend: [number, string][] = [
    [78300, '2026-01-15'], [79650, '2026-02-14'], [80900, '2026-03-16'],
    [82600, '2026-04-15'], [83450, '2026-05-14'], [84200, '2026-06-12']
  ];
  for (const [value, date] of golfTrend) insertReading.run(golf, value, date);
}

seedIfEmpty();
