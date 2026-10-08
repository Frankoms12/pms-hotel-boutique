import { DomainMappingError } from '@/lib/errors';
import { count, dateOnly, list, object, text } from '@/lib/validation';
import type { PublicBookingResponseDTO } from '../dtos/public-booking.dto';
import type { PublicBookingConfirmation, PublicBookingRequest } from '../model/public-booking';

function uuid(value: unknown) {
  const id = text(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new DomainMappingError('INVALID_BOOKING_UUID');
  return id;
}

export function mapPublicBooking(dto: PublicBookingResponseDTO, request: PublicBookingRequest, roomNames: Record<string, string>, receivedAt: string): PublicBookingConfirmation {
  const value = object(dto);
  const payment = object(value.payment);
  const totalMinor = count(value.totalMinor);
  if (value.status !== 'CONFIRMED' || value.currency !== 'GTQ' || totalMinor !== request.clientTotalMinor || totalMinor <= 0 || payment.provider !== 'SIMULATED' || payment.status !== 'APPROVED') throw new DomainMappingError('PUBLIC_BOOKING_NOT_CONFIRMED');
  const stays = list(value.stays).map(raw => {
    const stay = object(raw);
    const roomTypeId = uuid(stay.roomTypeId);
    const arrival = dateOnly(stay.arrival), departure = dateOnly(stay.departure);
    if (stay.roomId !== null || arrival !== request.arrival || departure !== request.departure || arrival >= departure) throw new DomainMappingError('BOOKING_STAY_SCOPE_MISMATCH');
    return { id: uuid(stay.reservationStayId), roomTypeId, roomId: null, arrival, departure, roomName: text(roomNames[roomTypeId]) };
  });
  const expected = request.stays.flatMap(stay => Array.from({ length: stay.quantity }, () => stay.roomTypeId)).sort();
  if (!stays.length || new Set(stays.map(stay => stay.id)).size !== stays.length || JSON.stringify(stays.map(stay => stay.roomTypeId).sort()) !== JSON.stringify(expected)) throw new DomainMappingError('BOOKING_STAYS_MISMATCH');
  return {
    source: 'backend', reservationId: uuid(value.reservationId), confirmationCode: text(value.confirmationCode), status: 'CONFIRMED',
    propertyId: request.propertyId, arrival: request.arrival, departure: request.departure, receivedAt,
    currency: 'GTQ', totalMinor, guaranteeMinor: totalMinor, remainingMinor: 0,
    payment: { provider: 'SIMULATED', status: 'APPROVED', reference: text(payment.reference) }, stays,
  };
}
