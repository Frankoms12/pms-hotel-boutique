import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';

const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const headers = { 'cache-control': 'private, no-store' };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_UPSTREAM');
  return value as Record<string, unknown>;
};
const text = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_UPSTREAM');
  return value;
};
const uuid = (value: unknown) => { const result = text(value); if (!uuidPattern.test(result)) throw new Error('INVALID_UPSTREAM'); return result; };
const optional = (value: unknown) => value === null ? null : text(value);

/** Allowlist only the Staff read contract; never relay extra upstream PII or credentials. */
function project(value: unknown, propertyId: string, reservationId?: string) {
  const r = object(value);
  if (r.propertyId !== propertyId || (reservationId && r.reservationId !== reservationId)
      || !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(text(r.status)) || !Array.isArray(r.stays)) throw new Error('INVALID_UPSTREAM');
  const guest = r.responsibleGuest === null ? null : object(r.responsibleGuest);
  return { reservationId: uuid(r.reservationId), propertyId: uuid(r.propertyId), confirmationCode: text(r.confirmationCode),
    status: r.status, source: optional(r.source), sourceReference: optional(r.sourceReference), currency: text(r.currency), createdAt: text(r.createdAt),
    responsibleGuest: guest === null ? null : { profileId: uuid(guest.profileId), firstName: text(guest.firstName), lastName: text(guest.lastName) },
    stays: r.stays.map(value => {
      const s = object(value), t = object(s.roomType), room = s.room === null ? null : object(s.room);
      if (!['RESERVED', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(text(s.status))) throw new Error('INVALID_UPSTREAM');
      return { stayId: uuid(s.stayId), arrival: text(s.arrival), departure: text(s.departure), status: s.status,
        roomType: { roomTypeId: uuid(t.roomTypeId), code: text(t.code), name: text(t.name) },
        room: room === null ? null : { roomId: uuid(room.roomId), code: text(room.code) } };
    }) };
}

export async function proxyStaffReservations(request: NextRequest, reservationId?: string) {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return NextResponse.json({ error: 'Staff session required' }, { status: 401, headers });
  const params = request.nextUrl.searchParams;
  const propertyId = params.get('propertyId')?.toLowerCase();
  reservationId = reservationId?.toLowerCase();
  if (!propertyId || !uuidPattern.test(propertyId) || params.size !== 1 || (reservationId !== undefined && !uuidPattern.test(reservationId)))
    return NextResponse.json({ error: 'Invalid reservation parameters' }, { status: 400, headers });
  try {
    const upstream = await backendStaffRequest(`/api/v1/reservations${reservationId ? `/${reservationId}` : ''}?${new URLSearchParams({ propertyId })}`, {
      method: 'GET', headers: { authorization: `Bearer ${token}` }, signal: request.signal,
    });
    if (!upstream.ok) {
      const status = [400, 401, 403, 404].includes(upstream.status) ? upstream.status : 503;
      return NextResponse.json({ error: 'Reservation read unavailable' }, { status, headers });
    }
    const data: unknown = await upstream.json();
    if (!reservationId && !Array.isArray(data)) throw new Error('INVALID_UPSTREAM');
    return NextResponse.json(reservationId ? project(data, propertyId, reservationId)
      : (data as unknown[]).map(r => project(r, propertyId)), { headers });
  } catch { return NextResponse.json({ error: 'Reservation read unavailable' }, { status: 503, headers }); }
}
