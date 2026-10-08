import { DomainMappingError } from '@/lib/errors';
import { list, object } from '@/lib/validation';

/** Frontend editorial fields aligned with Public 01; not a confirmed Backend schema. */
export interface RoomTypePresentation {
  description: string | null; maxOccupancy: number | null; bedDescription: string | null;
  areaSquareMeters: number | null; viewDescription: string | null;
  category: 'DELUXE' | 'SUITE' | 'SUPERIOR' | null; amenities: string[]; images: string[];
}
export const ROOM_PHOTO_LIMIT = 5;
export const ROOM_PHOTO_BYTES = 2 * 1024 * 1024;
export function isRoomPhotoSource(source: string): boolean {
  if (typeof source !== 'string' || source.length > Math.ceil(ROOM_PHOTO_BYTES / 3) * 4 + 100) return false;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(source)) return true;
  if (/^\/images\/[\w./-]+\.(webp|png|jpe?g)$/i.test(source) && !source.includes('..')) return true;
  try { const url = new URL(source); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function catalogOptionalText(value: unknown, maximum: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maximum) throw new DomainMappingError('INVALID_CATALOG_TEXT');
  return value.trim() || null;
}
export function readRoomTypePresentation(value: unknown): RoomTypePresentation | null {
  if (value === undefined || value === null) return null;
  const item = object(value);
  const numeric = (value: unknown, integer = false): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER
      || (integer && !Number.isSafeInteger(value))) throw new DomainMappingError('INVALID_ROOM_TYPE_DIMENSION');
    return value;
  };
  const category = item.category ?? null;
  if (category !== null && (typeof category !== 'string' || !['DELUXE', 'SUITE', 'SUPERIOR'].includes(category))) throw new DomainMappingError('INVALID_ROOM_TYPE_CATEGORY');
  const amenities = list(item.amenities).map(value => {
    const amenity = catalogOptionalText(value, 80);
    if (!amenity) throw new DomainMappingError('INVALID_ROOM_TYPE_AMENITY');
    return amenity;
  });
  const images = list(item.images).map(value => {
    if (typeof value !== 'string' || !isRoomPhotoSource(value.trim())) throw new DomainMappingError('INVALID_ROOM_TYPE_PHOTO');
    return value.trim();
  });
  if (amenities.length > 20 || new Set(amenities).size !== amenities.length || images.length > ROOM_PHOTO_LIMIT
    || new Set(images).size !== images.length) throw new DomainMappingError('INVALID_ROOM_TYPE_COLLECTION');
  return { description: catalogOptionalText(item.description, 2000), maxOccupancy: numeric(item.maxOccupancy, true),
    bedDescription: catalogOptionalText(item.bedDescription, 160), areaSquareMeters: numeric(item.areaSquareMeters),
    viewDescription: catalogOptionalText(item.viewDescription, 160), category: category as RoomTypePresentation['category'], amenities, images };
}
export function emptyRoomTypePresentation(): RoomTypePresentation {
  return { description: null, maxOccupancy: null, bedDescription: null, areaSquareMeters: null, viewDescription: null, category: null, amenities: [], images: [] };
}
