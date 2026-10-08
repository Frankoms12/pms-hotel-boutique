import { emptyRoomTypePresentation, type RoomTypePresentation } from './room-type-presentation';
export interface RoomPresentationDraft {
  description: string; capacity: string; beds: string; area: string; view: string;
  category: RoomTypePresentation['category']; amenities: string[]; images: string[];
}
export type RoomPresentationErrors = Partial<Record<keyof RoomPresentationDraft, string>>;
export function roomPresentationDraft(profile?: RoomTypePresentation | null): RoomPresentationDraft {
  const value = profile ?? emptyRoomTypePresentation();
  return { description: value.description ?? '', capacity: value.maxOccupancy === null ? '' : String(value.maxOccupancy),
    beds: value.bedDescription ?? '', area: value.areaSquareMeters === null ? '' : String(value.areaSquareMeters), view: value.viewDescription ?? '',
    category: value.category, amenities: [...value.amenities], images: [...value.images] };
}
export function roomPresentationDraftErrors(draft: RoomPresentationDraft): RoomPresentationErrors {
  const errors: RoomPresentationErrors = {};
  if (draft.capacity && (!Number.isSafeInteger(Number(draft.capacity)) || Number(draft.capacity) < 1)) errors.capacity = 'Indica una capacidad entera de al menos 1 huésped.';
  if (draft.area && (!Number.isFinite(Number(draft.area)) || Number(draft.area) <= 0 || Number(draft.area) > Number.MAX_SAFE_INTEGER)) errors.area = 'El tamaño debe ser un número mayor que 0.';
  if (draft.description.trim().length > 2000) errors.description = 'Usa como máximo 2000 caracteres.';
  if (draft.beds.trim().length > 160) errors.beds = 'Usa como máximo 160 caracteres.';
  if (draft.view.trim().length > 160) errors.view = 'Usa como máximo 160 caracteres.';
  if (draft.amenities.filter(item => item.trim()).length > 20 || draft.amenities.some(item => item.trim().length > 80)) errors.amenities = 'Agrega hasta 20 amenidades, de máximo 80 caracteres cada una.';
  return errors;
}
/** Preview tolerates incomplete input; the editor must validate before submitting. */
export function roomPresentationFromDraft(draft: RoomPresentationDraft): RoomTypePresentation {
  const errors = roomPresentationDraftErrors(draft);
  return { description: draft.description.trim() || null, maxOccupancy: !errors.capacity && draft.capacity ? Number(draft.capacity) : null,
    bedDescription: draft.beds.trim() || null, areaSquareMeters: !errors.area && draft.area ? Number(draft.area) : null,
    viewDescription: draft.view.trim() || null, category: draft.category,
    amenities: [...new Set(draft.amenities.map(item => item.trim()).filter(Boolean))], images: [...draft.images] };
}
