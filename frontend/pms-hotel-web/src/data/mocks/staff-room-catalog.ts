import { delay, http, HttpResponse } from 'msw';
import type { RoomDto } from '@/modules/rooms/dtos/room.dto';
import type { RoomCatalogSnapshotDto } from '@/modules/rooms/dtos/room-catalog.dto';
import type { RoomCatalogChange } from '@/modules/rooms/model/room-catalog';
import { catalogOptionalText, readRoomTypePresentation } from '@/modules/rooms/model/room-type-presentation';
import { object, text } from '@/lib/validation';

const stamp = '2026-10-06T12:00:00.000Z';
const seededCodes = ['101','102','103','201','202','203','204','301','302','401'];
const snapshots = new Map<string, RoomCatalogSnapshotDto>();
const operational = new Map<string, RoomDto[]>();
export function resetStaffRoomCatalog() { snapshots.clear(); operational.clear(); }
function initial(propertyId: string): RoomCatalogSnapshotDto {
  const presentation = (index: number) => ({
    description: ['Una habitación acogedora para compartir tu estadía.', 'Un espacio luminoso y tranquilo, con detalles cálidos y vistas al jardín.', 'Más espacio para descansar y disfrutar de tu estancia.', 'Una estancia amplia con una cómoda zona de descanso.'][index],
    maxOccupancy: index < 2 ? 2 : 4, bedDescription: index === 0 ? 'Dos camas dobles' : index === 1 ? 'King' : 'King y sofá cama',
    areaSquareMeters: index === 0 ? 28 : index === 1 ? 32 : null,
    viewDescription: index === 1 ? 'Vista al jardín' : null,
    category: index === 1 ? 'DELUXE' as const : index > 1 ? 'SUITE' as const : null,
    amenities: ['Wi-Fi de alta velocidad', 'Aire acondicionado', 'Smart TV', 'Caja de seguridad', 'Servicio de limpieza'],
    images: [1, 2, 3].map(n => `/images/rooms/demo/${['double-superior', 'deluxe-king', 'junior-suite', 'terrace-suite'][index]}${n === 1 ? '' : `-${n}`}.webp`),
  });
  const types = [ ['RT-STD','STD','Estandar Doble'], ['RT-DLX','DLX-KING','Deluxe King'], ['RT-SUITE','SUITE','Suite Jardin'], ['RT-MASTER','MASTER','Master Suite Presidencial'] ]
    .map(([id,code,name], index) => ({ id, code, name, propertyId, createdAt: stamp, updatedAt: stamp, presentation: presentation(index) }));
  const rooms = seededCodes.map(code => ({ id: `ROOM-${code}`, propertyId, code,
    roomTypeId: types[Number(code[0])-1].id, floor: code[0], internalNotes: null, createdAt: stamp, updatedAt: stamp }));
  return propertyId === 'GT-HB-01' ? { types, rooms } : { types: [], rooms: [] };
}
export function roomCatalogFixture(propertyId: string): RoomCatalogSnapshotDto {
  if (!snapshots.has(propertyId)) snapshots.set(propertyId, initial(propertyId));
  return snapshots.get(propertyId)!;
}
/** Local operational projection. Its status/floor are not fields of Backend RoomView. */
export function operationalRoomFixture(propertyId: string): RoomDto[] {
  const catalog = roomCatalogFixture(propertyId);
  const previous = operational.get(propertyId) ?? [];
  const rooms = catalog.rooms.map(room => {
    const old = previous.find(item => item.room_id === room.id);
    const seed = seededCodes.find(code => room.id === `ROOM-${code}`);
    return { room_id: room.id, property_id: propertyId, number: room.code, room_type_label: catalog.types.find(type => type.id === room.roomTypeId)!.name,
      floor: room.floor !== undefined ? room.floor : old ? old.floor : seed?.[0] ?? null,
      status: old?.status ?? (seed === '103' ? 'OOO' : seed === '204' ? 'OOS' : 'ACTIVE') };
  });
  operational.set(propertyId, rooms); return rooms;
}
const path = '*/__mock/staff-room-catalog/:propertyId';
export const staffRoomCatalogHandlers = [
  http.get(path, async ({ params, request }) => { await delay(150); if (request.signal.aborted) return new HttpResponse(null,{status:409}); return HttpResponse.json(roomCatalogFixture(String(params.propertyId))); }),
  http.post(path, async ({ params, request }) => {
    const propertyId = String(params.propertyId), snapshot = roomCatalogFixture(propertyId);
    let change: RoomCatalogChange;
    try { change = await request.json() as RoomCatalogChange; } catch { return new HttpResponse(null, { status: 400 }); }
    await delay(250);
    if (request.signal.aborted) return new HttpResponse(null,{status:409});
    if (!change || !['create-type','edit-type','create-room','edit-room'].includes(change.kind) || typeof change.code !== 'string' || !change.code.trim() || change.code.trim().length > 64) return new HttpResponse(null,{status:400});
    const typeChange = change.kind.endsWith('type'), editing = change.kind.startsWith('edit');
    const entries = typeChange ? snapshot.types : snapshot.rooms;
    const id = 'id' in change ? change.id : undefined;
    const existing = entries.find(entry => entry.id === id);
    if (editing && !existing) return new HttpResponse(null,{status:404});
    const code = change.code.trim();
    if (entries.some(entry => entry.id !== id && entry.code.toLocaleLowerCase('es') === code.toLocaleLowerCase('es'))) return new HttpResponse(null,{status:409});
    if (typeChange && (!('name' in change) || typeof change.name !== 'string' || !change.name.trim() || change.name.trim().length > 160)) return new HttpResponse(null,{status:400});
    let presentation, newType: { code: string; name: string; presentation: NonNullable<ReturnType<typeof readRoomTypePresentation>> } | undefined;
    let floor: string | null = null, internalNotes: string | null = null;
    try {
      if ((change.kind === 'create-type' || change.kind === 'edit-type') && change.presentation !== undefined)
        presentation = readRoomTypePresentation(change.presentation);
      if (change.kind === 'create-room' || change.kind === 'edit-room') { floor = catalogOptionalText(change.floor, 64); internalNotes = catalogOptionalText(change.internalNotes, 500); }
      if (change.kind === 'create-room') {
        if (change.newType) {
          if (change.roomTypeId !== undefined) return new HttpResponse(null, { status: 400 });
          const input = object(change.newType), typeCode = text(input.code), name = text(input.name);
          const profile = readRoomTypePresentation(input.presentation);
          if (typeCode.length > 64 || name.length > 160 || !profile) return new HttpResponse(null, { status: 400 });
          if (snapshot.types.some(type => type.code.toLocaleLowerCase('es') === typeCode.toLocaleLowerCase('es'))) return new HttpResponse(null, { status: 409 });
          newType = { code: typeCode, name, presentation: profile };
        } else if (!snapshot.types.some(type => type.id === change.roomTypeId)) return new HttpResponse(null, { status: 400 });
      }
    } catch { return new HttpResponse(null, { status: 400 }); }
    const now = new Date().toISOString();
    if (change.kind === 'create-type') snapshot.types.push({ id: crypto.randomUUID(), propertyId, code, name: change.name.trim(), createdAt:now, updatedAt:now, ...(presentation !== undefined ? { presentation } : {}) });
    if (change.kind === 'create-room') {
      const typeId = newType ? crypto.randomUUID() : change.roomTypeId!;
      // Validate both records first; no partial RoomType remains after a failed creation.
      if (newType) snapshot.types.push({ id: typeId, propertyId, ...newType, createdAt: now, updatedAt: now });
      snapshot.rooms.push({ id: crypto.randomUUID(), propertyId, code, roomTypeId: typeId, floor, internalNotes, createdAt: now, updatedAt: now });
    }
    if (existing) {
      existing.code = code; existing.updatedAt = now;
      if (change.kind === 'edit-type' && 'name' in existing) { existing.name = change.name.trim(); if (presentation !== undefined) existing.presentation = presentation; }
      if (change.kind === 'edit-room' && 'roomTypeId' in existing) {
        if (change.floor !== undefined) existing.floor = floor;
        if (change.internalNotes !== undefined) existing.internalNotes = internalNotes;
      }
    }
    return HttpResponse.json(snapshot);
  }),
];
