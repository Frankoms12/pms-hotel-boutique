'use client';
import { useQuery } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { mapRoomOccupancy } from '../mappers/room-occupancy.mapper';
import { isOccupancyDay } from '../model/room-occupancy';
import { readRoomOccupancy } from '../service/room-occupancy.service';

export function useRoomOccupancy(propertyId?: string, sessionId?: string, date = '', enabled = true) {
  const connected = getPublicEnvironment().useMockApi;
  const query = useQuery({ queryKey: ['staff-room-occupancy', sessionId, propertyId, date],
    enabled: connected && enabled && !!propertyId && !!sessionId && isOccupancyDay(date), retry: false, staleTime: 0,
    queryFn: async ({ signal }) => {
      if (!propertyId) throw new Error('ROOM_OCCUPANCY_SCOPE_REQUIRED');
      return mapRoomOccupancy(await readRoomOccupancy(propertyId, date, signal), propertyId, date);
    } });
  return { connected, query };
}
