import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicBookingRequest, publicBookingResponse } from '@/test/public-booking-fixture';
import { publicRoomTypeId } from '@/test/public-availability-fixture';
import { setAuthToken } from '@/lib/http/interceptors';
import { DomainMappingError } from '@/lib/errors';
import { createPublicBookingDTO } from './public-booking.service';
import { mapPublicBooking } from '../mappers/public-booking.mapper';

const request = { ...publicBookingRequest, idempotencyKey: 'opaque-key-123' };
const names = { [publicRoomTypeId]: 'Deluxe real' };
const receivedAt = '2026-10-08T12:00:00Z';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); setAuthToken(null); });

describe('Public booking adapter', () => {
  it('uses same-origin with exact J6 fields despite configured API URL and Staff token', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://other.example'); setAuthToken('staff-token');
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(publicBookingResponse, { status: 201 }));
    await createPublicBookingDTO(request, new AbortController().signal);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(new URL('/api/v1/public/bookings', window.location.origin).href);
    expect(JSON.parse(String(init?.body))).toEqual(publicBookingRequest);
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe(request.idempotencyKey);
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  });
  it('preserves IDs and code and uses the approved full payment without inventing card metadata', () => {
    const result = mapPublicBooking(publicBookingResponse, request, names, receivedAt);
    expect(result).toMatchObject({ source: 'backend', reservationId: publicBookingResponse.reservationId, confirmationCode: publicBookingResponse.confirmationCode, totalMinor: 170000, guaranteeMinor: 170000, remainingMinor: 0, receivedAt, payment: publicBookingResponse.payment });
    expect(result.stays[0]).toMatchObject({ id: publicBookingResponse.stays[0].reservationStayId, roomTypeId: publicRoomTypeId, roomId: null });
    expect(result).not.toHaveProperty('guarantee'); expect(result).not.toHaveProperty('confirmedAt');
  });
  it.each([
    { reservationId: 'HB-fake' }, { confirmationCode: '' }, { status: 'PENDING' }, { currency: 'USD' }, { totalMinor: 1 },
    { payment: { provider: 'SIMULATED', status: 'DECLINED', reference: 'ref' } }, { stays: [] },
    { stays: [publicBookingResponse.stays[0], publicBookingResponse.stays[0]] },
    { stays: [{ ...publicBookingResponse.stays[0], roomId: 'physical-room' }] },
    { stays: [{ ...publicBookingResponse.stays[0], arrival: '2026-11-02' }] },
    { stays: [{ ...publicBookingResponse.stays[0], reservationStayId: 'fake' }] },
    { stays: [{ ...publicBookingResponse.stays[0], roomTypeId: '23ec66c1-2d0b-40e5-bccf-a6dc3acfe1d6' }] },
  ])('rejects a malformed or mismatched confirmation: %j', patch => {
    expect(() => mapPublicBooking({ ...publicBookingResponse, ...patch } as typeof publicBookingResponse, request, names, receivedAt)).toThrow(DomainMappingError);
  });
});
