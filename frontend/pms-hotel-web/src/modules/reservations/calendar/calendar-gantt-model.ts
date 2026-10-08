import type { Room } from "@/modules/rooms";

import type { ReservationListItem, ReservationStatus } from "../model/reservation-summary";

/** Días visibles del Gantt. Fijo en 14 para lectura Staff sin scroll horizontal excesivo. */
export const GANTT_WINDOW_DAYS = 14;

/** Estados que ocupan inventario físico en el Gantt. Canceladas y cerradas no pintan ocupación. */
const OCCUPYING_STATES: ReadonlySet<ReservationStatus> = new Set([
  "CONFIRMED",
  "PENDING",
  "NO_SHOW_PENDING",
  "NO_SHOW",
]);

export interface GanttBooking {
  id: string;
  guestName: string;
  status: ReservationStatus;
  /** Primer día visible de la estadía dentro de la ventana. */
  isStart: boolean;
  /** Último día visible de la estadía dentro de la ventana. */
  isEnd: boolean;
}

export interface GanttCell {
  date: Date;
  dayKey: string;
  bookings: GanttBooking[];
}

export interface GanttRow {
  key: string;
  label: string;
  detail: string | null;
  roomStatus: Room["status"] | null;
  cells: GanttCell[];
}

export interface GanttGrid {
  days: Date[];
  rows: GanttRow[];
  /** Habitaciones físicas con estado ACTIVE. Base del cálculo de ocupación. */
  sellableRooms: number;
  /** Por día visible: habitaciones ocupadas (al menos una reserva que ocupa inventario). */
  occupiedPerDay: number[];
}

export function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Ventana de días consecutivos a partir del inicio (ambos a granularidad de día). */
export function buildDateWindow(start: Date, length: number = GANTT_WINDOW_DAYS): Date[] {
  const first = startOfDay(start);
  return Array.from({ length }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return day;
  });
}

function overlapsWindow(stayStart: Date, stayEnd: Date, windowKeys: ReadonlySet<string>): boolean {
  const cursor = startOfDay(stayStart);
  const last = startOfDay(stayEnd);
  while (cursor < last) {
    if (windowKeys.has(toDayKey(cursor))) {
      return true;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

/**
 * Construye la grilla del Gantt a partir de habitaciones físicas y reservas.
 * - La reserva se asigna a la habitación cuyo `number` coincide con `roomLabel`.
 * - Reservas activas sin habitación coincidente caen en la fila "Sin asignar".
 * - Solo estados que ocupan inventario pintan ocupación; el resto se informa sin ocupar.
 */
export function buildGanttGrid(
  rooms: ReadonlyArray<Room>,
  reservations: ReadonlyArray<ReservationListItem>,
  days: ReadonlyArray<Date>,
): GanttGrid {
  const windowKeys = new Set(days.map(toDayKey));
  const byRoomNumber = new Map<string, Room>();
  for (const room of rooms) {
    if (!byRoomNumber.has(room.number)) {
      byRoomNumber.set(room.number, room);
    }
  }

  const cellsByRow = new Map<string, GanttCell[]>();
  const rowMeta = new Map<string, { label: string; detail: string | null; roomStatus: Room["status"] | null }>();

  const ensureRow = (key: string, meta: { label: string; detail: string | null; roomStatus: Room["status"] | null }) => {
    if (!cellsByRow.has(key)) {
      cellsByRow.set(
        key,
        days.map((date) => ({ date, dayKey: toDayKey(date), bookings: [] })),
      );
      rowMeta.set(key, meta);
    }
    return cellsByRow.get(key) as GanttCell[];
  };

  for (const room of rooms) {
    ensureRow(`room:${room.id}`, {
      label: room.number,
      detail: room.roomTypeLabel,
      roomStatus: room.status,
    });
  }

  const unassigned = ensureRow("unassigned", {
    label: "Sin asignar",
    detail: "Reservas activas sin habitación coincidente",
    roomStatus: null,
  });

  const occupyingPerDay = new Map<string, Set<string>>();

  for (const reservation of reservations) {
    if (!reservation.stayStart || !reservation.stayEnd) continue;
    if (!overlapsWindow(reservation.stayStart, reservation.stayEnd, windowKeys)) {
      continue;
    }

    const room = reservation.roomLabel ? byRoomNumber.get(reservation.roomLabel) ?? null : null;
    const cells = room ? ensureRow(`room:${room.id}`, {
      label: room.number,
      detail: room.roomTypeLabel,
      roomStatus: room.status,
    }) : unassigned;

    const stayStartKey = toDayKey(startOfDay(reservation.stayStart));
    const stayEndExclusiveKey = toDayKey(startOfDay(reservation.stayEnd));
    const occupies = OCCUPYING_STATES.has(reservation.status);

    const visibleCells = cells.filter(
      (cell) => cell.dayKey >= stayStartKey && cell.dayKey < stayEndExclusiveKey,
    );

    visibleCells.forEach((cell, index) => {
      cell.bookings.push({
        id: reservation.id,
        guestName: reservation.guestName ?? "Responsable no registrado",
        status: reservation.status,
        isStart: index === 0,
        isEnd: index === visibleCells.length - 1,
      });
      if (occupies && room) {
        const occupied = occupyingPerDay.get(cell.dayKey) ?? new Set<string>();
        occupied.add(room.id);
        occupyingPerDay.set(cell.dayKey, occupied);
      }
    });
  }

  const rows: GanttRow[] = [...cellsByRow.entries()].map(([key, cells]) => ({
    key,
    label: (rowMeta.get(key) as { label: string }).label,
    detail: (rowMeta.get(key) as { detail: string | null }).detail,
    roomStatus: (rowMeta.get(key) as { roomStatus: Room["status"] | null }).roomStatus,
    cells,
  }));

  const sellableRooms = rooms.filter((room) => room.status === "ACTIVE").length;
  const occupiedPerDay = days.map((day) => occupyingPerDay.get(toDayKey(day))?.size ?? 0);

  return { days: [...days], rows, sellableRooms, occupiedPerDay };
}
