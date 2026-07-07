import { useMemo, useState } from 'react';
import { useVehiclesContext } from '../context/VehiclesContext';
import { VehicleCard } from '../components/VehicleCard';
import { api } from '../api/client';
import type { Vehicle, VehicleType } from '../api/types';
import { overallStatus } from '../domain/maintenance';

const TYPE_FILTERS: Array<VehicleType | 'Alle'> = ['Alle', 'Auto', 'Motorrad', 'Fahrrad'];
const STATUS_FILTERS: Array<Vehicle['items'][number]['status'] | 'alle'> = ['alle', 'overdue', 'due_soon', 'planned', 'done'];
const STATUS_LABEL: Record<string, string> = {
  alle: 'alle', overdue: 'überfällig', due_soon: 'bald fällig', planned: 'vereinbart', done: 'erledigt',
};
const SEVERITY_RANK: Record<string, number> = { overdue: 0, due_soon: 1, planned: 2, done: 3 };

export function Uebersicht() {
  const { vehicles, reload } = useVehiclesContext();
  const [typeFilter, setTypeFilter] = useState<VehicleType | 'Alle'>('Alle');
  const [statusFilter, setStatusFilter] = useState<string>('alle');
  const [sortByUrgency, setSortByUrgency] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [form, setForm] = useState({ name: '', plate: '', type: 'Auto' as VehicleType, driver: '' });

  const filtered = useMemo(() => {
    let list = vehicles.filter((v) => typeFilter === 'Alle' || v.type === typeFilter);
    if (statusFilter !== 'alle') {
      list = list.filter((v) => v.items.some((i) => i.status === statusFilter));
    }
    if (sortByUrgency) {
      list = [...list].sort((a, b) => SEVERITY_RANK[overallStatus(a.items)] - SEVERITY_RANK[overallStatus(b.items)]);
    }
    return list;
  }, [vehicles, typeFilter, statusFilter, sortByUrgency]);

  const activeExpanded = expandedId ?? filtered[0]?.id ?? null;

  async function createVehicle() {
    if (!form.name.trim()) return;
    await api.vehicles.create({ name: form.name, plate: form.plate || null, type: form.type, driver: form.driver || null });
    setForm({ name: '', plate: '', type: 'Auto', driver: '' });
    setShowNewVehicle(false);
    reload();
  }

  return (
    <div className="wf-body">
      <div className="row wrap" style={{ gap: 9 }}>
        <span className="mono">FILTER</span>
        {TYPE_FILTERS.map((t) => (
          <button key={t} className={`chipbtn${typeFilter === t ? ' active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t === 'Alle' ? 'Alle Arten' : t}
          </button>
        ))}
        <button className={`chipbtn${statusFilter !== 'alle' ? ' active' : ''}`}
          onClick={() => {
            const idx = STATUS_FILTERS.indexOf(statusFilter as never);
            setStatusFilter(STATUS_FILTERS[(idx + 1) % STATUS_FILTERS.length]);
          }}>
          Status: {STATUS_LABEL[statusFilter]} ▾
        </button>
        <span style={{ flex: 1 }} />
        <span className="mono">SORTIEREN</span>
        <button className={`chipbtn${sortByUrgency ? ' active' : ''}`} onClick={() => setSortByUrgency((v) => !v)}>
          nach Dringlichkeit {sortByUrgency ? '✓' : ''}
        </button>
        <button className="btn" onClick={() => setShowNewVehicle((v) => !v)}>+ Fahrzeug</button>
      </div>

      {showNewVehicle && (
        <div className="vcard row wrap" style={{ gap: 10 }}>
          <input placeholder="Name (z.B. VW Golf VII)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ padding: '6px 10px', border: '1.5px solid #1f1f1f', borderRadius: 6, flex: '1 1 180px' }} />
          <input placeholder="Kennzeichen" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })}
            style={{ padding: '6px 10px', border: '1.5px solid #1f1f1f', borderRadius: 6, flex: '1 1 120px' }} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })}
            style={{ padding: '6px 10px', border: '1.5px solid #1f1f1f', borderRadius: 6 }}>
            <option value="Auto">Auto</option>
            <option value="Motorrad">Motorrad</option>
            <option value="Fahrrad">Fahrrad</option>
          </select>
          <input placeholder="Fahrer" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })}
            style={{ padding: '6px 10px', border: '1.5px solid #1f1f1f', borderRadius: 6, flex: '1 1 120px' }} />
          <button className="btn pri" onClick={createVehicle}>Anlegen</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            expanded={activeExpanded === v.id}
            onToggleExpand={() => setExpandedId(activeExpanded === v.id ? -1 : v.id)}
            onChanged={reload}
          />
        ))}
        {filtered.length === 0 && <div className="mono">Keine Fahrzeuge für diesen Filter.</div>}
      </div>

      <div className="legend">
        <span className="row"><span className="dot red" />überfällig</span>
        <span className="row"><span className="dot amber" />bald fällig</span>
        <span className="row"><span className="dot green" />vereinbart</span>
        <span className="row"><span className="dot grey" />erledigt</span>
      </div>
    </div>
  );
}
