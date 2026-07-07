import type { MaintenanceItem, Vehicle } from '../api/types';

export interface CalendarEvent {
  date: Date;
  vehicle: Vehicle;
  item: MaintenanceItem;
  label: string;
}

export function collectEvents(vehicles: Vehicle[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const vehicle of vehicles) {
    for (const item of vehicle.items) {
      const dateStr = item.appointment_at ?? item.due_date;
      if (!dateStr) continue;
      events.push({ date: new Date(dateStr), vehicle, item, label: `${vehicle.name} · ${item.label}` });
    }
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface DayCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export function buildMonthGrid(year: number, month: number, events: CalendarEvent[]): DayCell[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(year, month, 1 - startOffset);
  const today = new Date();

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const inMonth = date.getMonth() === month;
    const isToday = date.toDateString() === today.toDateString();
    const dayEvents = events.filter((e) => e.date.toDateString() === date.toDateString());
    cells.push({ date, inMonth, isToday, events: dayEvents });
    if (i >= 34 && date.getMonth() !== month && i % 7 === 6) break;
  }
  return cells;
}

export function buildWeekCells(anchor: Date, events: CalendarEvent[]): DayCell[] {
  const startOffset = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - startOffset);
  const today = new Date();

  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayEvents = events.filter((e) => e.date.toDateString() === date.toDateString());
    cells.push({ date, inMonth: true, isToday: date.toDateString() === today.toDateString(), events: dayEvents });
  }
  return cells;
}
