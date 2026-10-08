import { NextRequest, type NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const backend = "http://backend:8080";
const tokens = { accessToken: "synthetic-access", refreshToken: "synthetic-refresh", accessTokenExpiresInSeconds: 900 };
const fetchBackend = vi.fn<typeof fetch>();
let staff: typeof import("./staff/session/route");
let guest: typeof import("./guest/session/route");
let staffRefresh: typeof import("./staff/refresh/route");
let guestRefresh: typeof import("./guest/refresh/route");

function request(path: string, method = "GET", cookies?: string, body?: string) {
  return new NextRequest(`http://localhost:3001/api/auth/${path}`, {
    method,
    headers: { ...(cookies ? { cookie: cookies } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body } : {}),
  });
}

function assertTokenCookies(response: NextResponse, context: "staff" | "guest") {
  expect(response.cookies.getAll().map(c => c.name).sort()).toEqual([`pms_${context}_access`, `pms_${context}_refresh`]);
  expect(response.cookies.get(`pms_${context}_access`)).toMatchObject({
    value: tokens.accessToken, httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 900,
  });
  expect(response.cookies.get(`pms_${context}_refresh`)).toMatchObject({
    value: tokens.refreshToken, httpOnly: true, sameSite: "lax", secure: true, path: `/api/auth/${context}/refresh`, maxAge: 7 * 24 * 60 * 60,
  });
}

function assertClearedCookies(response: NextResponse, context: "staff" | "guest") {
  expect(response.cookies.getAll().map(c => c.name).sort()).toEqual([`pms_${context}_access`, `pms_${context}_refresh`]);
  for (const kind of ["access", "refresh"]) expect(response.cookies.get(`pms_${context}_${kind}`)).toMatchObject({
    value: "", maxAge: 0, httpOnly: true, sameSite: "lax", path: kind === "access" ? "/" : `/api/auth/${context}/refresh`,
  });
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("PMS_BACKEND_INTERNAL_URL", `${backend}/`);
  vi.stubEnv("NODE_ENV", "production");
  fetchBackend.mockReset();
  vi.stubGlobal("fetch", fetchBackend);
  [staff, guest, staffRefresh, guestRefresh] = await Promise.all([
    import("./staff/session/route"), import("./guest/session/route"),
    import("./staff/refresh/route"), import("./guest/refresh/route"),
  ]);
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Browser session routes target explicit Backend authentication", () => {
  it("accepts exact 50 Staff credentials, with email normalized and password intact", async () => {
    fetchBackend.mockResolvedValue(Response.json(tokens, { status: 201 }));
    const email = 'a'.repeat(37) + '@example.test', password = ' ' + 'X!'.repeat(24) + ' ';
    const response = await staff.POST(request('staff/session', 'POST', undefined, JSON.stringify({email:' '+email.toUpperCase()+' ',password})));
    expect(response.status).toBe(201);
    expect(JSON.parse(fetchBackend.mock.calls[0][1]?.body as string)).toEqual({email,password});
  });

  it.each([
    {email:'a'.repeat(38)+'@example.test',password:'x'},
    {email:'valid@example.test',password:'x'.repeat(51)},
    {email:'bad-email',password:'x'}, {email:'',password:'x'}, {email:'valid@example.test',password:''},
  ])("rejects invalid Staff input case %# before Backend", async body => {
    expect((await staff.POST(request('staff/session','POST',undefined,JSON.stringify(body)))).status).toBe(400);
    expect(fetchBackend).not.toHaveBeenCalled();
  });
  it.each([500, 503])("does not disguise Backend %s as a Staff 401 or rotate cookies", async status => {
    fetchBackend.mockResolvedValue(new Response(null, { status }));
    const session = await staff.GET(request("staff/session", "GET", "pms_staff_access=synthetic-access"));
    const refresh = await staffRefresh.POST(request("staff/refresh", "POST", "pms_staff_refresh=synthetic-refresh"));
    for (const response of [session, refresh]) {
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.cookies.getAll()).toEqual([]);
    }
  });

  it("never caches Staff session/refresh success or authoritative unauthenticated responses", async () => {
    fetchBackend.mockResolvedValue(Response.json(tokens));
    const responses = [
      await staff.GET(request("staff/session", "GET", "pms_staff_access=synthetic-access")),
      await staff.GET(request("staff/session")),
      await staffRefresh.POST(request("staff/refresh", "POST", "pms_staff_refresh=synthetic-refresh")),
      await staffRefresh.POST(request("staff/refresh", "POST")),
    ];
    responses.forEach(response => expect(response.headers.get("cache-control")).toBe("no-store"));
  });

  it("keeps POST Staff session public while calling POST login once and keeping tokens in cookies", async () => {
    fetchBackend.mockResolvedValue(Response.json(tokens, { status: 201 }));
    const response = await staff.POST(request("staff/session", "POST", undefined, JSON.stringify({ email: " TEST-STAFF@example.test ", password: "synthetic-password" })));
    expect(fetchBackend).toHaveBeenCalledExactlyOnceWith(`${backend}/api/v1/staff-auth/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test-staff@example.test", password: "synthetic-password" }), cache: "no-store",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ authenticated: true });
    assertTokenCookies(response, "staff");
  });

  it.each(["{", "{}", '{"email":"","password":""}'])("preserves 400 input rejection without calling login (%s)", async body => {
    expect((await staff.POST(request("staff/session", "POST", undefined, body))).status).toBe(400);
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it.each(["rejected", "unavailable", "incomplete"])("preserves login failure semantics for %s", async outcome => {
    if (outcome === "unavailable") fetchBackend.mockRejectedValue(new Error("synthetic-network-error"));
    else fetchBackend.mockResolvedValue(Response.json(outcome === "incomplete" ? {} : { error: "denied" }, { status: outcome === "rejected" ? 401 : 201 }));
    const response = await staff.POST(request("staff/session", "POST", undefined, '{"email":"test-staff@example.test","password":"synthetic-password"}'));
    expect(response.status).toBe(outcome === "rejected" ? 401 : 503);
    expect(response.cookies.getAll()).toEqual([]);
    expect(await response.json()).toEqual({ error: outcome === "rejected" ? "Invalid credentials" : "Staff authentication is unavailable" });
  });

  describe.each(["staff", "guest"] as const)("%s remains isolated", context => {
    it("GET public session calls GET me with only its access cookie", async () => {
      const session = context === "staff"
        ? { staffUserId: "staff-1", sessionId: "session-1", username: "test-staff", roleCode: "RECEPCION", permissions: ["RESERVATION_MANAGE"], memberships: [] }
        : { guestAccountId: "guest-1", sessionId: "session-2", email: "guest@example.test", context: "GUEST" };
      fetchBackend.mockResolvedValue(Response.json(session));
      const handler = context === "staff" ? staff : guest;
      const response = await handler.GET(request(`${context}/session`, "GET", `pms_${context}_access=synthetic-access; pms_${context === "staff" ? "guest" : "staff"}_access=foreign`));
      expect(fetchBackend).toHaveBeenCalledExactlyOnceWith(`${backend}/api/v1/${context}-auth/me`, {
        headers: { authorization: "Bearer synthetic-access" }, cache: "no-store",
      });
      // Omitting the fetch method means GET; no public response envelope is introduced.
      expect(fetchBackend.mock.calls[0][1]?.method ?? "GET").toBe("GET");
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(session);
      expect(response.cookies.getAll()).toEqual([]);
    });

    it.each(["missing", "foreign", "rejected", "unavailable"])("preserves session auth/errors for %s", async outcome => {
      const handler = context === "staff" ? staff : guest;
      fetchBackend.mockRejectedValue(new Error("synthetic-network-error"));
      if (outcome === "rejected") fetchBackend.mockResolvedValue(new Response(null, { status: 401 }));
      const cookie = outcome === "missing" ? undefined : outcome === "foreign" ? `pms_${context === "staff" ? "guest" : "staff"}_access=foreign` : `pms_${context}_access=synthetic-access`;
      const response = await handler.GET(request(`${context}/session`, "GET", cookie));
      expect(response.status).toBe(outcome === "unavailable" ? 503 : 401);
      expect(await response.json()).toEqual({ error: `${context === "staff" ? "Staff" : "Guest"} session ${outcome === "unavailable" ? "unavailable" : "required"}` });
      if (outcome === "missing" || outcome === "foreign") expect(fetchBackend).not.toHaveBeenCalled();
    });

    it("DELETE public session calls POST logout once and clears only its context", async () => {
      fetchBackend.mockResolvedValue(new Response(null, { status: 204 }));
      const handler = context === "staff" ? staff : guest;
      const response = await handler.DELETE(request(`${context}/session`, "DELETE", `pms_${context}_access=synthetic-access; pms_${context === "staff" ? "guest" : "staff"}_access=foreign`));
      expect(fetchBackend).toHaveBeenCalledExactlyOnceWith(`${backend}/api/v1/${context}-auth/logout`, {
        method: "POST", headers: { authorization: "Bearer synthetic-access" }, cache: "no-store",
      });
      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
      assertClearedCookies(response, context);
    });

    it.each(["missing", "foreign", "rejected", "unavailable"])("still clears cookies and returns 204 on logout %s", async outcome => {
      fetchBackend.mockRejectedValue(new Error("synthetic-network-error"));
      if (outcome === "rejected") fetchBackend.mockResolvedValue(new Response(null, { status: 401 }));
      const cookie = outcome === "missing" ? undefined : outcome === "foreign" ? `pms_${context === "staff" ? "guest" : "staff"}_access=foreign` : `pms_${context}_access=synthetic-access`;
      const response = await (context === "staff" ? staff : guest).DELETE(request(`${context}/session`, "DELETE", cookie));
      if(context==='guest' && outcome==='unavailable'){
        expect(response.status).toBe(503);expect(response.cookies.getAll()).toEqual([]);
      }else{expect(response.status).toBe(204);assertClearedCookies(response,context);}
      if (outcome === "missing" || outcome === "foreign") expect(fetchBackend).not.toHaveBeenCalled();
    });

    it("refresh stays POST refresh, forwards its opaque cookie and keeps tokens out of JSON", async () => {
      fetchBackend.mockResolvedValue(Response.json(tokens));
      const response = await (context === "staff" ? staffRefresh : guestRefresh).POST(request(`${context}/refresh`, "POST", `pms_${context}_refresh=synthetic-refresh`));
      expect(fetchBackend).toHaveBeenCalledExactlyOnceWith(`${backend}/api/v1/${context}-auth/refresh`, {
        method: "POST", headers: { cookie: `pms_${context}_refresh=synthetic-refresh` }, cache: "no-store",
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ refreshed: true });
      assertTokenCookies(response, context);
    });

    it.each(["missing", "foreign", "rejected", "unavailable"])("preserves refresh auth/errors for %s", async outcome => {
      fetchBackend.mockRejectedValue(new Error("synthetic-network-error"));
      if (outcome === "rejected") fetchBackend.mockResolvedValue(new Response(null, { status: 401 }));
      const cookie = outcome === "missing" ? undefined : outcome === "foreign" ? `pms_${context === "staff" ? "guest" : "staff"}_refresh=foreign` : `pms_${context}_refresh=synthetic-refresh`;
      const response = await (context === "staff" ? staffRefresh : guestRefresh).POST(request(`${context}/refresh`, "POST", cookie));
      expect(response.status).toBe(outcome === "unavailable" ? 503 : 401);
      expect(response.cookies.getAll()).toEqual([]);
      if (outcome === "missing" || outcome === "foreign") expect(fetchBackend).not.toHaveBeenCalled();
    });
  });
});
