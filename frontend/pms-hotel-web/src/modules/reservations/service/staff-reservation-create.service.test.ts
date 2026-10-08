import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http';
import { DomainMappingError } from '@/lib/errors';
import { mockServer } from '@/data/mocks/server';
import { reservationHandlers } from '@/data/mocks/reservation-handlers';
import { resetStaffCreatedReservations } from '@/data/mocks/staff-reservation-create';
import { resetStaffRoomCatalog, roomCatalogFixture } from '@/data/mocks/staff-room-catalog';
import { readStaffReservationQuote, createStaffReservation } from './staff-reservation-create.service';
import { listReservationCenter, getReservationDetail } from './reservation.service';
import { mapStaffReservationQuote, mapCreatedStaffReservation } from '../mappers/staff-reservation-create.mapper';
import type { StaffStaySearch } from '../model/staff-reservation-create';

const property = 'GT-HB-01';
const endpoint = 'http://pms.test/contract/reservations';
const search: StaffStaySearch = { checkIn: '2026-11-10', checkOut: '2026-11-12', adults: 2, children: 0, rooms: 2 };
const guest = { fullName: 'Ana Pérez', email: 'ana@example.test', phone: '+502 5555 5555', notes: 'Llegada tardía' };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetStaffCreatedReservations(); resetStaffRoomCatalog(); mockServer.use(...reservationHandlers); });
afterEach(() => { vi.unstubAllEnvs(); resetStaffCreatedReservations(); resetStaffRoomCatalog(); });
async function quote(criteria = search, propertyId = property) {
  return mapStaffReservationQuote(await readStaffReservationQuote(propertyId, criteria), propertyId, criteria);
}

describe('Staff frontend creation transport and integration', () => {
  it('creates one Reservation with N unassigned stays and exposes it in the existing center and detail', async () => {
    const current = await quote(), option = current.options.find(item => item.roomTypeId === 'RT-STD')!;
    const response = await createStaffReservation(current, option, guest, 'create-two-rooms');
    const result = mapCreatedStaffReservation(response, current, option);
    expect(result.status).toBe('PENDING'); expect(result.stays).toHaveLength(2);
    expect(result.stays.map(item => item.id)).toHaveLength(new Set(result.stays.map(item => item.id)).size);
    expect(result.stays.every(item => item.roomId === null && item.travelState === 'RESERVED')).toBe(true);
    expect(result.finance).toMatchObject({ totalAmount: 3760, paidAmount: null, financeState: 'NO_CAPTURE' });
    expect(result.notes).toBe(guest.notes);
    const list = await listReservationCenter({ endpoint, propertyId: property });
    expect(list.reservations.filter(item => item.reservation_id === result.id)).toHaveLength(1);
    expect(await getReservationDetail({ endpoint, propertyId: property, reservationId: result.id })).toEqual(response);
    expect(roomCatalogFixture(property).rooms).toHaveLength(10);
  });
  it('replays an idempotent request with the same Reservation and Stay IDs, and rejects changed payload', async () => {
    const current = await quote(), option = current.options[0];
    const first = await createStaffReservation(current, option, guest, 'repeat');
    expect(await createStaffReservation(current, option, guest, 'repeat')).toEqual(first);
    await expect(createStaffReservation(current, option, { ...guest, fullName: 'Otro Huésped' }, 'repeat')).rejects.toMatchObject({ status: 409 });
    const center = await listReservationCenter({ endpoint, propertyId: property });
    expect(center.reservations.filter(item => item.reservation_id.startsWith('LOCAL-'))).toHaveLength(1);
  });
  it('rejects stale availability at admission and counts OOO separately while OOS stays sellable', async () => {
    const current = await quote(), standard = current.options.find(item => item.roomTypeId === 'RT-STD')!;
    expect(standard.availableRooms).toBe(2);
    expect(current.options.find(item => item.roomTypeId === 'RT-DLX')?.availableRooms).toBe(4);
    await createStaffReservation(current, standard, guest, 'first');
    await expect(createStaffReservation(current, standard, guest, 'second')).rejects.toMatchObject({ status: 409 });
    expect((await quote()).options.find(item => item.roomTypeId === 'RT-STD')?.availableRooms).toBe(0);
  });
  it('uses minimum availability per night instead of adding disjoint sold stays across the range', async () => {
    for (const [arrival, departure] of [['2026-11-10', '2026-11-11'], ['2026-11-11', '2026-11-12']]) {
      const current = await quote({ ...search, checkIn: arrival, checkOut: departure, rooms: 1 });
      await createStaffReservation(current, current.options.find(item => item.roomTypeId === 'RT-STD')!, guest, arrival);
    }
    expect((await quote({ ...search, rooms: 1 })).options.find(item => item.roomTypeId === 'RT-STD')?.availableRooms).toBe(1);
    expect((await quote({ ...search, checkIn: '2026-11-12', checkOut: '2026-11-13' })).options.find(item => item.roomTypeId === 'RT-STD')?.availableRooms).toBe(2);
  });
  it('keeps property boundaries explicit for quotes, admission, list and detail', async () => {
    const current = await quote(), option = current.options[0];
    const first = await createStaffReservation(current, option, guest, 'scope');
    expect((await quote(search, 'OTHER-PROPERTY')).options).toEqual([]);
    await expect(createStaffReservation({ ...current, propertyId: 'OTHER-PROPERTY' }, option, guest, 'other')).rejects.toMatchObject({ status: 400 });
    await expect(getReservationDetail({ endpoint, propertyId: 'OTHER-PROPERTY', reservationId: first.reservation_id })).rejects.toMatchObject({ status: 404 });
    expect((await listReservationCenter({ endpoint, propertyId: 'OTHER-PROPERTY' })).reservations).toEqual([]);
  });
  it('blocks all synthetic creation transport in real mode', async () => {
    const current = await quote(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    expect(() => readStaffReservationQuote(property, search)).toThrow('STAFF_RESERVATION_CREATION_NOT_CONNECTED');
    expect(() => createStaffReservation(current, current.options[0], guest, 'blocked')).toThrow('STAFF_RESERVATION_CREATION_NOT_CONNECTED');
  });
  it('rejects a mapper response belonging to another property or with a changed price', async () => {
    const dto = await readStaffReservationQuote(property, search);
    expect(() => mapStaffReservationQuote({ ...dto, property_id: 'OTHER-PROPERTY' }, property, search)).toThrow(DomainMappingError);
    expect(() => mapStaffReservationQuote({ ...dto, options: [{ ...dto.options[0], total_minor: 1 }] }, property, search)).toThrow(DomainMappingError);
    const current = mapStaffReservationQuote(dto, property, search), option = current.options[0];
    const detail = await createStaffReservation(current, option, guest, 'mapped');
    expect(() => mapCreatedStaffReservation({ ...detail, property_id: 'OTHER-PROPERTY' }, current, option)).toThrow(DomainMappingError);
    expect(() => mapCreatedStaffReservation({ ...detail, stays: [detail.stays[0], detail.stays[0]] }, current, option)).toThrow(DomainMappingError);
  });
  it('rejects malformed guest information without inserting a booking', async () => {
    const current = await quote();
    await expect(createStaffReservation(current, current.options[0], { ...guest, email: 'invalid' }, 'invalid')).rejects.toBeInstanceOf(HttpStatusError);
    expect((await listReservationCenter({ endpoint, propertyId: property })).reservations.some(item => item.reservation_id.startsWith('LOCAL-'))).toBe(false);
  });
});
