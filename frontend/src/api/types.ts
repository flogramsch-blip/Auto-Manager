export type VehicleType = 'Auto' | 'Motorrad' | 'Fahrrad';
export type MaintenanceStatus = 'overdue' | 'due_soon' | 'planned' | 'done';

export interface MaintenanceItem {
  id: number;
  vehicle_id: number;
  category: string;
  label: string;
  status: MaintenanceStatus;
  due_date: string | null;
  due_km: number | null;
  appointment_at: string | null;
  location: string | null;
  workshop_id: number | null;
  cost: number | null;
  paid: 0 | 1;
  google_event_id: string | null;
  created_at: string;
}

export interface OdometerReading {
  id: number;
  vehicle_id: number;
  value: number;
  recorded_at: string;
}

export interface DocumentRow {
  id: number;
  vehicle_id: number;
  filename: string;
  original_name: string;
  uploaded_at: string;
}

export interface Vehicle {
  id: number;
  name: string;
  plate: string | null;
  type: VehicleType;
  driver: string | null;
  photo_url: string | null;
  odometer_km: number | null;
  reminder_interval_weeks: number;
  last_reminder_sent_at: string | null;
  created_at: string;
  items: MaintenanceItem[];
  readings: OdometerReading[];
  documents: DocumentRow[];
}

export interface Workshop {
  id: number;
  name: string;
  address: string | null;
  distance_km: number | null;
  rating: number | null;
  phone: string | null;
}

export interface CostsResponse {
  year: string;
  kpis: { paid: number; planned: number; forecast: number };
  items: Array<{
    id: number;
    vehicle_id: number;
    vehicle_name: string;
    category: string;
    label: string;
    status: MaintenanceStatus;
    cost: number;
    paid: 0 | 1;
    due_date: string | null;
    appointment_at: string | null;
  }>;
  monthly: Record<string, number>;
}

export interface GoogleStatus {
  configured: boolean;
  connected: boolean;
}
