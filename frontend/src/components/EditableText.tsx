import { useState } from 'react';

export function EditableText({
  value,
  placeholder,
  onSave,
  prefix,
}: {
  value: string | null;
  placeholder: string;
  onSave: (value: string) => void;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onSave(draft); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { setEditing(false); onSave(draft); }
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        }}
        style={{ font: '12px system-ui,sans-serif', padding: '3px 6px', border: '1.5px solid #1f1f1f', borderRadius: 20 }}
      />
    );
  }

  return (
    <span className="stat" style={{ cursor: 'pointer' }} onClick={() => setEditing(true)} title="Klicken zum Bearbeiten">
      {prefix}
      {value || placeholder} ✎
    </span>
  );
}
