import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { mapRoomOccupancy } from './room-occupancy.mapper';
import { hotelOccupancyDay, isOccupancyDay } from '../model/room-occupancy';
import type { RoomOccupancySnapshotDto } from '../dtos/room-occupancy.dto';
const date = '2026-08-28', propertyId = 'GT-HB-01';
const stay = { reservation_id: 'R-1', stay_id: 'S-1', guest_name: 'Ana', room_type: 'Deluxe', arrival: date, departure: '2026-08-31', travel_state: 'RESERVED' };
function fixture(): RoomOccupancySnapshotDto { return { property_id: propertyId, date, rooms: [
  { room_id: 'A', stays: [] }, { room_id: 'B', stays: [stay] },
  { room_id: 'C', stays: [{ ...stay, stay_id: 'S-2', travel_state: 'IN_HOUSE' }] },
  { room_id: 'D', stays: [{ ...stay, stay_id: 'S-3' }, { ...stay, stay_id: 'S-4' }] },
], unassigned: [{ ...stay, stay_id: 'S-5' }] }; }
describe('Dated room occupancy mapper', () => {
  it('distinguishes free, reserved, in-house and conflicting assignments without equating them to operational state', () => {
    const mapped = mapRoomOccupancy(fixture(), propertyId, date);
    expect(mapped.rooms.map(room => room.state)).toEqual(['FREE', 'RESERVED', 'OCCUPIED', 'CONFLICT']);
    expect(mapped.unassigned).toHaveLength(1);
    expect(mapped.rooms[2].stays[0].state).toBe('IN_HOUSE');
  });
  it.each(['scope', 'date', 'duplicateRoom', 'duplicateStay', 'cancelled', 'departure', 'arrival', 'invalidDate', 'missingGuest'])('rejects inconsistent %s', problem => {
    const dto = fixture();
    if (problem === 'scope') dto.property_id = 'OTHER';
    if (problem === 'date') dto.date = '2026-08-29';
    if (problem === 'duplicateRoom') dto.rooms.push(dto.rooms[0]);
    if (problem === 'duplicateStay') dto.unassigned.push(stay);
    if (problem === 'cancelled') dto.rooms[1].stays[0] = { ...stay, travel_state: 'CANCELLED' };
    if (problem === 'departure') dto.rooms[1].stays[0] = { ...stay, departure: date };
    if (problem === 'arrival') dto.rooms[1].stays[0] = { ...stay, arrival: '2026-08-29' };
    if (problem === 'invalidDate') dto.rooms[1].stays[0] = { ...stay, departure: '2026-02-31' };
    if (problem === 'missingGuest') dto.rooms[1].stays[0] = { ...stay, guest_name: '' };
    expect(() => mapRoomOccupancy(dto, propertyId, date)).toThrow(DomainMappingError);
  });
  it('validates calendar days and resolves today only with an explicit property timezone', () => {
    expect(isOccupancyDay('2026-02-31')).toBe(false);
    expect(isOccupancyDay('2028-02-29')).toBe(true);
    expect(hotelOccupancyDay()).toBe('');
    expect(hotelOccupancyDay('invalid')).toBe('');
    expect(isOccupancyDay(hotelOccupancyDay('America/Guatemala'))).toBe(true);
  });
});
