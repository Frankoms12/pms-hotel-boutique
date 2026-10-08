import { getPublicEnvironment } from '@/lib/env';
import { httpRequest } from '@/lib/http';
import type { RoomAssignmentScope } from '../model/room-assignment';
import type { RoomAssignmentPreviewDto, RoomAssignmentResultDto } from '../dtos/room-assignment.dto';

function resource(scope: RoomAssignmentScope) {
  if (!getPublicEnvironment().useMockApi) throw new Error('ROOM_ASSIGNMENT_NOT_CONNECTED');
  const parts = [scope.propertyId, scope.reservationId, scope.stayId].map(encodeURIComponent);
  return new URL(`/__mock/staff-reservations/${parts[0]}/${parts[1]}/stays/${parts[2]}/room-assignment`, window.location.origin).href;
}
export function getRoomAssignmentPreview(scope: RoomAssignmentScope, signal?: AbortSignal): Promise<RoomAssignmentPreviewDto> {
  return httpRequest({ path: resource(scope), signal, withAuth: false });
}
export function assignStayRoom(scope: RoomAssignmentScope, roomId: string, signal?: AbortSignal): Promise<RoomAssignmentResultDto> {
  return httpRequest({ path: resource(scope), method: 'PUT', withAuth: false, signal,
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room_id: roomId }) });
}
