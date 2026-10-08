import type { DemoBookingConfirmation } from './demo-booking';

/** Public J6 operation. Amounts come from Backend availability, in GTQ cents. */
export interface PublicBookingRequest {
  idempotencyKey: string;
  propertyId: string;
  arrival: string;
  departure: string;
  currency: 'GTQ';
  clientTotalMinor: number;
  stays: { roomTypeId: string; ratePlanId: string; quantity: number }[];
  bookingGuest: { firstName: string; lastName: string; email: string };
  paymentMode: 'SIMULATED_CARD';
}

export interface PublicBookingConfirmation {
  source: 'backend';
  reservationId: string;
  confirmationCode: string;
  status: 'CONFIRMED';
  propertyId: string;
  arrival: string;
  departure: string;
  /** Local receipt time, not a Backend confirmation timestamp. */
  receivedAt: string;
  currency: 'GTQ';
  totalMinor: number;
  guaranteeMinor: number;
  remainingMinor: 0;
  payment: { provider: 'SIMULATED'; status: 'APPROVED'; reference: string };
  stays: { id: string; roomTypeId: string; roomId: null; arrival: string; departure: string; roomName: string }[];
}

export type BookingConfirmation = DemoBookingConfirmation | PublicBookingConfirmation;
