import { delay, http, HttpResponse } from "msw";
import { mapStaffIdentity } from "@/modules/auth/mappers/staff-session.mapper";
import type { StaffIdentityDTO } from "@/modules/auth/dtos/staff-session.dto";
import { mapRoles } from "@/modules/permissions/mappers/roles.mapper";
import { mapSecurity } from "@/modules/security/mappers/security.mapper";
import { resolvePropertyScope } from "@/modules/properties";
import type { PortfolioDTO, ComparisonDTO } from "@/modules/multi-property/dtos/portfolio.dto";
import { stayDates } from "@/modules/multi-property/model/portfolio";
import { initialRoles, initialSecurity, private07Keys } from "./private-07";
import { isLocalStaffLogin, localStaffAccessEnabled } from '@/modules/auth/model/local-staff-access';

export const private09Keys = { identity: "pms:private-09:identity:v1", scenario: "pms:private-09:scenario" };
export function initialStaffIdentity(): StaffIdentityDTO {
  return { session_id: "staff-current", user_name: "Usuario de demostración", role_id: "gerencia", memberships: [
    { property_id: "GT-HB-01", name: "Hotel Boutique Huehue", timezone: "America/Guatemala", currency: "GTQ", status: "ACTIVE" },
    { property_id: "GT-HB-03", name: "Hotel Boutique Antigua", timezone: "America/Guatemala", currency: "GTQ", status: "ACTIVE" },
  ] };
}

function read(key: string, initial: () => unknown): unknown {
  const stored = localStorage.getItem(key);
  return stored === null ? initial() : JSON.parse(stored);
}

function session() {
  const identity = mapStaffIdentity(read(private09Keys.identity, initialStaffIdentity));
  const role = mapRoles(read(private07Keys.roles, initialRoles)).find(role => role.id === identity.roleId);
  const security = mapSecurity(read(private07Keys.security, initialSecurity));
  if (!role || !security.sessions.some(item => item.current && item.id === identity.id && item.status === "active")) throw new Error("SESSION_REQUIRED");
  return { ...identity, roleName: role.name, permissions: role.permissions };
}

function authorizedIds(url: URL, compare: boolean) {
  const staff = session();
  if (compare && !staff.permissions.includes("COMPARE_AVAILABILITY")) throw new Error("COMPARISON_NOT_ALLOWED");
  const ids = url.searchParams.getAll("property");
  const kind = url.searchParams.get("scope");
  if (!ids.length || new Set(ids).size !== ids.length || !["PROPERTY", "ALL_PROPERTIES"].includes(kind ?? "")) throw new Error("INVALID_SCOPE");
  const scope = resolvePropertyScope(staff, kind === "ALL_PROPERTIES" ? "ALL_PROPERTIES" : ids[0]);
  if (!scope || scope.propertyIds.length !== ids.length || ids.some(id => !scope.propertyIds.includes(id))) throw new Error("INVALID_SCOPE");
  return ids;
}

// Existing Private 09 snapshot moved out of the UI. No Revenue service or inventory mutation.
const metrics: PortfolioDTO["metrics"] = [
  { property_id: "GT-HB-01", currency: "GTQ", date: "2026-09-08", sold_room_nights: 82, available_room_nights: 100, net_revenue: "92250.00" },
  { property_id: "GT-HB-03", currency: "GTQ", date: "2026-09-08", sold_room_nights: 76, available_room_nights: 100, net_revenue: "101800.00" },
];
const options: ComparisonDTO["options"] = [
  { property_id: "GT-HB-01", room_type_id: "deluxe-king", room_type_name: "Deluxe King", currency: "GTQ", nightly_rate: "1150.00", daily: [{ date: "2026-09-12", ats: 2 }, { date: "2026-09-13", ats: 3 }] },
  { property_id: "GT-HB-01", room_type_id: "standard-twin", room_type_name: "Standard Twin", currency: "GTQ", nightly_rate: "900.00", daily: [{ date: "2026-09-12", ats: 1 }, { date: "2026-09-13", ats: 1 }] },
  { property_id: "GT-HB-03", room_type_id: "patio-king", room_type_name: "Patio King", currency: "GTQ", nightly_rate: "1340.00", daily: [{ date: "2026-09-12", ats: 5 }, { date: "2026-09-13", ats: 4 }] },
  { property_id: "GT-HB-03", room_type_id: "colonial-suite", room_type_name: "Colonial Suite", currency: "GTQ", nightly_rate: "1650.00", daily: [{ date: "2026-09-12", ats: 2 }, { date: "2026-09-13", ats: 2 }] },
];

