import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { reservationHandlers } from '@/data/mocks/reservation-handlers';
import { resetRoomAssignments } from '@/data/mocks/room-assignment';
import { resetStaffCreatedReservations } from '@/data/mocks/staff-reservation-create';
import { operationalRoomFixture, resetStaffRoomCatalog, roomCatalogFixture } from '@/data/mocks/staff-room-catalog';
import { DomainMappingError } from '@/lib/errors';
import { readStaffReservationQuote, createStaffReservation } from './staff-reservation-create.service';
import { getReservationDetail, listReservationCenter } from './reservation.service';
import { getRoomAssignmentPreview, assignStayRoom } from './room-assignment.service';
import { mapStaffReservationQuote } from '../mappers/staff-reservation-create.mapper';
import { mapRoomAssignmentPreview, mapRoomAssignmentResult } from '../mappers/room-assignment.mapper';
import type { RoomAssignmentScope } from '../model/room-assignment';

const propertyId = 'GT-HB-01', endpoint = 'http://pms.test/contract/reservations';
const guest = { fullName: 'Ana Pérez', email: 'ana@example.test', phone: '+502 5555 5555', notes: '' };
async function quote(arrival = '2026-11-10', departure = '2026-11-12', rooms = 1) {
  const search = { checkIn: arrival, checkOut: departure, adults: 2, children: 0, rooms };
  return mapStaffReservationQuote(await readStaffReservationQuote(propertyId, search), propertyId, search);
}
async function booking(rooms = 1, arrival?: string, departure?: string, type = 'RT-STD') {
  const current = await quote(arrival, departure, rooms);
  return createStaffReservation(current, current.options.find(item => item.roomTypeId === type)!, guest, crypto.randomUUID());
}
function scope(detail: Awaited<ReturnType<typeof booking>>, index = 0): RoomAssignmentScope {
  return { propertyId, reservationId: detail.reservation_id, stayId: detail.stays[index].stay_id };
}
function read(reservationId: string) { return getReservationDetail({ endpoint, propertyId, reservationId }); }
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetRoomAssignments(); resetStaffCreatedReservations(); resetStaffRoomCatalog(); mockServer.use(...reservationHandlers); });
afterEach(() => { vi.unstubAllEnvs(); resetRoomAssignments(); resetStaffCreatedReservations(); resetStaffRoomCatalog(); });

