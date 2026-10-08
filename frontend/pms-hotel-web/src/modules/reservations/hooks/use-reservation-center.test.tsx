import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useReservationCenter } from "./use-reservation-center";

afterEach(() => cleanup());

const { listReservationCenterMock } = vi.hoisted(() => ({ listReservationCenterMock: vi.fn() }));

vi.mock("../service/reservation.service", () => ({ listReservationCenter: listReservationCenterMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function centerDto() {
  return {
    summary: {
      arrivals_today: 18,
      departures_today: 126,
      vip_today: 2,
      multi_room_today: 2,
      late_checkout_today: 2,
      alerts: 4,
      confirmed_next_days: 37,
      decisions_required: 2,
      total: 1,
    },
    alerts: [],
    reservations: [{
      reservation_id: "HB-2026-08421",
      property_id: "GT-HB-01",
      guest_name: "María López",
      source_label: "Viajes Maya",
      source_reference: null,
      room_label: "203",
      stay_start: "2026-08-28",
      stay_end: "2026-08-31",
      nights: 3,
      adults: 2,
      room_count: 1,
      currency: "GTQ",
      total_amount: "3920",
      paid_amount: "2400",
      finance_state: "BALANCE",
      alert_text: null,
      status: "CONFIRMED",
      status_detail: "Check-in 28 ago · 15:00",
    }],
  };
}

describe("useReservationCenter", () => {
  it('rejects reservation summaries from another property', async () => {
    const dto = centerDto(); dto.reservations[0].property_id = 'GT-HB-03';
    listReservationCenterMock.mockResolvedValueOnce(dto);
    const { result } = renderHook(() => useReservationCenter('GT-HB-01', 'http://pms.test/contract/reservations'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('RESERVATION_PROPERTY_MISMATCH');
    expect(result.current.data).toBeUndefined();
  });
  beforeEach(() => {
    listReservationCenterMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listReservationCenterMock.mockResolvedValueOnce(centerDto());

    const { result } = renderHook(() => useReservationCenter("GT-HB-01", "http://pms.test/contract/reservations"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.reservations[0]).toEqual(expect.objectContaining({ id: "HB-2026-08421", propertyId: "GT-HB-01" }));
    expect(result.current.data?.summary?.confirmedNextDays).toBe(37);
    expect(listReservationCenterMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: "http://pms.test/contract/reservations",
      propertyId: "GT-HB-01",
    }));
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useReservationCenter(undefined, undefined), { wrapper: createWrapper() });

    expect(listReservationCenterMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listReservationCenterMock
      .mockRejectedValueOnce(new HttpNetworkError())
      .mockResolvedValueOnce(centerDto());

    const { result } = renderHook(() => useReservationCenter("GT-HB-01", "http://pms.test/contract/reservations"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
