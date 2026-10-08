import { DomainMappingError } from '@/lib/errors';
import { parseDateTime, parseDay, requiredText } from '@/lib/mapper';
import type { StaffReservationDto } from '../dtos/staff-reservation.dto';
import type { ReservationDetailData, ReservationStayDetail } from '../model/reservation-detail';
import type { ReservationCenterData, ReservationListItem } from '../model/reservation-summary';

const invalid = () => { throw new DomainMappingError('INVALID_STAFF_RESERVATION'); };
const text = (value: string) => typeof value === 'string' ? requiredText(value, 'INVALID_STAFF_RESERVATION_TEXT') : invalid();
const uuid = (value: string) => /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(text(value)) ? value : invalid();
const optional = (value: string | null) => value === null ? null : text(value);
const states = new Set(['RESERVED', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']);

function day(value: string): Date {
  const date = parseDay(value, 'INVALID_STAFF_STAY_DATE');
  const roundtrip = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return roundtrip === value ? date : invalid();
}

function projectDetail(dto: StaffReservationDto): ReservationDetailData {
  if (!dto || !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(dto.status) || !Array.isArray(dto.stays)) invalid();
  const ids = new Set<string>();
  const stays: ReservationStayDetail[] = dto.stays.map(s => {
    if (!s || !s.roomType || !states.has(s.status)) invalid();
    const id = uuid(s.stayId);
    if (ids.has(id)) invalid();
    ids.add(id);
    const checkIn = day(s.arrival), checkOut = day(s.departure);
    if (checkOut <= checkIn) invalid();
    uuid(s.roomType.roomTypeId);
    text(s.roomType.code);
    return { id, checkIn, checkOut, nights: Math.round((Date.parse(s.departure) - Date.parse(s.arrival)) / 86400000),
      roomId: s.room === null ? null : uuid(s.room.roomId), roomLabel: s.room === null ? null : text(s.room.code),
      roomType: text(s.roomType.name), travelState: s.status };
  });
  const guest = dto.responsibleGuest;
  return {
    id: uuid(dto.reservationId), propertyId: uuid(dto.propertyId), confirmationCode: text(dto.confirmationCode),
    status: dto.status, createdAt: parseDateTime(dto.createdAt, 'INVALID_STAFF_RESERVATION_CREATED_AT'),
    source: { label: optional(dto.source), reference: optional(dto.sourceReference) },
    currency: text(dto.currency), readOnly: true, stays,
    guest: { ...(guest === null ? {} : { profileId: uuid(guest.profileId) }),
      primaryName: guest === null ? null : `${text(guest.firstName)} ${text(guest.lastName)}`,
      adults: null, children: null, phone: null },
    policyLabel: null, notes: null,
    finance: { totalAmount: null, paidAmount: null, financeState: null, ratePerNight: null, lines: [] },
  };
}

export function mapStaffReservationDetail(dto: StaffReservationDto): ReservationDetailData {
  try { return projectDetail(dto); }
  catch (error) {
    if (error instanceof DomainMappingError) throw error;
    return invalid();
  }
}

function listItem(dto: StaffReservationDto): ReservationListItem {
  const detail = mapStaffReservationDetail(dto);
  const arrivals = detail.stays.map(s => s.checkIn.getTime()), departures = detail.stays.map(s => s.checkOut.getTime());
  const arrivalDays = dto.stays.map(s => s.arrival).sort(), departureDays = dto.stays.map(s => s.departure).sort();
  const start = arrivals.length ? new Date(Math.min(...arrivals)) : null;
  const end = departures.length ? new Date(Math.max(...departures)) : null;
  return { id: detail.id, propertyId: detail.propertyId, confirmationCode: detail.confirmationCode, readOnly: true,
    status: detail.status, guestName: detail.guest.primaryName, sourceLabel: detail.source.label,
    sourceReference: detail.source.reference,
    roomLabel: detail.stays.map(s => s.roomLabel).filter((room): room is string => room !== null).join(', ') || null,
    stayRooms: detail.stays.map(s => ({ roomType: s.roomType, room: s.roomLabel })),
    stayStart: start, stayEnd: end, nights: start && end ? Math.round((Date.parse(departureDays[departureDays.length - 1]) - Date.parse(arrivalDays[0])) / 86400000) : null,
    adults: null, roomCount: detail.stays.length, currency: detail.currency, finance: detail.finance,
    alertText: null, statusDetail: null };
}

export function mapStaffReservationCenter(dtos: StaffReservationDto[]): ReservationCenterData {
  if (!Array.isArray(dtos)) invalid();
  const reservations = dtos.map(listItem);
  if (new Set(reservations.map(r => r.id)).size !== reservations.length) invalid();
  return { readOnly: true, summary: null, alerts: [], reservations };
}
