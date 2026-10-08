'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { mapRoomCatalog } from '../mappers/room-catalog.mapper';
import { readRoomCatalog, changeRoomCatalog } from '../service/room-catalog.service';
import type { RoomCatalogChange } from '../model/room-catalog';

export function useRoomCatalog(propertyId: string, sessionId: string) {
  const client = useQueryClient();
  const key = ['staff-room-catalog', sessionId, propertyId];
  const query = useQuery({ queryKey: key, enabled: getPublicEnvironment().useMockApi,
    queryFn: async ({ signal }) => mapRoomCatalog(await readRoomCatalog(propertyId, signal), propertyId) });
  const mutation = useMutation({ mutationFn: async (change: RoomCatalogChange) => mapRoomCatalog(await changeRoomCatalog(propertyId, change), propertyId),
    onSuccess: result => {
      client.setQueryData(key, result);
      void client.invalidateQueries({ queryKey: ['rooms', propertyId] });
      void client.invalidateQueries({ queryKey: ['staff-room-occupancy', sessionId, propertyId] });
      void client.invalidateQueries({ queryKey: ['staff-reservation-quotes', sessionId, propertyId] });
      void client.invalidateQueries({ queryKey: ['staff-room-assignment', sessionId, propertyId] });
    } });
  return { query, mutation };
}
