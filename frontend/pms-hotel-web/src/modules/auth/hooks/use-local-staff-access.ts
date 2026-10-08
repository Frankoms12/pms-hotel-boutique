'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HttpStatusError } from '@/lib/http';
import { isLocalStaffLogin, localStaffAccessEnabled } from '../model/local-staff-access';
import { localStaffAccess } from '../service/local-staff-access.service';
import { mapStaffIdentity } from '../mappers/staff-session.mapper';

export function useLocalStaffAccess() {
  const client = useQueryClient();
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => () => request.current?.abort(), []);

  async function signIn(email: string, password: string): Promise<boolean | undefined> {
    if (!isLocalStaffLogin(email)) return undefined;
    if (request.current) return false;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(undefined);
    try {
      mapStaffIdentity(await localStaffAccess(email.trim().toLowerCase(), password, controller.signal));
      if (controller.signal.aborted) return false;
      await Promise.all([
        client.cancelQueries({ queryKey: ['private-09', 'identity'] }),
        client.cancelQueries({ queryKey: ['private-07', 'security'] }),
      ]);
      if (controller.signal.aborted) return false;
      client.removeQueries({ queryKey: ['private-09', 'identity'] });
      client.removeQueries({ queryKey: ['private-07', 'security'] });
      return true;
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof HttpStatusError && failure.status === 401
        ? 'Correo o contraseña incorrectos.' : 'No pudimos abrir el acceso Staff local. Inténtalo nuevamente.');
      return false;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      request.current = null;
    }
  }
  return { signIn, busy, error, enabled: localStaffAccessEnabled(), resetError: () => setError(undefined) };
}
