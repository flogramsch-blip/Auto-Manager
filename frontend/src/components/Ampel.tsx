import type { MaintenanceStatus } from '../api/types';
import { STATUS_DOT } from '../domain/maintenance';

const ORDER: MaintenanceStatus[] = ['overdue', 'due_soon', 'planned'];

export function Ampel({ status, row }: { status: MaintenanceStatus; row?: boolean }) {
  const active = STATUS_DOT[status];
  return (
    <div className={`ampel${row ? ' row-dir' : ''}`}>
      {ORDER.map((s) => {
        const color = STATUS_DOT[s];
        const isOn = (status === 'done' && s === 'planned') || color === active;
        return <span key={s} className={`d ${color}${isOn ? ' on' : ''}`} />;
      })}
    </div>
  );
}
