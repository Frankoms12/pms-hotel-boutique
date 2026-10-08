'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onlineManager } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { HttpNetworkError } from '@/lib/http/errors';
import { useResetPublicBooking, resolveSelection, type BookingSearchCriteria } from '@/modules/booking';
import { confirmPublicBooking } from '@/modules/reservations';
import { accommodationQuote } from '../domain/accommodation-quote';
import { validateGuest } from '../domain/guest-details';
import { quoteFingerprint } from '../domain/payment-estimate';
import { CheckoutAttemptError } from '../domain/booking-failure';
import type { PublicBookingAttempt } from '../domain/public-booking-attempt';
import { useCheckoutDraft, usePendingPublicBooking } from '../components/checkout-draft-provider';
import type { BookingReview } from '../components/checkout-availability-gate';
import { confirmationHref, failureHref } from './use-demo-checkout';
import { publicBookingFailure } from '../domain/public-booking-failure';

/** With no review, this hook can only replay the original pending operation. */
export function usePublicCheckout(review: BookingReview | null, criteria: Partial<BookingSearchCriteria>, { navigateOnError = true } = {}) {
  const pending = usePendingPublicBooking();
  const draft = useCheckoutDraft(review?.scope ?? pending?.scope ?? '');
  const router = useRouter();
  const clearCart = useResetPublicBooking();
  const [phase, setPhase] = useState<'idle' | 'checking' | 'processing' | 'done'>('idle');
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const current = useRef({ scope: review?.scope, selection: review?.selectionKey, guest: draft.guest });
  useEffect(() => { current.current = { scope: review?.scope, selection: review?.selectionKey, guest: draft.guest }; }, [review?.scope, review?.selectionKey, draft.guest]);
  useEffect(() => () => { active.current?.abort(); }, []);

  async function submit() {
    if (getPublicEnvironment().useMockApi || active.current || phase === 'done' || draft.confirmation) return;
    // Recover the saved operation BEFORE any availability, quote or guest validation.
    let operation = draft.publicAttempt;
    if (!operation && (!review || !review.ready || draft.approvedSelection !== review.selectionKey || draft.reviewedQuote !== quoteFingerprint(review.items, review.availability.data?.totalNights ?? 0) || Object.keys(validateGuest(draft.guest)).length)) return;
    const controller = new AbortController();
    active.current = controller; setError(''); setPhase(operation ? 'processing' : 'checking');
    let sent = false;
    try {
      if (!onlineManager.isOnline()) throw new HttpNetworkError();
      if (!operation) {
        if (!review) return;
        const refreshed = await review.availability.refetch({ cancelRefetch: true });
        if (controller.signal.aborted) return;
        if (refreshed.error || !refreshed.data || refreshed.fetchStatus === 'paused') throw new CheckoutAttemptError('network', 'No pudimos verificar la disponibilidad. Recupera la conexión e inténtalo de nuevo.');
        const items = resolveSelection(review.items, refreshed.data.roomTypes);
        if (items.some(item => !item.valid)) throw new CheckoutAttemptError('availability', 'La habitación seleccionada ya no tiene disponibilidad para estas fechas o la cantidad solicitada.');
        const quote = accommodationQuote(items);
        if (!quote || quote.currency !== 'GTQ' || refreshed.data.propertyId !== review.availability.data?.propertyId || quoteFingerprint(items, refreshed.data.totalNights) !== quoteFingerprint(review.items, review.availability.data!.totalNights)) throw new CheckoutAttemptError('quote', 'La disponibilidad o la tarifa cambió. Revisa tu selección antes de volver a confirmar.');
        if (current.current.scope !== review.scope || current.current.selection !== review.selectionKey || current.current.guest !== draft.guest) throw new CheckoutAttemptError('quote', 'Tus datos o tu selección cambiaron. Revisa la reserva antes de continuar.');
        const request = {
          propertyId: refreshed.data.propertyId, arrival: criteria.checkIn!, departure: criteria.checkOut!, currency: 'GTQ' as const,
          clientTotalMinor: quote.totalMinor, stays: items.map(({ roomTypeId, ratePlanId, quantity }) => ({ roomTypeId, ratePlanId, quantity })),
          bookingGuest: { firstName: draft.guest.firstName.trim(), lastName: draft.guest.lastName.trim(), email: draft.guest.email.trim() },
          paymentMode: 'SIMULATED_CARD' as const,
        };
        operation = { scope: review.scope, selectionKey: review.selectionKey, criteria: { ...criteria }, request: { ...request, idempotencyKey: draft.attemptKey(JSON.stringify(request)) }, roomNames: Object.fromEntries(items.map(item => [item.roomTypeId, item.room!.name])) };
      }
      if (!draft.beginPublicAttempt(operation)) { setPhase('idle'); return; }
      setPhase('processing'); sent = true;
      const confirmation = await confirmPublicBooking(operation.request, operation.roomNames, controller.signal);
      if (draft.settlePublicAttempt(operation, confirmation)) clearCart();
      if (!controller.signal.aborted) { setPhase('done'); router.push(confirmationHref(operation.criteria)); }
      return { confirmed: true, outcomeUnknown: false };
    } catch (problem) {
      const failure = publicBookingFailure(problem, sent || Boolean(draft.publicAttempt), operation?.request.propertyId ?? review!.availability.data!.propertyId, Object.values(operation?.roomNames ?? Object.fromEntries(review!.items.map(item => [item.roomTypeId, item.room?.name ?? 'Habitación seleccionada']))));
      if (operation && (sent || draft.publicAttempt)) draft.settlePublicAttempt(operation, failure);
      else draft.fail(failure);
      if (!controller.signal.aborted) { setError(failure.message); setPhase('idle'); if (navigateOnError) router.push(failureHref(operation?.criteria ?? criteria)); }
      return { confirmed: false, outcomeUnknown: failure.outcomeUnknown };
    } finally {
      if (sent) draft.releasePublicAttempt();
      if (active.current === controller) active.current = null;
    }
  }
  return { submit, phase, error, isPending: phase === 'checking' || phase === 'processing', clearError: () => setError('') };
}
