import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../api/types';
import { api } from '../api/client';
import { Ampel } from './Ampel';
import {
  STATUS_BADGE_CLASS,
  STATUS_BADGE_LABEL,
  STATUS_DOT,
  TYPE_ICON,
  buildKmTrend,
  formatOrt,
  overallStatus,
  projectDueByKm,
} from '../domain/maintenance';
import { EditableText } from './EditableText';
import { enablePushNotifications } from '../push/registerPush';

const REMINDER_OPTIONS = [2, 4, 6, 8];

export function VehicleCard({
  vehicle,
  expanded,
  onToggleExpand,
  onChanged,
}: {
  vehicle: Vehicle;
  expanded: boolean;
  onToggleExpand: () => void;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [kmDraft, setKmDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const status = overallStatus(vehicle.items);
  const openItems = vehicle.items.filter((i) => i.status !== 'done');
  const history = vehicle.items.filter((i) => i.status === 'done');
  const { points, avgPerMonth } = buildKmTrend(vehicle.readings);
  const dueKmItem = vehicle.items.find((i) => i.due_km && i.status !== 'done');
  const projection = dueKmItem ? projectDueByKm(vehicle.odometer_km, avgPerMonth, dueKmItem.due_km) : null;

  const lastReading = vehicle.readings[vehicle.readings.length - 1];
  const nextReminderAt = lastReading
    ? new Date(new Date(lastReading.recorded_at).getTime() + vehicle.reminder_interval_weeks * 7 * 86400000)
    : null;

  async function submitKm() {
    const value = Number(kmDraft.replace(/\./g, '').replace(',', '.'));
    if (!value || value <= (vehicle.odometer_km ?? 0)) return;
    await api.odometer.add(vehicle.id, value);
    setKmDraft('');
    onChanged();
  }

  async function bumpKm(delta: number) {
    const value = (vehicle.odometer_km ?? 0) + delta;
    await api.odometer.add(vehicle.id, value);
    onChanged();
  }

  async function saveDriver(name: string) {
    await api.vehicles.update(vehicle.id, { driver: name });
    onChanged();
  }

  async function setReminderInterval(weeks: number) {
    await api.vehicles.update(vehicle.id, { reminder_interval_weeks: weeks });
    onChanged();
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      await api.documents.upload(vehicle.id, file);
      onChanged();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="vcard">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row">
          <div className="vicon">{TYPE_ICON[vehicle.type]}</div>
          <div className="ph" style={{ width: 52, height: 40, borderRadius: 5 }}>Foto</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{vehicle.name}</div>
            <div className="mono">
              {vehicle.plate ? `${vehicle.plate} · ` : ''}
              {vehicle.odometer_km ? `${vehicle.odometer_km.toLocaleString('de-DE')} km` : 'kein km-Stand'}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              <EditableText value={vehicle.driver} placeholder="Fahrer" prefix="👤 " onSave={saveDriver} />
            </div>
          </div>
        </div>
        <Ampel status={status} />
      </div>

      <hr className="line" />

      {openItems.map((item) => (
        <div className="task" key={item.id}>
          <span className={`dot ${STATUS_DOT[item.status]}`} />
          <span>{item.label}</span>
          <span className="ort">{formatOrt(item)}</span>
          {item.status === 'planned' ? (
            <span className={`badge ${STATUS_BADGE_CLASS[item.status]}`}>{STATUS_BADGE_LABEL[item.status]}</span>
          ) : (
            <button className="chipbtn" onClick={() => navigate(`/buchen?vehicle=${vehicle.id}&item=${item.id}`)}>
              buchen
            </button>
          )}
        </div>
      ))}

      <hr className="line" />

      <div className="row between">
        <button className="btn" onClick={onToggleExpand}>{expanded ? 'Weniger' : 'Details'}</button>
        <span className="mono">{openItems.length} offen · {history.length} erledigt</span>
      </div>

      {expanded && (
        <>
          <hr className="line" />

          <div className="row wrap" style={{ gap: 9 }}>
            <span className="mono">KM-STAND</span>
            <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--ink)', borderRadius: 7, overflow: 'hidden', background: 'var(--card)' }}>
              <input
                type="text"
                placeholder={vehicle.odometer_km ? String(vehicle.odometer_km + 500) : '85000'}
                value={kmDraft}
                onChange={(e) => setKmDraft(e.target.value)}
                style={{ width: 92, border: 'none', padding: '6px 10px', font: '600 15px ui-monospace,Menlo,monospace', background: 'transparent', color: 'var(--ink)', outline: 'none' }}
              />
              <span style={{ padding: '6px 10px', borderLeft: '1.5px dashed var(--line)', font: '12px ui-monospace,Menlo,monospace', color: 'var(--muted)' }}>km</span>
            </div>
            <button className="btn pri" onClick={submitKm}>Speichern</button>
            <span className="chipbtn" onClick={() => bumpKm(500)}>+ 500</span>
            <span className="chipbtn" onClick={() => bumpKm(1000)}>+ 1.000</span>
          </div>

          {points.length > 0 && (
            <>
              <div className="row between" style={{ marginTop: 10 }}>
                <span className="mono">VERLAUF · letzte {points.length} Einträge</span>
                <span className="mono">Ø ~{Math.round(avgPerMonth).toLocaleString('de-DE')} km / Monat</span>
              </div>
              <div className="trend-bars" style={{ marginTop: 8 }}>
                {points.map((p, i) => (
                  <div className="trend-bar-wrap" key={i}>
                    <div className={`trend-bar${i === points.length - 1 ? ' hi' : ''}`} style={{ height: `${p.heightPct}%` }} />
                    <span className="mono" style={{ fontSize: 9 }}>{p.month}</span>
                  </div>
                ))}
              </div>
              {projection && (
                <div className="mono" style={{ marginTop: 7, color: 'var(--muted)' }}>
                  → {dueKmItem!.label} {projection}
                </div>
              )}
            </>
          )}

          <hr className="line" />

          <div className="row between wrap" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 17 }}>🔔</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>km-Stand-Erinnerung</div>
                <div className="mono">Push · Intervall alle {vehicle.reminder_interval_weeks} Wochen</div>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {REMINDER_OPTIONS.map((w) => (
                <button
                  key={w}
                  className={`chipbtn${vehicle.reminder_interval_weeks === w ? ' active' : ''}`}
                  onClick={() => setReminderInterval(w)}
                >
                  {w}W
                </button>
              ))}
              <button className="chipbtn" onClick={() => enablePushNotifications()}>🔔 Push aktivieren</button>
            </div>
          </div>
          {nextReminderAt && (
            <div className="warn" style={{ borderLeftColor: 'var(--amber)', fontSize: 14, marginTop: 4 }}>
              <span style={{ fontSize: 15 }}>⏰</span>
              <b>Nächste Erinnerung:</b> {nextReminderAt.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          )}

          <hr className="line" />

          <div className="grid2">
            <div>
              <div className="mono" style={{ marginBottom: 6 }}>DOKUMENTE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {vehicle.documents.map((doc) => (
                  <a key={doc.id} className="doc" href={api.documents.fileUrl(doc.id)} style={{ textDecoration: 'none', color: 'inherit' }}>
                    📄 {doc.original_name}
                  </a>
                ))}
                <div className="doc" style={{ borderStyle: 'dashed', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => fileInput.current?.click()}>
                  {uploading ? 'lädt hoch…' : '+ Dokument ablegen'}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
                />
              </div>
            </div>
            <div>
              <div className="mono" style={{ marginBottom: 6 }}>HISTORIE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {history.length === 0 && <span className="mono">noch keine erledigten Termine</span>}
                {history.map((item) => (
                  <div className="row" key={item.id}>
                    <span className="dot grey" />
                    {formatOrt(item)} · {item.label}
                    {item.cost ? ` — ${item.cost} €` : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
