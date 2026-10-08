"use client";
import { mapStaffReservationCenter } from "../mappers/staff-reservation.mapper";
import { listStaffReservations, staffReservationsEndpoint } from "../service/staff-reservation-read.service";

import { useQuery } from "@tanstack/react-query";
import { DomainMappingError } from '@/lib/errors';

import { mapReservationCenter } from "../mappers/reservation-list.mapper";
import { listReservationCenter } from "../service/reservation.service";

export function useReservationCenter(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["reservations", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("RESERVATION_QUERY_CONFIGURATION_REQUIRED");
      }

      const result = endpoint === staffReservationsEndpoint
        ? mapStaffReservationCenter(await listStaffReservations(propertyId, signal))
        : mapReservationCenter(await listReservationCenter({ endpoint, propertyId, signal }));
      if (result.reservations.some(item => item.propertyId !== propertyId)) throw new DomainMappingError('RESERVATION_PROPERTY_MISMATCH');
      return result;
    },
  });
}
