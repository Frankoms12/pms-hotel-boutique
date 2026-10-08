import { http, HttpResponse } from 'msw';
import { roomCatalogFixture, operationalRoomFixture } from './staff-room-catalog';
import { calendarDay, stayNights, staffCreateErrors } from '@/modules/reservations/model/staff-reservation-create';
import type { StaffStaySearch } from '@/modules/reservations/model/staff-reservation-create';
import type { StaffReservationQuoteDto } from '@/modules/reservations/dtos/staff-reservation-create.dto';
import type { ReservationDetailDto } from '@/modules/reservations/dtos/reservation-detail.dto';
import type { ReservationListItemDto } from '@/modules/reservations/dtos/reservation-list.dto';

/** Local-only scenarios. Neither this route nor its payload confirms a Backend API. */
const quotes = new Map<string, StaffReservationQuoteDto>();
const bookings = new Map<string, { roomTypeId: string; detail: ReservationDetailDto }>();
const receipts = new Map<string, { body: string; detail: ReservationDetailDto }>();
const tariffFixtures: Record<string, { nightly: number; capacity: number }> = {
  'RT-STD': { nightly: 94000, capacity: 2 }, 'RT-DLX': { nightly: 116000, capacity: 2 },
  'RT-SUITE': { nightly: 140000, capacity: 4 }, 'RT-MASTER': { nightly: 180000, capacity: 4 },
};
export function resetStaffCreatedReservations() { quotes.clear(); bookings.clear(); receipts.clear(); }
export function staffCreatedReservation(id: string, propertyId: string): ReservationDetailDto | undefined {
  const detail = bookings.get(id)?.detail; return detail?.property_id === propertyId ? detail : undefined;
}
export function staffCreatedDetails(): ReservationDetailDto[] { return [...bookings.values()].map(item => item.detail); }
export function staffCreatedRoomType(id: string, propertyId: string): string | undefined {
  const item = bookings.get(id); return item?.detail.property_id === propertyId ? item.roomTypeId : undefined;
}
export function staffCreatedList(propertyId: string): ReservationListItemDto[] {
  return [...bookings.values()].filter(item => item.detail.property_id === propertyId).reverse().map(({ detail }) => ({
    reservation_id: detail.reservation_id, property_id: propertyId, guest_name: detail.guest.primary_name,
    source_label: detail.source.label, source_reference: null, room_label: detail.stays[0].room_type,
    stay_start: detail.stays[0].check_in, stay_end: detail.stays[0].check_out, nights: detail.stays[0].nights,
    adults: detail.guest.adults, room_count: detail.stays.length, currency: detail.currency, total_amount: detail.total_amount,
    paid_amount: null, finance_state: 'NO_CAPTURE', alert_text: null, status: 'PENDING', status_detail: 'Habitación física sin asignar',
  }));
}
function available(propertyId: string, typeId: string, arrival: string, departure: string, seeds: ReservationDetailDto[]): number {
  const catalog = roomCatalogFixture(propertyId), operational = operationalRoomFixture(propertyId);
  const rooms = catalog.rooms.filter(room => room.roomTypeId === typeId);
  const sellable = rooms.filter(room => operational.find(item => item.room_id === room.id)?.status !== 'OOO').length;
  const type = catalog.types.find(item => item.id === typeId);
  let minimum = sellable;
  for (let day = arrival; day < departure; day = new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)) {
    const newSold = [...bookings.values()].filter(item => item.roomTypeId === typeId && item.detail.property_id === propertyId)
      .flatMap(item => item.detail.stays).filter(stay => stay.check_in <= day && day < stay.check_out).length;
    const seedSold = seeds.filter(detail => detail.property_id === propertyId && ['CONFIRMED', 'PENDING', 'NO_SHOW_PENDING'].includes(detail.status))
      .flatMap(detail => detail.stays).filter(stay => stay.room_type === type?.name && ['RESERVED', 'IN_HOUSE'].includes(stay.travel_state)
        && stay.check_in <= day && day < stay.check_out).length;
    minimum = Math.min(minimum, Math.max(0, sellable - newSold - seedSold));
  }
  return minimum;
}
export function staffReservationCreationHandlers(seeds: () => ReservationDetailDto[]) {
  return [
    http.get('*/__mock/staff-reservations/:propertyId/quotes', ({ params, request }) => {
      const propertyId = String(params.propertyId), query = new URL(request.url).searchParams;
      const search: StaffStaySearch = { checkIn: query.get('arrival') ?? '', checkOut: query.get('departure') ?? '',
        adults: Number(query.get('adults')), children: Number(query.get('children')), rooms: Number(query.get('rooms')) };
      const nights = stayNights(search.checkIn, search.checkOut);
      if (!nights || !Number.isSafeInteger(search.rooms) || search.rooms < 1 || !Number.isSafeInteger(search.adults)
        || search.adults < 1 || !Number.isSafeInteger(search.children) || search.children < 0)
        return new HttpResponse(null, { status: 400 });
      const quote: StaffReservationQuoteDto = { quote_id: crypto.randomUUID(), property_id: propertyId, arrival: search.checkIn,
        departure: search.checkOut, nights, adults: search.adults, children: search.children, rooms: search.rooms,
        options: roomCatalogFixture(propertyId).types.flatMap(type => {
          const rate = tariffFixtures[type.id]; if (!rate) return [];
          const total = rate.nightly * nights * search.rooms;
          if (!Number.isSafeInteger(total)) return [];
          return [{ room_type_id: type.id, room_type_name: type.name, rate_plan_id: `MOCK-RATE-${type.id}`, rate_plan_name: 'Tarifa de alojamiento',
            capacity: type.presentation?.maxOccupancy ?? rate.capacity, available_rooms: available(propertyId, type.id, search.checkIn, search.checkOut, seeds()),
            nightly_minor: rate.nightly, total_minor: total, currency: 'GTQ' }];
        }) };
      quotes.set(quote.quote_id, quote); return HttpResponse.json(quote);
    }),
    http.post('*/__mock/staff-reservations/:propertyId', async ({ params, request }) => {
      const propertyId = String(params.propertyId), key = request.headers.get('Idempotency-Key');
      if (!key) return new HttpResponse(null, { status: 400 });
      let body: { quote_id?: string; room_type_id?: string; rate_plan_id?: string; guest?: { full_name?: string; email?: string; phone?: string }; notes?: string | null };
      try { body = await request.json() as typeof body; } catch { return new HttpResponse(null, { status: 400 }); }
      if (!body || typeof body !== 'object') return new HttpResponse(null, { status: 400 });
      const encoded = JSON.stringify(body), receipt = receipts.get(`${propertyId}:${key}`);
      if (receipt) return receipt.body === encoded ? HttpResponse.json(receipt.detail) : new HttpResponse(null, { status: 409 });
      const quote = quotes.get(body.quote_id ?? '');
      const option = quote?.options.find(item => item.room_type_id === body.room_type_id && item.rate_plan_id === body.rate_plan_id);
      if (!quote || quote.property_id !== propertyId || !option) return new HttpResponse(null, { status: 400 });
      const guest = { fullName: body.guest?.full_name ?? '', email: body.guest?.email ?? '', phone: body.guest?.phone ?? '', notes: body.notes ?? '' };
      if (Object.values(guest).some(value => typeof value !== 'string')) return new HttpResponse(null, { status: 400 });
      // The local fixture accepts quoted dates; admission is checked again atomically below.
      if (Object.keys(staffCreateErrors({ checkIn: quote.arrival, checkOut: quote.departure, adults: quote.adults,
        children: quote.children, rooms: quote.rooms }, guest, quote.arrival)).length || !calendarDay(quote.arrival))
        return new HttpResponse(null, { status: 400 });
      if (request.signal.aborted) return new HttpResponse(null, { status: 409 });
      const currentCapacity = roomCatalogFixture(propertyId).types.find(type => type.id === option.room_type_id)?.presentation?.maxOccupancy ?? option.capacity;
      if (currentCapacity * quote.rooms < quote.adults + quote.children
        || available(propertyId, option.room_type_id, quote.arrival, quote.departure, seeds()) < quote.rooms)
        return new HttpResponse(null, { status: 409 });
      const id = `LOCAL-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const detail: ReservationDetailDto = { reservation_id: id, property_id: propertyId, status: 'PENDING', created_at: new Date().toISOString().slice(0, 10),
        source: { label: 'Recepción', reference: null }, policy_label: 'Condiciones y garantía pendientes de confirmación',
        guest: { primary_name: guest.fullName.trim(), phone: guest.phone.trim(), adults: quote.adults, children: quote.children || null },
        stays: Array.from({ length: quote.rooms }, (_, index) => ({ stay_id: `${id}-STAY-${index + 1}`, room_id: null, room_label: null,
          room_type: option.room_type_name, check_in: quote.arrival, check_out: quote.departure, nights: quote.nights, travel_state: 'RESERVED' })),
        notes: guest.notes.trim() || null, currency: 'GTQ', total_amount: (option.total_minor / 100).toFixed(2), paid_amount: null,
        finance_state: 'NO_CAPTURE', rate_per_night: (option.nightly_minor / 100).toFixed(2),
        lines: [{ label: `Alojamiento · ${quote.rooms} ${quote.rooms === 1 ? 'habitación' : 'habitaciones'} · ${quote.nights} noches`, amount: (option.total_minor / 100).toFixed(2) }] };
      // No await between admission and insertion. A repeat returns the same Reservation and Stay IDs.
      bookings.set(id, { roomTypeId: option.room_type_id, detail }); receipts.set(`${propertyId}:${key}`, { body: encoded, detail });
      return HttpResponse.json(detail, { status: 201 });
    }),
  ];
}
