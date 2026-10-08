'use client';

import { useSyncExternalStore } from 'react';
import { usePublicAvailability } from '@/modules/availability';
import { usePublicBookingSession, usePublicRoomSelection } from '../components/public-booking-provider';
import { buildSearchQueryParams, validateBookingSearchCriteria, type BookingSearchCriteria } from '../domain/booking-search-criteria';
import { resolveSelection } from '../domain/room-catalogue';
import { selectionPriceSummary } from '../domain/selection-price-summary';

const subscribe = () => () => {};

export function usePublicBookingReview(criteria: Partial<BookingSearchCriteria>, suspendAvailability = false) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const validCriteria = hydrated && Object.keys(validateBookingSearchCriteria(criteria)).length === 0;
  const { cart } = usePublicBookingSession();
  const sameSearch = validCriteria && cart.propertyId && cart.scope === `${cart.propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}`;
  const availability = usePublicAvailability(validCriteria ? {
    propertyId: sameSearch ? cart.propertyId : undefined,
    checkInDate: criteria.checkIn!, checkOutDate: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, roomsCount: criteria.roomsCount!,
  } : undefined, suspendAvailability);
  const { selection, setSelection } = usePublicRoomSelection(criteria, availability.data?.propertyId);
  const items = resolveSelection(selection, availability.data?.roomTypes ?? []);
  const prices = selectionPriceSummary(items);
  const ready = validCriteria && availability.isSuccess && !availability.isFetching && availability.fetchStatus !== 'paused';
  const scope = validCriteria && availability.data?.propertyId ? `${availability.data.propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}` : '';
  const selectionKey = JSON.stringify(items.map(item => [item.roomTypeId, item.ratePlanId, item.quantity]).sort());
  return { hydrated, validCriteria, availability, items, prices, ready, setSelection, scope, selectionKey };
}
