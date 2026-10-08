import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useReservationDetail } from "./use-reservation-detail";

afterEach(() => cleanup());

const { getReservationDetailMock } = vi.hoisted(() => ({ getReservationDetailMock: vi.fn() }));

vi.mock("../service/reservation.service", () => ({ getReservationDetail: getReservationDetailMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function detailDto() {
  return {
    reservation_id: "HB-2026-08421",
    property_id: "GT-HB-01",
    status: "CONFIRMED",
    created_at: "2026-08-24",
    source: { label: "Viajes Maya", reference: "VM-77821 · TA-MAYA-01" },
    policy_label: "Flexible 48h · Viajes Maya",
    guest: { primary_name: "María López", phone: "+502 5555 5555", adults: 2, children: null },
    stays: [{
      stay_id: "STAY-001",
      room_id: "RM-203",
      room_label: "203",
      room_type: "Deluxe King",
      check_in: "2026-08-28",
      check_out: "2026-08-31",
      nights: 3,
      travel_state: "RESERVED",
    }],
    notes: "Llegada estimada 15:00. Solicita habitación tranquila.",
    currency: "GTQ",
    total_amount: "3920",
    paid_amount: "2400",
    finance_state: "BALANCE",
    rate_per_night: "1160",
    lines: [
      { label: "Habitación · 3 noches", amount: "3480" },
      { label: "Impuestos", amount: "240" },
      { label: "Servicio", amount: "200" },
    ],
  };
}

describe("useReservationDetail", () => {
  it.each(['property_id', 'reservation_id'] as const)('rejects a detail with mismatched %s', async field => {
    const dto = detailDto(); dto[field] = 'unrequested-id'; getReservationDetailMock.mockResolvedValueOnce(dto);
    const { result } = renderHook(() => useReservationDetail('GT-HB-01', 'http://pms.test/contract/reservations', 'HB-2026-08421'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('RESERVATION_SCOPE_MISMATCH');
    expect(result.current.data).toBeUndefined();
  });
  beforeEach(() => {
    getReservationDetailMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    getReservationDetailMock.mockResolvedValueOnce(detailDto());

    const { result } = renderHook(
      () => useReservationDetail("GT-HB-01", "http://pms.test/contract/reservations", "HB-2026-08421"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ id: "HB-2026-08421", propertyId: "GT-HB-01" }));
    expect(result.current.data?.stays).toHaveLength(1);
    expect(getReservationDetailMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: "http://pms.test/contract/reservations",
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08421",
    }));
  });

  it("does not request data without a reservation id, scope or endpoint", () => {
    renderHook(() => useReservationDetail(undefined, undefined, undefined), { wrapper: createWrapper() });

    expect(getReservationDetailMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    getReservationDetailMock
      .mockRejectedValueOnce(new HttpNetworkError())
      .mockResolvedValueOnce(detailDto());

    const { result } = renderHook(
      () => useReservationDetail("GT-HB-01", "http://pms.test/contract/reservations", "HB-2026-08421"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
