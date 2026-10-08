"use client";

import { useQuery } from "@tanstack/react-query";
import { DomainMappingError } from '@/lib/errors';

import { mapRoom } from "../mappers/room.mapper";
import { listRooms } from "../service/room.service";

export function useRooms(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["rooms", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("ROOMS_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listRooms({ endpoint, propertyId, signal });
      const rooms = response.rooms.map(mapRoom);
      if (rooms.some(room => room.propertyId !== propertyId)) throw new DomainMappingError('ROOM_PROPERTY_MISMATCH');
      return rooms;
    },
  });
}
