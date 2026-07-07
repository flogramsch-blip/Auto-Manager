import type { MaintenanceItem, MaintenanceStatus, OdometerReading, Vehicle } from '../api/types';

export const STATUS_DOT: Record<MaintenanceStatus, 'red' | 'amber' | 'green' | 'grey'> = {
  overdue: 'red',
  due_soon: 'amber',
  planned: 'green',
  done: 'grey',
};

export const STATUS_BADGE_LABEL: Record<MaintenanceStatus, string> = {
  overdue: 'offen',
  due_soon: 'offen',
  planned: 'vereinbart',
  done: 'ok',
};

export const STATUS_BADGE_CLASS: Record<MaintenanceStatus, string> = {
  overdue: 'bad',
  due_soon: 'warn',
  planned: 'done',
  done: 'ok',
};

export const TYPE_ICON: Record<Vehicle['type'], string> = {
  Auto: '🚗',
  Motorrad: '🏍️',
  Fahrrad: '🚲',
};

export function formatOrt(item: MaintenanceItem): string {
  if (item.status === 'planned' && item.appointment_at) {
    const d = new Date(item.appointment_at);
    const date = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${date}. ${time}${item.location ? ' · ' + item.location : ''}`;
  }
  if (item.status === 'done' && item.due_date) {
    const d = new Date(item.due_date);
    return `erledigt ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  if (item.status === 'overdue' && item.due_date) {
    const d = new Date(item.due_date);
    return `überfällig · seit ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  if (item.due_km) return `fällig ~${item.due_km.toLocaleString('de-DE')} km`;
  if (item.due_date) {
    const d = new Date(item.due_date);
    return `fällig ~${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return '';
}

/** worst-first ordering to derive the overall traffic-light status of a vehicle */
const SEVERITY: MaintenanceStatus[] = ['overdue', 'due_soon', 'planned', 'done'];

export function overallStatus(items: MaintenanceItem[]): MaintenanceStatus {
  for (const s of SEVERITY) {
    if (items.some((i) => i.status === s)) return s;
  }
  return 'done';
}

export function timelinePosition(dateStr: string, year: number): number {
  const d = new Date(dateStr);
  const startOfYear = new Date(year, 0, 1).getTime();
  const endOfYear = new Date(year + 1, 0, 1).getTime();
  const pct = (d.getTime() - startOfYear) / (endOfYear - startOfYear);
  return Math.min(100, Math.max(0, pct * 100));
}

export function todayPositionInYear(year: number): number {
  return timelinePosition(new Date().toISOString(), year);
}

export interface KmTrendPoint {
  month: string;
  value: number;
  heightPct: number;
}

export function buildKmTrend(readings: OdometerReading[]): { points: KmTrendPoint[]; avgPerMonth: number } {
  const last6 = readings.slice(-6);
  if (last6.length === 0) return { points: [], avgPerMonth: 0 };

  const deltas: number[] = [];
  for (let i = 1; i < last6.length; i++) deltas.push(last6[i].value - last6[i - 1].value);
  const avgPerMonth = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

  const max = Math.max(...last6.map((r) => r.value));
  const min = Math.min(...last6.map((r) => r.value));
  const range = Math.max(1, max - min);

  const points = last6.map((r) => ({
    month: new Date(r.recorded_at).toLocaleDateString('de-DE', { month: 'short' }),
    value: r.value,
    heightPct: 30 + ((r.value - min) / range) * 65,
  }));

  return { points, avgPerMonth };
}

export function projectDueByKm(currentKm: number | null, avgPerMonth: number, dueKm: number | null): string | null {
  if (!currentKm || !dueKm || avgPerMonth <= 0) return null;
  const remaining = dueKm - currentKm;
  if (remaining <= 0) return 'überfällig';
  const months = remaining / avgPerMonth;
  const weeks = Math.round(months * 4.33);
  if (weeks <= 1) return `in ~${remaining.toLocaleString('de-DE')} km (bald)`;
  return `in ~${remaining.toLocaleString('de-DE')} km (~${weeks} Wochen)`;
}
