import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { CostsResponse } from '../api/types';
import { STATUS_BADGE_CLASS, STATUS_BADGE_LABEL, STATUS_DOT } from '../domain/maintenance';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function Kosten() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<CostsResponse | null>(null);

  useEffect(() => {
    api.costs.get(year).then(setData);
  }, [year]);

  if (!data) return <div className="wf-body"><span className="mono">lädt…</span></div>;

  const maxMonthly = Math.max(1, ...Object.values(data.monthly));

  return (
    <div className="wf-body">
      <div className="row between">
        <b style={{ fontSize: 19 }}>Kostenübersicht {year}</b>
        <div className="row">
          <button className="chipbtn" onClick={() => setYear((y) => y - 1)}>‹</button>
          <span>{year}</span>
          <button className="chipbtn" onClick={() => setYear((y) => y + 1)}>›</button>
        </div>
      </div>

      <div className="row" style={{ gap: 12 }}>
        <div className="kpi"><div className="k">Bezahlt</div><div className="n">{data.kpis.paid.toLocaleString('de-DE')} €</div></div>
        <div className="kpi"><div className="k">Geplant / offen</div><div className="n">{data.kpis.planned.toLocaleString('de-DE')} €</div></div>
        <div className="kpi"><div className="k">Prognose gesamt</div><div className="n">{data.kpis.forecast.toLocaleString('de-DE')} €</div></div>
      </div>

      <div className="vcard">
        <div className="costrow head"><span></span><span>Leistung</span><span>Betrag</span><span>Status</span></div>
        {data.items.map((row) => (
          <div className="costrow" key={row.id}>
            <span className={`dot ${STATUS_DOT[row.status]}`} />
            <span>{row.vehicle_name} · {row.label}</span>
            <span>{row.cost.toLocaleString('de-DE')} €</span>
            <span className={`badge ${row.paid ? 'ok' : STATUS_BADGE_CLASS[row.status]}`}>
              {row.paid ? 'bezahlt' : STATUS_BADGE_LABEL[row.status]}
            </span>
          </div>
        ))}
        {data.items.length === 0 && <div className="mono" style={{ padding: '8px 0' }}>Keine Kosten für {year}.</div>}
      </div>

      <div className="vcard">
        <div className="mono" style={{ marginBottom: 6 }}>KOSTEN PRO MONAT</div>
        <div className="bars">
          {MONTHS.map((m, i) => {
            const value = data.monthly[m] ?? 0;
            return (
              <div className="bar-wrap" key={m}>
                <div className="bar" style={{ height: `${(value / maxMonthly) * 100}%` }} title={`${value} €`} />
                <span className="mono" style={{ fontSize: 9 }}>{MONTH_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
