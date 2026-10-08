import type { StatusBadgeVariant } from '@/shared/components';
import type { RoomOccupancyState } from '../model/room-occupancy';
export const OCCUPANCY_LABELS: Record<RoomOccupancyState, string> = {
  FREE: 'Libre de estadías', RESERVED: 'Reservada', OCCUPIED: 'Ocupada', CONFLICT: 'Revisar asignaciones',
};
export const OCCUPANCY_VARIANTS: Record<RoomOccupancyState, StatusBadgeVariant> = {
  FREE: 'success', RESERVED: 'warning', OCCUPIED: 'info', CONFLICT: 'error',
};
