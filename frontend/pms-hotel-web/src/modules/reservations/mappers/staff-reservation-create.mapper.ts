import { DomainMappingError } from '@/lib/errors';
import { requiredText } from '@/lib/mapper';
import type { StaffReservationQuoteDto } from '../dtos/staff-reservation-create.dto';
import type { ReservationDetailDto } from '../dtos/reservation-detail.dto';
import type { StaffReservationQuote, StaffReservationOption, StaffStaySearch } from '../model/staff-reservation-create';
import { stayNights } from '../model/staff-reservation-create';
import { mapReservationDetail } from './reservation-detail.mapper';

function integer(value: number, minimum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum) throw new DomainMappingError('INVALID_STAFF_QUOTE_NUMBER');
  return value;
}
export function mapStaffReservationQuote(dto: StaffReservationQuoteDto, propertyId: string, search: StaffStaySearch): StaffReservationQuote {
  if (dto.property_id !== propertyId || dto.arrival !== search.checkIn || dto.departure !== search.checkOut
    || dto.adults !== search.adults || dto.children !== search.children || dto.rooms !== search.rooms
    || dto.nights !== stayNights(search.checkIn, search.checkOut) || !dto.nights || !Array.isArray(dto.options))
    throw new DomainMappingError('STAFF_QUOTE_SCOPE_MISMATCH');
  const options = dto.options.map(option => {
    const nightlyMinor = integer(option.nightly_minor, 0), totalMinor = integer(option.total_minor, 0);
    if (totalMinor !== nightlyMinor * dto.nights * dto.rooms || !/^[A-Z]{3}$/.test(option.currency))
      throw new DomainMappingError('INVALID_STAFF_QUOTE_PRICE');
    return { roomTypeId: requiredText(option.room_type_id, 'INVALID_ROOM_TYPE'), roomTypeName: requiredText(option.room_type_name, 'INVALID_ROOM_TYPE_NAME'),
      ratePlanId: requiredText(option.rate_plan_id, 'INVALID_RATE_PLAN'), ratePlanName: requiredText(option.rate_plan_name, 'INVALID_RATE_PLAN_NAME'),
      capacity: integer(option.capacity, 1), availableRooms: integer(option.available_rooms, 0), nightlyMinor, totalMinor, currency: option.currency };
  });
  if (new Set(options.map(option => `${option.roomTypeId}:${option.ratePlanId}`)).size !== options.length)
    throw new DomainMappingError('DUPLICATE_STAFF_QUOTE_OPTION');
  return { ...search, id: requiredText(dto.quote_id, 'INVALID_STAFF_QUOTE_ID'), propertyId, nights: dto.nights, options };
}
export function mapCreatedStaffReservation(dto: ReservationDetailDto, quote: StaffReservationQuote, option: StaffReservationOption) {
  const detail = mapReservationDetail(dto);
  if (detail.propertyId !== quote.propertyId || detail.stays.length !== quote.rooms
    || new Set(detail.stays.map(stay => stay.id)).size !== quote.rooms
    || detail.stays.some((stay, index) => dto.stays[index].check_in !== quote.checkIn || dto.stays[index].check_out !== quote.checkOut
      || stay.nights !== quote.nights || stay.roomType !== option.roomTypeName || stay.roomId !== null || stay.travelState !== 'RESERVED')
    || detail.status !== 'PENDING' || detail.currency !== option.currency || detail.finance.totalAmount !== option.totalMinor / 100
    || detail.finance.paidAmount !== null || detail.finance.financeState !== 'NO_CAPTURE')
    throw new DomainMappingError('STAFF_CREATED_RESERVATION_MISMATCH');
  return detail;
}
