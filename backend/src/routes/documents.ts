import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db } from '../db.js';
import type { DocumentRow } from '../types.js';

export const documentsRouter = Router();

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

documentsRouter.get('/vehicles/:vehicleId/documents', (req, res) => {
  res.json(
    db.prepare('SELECT * FROM documents WHERE vehicle_id = ? ORDER BY uploaded_at DESC').all(req.params.vehicleId)
  );
});

documentsRouter.post('/vehicles/:vehicleId/documents', upload.single('file'), (req, res) => {
  const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'vehicle_not_found' });
  if (!req.file) return res.status(400).json({ error: 'file_required' });

  const info = db
    .prepare('INSERT INTO documents (vehicle_id, filename, original_name) VALUES (?, ?, ?)')
    .run(req.params.vehicleId, req.file.filename, req.file.originalname);

  res.status(201).json(db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid));
});

documentsRouter.get('/documents/:id/file', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as DocumentRow | undefined;
  if (!doc) return res.status(404).end();
  const filePath = path.join(UPLOAD_DIR, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.download(filePath, doc.original_name);
});

documentsRouter.delete('/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as DocumentRow | undefined;
  if (doc) {
    const filePath = path.join(UPLOAD_DIR, doc.filename);
    fs.rm(filePath, { force: true }, () => {});
  }
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
