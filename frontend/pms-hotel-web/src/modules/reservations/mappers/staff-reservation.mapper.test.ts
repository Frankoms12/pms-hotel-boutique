import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { mapStaffReservationCenter, mapStaffReservationDetail } from './staff-reservation.mapper';
import { filterStaffReservations } from '../model/reservation-search';

describe('Staff real reservation mapping', () => {
  it('keeps responsibility separate from occupancy and leaves finance and policy unknown', () => {
    const dto = staffReservationFixture();
    const detail = mapStaffReservationDetail(dto);
    expect(detail.guest).toEqual({ profileId: dto.responsibleGuest?.profileId, primaryName: 'Real Responsible', phone: null, adults: null, children: null });
    expect(detail.finance).toEqual({ totalAmount: null, paidAmount: null, financeState: null, ratePerNight: null, lines: [] });
    expect(detail.policyLabel).toBeNull(); expect(detail.notes).toBeNull();
    expect(detail.stays[0]).toMatchObject({ nights: 2, roomId: null, roomLabel: null, roomType: 'Deluxe', travelState: 'RESERVED' });
    expect(mapStaffReservationCenter([dto])).toMatchObject({ summary: null, readOnly: true });
  });
  it('preserves N stays including nullable room and travel states without changing parent status', () => {
    const dto = staffReservationFixture();
    dto.stays.push({ ...dto.stays[0], stayId: '66666666-6666-6666-6666-666666666666', status: 'IN_HOUSE',
      room: { roomId: '77777777-7777-7777-7777-777777777777', code: '203' } });
    const detail = mapStaffReservationDetail(dto);
    expect(detail.status).toBe('CONFIRMED'); expect(detail.stays).toHaveLength(2);
    expect(detail.stays[1]).toMatchObject({ roomLabel: '203', travelState: 'IN_HOUSE' });
    expect(mapStaffReservationCenter([dto]).reservations[0].roomCount).toBe(2);
  });
  it('accepts a historical header with no stays and no responsible profile', () => {
    const dto = staffReservationFixture(); dto.stays = []; dto.responsibleGuest = null; dto.source = null;
    const item = mapStaffReservationCenter([dto]).reservations[0];
    expect(item).toMatchObject({ guestName: null, stayStart: null, stayEnd: null, nights: null, roomCount: 0 });
    expect(filterStaffReservations([item], { query: '', status: 'ALL', arrivalFrom: '2026-11-01', arrivalTo: '' })).toEqual([]);
  });
  it('searches the persisted confirmation code', () => {
    const items = mapStaffReservationCenter([staffReservationFixture()]).reservations;
    expect(filterStaffReservations(items, { query: 'REAL-BOOKING', status: 'ALL', arrivalFrom: '', arrivalTo: '' })).toHaveLength(1);
  });
  it.each(['reservationId', 'confirmationCode', 'status', 'createdAt'] as const)('rejects invalid required %s', field => {
    const dto = { ...staffReservationFixture(), [field]: 'invalid' };
    if (field === 'confirmationCode') dto.confirmationCode = '';
    expect(() => mapStaffReservationDetail(dto)).toThrow(DomainMappingError);
  });
  it('rejects impossible dates, reversed dates and duplicate stays', () => {
    for (const arrival of ['2026-02-30', '2026-11-04']) {
      const dto = staffReservationFixture(); dto.stays[0].arrival = arrival;
      expect(() => mapStaffReservationDetail(dto)).toThrow(DomainMappingError);
    }
    const dto = staffReservationFixture(); dto.stays.push(dto.stays[0]);
    expect(() => mapStaffReservationDetail(dto)).toThrow(DomainMappingError);
    expect(() => mapStaffReservationCenter([dto, dto])).toThrow(DomainMappingError);
  });
});
