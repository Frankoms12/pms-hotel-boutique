import { staffBffRead } from '@/lib/http/staff-bff';
import type { StaffReservationDto } from '../dtos/staff-reservation.dto';

export const staffReservationsEndpoint = '/api/staff/reservations';

export function listStaffReservations(propertyId: string, signal?: AbortSignal): Promise<StaffReservationDto[]> {
  return staffBffRead(`${staffReservationsEndpoint}?${new URLSearchParams({ propertyId })}`, signal);
}

export function getStaffReservation(propertyId: string, reservationId: string, signal?: AbortSignal): Promise<StaffReservationDto> {
  return staffBffRead(`${staffReservationsEndpoint}/${encodeURIComponent(reservationId)}?${new URLSearchParams({ propertyId })}`, signal);
}
