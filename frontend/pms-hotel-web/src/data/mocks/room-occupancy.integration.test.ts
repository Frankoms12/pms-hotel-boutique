import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { reservationHandlers } from '@/data/mocks/reservation-handlers';
import { projectRoomOccupancy, roomOccupancyHandlers } from '@/data/mocks/room-occupancy';
import { resetRoomAssignments } from '@/data/mocks/room-assignment';
import { resetStaffCreatedReservations } from '@/data/mocks/staff-reservation-create';
import { resetStaffRoomCatalog } from '@/data/mocks/staff-room-catalog';
import { readRoomOccupancy } from '@/modules/rooms/service/room-occupancy.service';
import { mapRoomOccupancy } from '@/modules/rooms/mappers/room-occupancy.mapper';
import { getReservationDetail } from '@/modules/reservations/service/reservation.service';
import { readStaffReservationQuote, createStaffReservation } from '@/modules/reservations/service/staff-reservation-create.service';
import { mapStaffReservationQuote } from '@/modules/reservations/mappers/staff-reservation-create.mapper';
import { assignStayRoom } from '@/modules/reservations/service/room-assignment.service';
const propertyId = 'GT-HB-01', endpoint = 'http://pms.test/contract/reservations';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetRoomAssignments(); resetStaffCreatedReservations(); resetStaffRoomCatalog();
  mockServer.use(...reservationHandlers);
});
afterEach(() => { vi.unstubAllEnvs(); resetRoomAssignments(); resetStaffCreatedReservations(); resetStaffRoomCatalog(); });
describe('Room occupancy local transport', () => {
  it('reads physical assignments for the exact date and property, with checkout exclusive', async () => {
    const during = mapRoomOccupancy(await readRoomOccupancy(propertyId, '2026-08-30'), propertyId, '2026-08-30');
    expect(during.rooms.find(room => room.roomId === 'ROOM-203')?.state).toBe('RESERVED');
    expect(during.unassigned.map(stay => stay.reservationId)).toEqual(['HB-2026-08390']);
    const departure = await readRoomOccupancy(propertyId, '2026-08-31');
    expect(departure.rooms.find(room => room.room_id === 'ROOM-203')?.stays).toEqual([]);
    expect(await readRoomOccupancy('OTHER-PROPERTY', '2026-08-30')).toEqual({ property_id: 'OTHER-PROPERTY', date: '2026-08-30', rooms: [], unassigned: [] });
    await expect(readRoomOccupancy(propertyId, '2026-02-31')).rejects.toMatchObject({ status: 400 });
  });
  it('uses actual travel state, ignores terminal stays and cancelled parents, and reveals overlapping assignments', async () => {
    const detail = await getReservationDetail({ propertyId, endpoint, reservationId: 'HB-2026-08421' });
    const inHouse = { ...detail, stays: detail.stays.map(stay => ({ ...stay, travel_state: 'IN_HOUSE' as const })) };
    mockServer.use(...roomOccupancyHandlers(() => [inHouse]));
    const result = mapRoomOccupancy(await readRoomOccupancy(propertyId, '2026-08-28'), propertyId, '2026-08-28');
    expect(result.rooms.find(room => room.roomId === 'ROOM-203')?.state).toBe('OCCUPIED');
    for (const state of ['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'] as const) {
      expect(projectRoomOccupancy(propertyId, '2026-08-28', [{ ...detail, stays: detail.stays.map(stay => ({ ...stay, travel_state: state })) }]).rooms.every(room => !room.stays.length)).toBe(true);
    }
    expect(projectRoomOccupancy(propertyId, '2026-08-28', [{ ...inHouse, status: 'CANCELLED' }]).rooms.every(room => !room.stays.length)).toBe(true);
    const overlapping = projectRoomOccupancy(propertyId, '2026-08-28', [inHouse, { ...detail, reservation_id: 'R-2', stays: detail.stays.map(stay => ({ ...stay, stay_id: 'S-2' })) }]);
    expect(mapRoomOccupancy(overlapping, propertyId, '2026-08-28').rooms.find(room => room.roomId === 'ROOM-203')?.state).toBe('CONFLICT');
  });
  it('leaves unassigned bookings separate, then reflects a physical assignment without consuming another room', async () => {
    const search = { checkIn: '2026-11-10', checkOut: '2026-11-12', adults: 2, children: 0, rooms: 2 };
    const quote = mapStaffReservationQuote(await readStaffReservationQuote(propertyId, search), propertyId, search);
    const detail = await createStaffReservation(quote, quote.options.find(option => option.roomTypeId === 'RT-STD')!,
      { fullName: 'Ana Pérez', email: 'ana@example.test', phone: '+502 5555 5555', notes: '' }, 'occupancy-create');
    const before = await readRoomOccupancy(propertyId, search.checkIn);
    expect(before.unassigned).toHaveLength(2);
    expect(before.rooms.every(room => !room.stays.length)).toBe(true);
    await assignStayRoom({ propertyId, reservationId: detail.reservation_id, stayId: detail.stays[0].stay_id }, 'ROOM-101');
    const after = mapRoomOccupancy(await readRoomOccupancy(propertyId, search.checkIn), propertyId, search.checkIn);
    expect(after.rooms).toHaveLength(10);
    expect(after.rooms.find(room => room.roomId === 'ROOM-101')?.state).toBe('RESERVED');
    expect(after.unassigned).toHaveLength(1);
    expect(after.rooms.find(room => room.roomId === 'ROOM-103')?.state).toBe('FREE'); // OOO does not become an occupancy status.
    expect(after.rooms.find(room => room.roomId === 'ROOM-204')?.state).toBe('FREE'); // Same for OOS.
  });
  it('does not call a provisional transport with mocks disabled', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    expect(() => readRoomOccupancy(propertyId, '2026-08-28')).toThrow('ROOM_OCCUPANCY_NOT_CONNECTED');
  });
});
