import { loginCredentials } from "@/lib/bff/login-credentials";
import { NextRequest, NextResponse } from "next/server";
import { applyStaffCookies, backendStaffRequest, clearStaffCookies, staffAccessCookie, type StaffTokens } from "@/lib/bff/staff-auth";

export async function POST(request: NextRequest) {
  let credentials: unknown;
  try { credentials = await request.json(); } catch { return NextResponse.json({ error: "Invalid Staff credentials" }, { status: 400 }); }
  const parsed = loginCredentials(credentials);
  if (!parsed) return NextResponse.json({ error: "Invalid Staff credentials" }, { status: 400 });
  try {
    const backend = await backendStaffRequest("/api/v1/staff-auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: parsed.email, password: parsed.password }),
    });
    if (!backend.ok) return NextResponse.json({ error: "Invalid credentials" }, { status: backend.status >= 500 ? 503 : 401 });
    const tokens = await backend.json() as StaffTokens;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.accessTokenExpiresInSeconds) return NextResponse.json({ error: "Staff authentication is unavailable" }, { status: 503 });
    const response = NextResponse.json({ authenticated: true }, { status: 201 });
    applyStaffCookies(response, tokens);
    return response;
  } catch { return NextResponse.json({ error: "Staff authentication is unavailable" }, { status: 503 }); }
}

export async function GET(request: NextRequest) {
  const headers = { "cache-control": "no-store" };
  const access = request.cookies.get(staffAccessCookie)?.value;
  if (!access) return NextResponse.json({ error: "Staff session required" }, { status: 401, headers });
  try {
    const backend = await backendStaffRequest("/api/v1/staff-auth/me", { headers: { authorization: `Bearer ${access}` } });
    if (backend.status === 401 || backend.status === 403) return NextResponse.json({ error: "Staff session required" }, { status: 401, headers });
    if (!backend.ok) return NextResponse.json({ error: "Staff session unavailable" }, { status: 503, headers });
    return NextResponse.json(await backend.json(), { headers });
  } catch { return NextResponse.json({ error: "Staff session unavailable" }, { status: 503, headers }); }
}

export async function DELETE(request: NextRequest) {
  const access = request.cookies.get(staffAccessCookie)?.value;
  const response = new NextResponse(null, { status: 204 });
  if (access) {
    try { await backendStaffRequest("/api/v1/staff-auth/logout", { method: "POST", headers: { authorization: `Bearer ${access}` } }); }
    catch { /* Cookie clearing still terminates the browser session. */ }
  }
  clearStaffCookies(response);
  return response;
}
