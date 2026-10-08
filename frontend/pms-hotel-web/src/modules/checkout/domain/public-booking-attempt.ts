import type { PublicBookingRequest } from '@/modules/reservations';
import type { BookingSearchCriteria } from '@/modules/booking';

export interface PublicBookingAttempt {
  scope: string;
  selectionKey: string;
  criteria: Partial<BookingSearchCriteria>;
  request: PublicBookingRequest;
  roomNames: Record<string, string>;
}
