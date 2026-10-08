import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { emptyRoomTypePresentation, isRoomPhotoSource, readRoomTypePresentation } from './room-type-presentation';
import { roomPresentationDraft, roomPresentationDraftErrors, roomPresentationFromDraft } from './room-type-presentation-draft';
describe('RoomType editorial presentation', () => {
  it('accepts absent legacy metadata, normalizes valid values and keeps absent dimensions unknown', () => {
    expect(readRoomTypePresentation(undefined)).toBeNull();
    const profile = readRoomTypePresentation({ ...emptyRoomTypePresentation(), description: ' Confort ', maxOccupancy: 4, areaSquareMeters: 38.5, amenities: [' Wi-Fi '], images: ['/images/rooms/demo/deluxe-king.webp'] });
    expect(profile).toMatchObject({ description: 'Confort', maxOccupancy: 4, areaSquareMeters: 38.5, amenities: ['Wi-Fi'], bedDescription: null });
  });
  it.each([{ maxOccupancy: 0 }, { maxOccupancy: 1.5 }, { areaSquareMeters: -1 }, { areaSquareMeters: Infinity }, { category: 'OTHER' }, { images: ['javascript:alert(1)'] }, { images: ['data:image/svg+xml;base64,AAAA'] }, { images: Array(6).fill('/images/rooms/demo/deluxe-king.webp') }, { amenities: ['Wi-Fi', 'Wi-Fi'] }, { description: 'a'.repeat(2001) }])('rejects invalid profile %o', patch => {
    expect(() => readRoomTypePresentation({ ...emptyRoomTypePresentation(), ...patch })).toThrow(DomainMappingError);
  });
  it('restricts photos to raster uploads, local photo assets and HTTPS without embedded credentials', () => {
    expect(isRoomPhotoSource('data:image/png;base64,YWJj')).toBe(true);
    expect(isRoomPhotoSource('https://images.example.test/hotel.jpg')).toBe(true);
    for (const source of ['http://images.example.test/a.jpg', 'https://user:password@example.test/a.jpg', '/images/../private.jpg', 'blob:abc', 'file:///secret.jpg']) expect(isRoomPhotoSource(source)).toBe(false);
  });
  it('validates a form draft before conversion and does not silently save invalid dimensions', () => {
    const draft = { ...roomPresentationDraft(), capacity: '2.5', area: '-1' };
    expect(roomPresentationDraftErrors(draft)).toHaveProperty('capacity');
    expect(roomPresentationDraftErrors(draft)).toHaveProperty('area');
    const valid = { ...draft, capacity: '3', area: '40', amenities: ['Wi-Fi', ' Sauna ', '', 'Wi-Fi'] };
    expect(roomPresentationDraftErrors(valid)).toEqual({});
    expect(roomPresentationFromDraft(valid)).toMatchObject({ maxOccupancy: 3, areaSquareMeters: 40, amenities: ['Wi-Fi', 'Sauna'] });
  });
});
