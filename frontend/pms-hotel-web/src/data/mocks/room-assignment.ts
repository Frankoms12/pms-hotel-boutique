import { http, HttpResponse } from 'msw';
import { roomCatalogFixture, operationalRoomFixture } from './staff-room-catalog';
import { staffCreatedDetails, staffCreatedRoomType } from './staff-reservation-create';
import type { ReservationDetailDto } from '@/modules/reservations/dtos/reservation-detail.dto';
import type { ReservationListItemDto } from '@/modules/reservations/dtos/reservation-list.dto';
import type { RoomAssignmentPreviewDto, RoomAssignmentResultDto } from '@/modules/reservations/dtos/room-assignment.dto';

// Assignment is a projection over the scenario. Creation receipts/financial snapshots stay intact.
const assignments = new Map<string, string>();
const key = (propertyId: string, reservationId: string, stayId: string) => JSON.stringify([propertyId, reservationId, stayId]);
export function resetRoomAssignments() { assignments.clear(); }
export function projectAssignedDetail(detail: ReservationDetailDto): ReservationDetailDto {
  const catalog = roomCatalogFixture(detail.property_id);
  return { ...detail, stays: detail.stays.map(stay => {
    const id = assignments.get(key(detail.property_id, detail.reservation_id, stay.stay_id));
    const room = catalog.rooms.find(item => item.id === id);
    return room ? { ...stay, room_id: room.id, room_label: room.code } : { ...stay };
  }) };
}
export function projectAssignmentSummary(row: ReservationListItemDto, detail?: ReservationDetailDto): ReservationListItemDto {
  if (!detail || !detail.stays.some(stay => assignments.has(key(detail.property_id, detail.reservation_id, stay.stay_id)))) return row;
  const updated = projectAssignedDetail(detail);
  const assigned = updated.stays.filter(stay => stay.room_id !== null);
  return { ...row, room_label: updated.stays.length === 1 ? updated.stays[0].room_label : assigned.map(stay => stay.room_label).join(', '),
    status_detail: assigned.length === updated.stays.length ? 'Habitaciones asignadas' : `${assigned.length} de ${updated.stays.length} habitaciones asignadas` };
}
export function roomAssignmentHandlers(seeds: () => ReservationDetailDto[]) {
  function details() { return [...seeds(), ...staffCreatedDetails()]; }
  function existing(propertyId: string, reservationId: string) { return details().find(detail => detail.property_id === propertyId && detail.reservation_id === reservationId); }
  function preview(detail: ReservationDetailDto, stayId: string): RoomAssignmentPreviewDto | undefined {
    const stay = projectAssignedDetail(detail).stays.find(item => item.stay_id === stayId);
    if (!stay) return;
    const catalog = roomCatalogFixture(detail.property_id), operational = operationalRoomFixture(detail.property_id);
    const names = catalog.types.filter(type => type.name === stay.room_type);
    const typeId = staffCreatedRoomType(detail.reservation_id, detail.property_id) ?? (names.length === 1 ? names[0].id : null);
    const allowedState = ['PENDING', 'CONFIRMED'].includes(detail.status) && stay.travel_state === 'RESERVED';
    const canAssign = allowedState && stay.room_id === null && typeId !== null;
    return { property_id: detail.property_id, reservation_id: detail.reservation_id, stay_id: stayId,
      arrival: stay.check_in, departure: stay.check_out, room_type: stay.room_type, room_type_id: typeId, can_assign: canAssign,
      reason: !allowedState ? 'El estado de esta reserva o estadía no permite una asignación inicial.'
        : stay.room_id !== null ? 'Esta estadía ya tiene habitación asignada.'
          : typeId === null ? 'No se pudo resolver el tipo en el catálogo de esta propiedad.' : null,
      rooms: catalog.rooms.filter(room => room.roomTypeId === typeId).map((room): RoomAssignmentPreviewDto['rooms'][number] => {
        const state = operational.find(item => item.room_id === room.id);
        const conflict = details().filter(other => other.property_id === detail.property_id && ['PENDING', 'CONFIRMED', 'NO_SHOW_PENDING'].includes(other.status))
          .flatMap(other => projectAssignedDetail(other).stays).some(other => other.stay_id !== stayId && ['RESERVED', 'IN_HOUSE'].includes(other.travel_state)
            && (other.room_id === room.id || (other.room_id !== null && other.room_label === room.code))
            && other.check_in < stay.check_out && stay.check_in < other.check_out);
        const selectable = canAssign && state?.status === 'ACTIVE' && !conflict;
        return { room_id: room.id, number: room.code, floor: state?.floor ?? null,
          operational_status: state?.status === 'ACTIVE' ? 'ACTIVE' : state?.status === 'OOS' ? 'OOS' : 'OOO', selectable,
          reason: !canAssign ? 'Asignación no disponible para esta estadía.' : !state || state.status !== 'ACTIVE'
            ? 'No está operativa para asignación en este escenario.' : conflict ? 'Ya está asignada durante estas fechas.' : null };
      }) };
  }
  const path = '*/__mock/staff-reservations/:propertyId/:reservationId/stays/:stayId/room-assignment';
  return [
    http.get(path, ({ params }) => {
      const detail = existing(String(params.propertyId), String(params.reservationId));
      const result = detail && preview(detail, String(params.stayId));
      return result ? HttpResponse.json(result) : new HttpResponse(null, { status: 404 });
    }),
    http.put(path, async ({ params, request }) => {
      const propertyId = String(params.propertyId), reservationId = String(params.reservationId), stayId = String(params.stayId);
      let roomId: unknown;
      try { roomId = (await request.json() as { room_id?: unknown })?.room_id; } catch { return new HttpResponse(null, { status: 400 }); }
      if (typeof roomId !== 'string' || !roomId) return new HttpResponse(null, { status: 400 });
      const detail = existing(propertyId, reservationId);
      const stay = detail && projectAssignedDetail(detail).stays.find(item => item.stay_id === stayId);
      if (!detail || !stay) return new HttpResponse(null, { status: 404 });
      const room = roomCatalogFixture(propertyId).rooms.find(item => item.id === roomId);
      if (!room) return new HttpResponse(null, { status: 404 });
      if (request.signal.aborted || !['PENDING', 'CONFIRMED'].includes(detail.status) || stay.travel_state !== 'RESERVED') return new HttpResponse(null, { status: 409 });
      const result: RoomAssignmentResultDto = { property_id: propertyId, reservation_id: reservationId, stay_id: stayId, room_id: room.id, number: room.code };
      if (stay.room_id === roomId) return HttpResponse.json(result); // Idempotent replay, never a new charge.
      if (stay.room_id !== null || !preview(detail, stayId)?.rooms.some(item => item.room_id === roomId && item.selectable)) return new HttpResponse(null, { status: 409 });
      // Revalidation and assignment have no await between them. No overlapping double assignment.
      assignments.set(key(propertyId, reservationId, stayId), roomId);
      return HttpResponse.json(result);
    }),
  ];
}