describe('Initial room assignment scenario', () => {
  it('assigns each stay independently, refreshes list/detail and preserves finance, dates, states and inventory demand', async () => {
    const detail = await booking(2), first = scope(detail), second = scope(detail, 1);
    const beforeATS = (await quote()).options.find(item => item.roomTypeId === 'RT-STD')!.availableRooms;
    const physical = structuredClone(operationalRoomFixture(propertyId));
    const preview = mapRoomAssignmentPreview(await getRoomAssignmentPreview(first), first);
    expect(preview.rooms.filter(item => item.selectable).map(item => item.number)).toEqual(['101', '102']);
    expect(preview.rooms.find(item => item.number === '103')).toMatchObject({ status: 'OOO', selectable: false });
    const result = mapRoomAssignmentResult(await assignStayRoom(first, 'ROOM-101'), first, 'ROOM-101');
    expect(result.roomNumber).toBe('101');
    await expect(assignStayRoom(second, 'ROOM-101')).rejects.toMatchObject({ status: 409 });
    const partial = (await listReservationCenter({ endpoint, propertyId })).reservations.find(item => item.reservation_id === detail.reservation_id)!;
    expect(partial.status_detail).toBe('1 de 2 habitaciones asignadas');
    expect((await getRoomAssignmentPreview(second)).rooms.find(item => item.number === '101')?.selectable).toBe(false);
    await assignStayRoom(second, 'ROOM-102');
    const updated = await read(detail.reservation_id);
    expect(updated).toEqual({ ...detail, stays: detail.stays.map((stay, index) => ({ ...stay, room_id: `ROOM-${101 + index}`, room_label: `${101 + index}` })) });
    const row = (await listReservationCenter({ endpoint, propertyId })).reservations.find(item => item.reservation_id === detail.reservation_id)!;
    expect(row).toMatchObject({ room_label: '101, 102', status_detail: 'Habitaciones asignadas', status: 'PENDING', total_amount: detail.total_amount, paid_amount: null });
    expect((await quote()).options.find(item => item.roomTypeId === 'RT-STD')?.availableRooms).toBe(beforeATS);
    expect(operationalRoomFixture(propertyId)).toEqual(physical);
    expect(roomCatalogFixture(propertyId).rooms).toHaveLength(10);
  });
  it('replays the same assignment without overwriting it with another room or modifying creation receipts', async () => {
    const current = await quote();
    const detail = await createStaffReservation(current, current.options[0], guest, 'create-receipt'), context = scope(detail);
    const first = await assignStayRoom(context, 'ROOM-101');
    expect(await assignStayRoom(context, 'ROOM-101')).toEqual(first);
    await expect(assignStayRoom(context, 'ROOM-102')).rejects.toMatchObject({ status: 409 });
    expect((await read(detail.reservation_id)).stays[0].room_id).toBe('ROOM-101');
    expect(await createStaffReservation(current, current.options[0], guest, 'create-receipt')).toEqual(detail);
  });
  it('rejects wrong property, reservation/stay pairing, unknown physical room and another room type', async () => {
    const a = await booking(), b = await booking(), context = scope(a);
    await expect(getRoomAssignmentPreview({ ...context, propertyId: 'OTHER-PROPERTY' })).rejects.toMatchObject({ status: 404 });
    await expect(assignStayRoom({ ...context, propertyId: 'OTHER-PROPERTY' }, 'ROOM-101')).rejects.toMatchObject({ status: 404 });
    await expect(assignStayRoom({ ...context, stayId: b.stays[0].stay_id }, 'ROOM-101')).rejects.toMatchObject({ status: 404 });
    await expect(assignStayRoom(context, 'UNKNOWN')).rejects.toMatchObject({ status: 404 });
    await expect(assignStayRoom(context, 'ROOM-201')).rejects.toMatchObject({ status: 409 });
    expect(await read(a.reservation_id)).toEqual(a);
  });
  it('revalidates operational state after the preview and keeps OOS sale capacity separate from assignability', async () => {
    const detail = await booking(), context = scope(detail);
    expect((await getRoomAssignmentPreview(context)).rooms.find(item => item.number === '101')?.selectable).toBe(true);
    operationalRoomFixture(propertyId).find(item => item.number === '101')!.status = 'OOO';
    await expect(assignStayRoom(context, 'ROOM-101')).rejects.toMatchObject({ status: 409 });
    const deluxe = await booking(1, undefined, undefined, 'RT-DLX');
    const preview = await getRoomAssignmentPreview(scope(deluxe));
    expect(preview.rooms.find(item => item.number === '204')).toMatchObject({ operational_status: 'OOS', selectable: false });
    await expect(assignStayRoom(scope(deluxe), 'ROOM-204')).rejects.toMatchObject({ status: 409 });
    expect((await quote()).options.find(item => item.roomTypeId === 'RT-DLX')?.availableRooms).toBe(3);
    expect(await read(detail.reservation_id)).toEqual(detail);
  });
  it('accepts checkout turnover and rejects overlapping dates, including competing requests', async () => {
    const first = await booking(), overlap = await booking(1, '2026-11-11', '2026-11-13');
    const outcomes = await Promise.allSettled([assignStayRoom(scope(first), 'ROOM-101'), assignStayRoom(scope(overlap), 'ROOM-101')]);
    expect(outcomes.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.find(item => item.status === 'rejected')).toMatchObject({ reason: { status: 409 } });
    const end = outcomes[0].status === 'fulfilled' ? '2026-11-12' : '2026-11-13';
    const next = await booking(1, end, '2026-11-15');
    expect((await getRoomAssignmentPreview(scope(next))).rooms.find(item => item.number === '101')?.selectable).toBe(true);
    await assignStayRoom(scope(next), 'ROOM-101');
  });
  it('counts the existing seed assignment for the same property and blocks terminal reservations', async () => {
    const context = { propertyId, reservationId: 'HB-2026-08390', stayId: 'STAY-2026-08390-A' };
    const preview = await getRoomAssignmentPreview(context);
    expect(preview.rooms.find(item => item.number === '203')).toMatchObject({ selectable: false, reason: 'Ya está asignada durante estas fechas.' });
    await expect(assignStayRoom(context, 'ROOM-203')).rejects.toMatchObject({ status: 409 });
    const cancelled = { propertyId, reservationId: 'HB-2026-08055', stayId: 'STAY-2026-08055-A' };
    expect((await getRoomAssignmentPreview(cancelled)).can_assign).toBe(false);
    await expect(assignStayRoom(cancelled, 'ROOM-301')).rejects.toMatchObject({ status: 409 });
  });
  it('fails closed on inconsistent mapper responses and does not use a provisional endpoint in real mode', async () => {
    const detail = await booking(), context = scope(detail), dto = await getRoomAssignmentPreview(context);
    expect(() => mapRoomAssignmentPreview({ ...dto, stay_id: 'WRONG' }, context)).toThrow(DomainMappingError);
    expect(() => mapRoomAssignmentPreview({ ...dto, property_id: 'OTHER' }, context)).toThrow(DomainMappingError);
    expect(() => mapRoomAssignmentPreview({ ...dto, rooms: [dto.rooms[0], dto.rooms[0]] }, context)).toThrow(DomainMappingError);
    expect(() => mapRoomAssignmentResult({ property_id: propertyId, reservation_id: detail.reservation_id, stay_id: context.stayId, room_id: 'ROOM-102', number: '102' }, context, 'ROOM-101')).toThrow(DomainMappingError);
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    expect(() => getRoomAssignmentPreview(context)).toThrow('ROOM_ASSIGNMENT_NOT_CONNECTED');
    expect(() => assignStayRoom(context, 'ROOM-101')).toThrow('ROOM_ASSIGNMENT_NOT_CONNECTED');
  });
});
