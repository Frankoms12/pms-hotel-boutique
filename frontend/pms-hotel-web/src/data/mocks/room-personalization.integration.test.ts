import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { changeRoomCatalog } from '@/modules/rooms/service/room-catalog.service';
import { emptyRoomTypePresentation } from '@/modules/rooms/model/room-type-presentation';
import { roomCatalogFixture, operationalRoomFixture, resetStaffRoomCatalog } from './staff-room-catalog';
import { mockServer } from './server';
import { reservationHandlers } from './reservation-handlers';
import { readStaffReservationQuote, createStaffReservation } from '@/modules/reservations/service/staff-reservation-create.service';
import { mapStaffReservationQuote } from '@/modules/reservations/mappers/staff-reservation-create.mapper';
import { resetStaffCreatedReservations } from './staff-reservation-create';
import { httpRequest } from '@/lib/http';
const propertyId = 'GT-HB-01';
const profile = { ...emptyRoomTypePresentation(), description: 'Para una estancia tranquila.', maxOccupancy: 4, bedDescription: 'Dos camas dobles', areaSquareMeters: 42, amenities: ['Wi-Fi'], images: ['/images/rooms/demo/double-superior.webp'] };
const command = { kind: 'create-room' as const, code: '501', floor: '5', internalNotes: 'Nota solo para Staff', newType: { code: 'FAM', name: 'Familiar', presentation: profile } };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetStaffRoomCatalog(); resetStaffCreatedReservations(); mockServer.use(...reservationHandlers); });
afterEach(() => { vi.unstubAllEnvs(); resetStaffRoomCatalog(); resetStaffCreatedReservations(); });
describe('Local room personalization scenario', () => {
  it('creates one physical room and a separate type, with no rate or occupancy invented', async () => {
    const result = await changeRoomCatalog(propertyId, command);
    const room = result.rooms.find(room => room.code === '501')!, type = result.types.find(type => type.id === room.roomTypeId)!;
    expect(result.rooms).toHaveLength(11); expect(result.types).toHaveLength(5);
    expect(type).toMatchObject({ code: 'FAM', presentation: profile });
    expect(type).not.toHaveProperty('internalNotes');
    expect(operationalRoomFixture(propertyId).find(item => item.room_id === room.id)).toMatchObject({ floor: '5', status: 'ACTIVE' });
    const quote = await readStaffReservationQuote(propertyId, { checkIn: '2026-11-10', checkOut: '2026-11-12', rooms: 1, adults: 2, children: 0 });
    expect(quote.options.some(option => option.room_type_id === type.id)).toBe(false); // A new type has no RatePlan.
  });
  it('rejects duplicate room/type codes and invalid metadata without leaving an orphan type', async () => {
    const before = structuredClone(roomCatalogFixture(propertyId));
    await expect(changeRoomCatalog(propertyId, { ...command, code: '101' })).rejects.toMatchObject({ status: 409 });
    await expect(changeRoomCatalog(propertyId, { ...command, newType: { ...command.newType, code: 'std' } })).rejects.toMatchObject({ status: 409 });
    await expect(changeRoomCatalog(propertyId, { ...command, newType: { ...command.newType, presentation: { ...profile, maxOccupancy: 0 } } })).rejects.toMatchObject({ status: 400 });
    await expect(httpRequest({ path: new URL(`/__mock/staff-room-catalog/${propertyId}`, window.location.origin).href, method: 'POST', json: { ...command, roomTypeId: 'RT-DLX' } })).rejects.toMatchObject({ status: 400 });
    expect(roomCatalogFixture(propertyId)).toEqual(before);
    const outcomes = await Promise.allSettled([changeRoomCatalog(propertyId, command), changeRoomCatalog(propertyId, command)]);
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(roomCatalogFixture(propertyId).rooms).toHaveLength(11);
    expect(roomCatalogFixture(propertyId).types).toHaveLength(5);
  });
  it('edits physical floor/notes while keeping the type/id and another property unchanged', async () => {
    const before = structuredClone(roomCatalogFixture(propertyId));
    await changeRoomCatalog(propertyId, { kind: 'edit-room', id: 'ROOM-201', code: '205', floor: 'Planta baja', internalNotes: 'Esquina tranquila' });
    expect(roomCatalogFixture(propertyId).types).toEqual(before.types);
    expect(roomCatalogFixture(propertyId).rooms.find(room => room.id === 'ROOM-201')).toMatchObject({ roomTypeId: 'RT-DLX', floor: 'Planta baja', internalNotes: 'Esquina tranquila' });
    expect(operationalRoomFixture(propertyId).find(room => room.room_id === 'ROOM-201')?.floor).toBe('Planta baja');
    await expect(changeRoomCatalog('GT-HB-03', { kind: 'edit-room', id: 'ROOM-201', code: '999' })).rejects.toMatchObject({ status: 404 });
    expect(roomCatalogFixture('GT-HB-03').rooms).toHaveLength(0);
  });
  it('revalidates a changed capacity at booking admission and preserves physical inventory and prices', async () => {
    const search = { checkIn: '2026-11-10', checkOut: '2026-11-12', rooms: 1, adults: 2, children: 0 };
    const quote = mapStaffReservationQuote(await readStaffReservationQuote(propertyId, search), propertyId, search);
    const option = quote.options.find(option => option.roomTypeId === 'RT-DLX')!;
    const type = roomCatalogFixture(propertyId).types.find(type => type.id === 'RT-DLX')!;
    await changeRoomCatalog(propertyId, { kind: 'edit-type', id: type.id, code: type.code, name: type.name, presentation: { ...profile, maxOccupancy: 1 } });
    await expect(createStaffReservation(quote, option, { fullName: 'Ana Pérez', email: 'ana@example.test', phone: '+502 5555 5555', notes: '' }, 'changed-capacity')).rejects.toMatchObject({ status: 409 });
    const updated = mapStaffReservationQuote(await readStaffReservationQuote(propertyId, search), propertyId, search).options.find(option => option.roomTypeId === 'RT-DLX')!;
    expect(updated).toMatchObject({ capacity: 1, nightlyMinor: option.nightlyMinor, totalMinor: option.totalMinor, availableRooms: option.availableRooms });
    expect(roomCatalogFixture(propertyId).rooms).toHaveLength(10);
  });
});
