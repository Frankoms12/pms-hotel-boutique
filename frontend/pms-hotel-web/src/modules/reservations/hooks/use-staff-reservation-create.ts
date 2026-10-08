'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { HttpStatusError } from '@/lib/http';
import { readStaffReservationQuote, createStaffReservation } from '../service/staff-reservation-create.service';
import { mapStaffReservationQuote, mapCreatedStaffReservation } from '../mappers/staff-reservation-create.mapper';
import type { StaffStaySearch, StaffReservationQuote, StaffReservationOption, StaffBookingGuest } from '../model/staff-reservation-create';
import type { ReservationDetailData } from '../model/reservation-detail';

export function useStaffReservationCreate(propertyId: string, sessionId: string, allowed: boolean, search?: StaffStaySearch) {
  const client = useQueryClient();
  const connected = getPublicEnvironment().useMockApi;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ReservationDetailData>();
  const active = useRef<AbortController | null>(null);
  const identity = useRef({ propertyId, sessionId });
  const idempotency = useRef<{ body: string; key: string } | null>(null);
  useEffect(() => {
    identity.current = { propertyId, sessionId };
    return () => { identity.current = { propertyId: '', sessionId: '' }; active.current?.abort(); };
  }, [propertyId, sessionId]);
  const query = useQuery({ queryKey: ['staff-reservation-quotes', sessionId, propertyId, search], enabled: connected && allowed && !!search,
    retry: false, staleTime: 0, refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (!search || !allowed) throw new Error('STAFF_QUOTE_CONFIGURATION_REQUIRED');
      return mapStaffReservationQuote(await readStaffReservationQuote(propertyId, search, signal), propertyId, search);
    } });
  async function create(quote: StaffReservationQuote, option: StaffReservationOption, guest: StaffBookingGuest) {
    if (active.current || result) return;
    if (!connected || !allowed || quote.propertyId !== propertyId) { setError('No se puede crear una reserva en este contexto.'); return; }
    const body = JSON.stringify({ quote: quote.id, type: option.roomTypeId, rate: option.ratePlanId, guest });
    if (idempotency.current?.body !== body) idempotency.current = { body, key: crypto.randomUUID() };
    const controller = new AbortController(); active.current = controller; setBusy(true); setError(undefined);
    try {
      const detail = mapCreatedStaffReservation(await createStaffReservation(quote, option, guest, idempotency.current.key, controller.signal), quote, option);
      if (controller.signal.aborted || identity.current.propertyId !== propertyId || identity.current.sessionId !== sessionId) return;
      setResult(detail);
      await client.invalidateQueries({ queryKey: ['reservations', propertyId] });
      await client.invalidateQueries({ queryKey: ['staff-reservation-quotes', sessionId, propertyId] });
      await client.invalidateQueries({ queryKey: ['staff-room-occupancy', sessionId, propertyId] });
    } catch (failure) {
      if (!controller.signal.aborted && identity.current.propertyId === propertyId && identity.current.sessionId === sessionId)
        setError(failure instanceof HttpStatusError && failure.status === 409
          ? 'La disponibilidad cambió. Vuelve a consultar los tipos de habitación antes de continuar.'
          : 'No pudimos completar la reserva. Conservamos los datos para que puedas reintentar.');
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return { connected, query, create, busy, error, result, clearError: () => setError(undefined) };
}
