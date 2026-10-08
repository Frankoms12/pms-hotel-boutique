import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapStaffSession } from "./staff-session.mapper";

const session = {
  staffUserId: "77b2413e-162a-4d31-8ef7-fbde62e01cab",
  sessionId: "8c657b55-7d03-4f10-a77c-1883ad0fd4ae",
  username: "  recepcion.norte  ",
  roleCode: "RECEPCION",
  permissions: ["RESERVATION_MANAGE", "FOLIO_PAYMENT_OPERATE"],
  memberships: [{
    propertyId: "3f59d7f4-d769-4eb2-9f1b-862ee02e778b",
    propertyCode: "HB-GT-001",
    name: " Hotel Boutique ",
    timezone: "America/Guatemala",
    currency: "GTQ",
  }],
};

describe("mapStaffSession", () => {
  it("accepts the real Reception authorization including the intake permission", () => {
    expect(mapStaffSession({ ...session, permissions: ["RESERVATION_MANAGE", "SERVICE_REQUEST_INTAKE", "FOLIO_PAYMENT_OPERATE"] }).permissions)
      .toEqual(["FOLIO_PAYMENT_OPERATE", "RESERVATION_MANAGE", "SERVICE_REQUEST_INTAKE"]);
  });
  it("maps the C2 BFF session without exposing tokens", () => {
    expect(mapStaffSession(session)).toEqual({
      id: "8c657b55-7d03-4f10-a77c-1883ad0fd4ae",
      staffUserId: "77b2413e-162a-4d31-8ef7-fbde62e01cab",
      userName: "recepcion.norte",
      roleId: "RECEPCION",
      roleName: "Recepción",
      permissions: ["FOLIO_PAYMENT_OPERATE", "RESERVATION_MANAGE"],
      memberships: [{
        propertyId: "3f59d7f4-d769-4eb2-9f1b-862ee02e778b",
        propertyCode: "HB-GT-001",
        name: "Hotel Boutique",
        timezone: "America/Guatemala",
        currency: "GTQ",
        active: true,
      }],
    });
  });

  it("rejects unknown roles, permissions and duplicated authorized properties", () => {
    expect(() => mapStaffSession({ ...session, roleCode: "ROOT" })).toThrow(new DomainMappingError("INVALID_ENUM"));
    expect(() => mapStaffSession({ ...session, permissions: ["ROOT"] })).toThrow(new DomainMappingError("INVALID_ENUM"));
    expect(() => mapStaffSession({ ...session, memberships: [session.memberships[0], session.memberships[0]] })).toThrow(new DomainMappingError("DUPLICATE_MEMBERSHIP"));
  });

  it("rejects malformed property metadata rather than inventing an authorized scope", () => {
    expect(() => mapStaffSession({ ...session, memberships: [{ ...session.memberships[0], timezone: "invalid" }] })).toThrow(new DomainMappingError("INVALID_TIMEZONE"));
    expect(() => mapStaffSession({ ...session, memberships: [{ ...session.memberships[0], currency: "GTQA" }] })).toThrow(new DomainMappingError("INVALID_CURRENCY"));
  });
});
