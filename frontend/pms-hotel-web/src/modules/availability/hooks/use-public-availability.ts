"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicEnvironment } from '@/lib/env';
import { getPublicAvailability } from '../service/public-availability-query';
import type { AvailabilitySearchParams } from "../model/availability-option";

export function usePublicAvailability(params: AvailabilitySearchParams | undefined, suspended = false) {
  const mock = getPublicEnvironment().useMockApi;
  const propertyId = params?.propertyId ?? (mock ? undefined : process.env.NEXT_PUBLIC_PROPERTY_ID?.trim());
  return useQuery({
    queryKey: ["public-availability", mock, { ...params, propertyId }],
    enabled: Boolean(params) && !suspended,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (!params) throw new Error("AVAILABILITY_CRITERIA_REQUIRED");
      return getPublicAvailability({ ...params, propertyId }, signal);
    },
  });
}
