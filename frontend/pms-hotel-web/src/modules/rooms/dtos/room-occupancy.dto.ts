/** PROVISIONAL API CONTRACT: local Staff scenario; no confirmed Backend occupancy endpoint. */
export interface RoomOccupancyStayDto {
  reservation_id: string; stay_id: string; guest_name: string; room_type: string;
  arrival: string; departure: string; travel_state: string;
}
export interface RoomOccupancySnapshotDto {
  property_id: string; date: string;
  rooms: { room_id: string; stays: RoomOccupancyStayDto[] }[];
  unassigned: RoomOccupancyStayDto[];
}
