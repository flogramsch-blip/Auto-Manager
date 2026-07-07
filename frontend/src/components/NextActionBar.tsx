import { useNavigate } from 'react-router-dom';
import { useVehiclesContext } from '../context/VehiclesContext';
import { formatOrt } from '../domain/maintenance';

export function NextActionBar() {
  const { vehicles } = useVehiclesContext();
  const navigate = useNavigate();

  const candidates = vehicles.flatMap((v) =>
    v.items.filter((i) => i.status === 'overdue' || i.status === 'due_soon').map((i) => ({ vehicle: v, item: i }))
  );
  if (!candidates.length) return null;

  candidates.sort((a, b) => (a.item.status === 'overdue' ? -1 : 1) - (b.item.status === 'overdue' ? -1 : 1));
  const next = candidates[0];

  return (
    <div className="nextbar">
      <span style={{ fontSize: 18 }}>⏰</span>
      <b>Als Nächstes:</b> {next.vehicle.name} · {next.item.label} — {formatOrt(next.item)}
      <span style={{ flex: 1 }} />
      <button className="btn pri" onClick={() => navigate(`/buchen?vehicle=${next.vehicle.id}&item=${next.item.id}`)}>
        Jetzt buchen
      </button>
    </div>
  );
}
