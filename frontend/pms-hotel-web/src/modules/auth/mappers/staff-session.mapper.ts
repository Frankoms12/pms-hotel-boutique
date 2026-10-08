import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { choice, list, object, text } from "@/lib/validation";
import type { StaffIdentity, StaffRoleCode, StaffSession } from "../model/staff-session";

const roleNames: Record<StaffRoleCode, string> = {
  SUPER_ADMIN: "SuperAdmin",
  GERENCIA: "Gerencia",
  RECEPCION: "Recepción",
  OPERACIONES: "Operaciones",
  AUDITOR: "Auditoría",
};
const roleCodes = Object.keys(roleNames) as StaffRoleCode[];
const permissionCodes = [
  "MULTI_PROPERTY_READ", "STAFF_MANAGE", "RESERVATION_MANAGE", "FOLIO_PAYMENT_OPERATE",
  "PAYMENT_REFUND_VOID", "OPERATIONS_MANAGE", "COMMERCIAL_MANAGE", "AUDIT_READ", "NIGHT_AUDIT_RUN",
  "SERVICE_REQUEST_INTAKE",
] as const;

function mapMembership(value: unknown, propertyCode: string | null, active: boolean) {
  const item = object(value);
  const timezone = text(item.timezone);
  const currency = text(item.currency);
  try { new Intl.DateTimeFormat("es", { timeZone: timezone }); }
  catch { throw new DomainMappingError("INVALID_TIMEZONE"); }
  if (!/^[A-Z]{3}$/.test(currency)) throw new DomainMappingError("INVALID_CURRENCY");
  return { propertyId: text(item.property_id ?? item.propertyId), propertyCode, name: text(item.name), timezone, currency, active };
}

function ensureUniqueMemberships<T extends { propertyId: string }>(memberships: T[]): T[] {
  if (new Set(memberships.map(item => item.propertyId)).size !== memberships.length) throw new DomainMappingError("DUPLICATE_MEMBERSHIP");
  return memberships;
}

export function mapStaffIdentity(raw: unknown): StaffIdentity {
  const dto = object(raw);
  const memberships = ensureUniqueMemberships(list(dto.memberships).map(value => {
    const item = object(value);
    return mapMembership(item, null, choice(item.status, ["ACTIVE", "INACTIVE"]) === "ACTIVE");
  }));
  return { id: text(dto.session_id), userName: text(dto.user_name), roleId: text(dto.role_id), memberships };
}

export function mapStaffSession(raw: unknown): StaffSession {
  const dto = object(raw);
  const roleCode = choice(dto.roleCode, roleCodes);
  const permissions = Array.from(new Set(list(dto.permissions).map(value => choice(value, permissionCodes)))).sort();
  const memberships = ensureUniqueMemberships(list(dto.memberships).map(value => {
    const item = object(value);
    return mapMembership(item, text(item.propertyCode), true);
  }));
  return {
    id: text(dto.sessionId),
    staffUserId: text(dto.staffUserId),
    userName: text(dto.username),
    roleId: roleCode,
    roleName: roleNames[roleCode],
    permissions,
    memberships,
  };
}
