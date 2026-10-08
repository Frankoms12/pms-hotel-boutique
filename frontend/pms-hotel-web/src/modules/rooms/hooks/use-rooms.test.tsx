import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useRooms } from "./use-rooms";

const { listRoomsMock } = vi.hoisted(() => ({ listRoomsMock: vi.fn() }));

vi.mock("../service/room.service", () => ({ listRooms: listRoomsMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useRooms", () => {
  beforeEach(() => {
    listRoomsMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listRoomsMock.mockResolvedValueOnce({ rooms: [{
      room_id: "RM-101",
      property_id: "GT-HB-01",
      number: "101",
      floor: "1",
      status: "ACTIVE",
      room_type_label: "Deluxe King",
    }] });

    const { result } = renderHook(() => useRooms("GT-HB-01", "http://pms.test/contract/rooms"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "RM-101", status: "ACTIVE" })]);
    expect(listRoomsMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "http://pms.test/contract/rooms", propertyId: "GT-HB-01" }),
    );
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useRooms(undefined, undefined), { wrapper: createWrapper() });

    expect(listRoomsMock).not.toHaveBeenCalled();
  });

  it('rejects a response containing rooms from another property', async () => {
    listRoomsMock.mockResolvedValueOnce({ rooms: [{ room_id: 'RM-1', property_id: 'GT-HB-03', number: '101', floor: null, status: 'ACTIVE', room_type_label: 'Deluxe' }] });
    const { result } = renderHook(() => useRooms('GT-HB-01', 'http://pms.test/contract/rooms'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('ROOM_PROPERTY_MISMATCH');
    expect(result.current.data).toBeUndefined();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listRoomsMock.mockRejectedValueOnce(new HttpNetworkError()).mockResolvedValueOnce({ rooms: [] });

    const { result } = renderHook(() => useRooms("GT-HB-01", "http://pms.test/contract/rooms"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
