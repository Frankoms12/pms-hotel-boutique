import { getPublicEnvironment } from '@/lib/env';
import { httpRequest } from '@/lib/http';
import type { StaffReservationQuoteDto } from '../dtos/staff-reservation-create.dto';
import type { ReservationDetailDto } from '../dtos/reservation-detail.dto';
import type { StaffBookingGuest, StaffStaySearch, StaffReservationQuote, StaffReservationOption } from '../model/staff-reservation-create';

function resource(propertyId: string) {
  if (!getPublicEnvironment().useMockApi) throw new Error('STAFF_RESERVATION_CREATION_NOT_CONNECTED');
  if (!propertyId.trim()) throw new Error('STAFF_RESERVATION_PROPERTY_REQUIRED');
  return new URL(`/__mock/staff-reservations/${encodeURIComponent(propertyId)}`, window.location.origin).href;
}
export function readStaffReservationQuote(propertyId: string, search: StaffStaySearch, signal?: AbortSignal): Promise<StaffReservationQuoteDto> {
  const query = new URLSearchParams({ arrival: search.checkIn, departure: search.checkOut, adults: String(search.adults), children: String(search.children), rooms: String(search.rooms) });
  return httpRequest({ path: `${resource(propertyId)}/quotes?${query}`, signal });
}
export function createStaffReservation(quote: StaffReservationQuote, option: StaffReservationOption, guest: StaffBookingGuest, key: string, signal?: AbortSignal): Promise<ReservationDetailDto> {
  return httpRequest({ path: resource(quote.propertyId), method: 'POST', signal,
    headers: { 'Idempotency-Key': key }, json: {
      quote_id: quote.id, room_type_id: option.roomTypeId, rate_plan_id: option.ratePlanId,
      guest: { full_name: guest.fullName.trim(), email: guest.email.trim(), phone: guest.phone.trim() }, notes: guest.notes.trim() || null,
    } });
}
