import { DomainMappingError } from '@/lib/errors';
import { date, list, object, text } from '@/lib/validation';
import type { RoomCatalogSnapshot } from '../model/room-catalog';
import { catalogOptionalText, readRoomTypePresentation } from '../model/room-type-presentation';

export function mapRoomCatalog(raw: unknown, propertyId: string): RoomCatalogSnapshot {
  const dto = object(raw);
  function common(value: unknown) {
    const item = object(value);
    if (item.propertyId !== propertyId) throw new DomainMappingError('CATALOG_PROPERTY_MISMATCH');
    const createdAt = date(item.createdAt), updatedAt = date(item.updatedAt);
    if (updatedAt < createdAt) throw new DomainMappingError('CATALOG_TIMESTAMP_ORDER');
    return { id: text(item.id), propertyId, code: text(item.code), createdAt, updatedAt };
  }
  const types = list(dto.types).map(value => ({ ...common(value), name: text(object(value).name), presentation: readRoomTypePresentation(object(value).presentation) }));
  const rooms = list(dto.rooms).map(value => ({ ...common(value), roomTypeId: text(object(value).roomTypeId),
    floor: catalogOptionalText(object(value).floor, 64), internalNotes: catalogOptionalText(object(value).internalNotes, 500) }));
  for (const entries of [types, rooms]) {
    if (new Set(entries.map(item => item.id)).size !== entries.length || new Set(entries.map(item => item.code.toLocaleLowerCase('es'))).size !== entries.length)
      throw new DomainMappingError('DUPLICATE_CATALOG_ENTRY');
  }
  if (rooms.some(room => !types.some(type => type.id === room.roomTypeId))) throw new DomainMappingError('CATALOG_ROOM_TYPE_MISSING');
  return { types, rooms };
}
