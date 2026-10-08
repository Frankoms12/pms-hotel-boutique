import { NextRequest, NextResponse } from "next/server";
import { applyStaffCookies, backendStaffRequest, staffRefreshCookie, type StaffTokens } from "@/lib/bff/staff-auth";

export async function POST(request: NextRequest) {
  const headers = { "cache-control": "no-store" };
  const refresh = request.cookies.get(staffRefreshCookie)?.value;
  if (!refresh) return NextResponse.json({ error: "Staff session expired" }, { status: 401, headers });
  try {
    const backend = await backendStaffRequest("/api/v1/staff-auth/refresh", {
      method: "POST",
      headers: { cookie: `${staffRefreshCookie}=${encodeURIComponent(refresh)}` },
    });
    if (backend.status === 401 || backend.status === 403) return NextResponse.json({ error: "Staff session expired" }, { status: 401, headers });
    if (!backend.ok) return NextResponse.json({ error: "Staff session unavailable" }, { status: 503, headers });
    const tokens = await backend.json() as StaffTokens;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.accessTokenExpiresInSeconds) return NextResponse.json({ error: "Staff session unavailable" }, { status: 503, headers });
    const response = NextResponse.json({ refreshed: true }, { headers });
    applyStaffCookies(response, tokens);
    return response;
  } catch { return NextResponse.json({ error: "Staff session unavailable" }, { status: 503, headers }); }
}
