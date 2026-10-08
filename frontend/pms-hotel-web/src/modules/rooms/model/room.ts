export const ROOM_STATUSES = ["ACTIVE", "OOO", "OOS"] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export interface Room {
  id: string;
  propertyId: string;
  number: string;
  floor: string | null;
  status: RoomStatus;
  roomTypeLabel: string;
}

export function isRoomStatus(value: string): value is RoomStatus {
  return (ROOM_STATUSES as readonly string[]).includes(value);
}
