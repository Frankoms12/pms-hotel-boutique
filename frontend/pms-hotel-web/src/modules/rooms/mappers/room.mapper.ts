import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { requiredText } from "@/lib/mapper";

import type { RoomDto } from "../dtos/room.dto";
import { isRoomStatus, type Room } from "../model/room";

export function mapRoom(dto: RoomDto): Room {
  const status = dto.status.trim();

  if (!isRoomStatus(status)) {
    throw new DomainMappingError("INVALID_ROOM_STATUS");
  }

  return {
    id: requiredText(dto.room_id, "INVALID_ROOM_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_ROOM_PROPERTY_ID"),
    number: requiredText(dto.number, "INVALID_ROOM_NUMBER"),
    floor: dto.floor === null ? null : requiredText(dto.floor, "INVALID_ROOM_FLOOR"),
    status,
    roomTypeLabel: requiredText(dto.room_type_label, "INVALID_ROOM_TYPE_LABEL"),
  };
}
