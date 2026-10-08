"use client";
import { mapStaffReservationDetail } from "../mappers/staff-reservation.mapper";
import { getStaffReservation, staffReservationsEndpoint } from "../service/staff-reservation-read.service";

import { useQuery } from "@tanstack/react-query";
import { DomainMappingError } from '@/lib/errors';

import { mapReservationDetail } from "../mappers/reservation-detail.mapper";
import { getReservationDetail } from "../service/reservation.service";

export function useReservationDetail(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
) {
  return useQuery({
    queryKey: ["reservations", propertyId, endpoint, reservationId],
    enabled: Boolean(propertyId && endpoint && reservationId),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint || !reservationId) {
        throw new Error("RESERVATION_QUERY_CONFIGURATION_REQUIRED");
      }

      const result = endpoint === staffReservationsEndpoint
        ? mapStaffReservationDetail(await getStaffReservation(propertyId, reservationId, signal))
        : mapReservationDetail(await getReservationDetail({ endpoint, propertyId, reservationId, signal }));
      if (result.propertyId !== propertyId || result.id.toLowerCase() !== reservationId.toLowerCase()) throw new DomainMappingError('RESERVATION_SCOPE_MISMATCH');
      return result;
    },
  });
}
