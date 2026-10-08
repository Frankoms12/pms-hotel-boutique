import { DomainMappingError } from '@/lib/errors';
import { requiredText } from '@/lib/mapper';
import type { RoomOccupancySnapshotDto, RoomOccupancyStayDto } from '../dtos/room-occupancy.dto';
import { isOccupancyDay, type RoomOccupancySnapshot, type RoomOccupancyStay } from '../model/room-occupancy';

export function mapRoomOccupancy(dto: RoomOccupancySnapshotDto, propertyId: string, date: string): RoomOccupancySnapshot {
  const invalid = () => { throw new DomainMappingError('INVALID_ROOM_OCCUPANCY'); };
  if (dto.property_id !== propertyId || dto.date !== date || !isOccupancyDay(date)
    || !Array.isArray(dto.rooms) || !Array.isArray(dto.unassigned)) invalid();
  const roomIds = new Set<string>(), stayIds = new Set<string>();
  function stay(item: RoomOccupancyStayDto): RoomOccupancyStay {
    if (!isOccupancyDay(item.arrival) || !isOccupancyDay(item.departure)
      || item.arrival > date || item.departure <= date
      || (item.travel_state !== 'RESERVED' && item.travel_state !== 'IN_HOUSE')) invalid();
    const id = requiredText(item.stay_id, 'INVALID_OCCUPANCY_STAY');
    if (stayIds.has(id)) invalid();
    stayIds.add(id);
    return { stayId: id, reservationId: requiredText(item.reservation_id, 'INVALID_OCCUPANCY_RESERVATION'),
      guestName: requiredText(item.guest_name, 'INVALID_OCCUPANCY_GUEST'), roomType: requiredText(item.room_type, 'INVALID_OCCUPANCY_TYPE'),
      arrival: item.arrival, departure: item.departure, state: item.travel_state as RoomOccupancyStay['state'] };
  }
  return { propertyId, date, rooms: dto.rooms.map(item => {
    const roomId = requiredText(item.room_id, 'INVALID_OCCUPANCY_ROOM');
    if (roomIds.has(roomId) || !Array.isArray(item.stays)) invalid();
    roomIds.add(roomId);
    const stays = item.stays.map(stay);
    return { roomId, stays, state: stays.length > 1 ? 'CONFLICT' : !stays.length ? 'FREE'
      : stays[0].state === 'IN_HOUSE' ? 'OCCUPIED' : 'RESERVED' };
  }), unassigned: dto.unassigned.map(stay) };
}
