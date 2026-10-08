'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onlineManager } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { HttpNetworkError, HttpStatusError } from '@/lib/http/errors';
import { useResetPublicBooking, publicResultsHref, resolveSelection, type BookingSearchCriteria } from '@/modules/booking';
import type { DemoCardToken } from '@/modules/payments';
import { confirmDemoBooking } from '@/modules/reservations';
import { paymentEstimate, quoteFingerprint } from '../domain/payment-estimate';
import { validateGuest } from '../domain/guest-details';
import { CheckoutAttemptError } from '../domain/booking-failure';
import { chosenPayment } from '../domain/payment-choice';
import { useCheckoutDraft } from '../components/checkout-draft-provider';
import type { BookingReview } from '../components/checkout-availability-gate';

export const confirmationHref = (criteria: Partial<BookingSearchCriteria>) => publicResultsHref(criteria).replace('/habitaciones', '/reserva/confirmacion');
export const failureHref = (criteria: Partial<BookingSearchCriteria>) => publicResultsHref(criteria).replace('/habitaciones', '/reserva/error');

export function useDemoCheckout(review: BookingReview, criteria: Partial<BookingSearchCriteria>, card: DemoCardToken | null) {
  const draft = useCheckoutDraft(review.scope);
  const router = useRouter();
  const clearCart = useResetPublicBooking();
  const [phase, setPhase] = useState<'idle' | 'checking' | 'processing' | 'done'>('idle');
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const current = useRef({ scope: review.scope, selection: review.selectionKey, guest: draft.guest });
  useEffect(() => { current.current = { scope: review.scope, selection: review.selectionKey, guest: draft.guest }; }, [review.scope, review.selectionKey, draft.guest]);
  useEffect(() => () => { active.current?.abort(); }, []);
  async function submit() {
    if (active.current || phase === 'done' || !card || !review.ready || draft.confirmation || draft.approvedSelection !== review.selectionKey || draft.reviewedQuote !== quoteFingerprint(review.items, review.availability.data?.totalNights ?? 0) || Object.keys(validateGuest(draft.guest)).length || !getPublicEnvironment().useMockApi) return;
    const controller = new AbortController(); active.current = controller; setError(''); setPhase('checking');
    let sent = false;
    try {
      if (!onlineManager.isOnline()) throw new HttpNetworkError();
      const refreshed = await review.availability.refetch({ cancelRefetch: true });
      if (controller.signal.aborted) return;
      if (refreshed.error || !refreshed.data || refreshed.fetchStatus === 'paused') throw new CheckoutAttemptError('network', 'No pudimos verificar la disponibilidad. Recupera la conexión e inténtalo de nuevo.');
      const items = resolveSelection(review.items, refreshed.data.roomTypes);
      const estimate = paymentEstimate(items, refreshed.data.totalNights);
      if (items.some(item => !item.valid)) throw new CheckoutAttemptError('availability', 'La habitación seleccionada ya no tiene disponibilidad para estas fechas o la cantidad solicitada.');
      if (!estimate || refreshed.data.propertyId !== review.availability.data?.propertyId || quoteFingerprint(items, refreshed.data.totalNights) !== quoteFingerprint(review.items, review.availability.data!.totalNights)) throw new CheckoutAttemptError('quote', 'La disponibilidad o la tarifa cambió. Revisa tu selección antes de volver a confirmar.');
      if (current.current.scope !== review.scope || current.current.selection !== review.selectionKey || current.current.guest !== draft.guest) throw new CheckoutAttemptError('quote', 'Tus datos o tu selección cambiaron. Revisa la reserva antes de continuar.');
      const chosen = chosenPayment(estimate.totalMinor, estimate.guaranteeMinor, draft.paymentChoice(quoteFingerprint(items, refreshed.data.totalNights)), estimate.currency);
      if (chosen.amountMinor === null) throw new CheckoutAttemptError('quote', chosen.error);
      const payload = { propertyId: refreshed.data.propertyId, checkIn: criteria.checkIn!, checkOut: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, items: items.map(({ roomTypeId, ratePlanId, quantity }) => ({ roomTypeId, ratePlanId, quantity })), totalMinor: estimate.totalMinor, guaranteeMinor: chosen.amountMinor, currency: estimate.currency, card, bookingGuest: { firstName: draft.guest.firstName.trim(), lastName: draft.guest.lastName.trim(), email: draft.guest.email.trim() } };
      const key = draft.attemptKey(JSON.stringify(payload));
      setPhase('processing');
      sent = true;
      const confirmation = await confirmDemoBooking({ ...payload, idempotencyKey: key }, controller.signal);
      if (controller.signal.aborted) return;
      if (draft.complete(review.selectionKey, confirmation)) clearCart();
      setPhase('done');
      router.push(confirmationHref(criteria));
    } catch (problem) {
      if (!controller.signal.aborted) {
        const outcomeUnknown = (sent && !(problem instanceof HttpStatusError)) || (draft.hasUnresolvedAttempt && !sent);
        const kind = problem instanceof CheckoutAttemptError ? problem.kind : problem instanceof HttpNetworkError ? 'network' : problem instanceof HttpStatusError ? problem.status === 422 ? 'declined' : problem.status === 409 ? 'availability' : 'gateway' : 'unknown';
        const message = outcomeUnknown ? 'No pudimos verificar el resultado de la solicitud. Recupera la conexión y reintenta la misma operación antes de cambiar de tarjeta.' : problem instanceof HttpNetworkError ? 'Sin conexión. No pudimos confirmar la operación. Recupera la conexión y reintenta la misma solicitud.' : problem instanceof HttpStatusError ? problem.status === 422 ? 'La tarjeta fue rechazada. Selecciona otra tarjeta e inténtalo de nuevo.' : problem.status === 409 ? 'La disponibilidad o la cotización cambió. Revisa tu selección antes de confirmar.' : 'El servicio de pago no está disponible. No se confirmó la reserva; puedes reintentar.' : problem instanceof CheckoutAttemptError ? problem.message : 'No pudimos confirmar la reserva. Inténtalo de nuevo.';
        setError(message);
        draft.fail({ kind, message, outcomeUnknown, propertyId: review.availability.data!.propertyId, roomNames: review.items.map(item => `${item.room?.name ?? 'Habitación seleccionada'}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`), card });
        setPhase('idle');
        router.push(failureHref(criteria));
      }
    } finally { if (active.current === controller) active.current = null; }
  }
  return { submit, phase, error, isPending: phase === 'checking' || phase === 'processing', clearError: () => setError('') };
}
