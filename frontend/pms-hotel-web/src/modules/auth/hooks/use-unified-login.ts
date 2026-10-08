"use client";
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { HttpStatusError } from '@/lib/http';
import { loginWithCredentials } from '../service/unified-login.service';
import { mapUnifiedLogin } from '../mappers/unified-login.mapper';
import type { AuthContext } from '../model/unified-login';
import { guestAccessReturn } from '../model/checkout-return';
import { readGuestCheckoutReturn, clearGuestCheckoutReturn } from '../model/guest-checkout-context';
import { staffSessionKey } from './staff-session-query';
export function useUnifiedLogin(returnTo?: string, googleError = false) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [contexts, setContexts] = useState<AuthContext[]>([]);
  const [error, setError] = useState<string | undefined>(googleError
    ? 'No pudimos completar el acceso. Inténtalo de nuevo o continúa como invitado.' : undefined);
  const active = useRef(false);
  const router = useRouter();
  const client = useQueryClient();
  function changeEmail(value: string) { setEmail(value); setContexts([]); setError(undefined); }
  function changePassword(value: string) { setPassword(value); setContexts([]); setError(undefined); }
  async function submit(context?: AuthContext) {
    if (active.current) return;
    active.current = true; setBusy(true); setError(undefined);
    try {
      const result = mapUnifiedLogin(await loginWithCredentials(email, password, context));
      if (result.kind === 'selection') { setContexts(result.contexts); return; }
      setPassword(''); setContexts([]); setRedirecting(true);
      if (result.context === 'GUEST') {
        const destination = guestAccessReturn(returnTo) ?? (returnTo === undefined ? readGuestCheckoutReturn() : undefined) ?? '/cuenta';
        clearGuestCheckoutReturn();
        await client.invalidateQueries({ queryKey: ['guest-session'] });
        router.replace(destination);
      } else {
        await client.invalidateQueries({ queryKey: staffSessionKey });
        router.replace('/dashboard');
      }
      router.refresh();
    } catch (failure) {
      setRedirecting(false);
      setContexts([]); setPassword('');
      setError(failure instanceof HttpStatusError && (failure.status === 400 || failure.status === 401)
        ? 'Correo electrónico o contraseña incorrectos.' : 'El acceso no está disponible en este momento. Inténtalo de nuevo.');
    } finally { active.current = false; setBusy(false); }
  }
  return { email, password, busy, redirecting, contexts, error, changeEmail, changePassword, submit };
}
