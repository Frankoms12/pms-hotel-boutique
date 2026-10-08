import type { StaffReservationDto } from './dtos/staff-reservation.dto';

/** Synthetic test fixture shaped like the real PostgreSQL read contract. */
export function staffReservationFixture(): StaffReservationDto {
  return { reservationId: '11111111-1111-1111-1111-111111111111', propertyId: '22222222-2222-2222-2222-222222222222',
    confirmationCode: 'REAL-BOOKING', status: 'CONFIRMED', source: 'WEB_DIRECTA', sourceReference: null,
    currency: 'GTQ', createdAt: '2026-10-08T10:00:00Z',
    responsibleGuest: { profileId: '33333333-3333-3333-3333-333333333333', firstName: 'Real', lastName: 'Responsible' },
    stays: [{ stayId: '44444444-4444-4444-4444-444444444444', arrival: '2026-11-01', departure: '2026-11-03', status: 'RESERVED',
      roomType: { roomTypeId: '55555555-5555-5555-5555-555555555555', code: 'DELUXE', name: 'Deluxe' }, room: null }] };
}
