import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { describe, expect, it } from "vitest";

import type { ReservationDetailDto, ReservationStayDetailDto } from "../dtos/reservation-detail.dto";
import { mapReservationDetail } from "./reservation-detail.mapper";

function stayDto(overrides: Partial<ReservationStayDetailDto> = {}): ReservationStayDetailDto {
  return {
    stay_id: "STAY-001",
    room_id: "RM-203",
    room_label: "203",
    room_type: "Deluxe King",
    check_in: "2026-08-28",
    check_out: "2026-08-31",
    nights: 3,
    travel_state: "RESERVED",
    ...overrides,
  };
}

function detailDto(overrides: Partial<ReservationDetailDto> = {}): ReservationDetailDto {
  return {
    reservation_id: "HB-2026-08421",
    property_id: "GT-HB-01",
    status: "CONFIRMED",
    created_at: "2026-08-24",
    source: { label: "Viajes Maya", reference: "VM-77821 · TA-MAYA-01" },
    policy_label: "Flexible 48h · Viajes Maya",
    guest: { primary_name: "María López", phone: "+502 5555 5555", adults: 2, children: null },
    stays: [stayDto()],
    notes: "Llegada estimada 15:00. Solicita habitación tranquila.",
    currency: "GTQ",
    total_amount: "3920",
    paid_amount: "2400",
    finance_state: "BALANCE",
    rate_per_night: "1160",
    lines: [
      { label: "Habitación · 3 noches", amount: "3480" },
      { label: "Impuestos", amount: "240" },
      { label: "Servicio", amount: "200" },
    ],
    ...overrides,
  };
}

describe("mapReservationDetail", () => {
  it('accepts a stay with a room type but no assigned physical room', () => {
    const detail = mapReservationDetail(detailDto({ stays: [stayDto({ room_id: null, room_label: null })] }));
    expect(detail.stays[0]).toMatchObject({ roomId: null, roomLabel: null, roomType: 'Deluxe King' });
  });
  it('rejects an inconsistent physical room assignment', () => {
    expect(() => mapReservationDetail(detailDto({ stays: [stayDto({ room_id: null })] }))).toThrow('INCONSISTENT_ROOM_ASSIGNMENT');
  });
  it("maps a complete detail to Domain data", () => {
    const detail = mapReservationDetail(detailDto());

    expect(detail).toEqual({
      id: "HB-2026-08421",
      propertyId: "GT-HB-01",
      status: "CONFIRMED",
      createdAt: new Date("2026-08-24T00:00:00"),
      source: { label: "Viajes Maya", reference: "VM-77821 · TA-MAYA-01" },
      policyLabel: "Flexible 48h · Viajes Maya",
      guest: { primaryName: "María López", phone: "+502 5555 5555", adults: 2, children: null },
      stays: [
        {
          id: "STAY-001",
          roomId: "RM-203",
          roomLabel: "203",
          roomType: "Deluxe King",
          checkIn: new Date("2026-08-28T00:00:00"),
          checkOut: new Date("2026-08-31T00:00:00"),
          nights: 3,
          travelState: "RESERVED",
        },
      ],
      notes: "Llegada estimada 15:00. Solicita habitación tranquila.",
      currency: "GTQ",
      finance: {
        totalAmount: 3920,
        paidAmount: 2400,
        financeState: "BALANCE",
        ratePerNight: 1160,
        lines: [
          { label: "Habitación · 3 noches", amount: 3480 },
          { label: "Impuestos", amount: 240 },
          { label: "Servicio", amount: 200 },
        ],
      },
    });
  });

  it("preserves every stay independently for multi-room reservations", () => {
    const detail = mapReservationDetail(detailDto({
      stays: [stayDto(), stayDto({ stay_id: "STAY-002", room_id: "RM-101", room_label: "101" })],
    }));

    expect(detail.stays).toHaveLength(2);
    expect(detail.stays[0].id).toBe("STAY-001");
    expect(detail.stays[1].id).toBe("STAY-002");
    expect(detail.stays[1].roomLabel).toBe("101");
  });

  it("rejects a detail without stays (Reservation must contain at least one Stay)", () => {
    expect(() => mapReservationDetail(detailDto({ stays: [] }))).toThrow(DomainMappingError);
  });

  it("rejects invalid financial amounts", () => {
    expect(() => mapReservationDetail(detailDto({ total_amount: "abc" }))).toThrow(DomainMappingError);
    expect(() => mapReservationDetail(detailDto({ rate_per_night: "-100" }))).toThrow(DomainMappingError);
  });
});
