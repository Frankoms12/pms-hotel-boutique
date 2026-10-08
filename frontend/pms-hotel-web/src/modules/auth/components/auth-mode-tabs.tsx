import styles from './guest-access-page.module.css';

export type AuthMode = 'login' | 'register';

export function AuthModeTabs({ mode, disabled, onChange }: {
  mode: AuthMode; disabled: boolean; onChange: (mode: AuthMode) => void;
}) {
  return <div className={styles.tabs} role="tablist" aria-label="Opciones de acceso">
    {(['login', 'register'] as const).map(value => <button key={value} id={`auth-tab-${value}`} type="button" role="tab"
      aria-selected={value === mode} aria-controls={`auth-panel-${value}`} tabIndex={value === mode ? 0 : -1}
      className={styles.tab} disabled={disabled} onClick={() => onChange(value)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : mode === 'login' ? 'register' : 'login';
        onChange(next);
        event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#auth-tab-${next}`)?.focus();
      }}>{value === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>)}
  </div>;
}
