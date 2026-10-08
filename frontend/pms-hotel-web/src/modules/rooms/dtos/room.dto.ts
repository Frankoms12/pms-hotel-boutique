/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * Room = physical unit; RoomType is the sellable product.
 */
export interface RoomDto {
  room_id: string;
  property_id: string;
  number: string;
  floor: string | null;
  /** One of ACTIVE | OOO | OOS. */
  status: string;
  room_type_label: string;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface RoomListDto {
  rooms: RoomDto[];
}
