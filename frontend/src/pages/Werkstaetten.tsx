import { useState } from 'react';
import { useWorkshops } from '../hooks/useWorkshops';
import { api } from '../api/client';

export function Werkstaetten() {
  const { workshops, reload } = useWorkshops();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  async function create() {
    if (!form.name.trim()) return;
    await api.workshops.create(form);
    setForm({ name: '', address: '', phone: '' });
    setShowForm(false);
    reload();
  }

  return (
    <div className="wf-body">
      <div className="row between">
        <b style={{ fontSize: 19 }}>Werkstätten</b>
        <button className="chipbtn" onClick={() => setShowForm((v) => !v)}>+ Werkstatt</button>
      </div>

      {showForm && (
        <div className="vcard row wrap" style={{ gap: 10 }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ padding: '6px 10px', border: '1.5px solid var(--ink)', borderRadius: 6, flex: '1 1 160px' }} />
          <input placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            style={{ padding: '6px 10px', border: '1.5px solid var(--ink)', borderRadius: 6, flex: '1 1 200px' }} />
          <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={{ padding: '6px 10px', border: '1.5px solid var(--ink)', borderRadius: 6, flex: '1 1 140px' }} />
          <button className="btn pri" onClick={create}>Anlegen</button>
        </div>
      )}

      <div className="grid2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workshops.map((w) => (
            <div className="vcard" key={w.id} style={{ padding: 12 }}>
              <div className="row between">
                <b>{w.name}</b>
                {w.rating && <span className="mono">★ {w.rating}</span>}
              </div>
              {w.address && <div className="mono" style={{ marginTop: 3 }}>{w.address}{w.distance_km ? ` · ${w.distance_km} km` : ''}</div>}
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                {w.phone && <a className="chipbtn" href={`tel:${w.phone}`} style={{ textDecoration: 'none' }}>📞 {w.phone}</a>}
                {w.address && (
                  <a className="chipbtn" style={{ textDecoration: 'none' }}
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.address)}`}
                    target="_blank" rel="noreferrer">🧭 Route</a>
                )}
              </div>
            </div>
          ))}
          {workshops.length === 0 && <div className="mono">Noch keine Werkstätten angelegt.</div>}
        </div>
        <div className="ph" style={{ height: 250, borderRadius: 8 }}>Karte · Werkstätten in der Nähe</div>
      </div>
    </div>
  );
}
