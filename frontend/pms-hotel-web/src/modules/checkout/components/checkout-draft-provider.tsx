'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { emptyGuest, type GuestDetails } from '../domain/guest-details';
import type { BookingConfirmation } from '@/modules/reservations';
import type { PublicBookingAttempt } from '../domain/public-booking-attempt';
import { buildSearchQueryParams, validateBookingSearchCriteria, type BookingSearchCriteria } from '@/modules/booking';
import { CheckoutAttemptError, type BookingFailure } from '../domain/booking-failure';
import { defaultPaymentChoice, type PaymentChoice } from '../domain/payment-choice';

interface Draft { scope: string; guest: GuestDetails; approvedSelection?: string; reviewedQuote?: string; confirmation?: BookingConfirmation; confirmationGuest?: Pick<GuestDetails, 'firstName' | 'lastName' | 'email'>; failure?: BookingFailure; payment?: { quote: string; choice: PaymentChoice } }
const Context = createContext<{ draft: Draft; update: (scope: string, patch: Partial<GuestDetails>) => void; approve: (scope: string, selection: string) => void; reviewQuote: (scope: string, selection: string, quote: string) => void; complete: (scope: string, selection: string, confirmation: BookingConfirmation) => boolean; fail: (scope: string, failure: BookingFailure) => void; attemptKey: (scope: string, payload: string) => string; setPayment: (scope: string, quote: string, choice: PaymentChoice) => void; hasUnresolvedAttempt: boolean; reset: () => void; publicAttempt: PublicBookingAttempt | null; beginPublicAttempt: (operation: PublicBookingAttempt) => boolean; settlePublicAttempt: (operation: PublicBookingAttempt, result: BookingConfirmation | BookingFailure) => boolean; releasePublicAttempt: () => void } | null>(null);

/** Sensitive form data lives only in memory, never in URL, logs or browser storage. */
export function CheckoutDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ scope: '', guest: emptyGuest });
  const [hasUnresolvedAttempt, setHasUnresolvedAttempt] = useState(false);
  const attempt = useRef<{ scope: string; payload: string; key: string; unresolved?: boolean } | null>(null);
  const [publicAttempt, setPublicAttempt] = useState<PublicBookingAttempt | null>(null);
  const publicFlight = useRef(false);
  const publicSnapshot = useRef<PublicBookingAttempt | null>(null);
  const completedReservation = useRef<string | null>(null);
  const saveConfirmation = (scope: string, confirmation: BookingConfirmation) => {
    if (draft.scope !== scope || draft.confirmation || completedReservation.current === confirmation.reservationId) return false;
    completedReservation.current = confirmation.reservationId;
    attempt.current = null;
    publicSnapshot.current = null;
    setPublicAttempt(null);
    setHasUnresolvedAttempt(false);
    // Only receipt identity/scope and the ticket's responsible-person fields survive.
    const { firstName, lastName, email } = draft.guest;
    setDraft({ scope, guest: emptyGuest, confirmation, confirmationGuest: { firstName, lastName, email } });
    return true;
  };
  const beginPublicAttempt = (operation: PublicBookingAttempt) => {
    if (publicFlight.current) return false;
    if (publicSnapshot.current && JSON.stringify(publicSnapshot.current) !== JSON.stringify(operation)) return false;
    publicFlight.current = true;
    publicSnapshot.current = operation;
    setPublicAttempt(operation);
    setHasUnresolvedAttempt(true);
    return true;
  };
  const settlePublicAttempt = (operation: PublicBookingAttempt, result: BookingConfirmation | BookingFailure) => {
    if (!('outcomeUnknown' in result)) return saveConfirmation(operation.scope, result);
    if (!result.outcomeUnknown) { publicSnapshot.current = null; setPublicAttempt(null); }
    setHasUnresolvedAttempt(result.outcomeUnknown);
    setDraft(previous => previous.scope === operation.scope && !previous.confirmation ? { ...previous, failure: result } : previous);
    return false;
  };
  const releasePublicAttempt = () => { publicFlight.current = false; };
  const update = (scope: string, patch: Partial<GuestDetails>) => {
    if (publicSnapshot.current) return;
    setDraft(previous => ({ scope, guest: { ...(previous.scope === scope ? previous.guest : emptyGuest), ...patch } }));
  };
  const approve = (scope: string, selection: string) => { if (!publicSnapshot.current) setDraft(previous => previous.scope === scope ? { ...previous, approvedSelection: selection, reviewedQuote: undefined } : previous); };
  const reviewQuote = (scope: string, selection: string, quote: string) => { if (!publicSnapshot.current) setDraft(previous => previous.scope === scope && previous.approvedSelection === selection ? { ...previous, reviewedQuote: quote } : previous); };
  const complete = (scope: string, selection: string, confirmation: BookingConfirmation) => {
    if (draft.approvedSelection !== selection) return false;
    return saveConfirmation(scope, confirmation);
  };
  const fail = (scope: string, failure: BookingFailure) => {
    if (attempt.current?.scope === scope) { attempt.current.unresolved = failure.outcomeUnknown; setHasUnresolvedAttempt(failure.outcomeUnknown); }
    setDraft(previous => previous.scope === scope && !previous.confirmation ? { ...previous, failure } : previous);
  };
  const attemptKey = (scope: string, payload: string) => {
    if (attempt.current?.unresolved && (attempt.current.scope !== scope || attempt.current.payload !== payload)) throw new CheckoutAttemptError('unknown', 'Necesitamos verificar el intento anterior antes de confirmar con otros datos.');
    if (attempt.current?.scope !== scope || attempt.current.payload !== payload) attempt.current = { scope, payload, key: crypto.randomUUID() };
    return attempt.current.key;
  };
  const reset = () => { if (publicSnapshot.current) return; attempt.current = null; completedReservation.current = null; setHasUnresolvedAttempt(false); setDraft({ scope: '', guest: emptyGuest }); };
  const setPayment = (scope: string, quote: string, choice: PaymentChoice) => {
    if (attempt.current?.unresolved) return;
    setDraft(previous => previous.scope === scope && !previous.confirmation ? { ...previous, payment: { quote, choice } } : previous);
  };
  return <Context.Provider value={{ draft, update, approve, reviewQuote, complete, fail, attemptKey, setPayment, hasUnresolvedAttempt, reset, publicAttempt, beginPublicAttempt, settlePublicAttempt, releasePublicAttempt }}>{children}</Context.Provider>;
}

