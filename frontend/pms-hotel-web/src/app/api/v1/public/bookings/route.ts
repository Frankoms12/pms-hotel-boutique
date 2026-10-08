import { NextResponse } from 'next/server';
import { backendGuestRequest } from '@/lib/bff/guest-auth';

const headers = { 'Cache-Control': 'no-store' };

/** Public pass-through: no Guest/Staff session, token, refresh or cookies. */
export async function POST(request: Request) {
  const upstreamHeaders = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
  const key = request.headers.get('Idempotency-Key');
  if (key !== null) upstreamHeaders.set('Idempotency-Key', key);
  let body: string;
  try { body = await request.text(); }
  catch { return NextResponse.json({ code: 'INVALID_REQUEST' }, { status: 400, headers }); }
  try {
    // Preserve the payload verbatim, including invalid fields for J6 to reject.
    const upstream = await backendGuestRequest('/api/v1/public/bookings', { method: 'POST', headers: upstreamHeaders, body, signal: request.signal });
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json({ code: data.code }, { status: upstream.status, headers });
    }
    return NextResponse.json({
      reservationId: data.reservationId, confirmationCode: data.confirmationCode, status: data.status,
      currency: data.currency, totalMinor: data.totalMinor,
      payment: { provider: data.payment.provider, status: data.payment.status, reference: data.payment.reference },
      stays: data.stays.map((stay: Record<string, unknown>) => ({
        reservationStayId: stay.reservationStayId, roomTypeId: stay.roomTypeId, roomId: stay.roomId,
        arrival: stay.arrival, departure: stay.departure,
      })),
    }, { status: upstream.status, headers });
  } catch {
    // The Backend may already have committed. Never report this as BOOKING_FAILED.
    return NextResponse.json({ code: 'UPSTREAM_RESULT_UNKNOWN' }, { status: 502, headers });
  }
}
