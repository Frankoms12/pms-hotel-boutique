/** Presentation of assigned stays on a hotel-local date; never a Room operational status or ATS. */
export type RoomOccupancyState = 'FREE' | 'RESERVED' | 'OCCUPIED' | 'CONFLICT';
export interface RoomOccupancyStay {
  reservationId: string; stayId: string; guestName: string; roomType: string;
  arrival: string; departure: string; state: 'RESERVED' | 'IN_HOUSE';
}
export interface RoomOccupancy {
  roomId: string; state: RoomOccupancyState; stays: RoomOccupancyStay[];
}
export interface RoomOccupancySnapshot {
  propertyId: string; date: string; rooms: RoomOccupancy[]; unassigned: RoomOccupancyStay[];
}
export function isOccupancyDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
export function hotelOccupancyDay(timezone?: string): string {
  if (!timezone) return '';
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = (type: string) => parts.find(part => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch { return ''; }
}
