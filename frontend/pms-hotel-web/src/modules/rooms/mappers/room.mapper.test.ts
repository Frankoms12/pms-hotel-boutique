import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapRoom } from "./room.mapper";

const DTO = {
  room_id: " RM-101 ",
  property_id: " GT-HB-01 ",
  number: " 101 ",
  floor: " 1 ",
  status: " ACTIVE ",
  room_type_label: " Deluxe King ",
};

describe("mapRoom", () => {
  it('keeps an explicitly unknown floor as null without guessing from the room number', () => {
    expect(mapRoom({ ...DTO, floor: null })).toMatchObject({ number: '101', floor: null });
  });
  it("maps and normalizes a provisional room DTO", () => {
    expect(mapRoom(DTO)).toEqual({
      id: "RM-101",
      propertyId: "GT-HB-01",
      number: "101",
      floor: "1",
      status: "ACTIVE",
      roomTypeLabel: "Deluxe King",
    });
  });

  it("rejects an unknown room status", () => {
    expect(() => mapRoom({ ...DTO, status: "UNKNOWN" })).toThrow(
      new DomainMappingError("INVALID_ROOM_STATUS"),
    );
  });

  it("accepts OOO status", () => {
    expect(mapRoom({ ...DTO, status: "OOO" })).toEqual(
      expect.objectContaining({ status: "OOO" }),
    );
  });

  it("accepts OOS status", () => {
    expect(() => mapRoom({ ...DTO, status: "OOS" })).not.toThrow();
  });

  it("rejects a missing required room identifier", () => {
    expect(() => mapRoom({ ...DTO, room_id: " " })).toThrow(
      new DomainMappingError("INVALID_ROOM_ID"),
    );
  });

  it("rejects a missing room number", () => {
    expect(() => mapRoom({ ...DTO, number: " " })).toThrow(
      new DomainMappingError("INVALID_ROOM_NUMBER"),
    );
  });

  it("rejects a missing floor", () => {
    expect(() => mapRoom({ ...DTO, floor: " " })).toThrow(
      new DomainMappingError("INVALID_ROOM_FLOOR"),
    );
  });

  it("rejects a missing room type label", () => {
    expect(() => mapRoom({ ...DTO, room_type_label: " " })).toThrow(
      new DomainMappingError("INVALID_ROOM_TYPE_LABEL"),
    );
  });
});
