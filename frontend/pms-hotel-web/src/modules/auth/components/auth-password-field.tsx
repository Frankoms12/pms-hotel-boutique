'use client';

import { useState } from 'react';
import styles from './guest-access-page.module.css';

export function AuthPasswordField({ id, label, value, onChange, onBlur, error, disabled, autoComplete, hintId }: {
  id: string; label: string; value: string; onChange: (value: string) => void; onBlur: () => void;
  error?: string; disabled: boolean; autoComplete: 'current-password' | 'new-password'; hintId?: string;
}) {
  const [visible, setVisible] = useState(false);
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.passwordWrapper}>
      <input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)}
        onBlur={onBlur} autoComplete={autoComplete} disabled={disabled} required maxLength={50}
        aria-invalid={!!error} aria-describedby={[hintId, error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined} />
      <button type="button" className={styles.eye} disabled={disabled} onClick={() => setVisible(!visible)}
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
    {error && <p className={styles.fieldError} id={`${id}-error`}>{error}</p>}
  </div>;
}
