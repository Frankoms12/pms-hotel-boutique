import { createPublicBookingDTO } from '../service/public-booking.service';
import { mapPublicBooking } from '../mappers/public-booking.mapper';
import type { PublicBookingRequest } from '../model/public-booking';

/** Domain-only boundary used by Checkout. */
export async function confirmPublicBooking(request: PublicBookingRequest, roomNames: Record<string, string>, signal: AbortSignal) {
  const dto = await createPublicBookingDTO(request, signal);
  return mapPublicBooking(dto, request, roomNames, new Date().toISOString());
}
