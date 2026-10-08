import { getPublicEnvironment } from '@/lib/env';
import { httpRequest } from '@/lib/http';
import type { RoomCatalogSnapshotDto } from '../dtos/room-catalog.dto';
import type { RoomCatalogChange } from '../model/room-catalog';

function url(propertyId: string) {
  if (!getPublicEnvironment().useMockApi) throw new Error('ROOM_CATALOG_TRANSPORT_NOT_CONNECTED');
  return new URL(`/__mock/staff-room-catalog/${encodeURIComponent(propertyId)}`, window.location.origin).href;
}
export function readRoomCatalog(propertyId: string, signal?: AbortSignal): Promise<RoomCatalogSnapshotDto> {
  return httpRequest({ path: url(propertyId), signal });
}
export function changeRoomCatalog(propertyId: string, change: RoomCatalogChange): Promise<RoomCatalogSnapshotDto> {
  return httpRequest({ path: url(propertyId), method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) });
}
