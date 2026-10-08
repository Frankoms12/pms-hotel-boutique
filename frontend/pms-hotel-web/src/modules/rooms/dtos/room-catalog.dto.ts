/** Catalog projection matches the confirmed RoomView/RoomTypeView fields.
 * The combined envelope and local transport are frontend MSW only, not a Backend endpoint. */
/** PROVISIONAL editorial payload; these additional fields are local, not Backend RoomTypeView. */
export interface RoomTypePresentationDto {
  description: string | null; maxOccupancy: number | null; bedDescription: string | null;
  areaSquareMeters: number | null; viewDescription: string | null;
  category: 'DELUXE' | 'SUITE' | 'SUPERIOR' | null; amenities: string[]; images: string[];
}
export interface RoomTypeCatalogDto { id: string; propertyId: string; code: string; name: string; createdAt: string; updatedAt: string; presentation?: RoomTypePresentationDto | null }
/** floor/internalNotes are PROVISIONAL local extensions, not confirmed RoomView fields. */
export interface RoomCatalogDto { id: string; propertyId: string; roomTypeId: string; code: string; createdAt: string; updatedAt: string; floor?: string | null; internalNotes?: string | null }
export interface RoomCatalogSnapshotDto { types: RoomTypeCatalogDto[]; rooms: RoomCatalogDto[] }
