import type { ReservationListItem, ReservationStatus } from './reservation-summary';

export interface ReservationFilters { query: string; status: ReservationStatus | 'ALL'; arrivalFrom: string; arrivalTo: string }
export const emptyReservationFilters: ReservationFilters = { query: '', status: 'ALL', arrivalFrom: '', arrivalTo: '' };
const normalized = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('es');
export function localDay(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function filterStaffReservations(items: ReadonlyArray<ReservationListItem>, filters: ReservationFilters): ReservationListItem[] {
  if (filters.arrivalFrom && filters.arrivalTo && filters.arrivalFrom > filters.arrivalTo) return [];
  const query = normalized(filters.query);
  return items.filter(item => (filters.status === 'ALL' || item.status === filters.status)
    && (!filters.arrivalFrom || (item.stayStart !== null && localDay(item.stayStart) >= filters.arrivalFrom))
    && (!filters.arrivalTo || (item.stayStart !== null && localDay(item.stayStart) <= filters.arrivalTo))
    && normalized([item.id, item.confirmationCode ?? "", item.guestName, item.sourceLabel, item.roomLabel ?? '', ...(item.stayRooms?.map(s => s.roomType) ?? [])].join(' ')).includes(query));
}
