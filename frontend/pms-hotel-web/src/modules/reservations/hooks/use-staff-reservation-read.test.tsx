import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { useReservationCenter } from './use-reservation-center';
import { useReservationDetail } from './use-reservation-detail';

const mocks = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), mockList: vi.fn(), mockDetail: vi.fn() }));
vi.mock('../service/staff-reservation-read.service', () => ({ staffReservationsEndpoint: '/api/staff/reservations', listStaffReservations: mocks.list, getStaffReservation: mocks.detail }));
vi.mock('../service/reservation.service', () => ({ listReservationCenter: mocks.mockList, getReservationDetail: mocks.mockDetail }));
const dto = staffReservationFixture(), endpoint = '/api/staff/reservations';
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}
beforeEach(() => { Object.values(mocks).forEach(fn => fn.mockReset()); });
afterEach(cleanup);

describe('real Staff read hooks', () => {
  it('uses real adapters and maps PostgreSQL DTOs with nullable finance', async () => {
    mocks.list.mockResolvedValue([dto]); mocks.detail.mockResolvedValue(dto);
    const list = renderHook(() => useReservationCenter(dto.propertyId, endpoint), { wrapper });
    const detail = renderHook(() => useReservationDetail(dto.propertyId, endpoint, dto.reservationId), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(list.result.current.data?.reservations[0]).toMatchObject({ confirmationCode: dto.confirmationCode, adults: null });
    expect(detail.result.current.data?.finance.totalAmount).toBeNull();
    expect(mocks.mockList).not.toHaveBeenCalled(); expect(mocks.mockDetail).not.toHaveBeenCalled();
  });
  it('fails closed on another property or a different reservation', async () => {
    mocks.list.mockResolvedValue([{ ...dto, propertyId: '88888888-8888-8888-8888-888888888888' }]);
    mocks.detail.mockResolvedValue({ ...dto, reservationId: '88888888-8888-8888-8888-888888888888' });
    const list = renderHook(() => useReservationCenter(dto.propertyId, endpoint), { wrapper });
    const detail = renderHook(() => useReservationDetail(dto.propertyId, endpoint, dto.reservationId), { wrapper });
    await waitFor(() => expect(list.result.current.isError).toBe(true));
    await waitFor(() => expect(detail.result.current.isError).toBe(true));
    expect(list.result.current.error?.message).toBe('RESERVATION_PROPERTY_MISMATCH');
    expect(detail.result.current.error?.message).toBe('RESERVATION_SCOPE_MISMATCH');
    expect(list.result.current.data).toBeUndefined(); expect(detail.result.current.data).toBeUndefined();
  });
  it('does not query until the Staff property scope exists', () => {
    renderHook(() => useReservationCenter(undefined, endpoint), { wrapper });
    renderHook(() => useReservationDetail(undefined, endpoint, dto.reservationId), { wrapper });
    expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.detail).not.toHaveBeenCalled();
  });
});
