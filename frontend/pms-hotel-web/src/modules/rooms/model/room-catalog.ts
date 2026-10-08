import type { RoomTypePresentation } from './room-type-presentation';
export interface RoomTypeCatalogEntry { id: string; propertyId: string; code: string; name: string; createdAt: Date; updatedAt: Date; presentation: RoomTypePresentation | null }
export interface RoomCatalogEntry { id: string; propertyId: string; roomTypeId: string; code: string; createdAt: Date; updatedAt: Date; floor: string | null; internalNotes: string | null }
export interface RoomCatalogSnapshot { types: RoomTypeCatalogEntry[]; rooms: RoomCatalogEntry[] }
export type RoomCatalogChange =
  | { kind: 'create-type'; code: string; name: string; presentation?: RoomTypePresentation }
  | { kind: 'edit-type'; id: string; code: string; name: string; presentation?: RoomTypePresentation }
  | ({ kind: 'create-room'; code: string; floor?: string | null; internalNotes?: string | null } & (
      { roomTypeId: string; newType?: never } | { roomTypeId?: never; newType: { code: string; name: string; presentation: RoomTypePresentation } }))
  | { kind: 'edit-room'; id: string; code: string; floor?: string | null; internalNotes?: string | null };
export function catalogFieldError(value: string, maximum: number): string | undefined {
  return !value.trim() ? 'Este campo es obligatorio.' : value.trim().length > maximum ? `Usa como máximo ${maximum} caracteres.` : undefined;
}
