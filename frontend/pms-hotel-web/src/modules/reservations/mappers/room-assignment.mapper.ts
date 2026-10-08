import { DomainMappingError } from '@/lib/errors';
import { requiredText } from '@/lib/mapper';
import { calendarDay, stayNights } from '../model/staff-reservation-create';
import type { RoomAssignmentPreviewDto, RoomAssignmentResultDto } from '../dtos/room-assignment.dto';
import type { RoomAssignmentPreview, RoomAssignmentResult, RoomAssignmentScope } from '../model/room-assignment';

function validateScope(dto: { property_id: string; reservation_id: string; stay_id: string }, scope: RoomAssignmentScope) {
  if (dto.property_id !== scope.propertyId || dto.reservation_id !== scope.reservationId || dto.stay_id !== scope.stayId)
    throw new DomainMappingError('ROOM_ASSIGNMENT_SCOPE_MISMATCH');
}
function nullableText(value: string | null) { return value === null ? null : requiredText(value, 'INVALID_ASSIGNMENT_TEXT'); }
export function mapRoomAssignmentPreview(dto: RoomAssignmentPreviewDto, scope: RoomAssignmentScope): RoomAssignmentPreview {
  validateScope(dto, scope);
  if (!calendarDay(dto.arrival) || !stayNights(dto.arrival, dto.departure) || typeof dto.can_assign !== 'boolean' || !Array.isArray(dto.rooms))
    throw new DomainMappingError('INVALID_ASSIGNMENT_PREVIEW');
  const rooms = dto.rooms.map(room => {
    if (!['ACTIVE', 'OOO', 'OOS'].includes(room.operational_status) || typeof room.selectable !== 'boolean'
      || (room.selectable && (!dto.can_assign || room.operational_status !== 'ACTIVE')))
      throw new DomainMappingError('INVALID_ASSIGNMENT_CANDIDATE');
    return { id: requiredText(room.room_id, 'INVALID_ASSIGNMENT_ROOM'), number: requiredText(room.number, 'INVALID_ASSIGNMENT_NUMBER'),
      floor: nullableText(room.floor), status: room.operational_status, selectable: room.selectable, reason: nullableText(room.reason) };
  });
  if (new Set(rooms.map(room => room.id)).size !== rooms.length) throw new DomainMappingError('DUPLICATE_ASSIGNMENT_ROOM');
  const roomTypeId = nullableText(dto.room_type_id);
  if (dto.can_assign && roomTypeId === null) throw new DomainMappingError('MISSING_ASSIGNMENT_ROOM_TYPE');
  return { ...scope, arrival: dto.arrival, departure: dto.departure, roomTypeId,
    roomType: requiredText(dto.room_type, 'INVALID_ASSIGNMENT_ROOM_TYPE'), canAssign: dto.can_assign, reason: nullableText(dto.reason), rooms };
}
export function mapRoomAssignmentResult(dto: RoomAssignmentResultDto, scope: RoomAssignmentScope, roomId: string): RoomAssignmentResult {
  validateScope(dto, scope);
  if (dto.room_id !== roomId) throw new DomainMappingError('ROOM_ASSIGNMENT_RESULT_MISMATCH');
  return { ...scope, roomId: requiredText(dto.room_id, 'INVALID_ASSIGNMENT_ROOM'), roomNumber: requiredText(dto.number, 'INVALID_ASSIGNMENT_NUMBER') };
}