async function response(request: Request, compare: boolean) {
  try {
    const url = new URL(request.url);
    // Resolve the permitted set before selecting any property data.
    const ids = authorizedIds(url, compare);
    const scenario = localStorage.getItem(private09Keys.scenario);
    await delay(scenario === "loading" ? 3000 : 150);
    if (scenario === "error") return HttpResponse.json({ error: "DEMO_UNAVAILABLE" }, { status: 503 });
    if (!compare) return HttpResponse.json({ metrics: scenario === "empty" ? [] : ids.flatMap(id => metrics.filter(row => row.property_id === id)) });
    const criteria = { startDate: url.searchParams.get("start") ?? "", endDate: url.searchParams.get("end") ?? "", roomType: url.searchParams.get("roomType")?.trim().toLowerCase() ?? "" };
    const dates = stayDates(criteria);
    if (!dates.length) return HttpResponse.json({ error: "INVALID_RANGE" }, { status: 400 });
    return HttpResponse.json({ options: scenario === "empty" ? [] : ids.flatMap(id => options.filter(row => row.property_id === id && row.room_type_name.toLowerCase().includes(criteria.roomType) && dates.every(date => row.daily.some(day => day.date === date))).map(row => ({ ...row, daily: row.daily.filter(day => dates.includes(day.date)) }))) });
  } catch { return HttpResponse.json({ error: "DEMO_SCOPE_UNAVAILABLE" }, { status: 403 }); }
}

export const private09Handlers = [
  http.post('*/__mock/private-09/login', async ({ request }) => {
    if (!localStaffAccessEnabled()) return new HttpResponse(null, { status: 404 });
    const input = await request.json() as { email?: unknown; password?: unknown };
    await delay(200);
    if (request.signal.aborted) return new HttpResponse(null, { status: 409 });
    if (typeof input?.email !== 'string' || !isLocalStaffLogin(input.email) || input.password !== '12345678')
      return new HttpResponse(null, { status: 401 });
    const identity = { ...initialStaffIdentity(), user_name: 'qa_staff', role_id: 'superadmin' };
    try {
      const security = read(private07Keys.security, initialSecurity) as ReturnType<typeof initialSecurity>;
      mapSecurity(security);
      const current = security.sessions.find(item => item.is_current);
      if (current) { current.session_id = identity.session_id; current.status = 'active'; current.last_active = new Date().toISOString(); }
      else security.sessions.push(initialSecurity().sessions[0]);
      // Only fixture identity/security are saved; never the request or its password.
      const previousIdentity = localStorage.getItem(private09Keys.identity);
      const previousSecurity = localStorage.getItem(private07Keys.security);
      try {
        localStorage.setItem(private09Keys.identity, JSON.stringify(identity));
        localStorage.setItem(private07Keys.security, JSON.stringify(security));
      } catch {
        if (previousIdentity === null) localStorage.removeItem(private09Keys.identity);
        else localStorage.setItem(private09Keys.identity, previousIdentity);
        if (previousSecurity === null) localStorage.removeItem(private07Keys.security);
        else localStorage.setItem(private07Keys.security, previousSecurity);
        throw new Error('LOCAL_STAFF_STORAGE_UNAVAILABLE');
      }
      return HttpResponse.json(identity);
    } catch { return new HttpResponse(null, { status: 503 }); }
  }),
  http.get("*/__mock/private-09/session", () => {
    try {
      const raw = read(private09Keys.identity, initialStaffIdentity);
      mapStaffIdentity(raw);
      return HttpResponse.json(raw as StaffIdentityDTO);
    } catch { return HttpResponse.json({ error: "DEMO_IDENTITY_UNAVAILABLE" }, { status: 409 }); }
  }),
  http.get("*/__mock/private-09/metrics", ({ request }) => response(request, false)),
  http.get("*/__mock/private-09/comparison", ({ request }) => response(request, true)),
];
