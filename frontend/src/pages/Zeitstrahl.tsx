import { useNavigate } from 'react-router-dom';
import { useVehiclesContext } from '../context/VehiclesContext';
import { STATUS_DOT, TYPE_ICON, timelinePosition, todayPositionInYear } from '../domain/maintenance';
import type { MaintenanceItem } from '../api/types';

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MIN_GAP_PCT = 9;

function layoutMarkers(items: MaintenanceItem[], year: number) {
  const withPos = items
    .filter((item) => item.appointment_at || item.due_date)
    .map((item) => ({ item, pos: timelinePosition((item.appointment_at ?? item.due_date)!, year) }))
    .sort((a, b) => a.pos - b.pos);

  let lastPos = -Infinity;
  let row = 0;
  return withPos.map((entry) => {
    row = entry.pos - lastPos < MIN_GAP_PCT ? 1 - row : 0;
    lastPos = entry.pos;
    return { ...entry, row };
  });
}

export function Zeitstrahl() {
  const { vehicles } = useVehiclesContext();
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const todayPct = todayPositionInYear(year);

  return (
    <div className="wf-body">
      <div className="row between">
        <b style={{ fontSize: 19 }}>Wartungs-Zeitstrahl {year}</b>
        <span className="gcal"><span className="gi" />synchron mit Google Kalender</span>
      </div>

      <div className="timeline-scroll">
        <div>
          <div className="tl-axis">
            <span>Fahrzeug</span>
            {MONTHS.map((m) => <span key={m}>{m}</span>)}
          </div>
          {vehicles.map((v) => (
            <div className="lane" key={v.id}>
              <div className="lane-name"><span className="vicon sm">{TYPE_ICON[v.type]}</span>{v.name}</div>
              <div className="lane-track">
                <div className="today-line" style={{ left: `${todayPct}%` }} />
                {layoutMarkers(v.items, year).map(({ item, pos, row }) => {
                  const dateStr = item.appointment_at ?? item.due_date;
                  if (!dateStr) return null;
                  const d = new Date(dateStr);
                  const dd = item.status === 'planned'
                    ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                    : String(d.getMonth() + 1).padStart(2, '0');
                  return (
                    <button className="marker" key={item.id}
                      style={{ left: `${pos}%`, top: row === 0 ? '30%' : '70%' }}
                      onClick={() => navigate(`/buchen?vehicle=${v.id}&item=${item.id}`)}>
                      <span className="pill"><span className={`dot ${STATUS_DOT[item.status]}`} />{item.label.split(' ')[0]}</span>
                      <span className="dd">{dd}{item.location ? ` · ${item.location}` : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row between" style={{ marginTop: 12 }}>
        <div className="legend">
          <span className="row"><span className="dot red" />überfällig</span>
          <span className="row"><span className="dot amber" />bald fällig</span>
          <span className="row"><span className="dot green" />vereinbart</span>
          <span className="row"><span style={{ width: 14, borderTop: '2px dashed #d64c4c' }} />heute</span>
        </div>
        <span className="mono">Marker klicken → Termin buchen / bearbeiten</span>
      </div>
    </div>
  );
}
