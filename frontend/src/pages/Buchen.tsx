import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useVehiclesContext } from '../context/VehiclesContext';
import { useWorkshops } from '../hooks/useWorkshops';
import { api } from '../api/client';
import { useGoogleStatus } from '../hooks/useGoogleStatus';

const SLOT_TIMES = ['08:00', '09:30', '11:00', '13:30', '14:00', '15:30', '16:00', '16:45'];
const LEAD_OPTIONS = ['1 Woche vorher', '2 Wochen vorher', '4 Wochen vorher'];

export function Buchen() {
  const { vehicles, reload } = useVehiclesContext();
  const { workshops } = useWorkshops();
  const { status: googleStatus } = useGoogleStatus();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [itemId, setItemId] = useState<number | null>(null);
  const [workshopId, setWorkshopId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [lead, setLead] = useState(LEAD_OPTIONS[2]);
  const [channels, setChannels] = useState<string[]>(['push']);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const v = Number(params.get('vehicle'));
    const i = Number(params.get('item'));
    if (v) setVehicleId(v);
    if (i) setItemId(i);
    if (v && i) setStep(2);
  }, [params]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const openItems = vehicle?.items.filter((i) => i.status !== 'done') ?? [];
  const item = vehicle?.items.find((i) => i.id === itemId);
  const workshop = workshops.find((w) => w.id === workshopId);

  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => { if (!date) setDate(defaultDate); }, [defaultDate, date]);

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  function toggleChannel(c: string) {
    setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  async function confirmBooking() {
    if (!item || !time) return;
    const appointment_at = `${date}T${time}:00`;
    await api.maintenance.update(item.id, {
      status: 'planned',
      appointment_at,
      location: workshop?.name ?? null,
      workshop_id: workshopId,
      syncCalendar: true,
    });
    setConfirmed(true);
    reload();
  }

  if (confirmed) {
    return (
      <div className="wf-body">
        <div className="vcard" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>✓ Termin gebucht</div>
          <div className="mono" style={{ marginTop: 8 }}>
            {vehicle?.name} · {item?.label} — {formattedDate}, {time} Uhr · {workshop?.name}
          </div>
          {googleStatus.connected && <div className="mono" style={{ marginTop: 4 }}>In Google Kalender eingetragen.</div>}
          <button className="btn pri" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Zur Übersicht</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-body">
      <div className="row between wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="step"><span className={`stepn${step >= 1 ? ' on' : ''}`}>1</span>Leistung</span>
          <span className="step"><span className={`stepn${step >= 2 ? ' on' : ''}`}>2</span>Werkstatt</span>
          <span className="step"><span className={`stepn${step >= 3 ? ' on' : ''}`}>3</span>Termin</span>
          <span className="step"><span className={`stepn${step >= 4 ? ' on' : ''}`}>4</span>Bestätigen</span>
        </div>
        {vehicle && item && <span className="badge warn">{vehicle.name} · {item.label}</span>}
      </div>
      <hr className="line" />

      {step === 1 && (
        <div>
          <div className="mono" style={{ marginBottom: 8 }}>FAHRZEUG &amp; LEISTUNG WÄHLEN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vehicles.map((v) => (
              <div key={v.id}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{v.name}</div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {v.items.filter((i) => i.status !== 'done').map((i) => (
                    <label className="vcard" key={i.id} style={{ padding: 9, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="radio" name="item" checked={vehicleId === v.id && itemId === i.id}
                        onChange={() => { setVehicleId(v.id); setItemId(i.id); }} />
                      <b style={{ fontSize: 14 }}>{i.label}</b>
                    </label>
                  ))}
                  {v.items.every((i) => i.status === 'done') && <span className="mono">alles erledigt</span>}
                </div>
              </div>
            ))}
          </div>
          <button className="btn pri" style={{ marginTop: 14 }} disabled={!vehicleId || !itemId} onClick={() => setStep(2)}>Weiter</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mono" style={{ marginBottom: 8 }}>WERKSTATT WÄHLEN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workshops.map((w) => (
              <label className="vcard" key={w.id} style={{ padding: 11, display: 'flex', gap: 9, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="wk" checked={workshopId === w.id} onChange={() => setWorkshopId(w.id)} />
                <div>
                  <b>{w.name}</b>
                  <div className="mono">{w.distance_km ? `${w.distance_km} km · ` : ''}{w.rating ? `★ ${w.rating} · ` : ''}{w.address}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="row" style={{ marginTop: 14, gap: 10 }}>
            <button className="btn" onClick={() => setStep(1)}>Zurück</button>
            <button className="btn pri" disabled={!workshopId} onClick={() => setStep(3)}>Weiter</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="mono" style={{ marginBottom: 8 }}>FREIE TERMINE · {workshop?.name}</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1.5px solid var(--ink)', borderRadius: 6, marginBottom: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            {SLOT_TIMES.map((t, i) => (
              <div key={t} className={`slot${time === t ? ' on' : ''}${i % 5 === 0 ? ' off' : ''}`}
                onClick={() => i % 5 !== 0 && setTime(t)}>{t}</div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 14, gap: 10 }}>
            <button className="btn" onClick={() => setStep(2)}>Zurück</button>
            <button className="btn pri" disabled={!time} onClick={() => setStep(4)}>Weiter</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="mono" style={{ marginBottom: 8 }}>ZUSAMMENFASSUNG</div>
          <div className="vcard" style={{ marginBottom: 12 }}>
            <div>{vehicle?.name} · {item?.label}</div>
            <div className="mono">{formattedDate} · {time} Uhr · {workshop?.name}</div>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <span className="mono">ERINNERUNG</span>
            <span>Vorlauf</span>
            <select value={lead} onChange={(e) => setLead(e.target.value)} style={{ padding: '5px 8px', border: '1.5px solid var(--ink)', borderRadius: 6, background: 'var(--card)', color: 'var(--ink)' }}>
              {LEAD_OPTIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
            <span>Kanal</span>
            <button className={`chipbtn${channels.includes('push') ? ' active' : ''}`} onClick={() => toggleChannel('push')}>🔔 Push</button>
            <button className={`chipbtn${channels.includes('email') ? ' active' : ''}`} onClick={() => toggleChannel('email')}>✉ E-Mail</button>
            <button className={`chipbtn${channels.includes('calendar') ? ' active' : ''}`} onClick={() => toggleChannel('calendar')}>📅 Kalender-Alarm</button>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn" onClick={() => setStep(3)}>Zurück</button>
            <button className="btn pri" onClick={confirmBooking}>
              <span className="gi" style={{ display: 'inline-block', width: 13, height: 13, borderRadius: 3, background: 'conic-gradient(#4285F4 0 25%,#EA4335 0 50%,#FBBC05 0 75%,#34A853 0)', verticalAlign: -2, marginRight: 6 }} />
              Buchen{googleStatus.connected ? ' & in Google Kalender' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
