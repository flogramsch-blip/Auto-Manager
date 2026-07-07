import { google } from 'googleapis';
import { db } from '../db.js';
import type { MaintenanceItem } from '../types.js';
import { getJsonSetting, setJsonSetting, deleteSetting } from './settingsStore.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const TOKENS_KEY = 'google_tokens';

interface StoredTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

function createClient() {
  if (!isConfigured()) return null;
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  const tokens = getJsonSetting<StoredTokens>(TOKENS_KEY);
  if (tokens) client.setCredentials(tokens);
  client.on('tokens', (newTokens) => {
    const merged = { ...(tokens ?? {}), ...newTokens };
    setJsonSetting(TOKENS_KEY, merged);
  });
  return client;
}

export function isGoogleConfigured(): boolean {
  return isConfigured();
}

export function getAuthUrl(): string | null {
  const client = createClient();
  if (!client) return null;
  return client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error('google_not_configured');
  const { tokens } = await client.getToken(code);
  setJsonSetting(TOKENS_KEY, tokens);
}

export function getConnectionStatus(): { configured: boolean; connected: boolean } {
  const configured = isConfigured();
  const tokens = getJsonSetting<StoredTokens>(TOKENS_KEY);
  return { configured, connected: configured && Boolean(tokens?.refresh_token || tokens?.access_token) };
}

export function disconnectGoogle(): void {
  deleteSetting(TOKENS_KEY);
}

function getCalendarClient() {
  const client = createClient();
  const tokens = getJsonSetting<StoredTokens>(TOKENS_KEY);
  if (!client || !tokens) return null;
  return google.calendar({ version: 'v3', auth: client });
}

function eventPayloadForItem(item: MaintenanceItem) {
  const vehicle = db.prepare('SELECT name FROM vehicles WHERE id = ?').get(item.vehicle_id) as { name: string } | undefined;
  const summary = `${vehicle?.name ?? 'Fahrzeug'} · ${item.label}`;
  const start = item.appointment_at ? new Date(item.appointment_at) : null;
  if (!start) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    summary,
    location: item.location ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

export async function upsertCalendarEventForItem(item: MaintenanceItem): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;
  const payload = eventPayloadForItem(item);
  if (!payload) return null;

  if (item.google_event_id) {
    const { data } = await calendar.events.update({
      calendarId: 'primary',
      eventId: item.google_event_id,
      requestBody: payload,
    });
    return data.id ?? null;
  }
  const { data } = await calendar.events.insert({ calendarId: 'primary', requestBody: payload });
  return data.id ?? null;
}

export async function deleteCalendarEventForItem(item: MaintenanceItem): Promise<void> {
  const calendar = getCalendarClient();
  if (!calendar || !item.google_event_id) return;
  try {
    await calendar.events.delete({ calendarId: 'primary', eventId: item.google_event_id });
  } catch (err) {
    console.error('failed to delete calendar event', err);
  }
}
