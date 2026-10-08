export interface StaffStaySearch {
  checkIn: string; checkOut: string; adults: number; children: number; rooms: number;
}
export interface StaffBookingGuest { fullName: string; email: string; phone: string; notes: string }
export interface StaffReservationOption {
  roomTypeId: string; roomTypeName: string; ratePlanId: string; ratePlanName: string;
  capacity: number; availableRooms: number; nightlyMinor: number; totalMinor: number; currency: string;
}
export interface StaffReservationQuote extends StaffStaySearch {
  id: string; propertyId: string; nights: number; options: StaffReservationOption[];
}
export type StaffCreateField = keyof StaffStaySearch | keyof StaffBookingGuest;

export function calendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
export function stayNights(checkIn: string, checkOut: string): number {
  return calendarDay(checkIn) && calendarDay(checkOut) && checkOut > checkIn
    ? (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000 : 0;
}
export function staffCreateErrors(search: StaffStaySearch, guest: StaffBookingGuest, today: string): Partial<Record<StaffCreateField, string>> {
  const errors: Partial<Record<StaffCreateField, string>> = {};
  if (!calendarDay(search.checkIn) || search.checkIn < today) errors.checkIn = 'Elige una fecha de llegada válida, desde hoy.';
  if (!calendarDay(search.checkOut) || !stayNights(search.checkIn, search.checkOut)) errors.checkOut = 'La salida debe ser posterior a la llegada.';
  if (!Number.isSafeInteger(search.rooms) || search.rooms < 1) errors.rooms = 'Selecciona al menos una habitación.';
  if (!Number.isSafeInteger(search.adults) || search.adults < 1) errors.adults = 'Indica al menos un adulto en la reserva.';
  if (!Number.isSafeInteger(search.children) || search.children < 0) errors.children = 'El número de menores debe ser cero o mayor.';
  if (guest.fullName.trim().length < 3 || guest.fullName.trim().split(/\s+/).length < 2) errors.fullName = 'Ingresa el nombre y apellido del huésped principal.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())) errors.email = 'Ingresa un correo electrónico válido.';
  if (!/^\+?[\d\s()-]{7,24}$/.test(guest.phone.trim()) || guest.phone.replace(/\D/g, '').length < 7) errors.phone = 'Ingresa un teléfono válido con código de país.';
  if (guest.notes.length > 300) errors.notes = 'Usa como máximo 300 caracteres.';
  return errors;
}
export function canChooseStaffOption(option: StaffReservationOption, search: StaffStaySearch): boolean {
  return option.availableRooms >= search.rooms && option.capacity * search.rooms >= search.adults + search.children;
}
