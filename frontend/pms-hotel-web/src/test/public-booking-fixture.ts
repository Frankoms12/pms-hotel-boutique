import { publicPropertyId, publicRoomTypeId } from './public-availability-fixture';

export const publicBookingRequest = {
  propertyId: publicPropertyId, arrival: '2026-11-01', departure: '2026-11-03', currency: 'GTQ' as const,
  clientTotalMinor: 170000, stays: [{ roomTypeId: publicRoomTypeId, ratePlanId: 'DEMO_DELUXE', quantity: 1 }],
  bookingGuest: { firstName: 'María José', lastName: 'O’Neill-Pérez', email: 'guest@example.com' }, paymentMode: 'SIMULATED_CARD' as const,
};
export const publicBookingResponse = {
  reservationId: 'ce280061-b735-4664-a04d-cf55bfbeb550', confirmationCode: 'HB-REAL-12345', status: 'CONFIRMED' as const,
  currency: 'GTQ' as const, totalMinor: 170000, payment: { provider: 'SIMULATED' as const, status: 'APPROVED' as const, reference: 'simulated-reference' },
  stays: [{ reservationStayId: '082b6fa7-0c84-4929-a98b-2e753793bc97', roomTypeId: publicRoomTypeId, roomId: null, arrival: '2026-11-01', departure: '2026-11-03' }],
};
