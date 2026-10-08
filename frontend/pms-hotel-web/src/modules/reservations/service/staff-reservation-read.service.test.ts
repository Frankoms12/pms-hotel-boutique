import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { getStaffReservation, listStaffReservations } from './staff-reservation-read.service';

const fetchMock = vi.fn<typeof fetch>();
const dto = staffReservationFixture();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://external.example.test'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('real Staff reservation service', () => {
  it.each(['false', 'true'])('uses same-origin BFF with mocks=%s and returns DTO without mapping or authorization headers', async mocks => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', mocks);
    fetchMock.mockResolvedValueOnce(Response.json([dto])).mockResolvedValueOnce(Response.json(dto));
    expect(await listStaffReservations(dto.propertyId)).toEqual([dto]);
    expect(await getStaffReservation(dto.propertyId, dto.reservationId)).toEqual(dto);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/^http:\/\/localhost(?::\d+)?\/api\/staff\/reservations/);
      expect(new Headers(init?.headers).has('authorization')).toBe(false);
    }
  });
  it('recovers a 401 with one Staff refresh and one retry', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ refreshed: true })).mockResolvedValueOnce(Response.json([dto]));
    expect(await listStaffReservations(dto.propertyId)).toEqual([dto]);
    expect(fetchMock).toHaveBeenCalledTimes(3); expect(fetchMock.mock.calls[1][0]).toContain('/api/auth/staff/refresh');
  });
  it('shares concurrent rotations and terminates on a second 401', async () => {
    let reads = 0;
    fetchMock.mockImplementation(async input => {
      if (String(input).includes('/refresh')) return Response.json({ refreshed: true });
      return ++reads <= 2 ? new Response(null, { status: 401 }) : Response.json([dto]);
    });
    await Promise.all([listStaffReservations(dto.propertyId), listStaffReservations(dto.propertyId)]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/refresh'))).toHaveLength(1);
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json({ refreshed: true })).mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(listStaffReservations(dto.propertyId)).rejects.toMatchObject({ status: 401 }); expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it.each([403, 404, 503])('does not refresh on %i', async status => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    await expect(listStaffReservations(dto.propertyId)).rejects.toMatchObject({ status }); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
