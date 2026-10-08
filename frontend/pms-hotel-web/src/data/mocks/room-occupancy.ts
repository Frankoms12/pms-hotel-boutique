import { http, HttpResponse } from 'msw';
import type { ReservationDetailDto } from '@/modules/reservations/dtos/reservation-detail.dto';
import type { RoomOccupancySnapshotDto, RoomOccupancyStayDto } from '@/modules/rooms/dtos/room-occupancy.dto';
import { isOccupancyDay } from '@/modules/rooms/model/room-occupancy';
import { roomCatalogFixture } from './staff-room-catalog';
import { projectAssignedDetail } from './room-assignment';
import { staffCreatedDetails } from './staff-reservation-create';

export function projectRoomOccupancy(propertyId: string, date: string, details: ReservationDetailDto[]): RoomOccupancySnapshotDto {
  const catalog = roomCatalogFixture(propertyId);
  const rooms = catalog.rooms.map(room => ({ room_id: room.id, stays: [] as RoomOccupancyStayDto[] }));
  const unassigned: RoomOccupancyStayDto[] = [];
  for (const detail of details) {
    if (detail.property_id !== propertyId || !['PENDING', 'CONFIRMED', 'NO_SHOW_PENDING'].includes(detail.status)) continue;
    for (const stay of projectAssignedDetail(detail).stays) {
      if (!['RESERVED', 'IN_HOUSE'].includes(stay.travel_state) || stay.check_in > date || stay.check_out <= date) continue;
      const item: RoomOccupancyStayDto = { reservation_id: detail.reservation_id, stay_id: stay.stay_id,
        guest_name: detail.guest.primary_name, room_type: stay.room_type, arrival: stay.check_in,
        departure: stay.check_out, travel_state: stay.travel_state };
      // Legacy fixture labels may identify a physical code; only within this property's catalog.
      const physical = stay.room_id === null ? undefined : catalog.rooms.find(room => room.id === stay.room_id || room.code === stay.room_label);
      const entry = rooms.find(room => room.room_id === physical?.id);
      if (entry) entry.stays.push(item); else unassigned.push(item);
    }
  }
  return { property_id: propertyId, date, rooms, unassigned };
}
export function roomOccupancyHandlers(seeds: () => ReservationDetailDto[]) {
  return [http.get('*/__mock/staff-room-occupancy/:propertyId', ({ request, params }) => {
    const date = new URL(request.url).searchParams.get('date') ?? '';
    if (!isOccupancyDay(date)) return HttpResponse.json({ code: 'INVALID_DATE' }, { status: 400 });
    return HttpResponse.json(projectRoomOccupancy(String(params.propertyId), date, [...seeds(), ...staffCreatedDetails()]));
  })];
}
