import type { DemoCardToken } from '@/modules/payments';

export type BookingFailureKind = 'declined' | 'availability' | 'quote' | 'gateway' | 'network' | 'unknown' | 'invalid' | 'property' | 'idempotency';
export interface BookingFailure {
  kind: BookingFailureKind;
  message: string;
  outcomeUnknown: boolean;
  propertyId: string;
  roomNames: string[];
  card?: DemoCardToken;
  source?: 'backend';
}

export class CheckoutAttemptError extends Error {
  constructor(readonly kind: BookingFailureKind, message: string) { super(message); }
}
