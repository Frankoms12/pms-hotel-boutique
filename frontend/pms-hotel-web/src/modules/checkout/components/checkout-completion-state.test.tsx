import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildSearchQueryParams } from '@/modules/booking';
import type { PublicBookingConfirmation } from '@/modules/reservations';
import { publicBookingRequest, publicBookingResponse } from '@/test/public-booking-fixture';
import { emptyGuest } from '../domain/guest-details';
import { defaultPaymentChoice } from '../domain/payment-choice';
import { CheckoutDraftProvider, useCheckoutConfirmation, useCheckoutDraft } from './checkout-draft-provider';

const criteria = { checkIn: publicBookingRequest.arrival, checkOut: publicBookingRequest.departure, adults: 2, children: 0, roomsCount: 1 };
const scope = `${publicBookingRequest.propertyId}:${buildSearchQueryParams(criteria)}`;
const confirmation: PublicBookingConfirmation = {
  ...publicBookingResponse, source: 'backend', propertyId: publicBookingRequest.propertyId,
  arrival: publicBookingRequest.arrival, departure: publicBookingRequest.departure, receivedAt: '2026-10-08T12:00:00Z',
  guaranteeMinor: publicBookingResponse.totalMinor, remainingMinor: 0,
  stays: publicBookingResponse.stays.map(({ reservationStayId, ...stay }) => ({ ...stay, id: reservationStayId, roomName: 'Deluxe real' })),
};

describe('Checkout confirmation state', () => {
  it('accepts success only once and releases the form, quote, payment choice and attempt while retaining the ticket', () => {
    const { result } = renderHook(() => ({ draft: useCheckoutDraft(scope), receipt: useCheckoutConfirmation(criteria) }), { wrapper: CheckoutDraftProvider });
    act(() => result.current.draft.update({ ...publicBookingRequest.bookingGuest, phone: '55555555', document: 'QA-DOC', specialRequests: 'Private note' }));
    act(() => result.current.draft.approve('selection'));
    act(() => result.current.draft.reviewQuote('selection', 'quote'));
    act(() => result.current.draft.setPayment('quote', { mode: 'partial', preset: 'half', customAmount: '' }));
    const key = result.current.draft.attemptKey('original-payload');
    const operation = { scope, selectionKey: 'selection', criteria, request: { ...publicBookingRequest, idempotencyKey: key }, roomNames: { [publicBookingRequest.stays[0].roomTypeId]: 'Deluxe real' } };
    act(() => { result.current.draft.beginPublicAttempt(operation); });
    const settle = result.current.draft.settlePublicAttempt;
    const accepted: boolean[] = [];
    act(() => {
      accepted.push(settle(operation, confirmation));
      accepted.push(settle(operation, confirmation));
      result.current.draft.releasePublicAttempt();
    });
    expect(accepted).toEqual([true, false]);
    expect(result.current.draft.guest).toEqual(emptyGuest);
    expect(result.current.draft.approvedSelection).toBeUndefined();
    expect(result.current.draft.reviewedQuote).toBeUndefined();
    expect(result.current.draft.failure).toBeUndefined();
    expect(result.current.draft.paymentChoice('quote')).toEqual(defaultPaymentChoice);
    expect(result.current.draft.publicAttempt).toBeNull();
    expect(result.current.draft.hasUnresolvedAttempt).toBe(false);
    expect(result.current.receipt.confirmation).toEqual(confirmation);
    expect(result.current.receipt.guest).toEqual(publicBookingRequest.bookingGuest);
    expect(result.current.draft.attemptKey('original-payload')).not.toBe(key);
  });
});
