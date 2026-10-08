import { httpRequest } from '@/lib/http/client';
import type { PublicBookingRequest } from '../model/public-booking';
import type { PublicBookingRequestDTO, PublicBookingResponseDTO } from '../dtos/public-booking.dto';

export function createPublicBookingDTO(request: PublicBookingRequest, signal: AbortSignal) {
  const body: PublicBookingRequestDTO = {
    propertyId: request.propertyId, arrival: request.arrival, departure: request.departure,
    currency: request.currency, clientTotalMinor: request.clientTotalMinor,
    stays: request.stays.map(({ roomTypeId, ratePlanId, quantity }) => ({ roomTypeId, ratePlanId, quantity })),
    bookingGuest: { firstName: request.bookingGuest.firstName, lastName: request.bookingGuest.lastName, email: request.bookingGuest.email },
    paymentMode: request.paymentMode,
  };
  // Explicit same-origin URL bypasses NEXT_PUBLIC_API_BASE_URL and auth interceptors.
  return httpRequest<PublicBookingResponseDTO>({
    path: new URL('/api/v1/public/bookings', window.location.origin).href,
    method: 'POST', withAuth: false, signal,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.idempotencyKey },
    body: JSON.stringify(body),
  });
}