export function useCheckoutDraft(scope: string) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  return {
    guest: context.draft.scope === scope ? context.draft.guest : emptyGuest,
    approvedSelection: context.draft.scope === scope ? context.draft.approvedSelection : undefined,
    reviewedQuote: context.draft.scope === scope ? context.draft.reviewedQuote : undefined,
    confirmation: context.draft.scope === scope ? context.draft.confirmation : undefined,
    failure: context.draft.scope === scope ? context.draft.failure : undefined,
    update: (patch: Partial<GuestDetails>) => context.update(scope, patch),
    approve: (selection: string) => context.approve(scope, selection),
    reviewQuote: (selection: string, quote: string) => context.reviewQuote(scope, selection, quote),
    complete: (selection: string, confirmation: BookingConfirmation) => context.complete(scope, selection, confirmation),
    fail: (failure: BookingFailure) => context.fail(scope, failure),
    attemptKey: (payload: string) => context.attemptKey(scope, payload),
    hasUnresolvedAttempt: context.hasUnresolvedAttempt,
    paymentChoice: (quote: string) => context.draft.scope === scope && context.draft.payment?.quote === quote ? context.draft.payment.choice : defaultPaymentChoice,
    setPayment: (quote: string, choice: PaymentChoice) => context.setPayment(scope, quote, choice),
    publicAttempt: context.publicAttempt,
    beginPublicAttempt: context.beginPublicAttempt,
    settlePublicAttempt: context.settlePublicAttempt,
    releasePublicAttempt: context.releasePublicAttempt,
  };
}

export function usePendingPublicBooking() {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  return context.publicAttempt;
}

export function useCheckoutFailure(criteria: Partial<BookingSearchCriteria>) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  const failure = context.draft.failure;
  const valid = Object.keys(validateBookingSearchCriteria(criteria)).length === 0 && failure && context.draft.scope === `${failure.propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}`;
  return { failure: valid ? failure : undefined, guest: valid ? context.draft.guest : emptyGuest };
}

export function useResetCheckout() {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  return context.reset;
}

export function useCheckoutConfirmation(criteria: Partial<BookingSearchCriteria>) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  const confirmation = context.draft.confirmation;
  const valid = Object.keys(validateBookingSearchCriteria(criteria)).length === 0 && confirmation && context.draft.scope === `${confirmation.propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}`;
  return { confirmation: valid ? confirmation : undefined, guest: valid ? context.draft.confirmationGuest ?? emptyGuest : emptyGuest };
}
