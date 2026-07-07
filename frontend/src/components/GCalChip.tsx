import { useGoogleStatus } from '../hooks/useGoogleStatus';
import { api } from '../api/client';

export function GCalChip() {
  const { status, reload } = useGoogleStatus();

  if (status.connected) {
    return (
      <span className="gcal">
        <span className="gi" />
        Google · verbunden <span className="dot green" />
      </span>
    );
  }

  if (!status.configured) {
    return (
      <span className="gcal" title="GOOGLE_CLIENT_ID / SECRET nicht gesetzt (siehe docs/SETUP.md)">
        <span className="gi" />
        Google Kalender · nicht konfiguriert
      </span>
    );
  }

  return (
    <a
      className="gcal"
      href={api.google.startUrl}
      onClick={() => setTimeout(reload, 2000)}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <span className="gi" />
      Google Kalender · verbinden
    </a>
  );
}
