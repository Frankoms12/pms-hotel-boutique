import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockServer } from "@/data/mocks/server";
import { HttpStatusError, setAuthToken } from "@/lib/http";
import { getActiveStaffSessionDTO, logoutStaffSession } from "./staff-session.service";

const session = { staffUserId: "staff", sessionId: "session", username: "staff-demo", roleCode: "RECEPCION", permissions: [], memberships: [] };
afterEach(() => setAuthToken(null));
describe("bounded Staff session restoration", () => {
  it("shares one refresh rotation between simultaneous access failures", async () => {
    let accessValid = false;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    let bothInitial!: () => void;
    const started = new Promise<void>(resolve => { bothInitial = resolve; });
    const refresh = vi.fn(async () => { await pending; accessValid = true; return HttpResponse.json({ refreshed: true }); });
    mockServer.use(
      http.get("*/api/auth/staff/session", () => {
        if (++calls === 2) bothInitial();
        return accessValid ? HttpResponse.json(session) : new HttpResponse(null, { status: 401 });
      }),
      http.post("*/api/auth/staff/refresh", refresh),
    );
    const first = getActiveStaffSessionDTO(), second = getActiveStaffSessionDTO();
    await started;
    // Ensure both 401 responses are processed before completing the one rotation.
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    release();
    expect(await Promise.all([first, second])).toEqual([session, session]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toBe(4);
  });
  it("does not refresh on a 503 session load failure", async () => {
    const refresh = vi.fn(() => HttpResponse.json({ refreshed: true }));
    mockServer.use(http.get("*/api/auth/staff/session", () => new HttpResponse(null, { status: 503 })), http.post("*/api/auth/staff/refresh", refresh));
    await expect(getActiveStaffSessionDTO()).rejects.toMatchObject({ status: 503 });
    expect(refresh).not.toHaveBeenCalled();
  });
  it("does not bootstrap or refresh a cancelled session read", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const controller = new AbortController(); controller.abort();
    try {
      await expect(getActiveStaffSessionDTO(controller.signal)).rejects.toThrow();
      expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/api/auth/staff/refresh'))).toBe(false);
    } finally { fetch.mockRestore(); }
  });
  it("never attaches a generic Bearer token to Staff refresh/logout BFF requests", async () => {
    setAuthToken("synthetic-foreign-token");
    const headers: Headers[] = [];
    mockServer.use(http.get("*/api/auth/staff/session", () => new HttpResponse(null, { status: 401 })),
      http.post("*/api/auth/staff/refresh", ({ request }) => { headers.push(request.headers); return new HttpResponse(null, { status: 401 }); }),
      http.delete("*/api/auth/staff/session", ({ request }) => { headers.push(request.headers); return new HttpResponse(null, { status: 204 }); }));
    await expect(getActiveStaffSessionDTO()).rejects.toBeInstanceOf(HttpStatusError);
    await logoutStaffSession();
    expect(headers).toHaveLength(2);
    expect(headers.every(item => !item.has("authorization"))).toBe(true);
  });
});
