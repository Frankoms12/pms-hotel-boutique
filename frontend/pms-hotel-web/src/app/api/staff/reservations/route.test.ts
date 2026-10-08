import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';


const fetchMock = vi.fn<typeof fetch>();
let GET: typeof import('./route').GET;
let detailGET: typeof import('./[reservationId]/route').GET;
const fixture = { reservationId: '11111111-1111-1111-1111-111111111111', propertyId: '22222222-2222-2222-2222-222222222222',
  confirmationCode: 'REAL-BOOKING', status: 'CONFIRMED', source: 'WEB_DIRECTA', sourceReference: null, currency: 'GTQ', createdAt: '2026-10-08T10:00:00Z',
  responsibleGuest: { profileId: '33333333-3333-3333-3333-333333333333', firstName: 'Real', lastName: 'Responsible' }, stays: [] };
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  GET = (await import('./route')).GET; detailGET = (await import('./[reservationId]/route')).GET;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(query = `propertyId=${fixture.propertyId}`, cookie = 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest') {
  return new NextRequest(`http://localhost/api/staff/reservations?${query}`, { headers: { cookie, authorization: 'Bearer client-supplied' } });
}

describe('Staff reservations BFF', () => {
  it('uses only the Staff cookie, fixed target and no-store with an allowlisted response', async () => {
    fetchMock.mockResolvedValue(Response.json([{ ...fixture, accessToken: 'secret', responsibleGuest: { ...fixture.responsibleGuest, email: 'private' } }]));
    const response = await GET(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual([fixture]);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`http://backend:8080/api/v1/reservations?propertyId=${fixture.propertyId}`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-staff');
    expect(init?.cache).toBe('no-store');
  });
  it('supports detail with promised params and empty list', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(fixture));
    const response = await detailGET(request(), { params: Promise.resolve({ reservationId: fixture.reservationId }) });
    expect(await response.json()).toEqual(fixture);
    expect(fetchMock.mock.calls[0][0]).toContain(`/reservations/${fixture.reservationId}?propertyId=`);
    fetchMock.mockResolvedValueOnce(Response.json([])); expect(await (await GET(request())).json()).toEqual([]);
  });
  it('rejects Guest-only and missing credentials without a backend call', async () => {
    for (const cookie of ['', 'pms_guest_access=synthetic-guest']) expect((await GET(request(undefined, cookie))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', 'propertyId=invalid', `propertyId=${fixture.propertyId}&propertyId=${fixture.propertyId}`, `propertyId=${fixture.propertyId}&scope=ALL_PROPERTIES`])('rejects invalid filters %s', async query => {
    expect((await GET(request(query))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 500])('preserves meaningful status %i and sanitizes errors', async status => {
    fetchMock.mockResolvedValue(Response.json({ secret: 'do-not-relay' }, { status }));
    const response = await GET(request());
    expect(response.status).toBe(status === 500 ? 503 : status);
    expect(JSON.stringify(await response.json())).not.toContain('do-not-relay');
  });
  it('fails closed on invalid JSON, cross-property data or mismatched detail ID', async () => {
    fetchMock.mockResolvedValueOnce(new Response('broken'));
    expect((await GET(request())).status).toBe(503);
    fetchMock.mockResolvedValueOnce(Response.json([{ ...fixture, propertyId: '88888888-8888-8888-8888-888888888888' }]));
    expect((await GET(request())).status).toBe(503);
    fetchMock.mockResolvedValueOnce(Response.json(fixture));
    expect((await detailGET(request(), { params: Promise.resolve({ reservationId: '88888888-8888-8888-8888-888888888888' }) })).status).toBe(503);
  });
});
