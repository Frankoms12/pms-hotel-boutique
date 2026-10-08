import { getPublicEnvironment } from '@/lib/env';
import { httpRequest } from '@/lib/http';
import type { RoomOccupancySnapshotDto } from '../dtos/room-occupancy.dto';

export function readRoomOccupancy(propertyId: string, date: string, signal?: AbortSignal): Promise<RoomOccupancySnapshotDto> {
  if (!getPublicEnvironment().useMockApi) throw new Error('ROOM_OCCUPANCY_NOT_CONNECTED');
  const url = new URL(`/__mock/staff-room-occupancy/${encodeURIComponent(propertyId)}`, window.location.origin);
  url.searchParams.set('date', date);
  return httpRequest({ path: url.href, signal, withAuth: false });
}
