import { useMemo, useState } from 'react';
import { useVehiclesContext } from '../context/VehiclesContext';
import { useNavigate } from 'react-router-dom';
import { buildMonthGrid, buildWeekCells, collectEvents } from '../domain/calendar';
import { STATUS_DOT } from '../domain/maintenance';
import { useGoogleStatus } from '../hooks/useGoogleStatus';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function Kalender() {
  const { vehicles } = useVehiclesContext();
  const { status } = useGoogleStatus();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const events = useMemo(() => collectEvents(vehicles), [vehicles]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const monthCells = useMemo(() => buildMonthGrid(year, month, events), [year, month, events]);
  const weekCells = useMemo(() => buildWeekCells(cursor, events), [cursor, events]);

  const outsideMonth = events.filter((e) => !(e.date.getFullYear() === year && e.date.getMonth() === month) && e.date >= new Date(new Date().toDateString()))
    .slice(0, 5);

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  return (
    <div className="wf-body">
      <div className="row between wrap">
        <div className="row">
          <button className="btn" style={{ padding: '3px 11px' }} onClick={() => shiftMonth(-1)}>‹</button>
          <b style={{ fontSize: 19, minWidth: 150, textAlign: 'center' }}>{MONTH_NAMES[month]} {year}</b>
          <button className="btn" style={{ padding: '3px 11px' }} onClick={() => shiftMonth(1)}>›</button>
        </div>
        <div className="row">
          <span className="stat"><span className={`dot ${status.connected ? 'green' : 'grey'}`} />Google {status.connected ? 'AN' : 'AUS'}</span>
          <button className="btn" onClick={() => setCursor(new Date())}>Heute</button>
          <div style={{ display: 'flex', border: '2px solid var(--ink)', borderRadius: 7, overflow: 'hidden' }}>
            <span onClick={() => setView('month')} style={{ padding: '5px 12px', background: view === 'month' ? 'var(--accent)' : 'var(--card)', color: view === 'month' ? 'var(--on-accent)' : 'var(--ink)', fontSize: 14, cursor: 'pointer' }}>Monat</span>
            <span onClick={() => setView('week')} style={{ padding: '5px 12px', background: view === 'week' ? 'var(--accent)' : 'var(--card)', color: view === 'week' ? 'var(--on-accent)' : 'var(--ink)', fontSize: 14, cursor: 'pointer' }}>Woche</span>
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <div className="cal">
          {WEEKDAYS.map((d) => <div className="hd" key={d}>{d}</div>)}
          {monthCells.map((cell, i) => (
            <div key={i} className={`cell${!cell.inMonth ? ' mut' : ''}${cell.isToday ? ' today' : ''}`}>
              {cell.date.getDate()}
              {cell.events.map((e) => (
                <div className="evt" key={e.item.id} style={{ borderColor: colorFor(STATUS_DOT[e.item.status]) }}
                  onClick={() => navigate(`/buchen?vehicle=${e.vehicle.id}&item=${e.item.id}`)}>
                  <span className={`dot ${STATUS_DOT[e.item.status]}`} />{e.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mono">// WOCHENANSICHT · {cursor.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 7 }}>
            {weekCells.map((cell, i) => (
              <div className="weekcell" key={i}>
                {WEEKDAYS[i]} {cell.date.getDate()}
                {cell.events.map((e) => (
                  <div className="evt" key={e.item.id} style={{ borderColor: colorFor(STATUS_DOT[e.item.status]), marginTop: 5 }}>
                    <span className={`dot ${STATUS_DOT[e.item.status]}`} />{e.vehicle.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="row between wrap">
        <div className="legend">
          <span className="row"><span className="dot green" />vereinbart</span>
          <span className="row"><span className="dot amber" />fällig / offen</span>
          <span className="row"><span className="dot red" />überfällig</span>
        </div>
        <span className="gcal"><span className="gi" />synchron mit Google Kalender</span>
      </div>

      {outsideMonth.length > 0 && (
        <div className="vcard" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="mono">// AUSSERHALB DIESES MONATS</div>
          {outsideMonth.map((e) => (
            <div className="row" key={e.item.id} style={{ fontSize: 14 }}>
              <span className={`dot ${STATUS_DOT[e.item.status]}`} />
              {e.date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {e.label}
              <span style={{ marginLeft: 'auto' }}>
                <button className="chipbtn" onClick={() => navigate(`/buchen?vehicle=${e.vehicle.id}&item=${e.item.id}`)}>
                  {e.item.status === 'planned' ? 'ansehen' : 'Termin buchen'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function colorFor(dot: string): string {
  return { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)', grey: 'var(--grey)' }[dot] || 'var(--ink)';
}
