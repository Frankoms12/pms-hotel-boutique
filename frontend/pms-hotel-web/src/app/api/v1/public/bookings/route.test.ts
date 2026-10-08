import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publicBookingRequest, publicBookingResponse } from '@/test/public-booking-fixture';

beforeEach(() => { vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080'); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
async function call(body = JSON.stringify(publicBookingRequest), key: string | null = 'opaque-key-123') {
  const { POST } = await import('./route');
  const headers = new Headers({ 'Content-Type': 'application/json', Cookie: 'pms_guest_access=guest; pms_staff_access=staff', Authorization: 'Bearer staff' });
  if (key) headers.set('Idempotency-Key', key);
  return POST(new Request('http://localhost/api/v1/public/bookings', { method: 'POST', headers, body }));
}

describe('Public booking BFF J6', () => {
  it('forwards exact key/payload without credentials and preserves 201 for creation/replay', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ ...publicBookingResponse, privateData: 'secret', payment: { ...publicBookingResponse.payment, privateData: 'secret' }, stays: publicBookingResponse.stays.map(stay => ({ ...stay, privateData: 'secret' })) }, { status: 201 }));
    for (let replay = 0; replay < 2; replay++) {
      const response = await call();
      expect(response.status).toBe(201); expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual(publicBookingResponse);
    }
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://backend:8080/api/v1/public/bookings');
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store', body: JSON.stringify(publicBookingRequest) });
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('opaque-key-123');
    expect(new Headers(init?.headers).has('Cookie')).toBe(false); expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  });
  it.each([[400, 'INVALID_REQUEST'], [400, 'INVALID_DATE_RANGE'], [404, 'PROPERTY_NOT_FOUND'], [409, 'PRICE_CHANGED'], [409, 'NO_AVAILABILITY'], [409, 'IDEMPOTENCY_KEY_REUSED'], [422, 'PAYMENT_DECLINED'], [500, 'BOOKING_FAILED']])('preserves %i/%s and does not expose upstream details', async (status, code) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ code, detail: 'private diagnostic' }, { status: Number(status) }));
    const response = await call(); expect(response.status).toBe(status); expect(await response.json()).toEqual({ code });
  });
  it('lets J6 reject unknown fields and missing keys without silently changing the request', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ code: 'INVALID_REQUEST' }, { status: 400 }));
    const body = JSON.stringify({ ...publicBookingRequest, extra: 'invalid' });
    expect((await call(body, null)).status).toBe(400);
    expect(fetch.mock.calls[0][1]?.body).toBe(body); expect(new Headers(fetch.mock.calls[0][1]?.headers).has('Idempotency-Key')).toBe(false);
  });
  it.each(['network', 'invalid-json', 'invalid-contract'])('reports an unknown result for %s', async failure => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    if (failure === 'network') fetch.mockRejectedValue(new TypeError('Connection lost'));
    else fetch.mockResolvedValue(failure === 'invalid-json' ? new Response('broken', { status: 201 }) : Response.json({ reservationId: 'bad' }, { status: 201 }));
    const response = await call(); expect(response.status).toBe(502); expect(await response.json()).toEqual({ code: 'UPSTREAM_RESULT_UNKNOWN' });
  });
});
