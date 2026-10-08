import { describe, expect, it } from 'vitest';
import { mapRoomCatalog } from './room-catalog.mapper';

const stamp = '2026-10-06T12:00:00Z';
const type = { id: 'type-1', code: 'DLX', name: 'Deluxe', propertyId: 'p1', createdAt: stamp, updatedAt: stamp };
const room = { id: 'room-1', code: '201', roomTypeId: 'type-1', propertyId: 'p1', createdAt: stamp, updatedAt: stamp };
describe('mapRoomCatalog', () => {
  it('maps dates and keeps types separate from physical inventory', () => {
    const catalog = mapRoomCatalog({ types: [type], rooms: [] }, 'p1');
    expect(catalog.types[0].createdAt).toBeInstanceOf(Date);
    expect(catalog.rooms).toHaveLength(0);
    expect(catalog.types[0].presentation).toBeNull();
  });
  it('maps local editorial and physical metadata separately, rejecting invalid optional data', () => {
    const presentation = { description: 'Estancia tranquila', maxOccupancy: 2, bedDescription: 'King', areaSquareMeters: 32, viewDescription: 'Jardín', category: 'DELUXE', amenities: ['Wi-Fi'], images: [] };
    const mapped = mapRoomCatalog({ types: [{ ...type, presentation }], rooms: [{ ...room, floor: ' 2 ', internalNotes: ' Uso interno ' }] }, 'p1');
    expect(mapped.rooms[0]).toMatchObject({ floor: '2', internalNotes: 'Uso interno' });
    expect(mapped.types[0].presentation).toMatchObject({ maxOccupancy: 2, areaSquareMeters: 32 });
    expect(() => mapRoomCatalog({ types: [{ ...type, presentation: { ...presentation, maxOccupancy: 0 } }], rooms: [] }, 'p1')).toThrow();
  });
  it('rejects rooms from another property', () => {
    expect(() => mapRoomCatalog({ types: [type], rooms: [{ ...room, propertyId: 'p2' }] }, 'p1')).toThrow('CATALOG_PROPERTY_MISMATCH');
  });
  it('rejects missing room types and duplicate codes', () => {
    expect(() => mapRoomCatalog({ types: [], rooms: [room] }, 'p1')).toThrow('CATALOG_ROOM_TYPE_MISSING');
    expect(() => mapRoomCatalog({ types: [type, { ...type, id: 'type-2', code: 'dlx' }], rooms: [] }, 'p1')).toThrow('DUPLICATE_CATALOG_ENTRY');
  });
  it('rejects invalid required fields and timestamp order', () => {
    expect(() => mapRoomCatalog({ types: [{ ...type, name: ' ' }], rooms: [] }, 'p1')).toThrow();
    expect(() => mapRoomCatalog({ types: [{ ...type, updatedAt: '2025-01-01T00:00:00Z' }], rooms: [] }, 'p1')).toThrow('CATALOG_TIMESTAMP_ORDER');
  });
});
