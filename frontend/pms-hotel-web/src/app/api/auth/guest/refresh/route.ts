import { NextRequest, NextResponse } from "next/server";
import { applyGuestCookies, backendGuestRequest, guestRefreshCookie, type GuestTokens } from "@/lib/bff/guest-auth";

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(guestRefreshCookie)?.value;
  if (!refresh) return NextResponse.json({ error: "Guest session expired" }, { status: 401 });
  try {
    const backend = await backendGuestRequest("/api/v1/guest-auth/refresh", { method: "POST", headers: { cookie: `${guestRefreshCookie}=${encodeURIComponent(refresh)}` } });
    if (!backend.ok) return NextResponse.json({ error: backend.status >= 500 ? "Guest session unavailable" : "Guest session expired" }, { status: backend.status >= 500 ? 503 : 401, headers: {"Cache-Control":"no-store"} });
    const tokens = await backend.json() as GuestTokens;
    if (typeof tokens.accessToken!=="string" || !tokens.accessToken || typeof tokens.refreshToken!=="string" || !tokens.refreshToken || !Number.isFinite(tokens.accessTokenExpiresInSeconds) || tokens.accessTokenExpiresInSeconds<=0) throw new Error("Invalid Guest refresh response");
    const response = NextResponse.json({ refreshed: true }, {headers:{"Cache-Control":"no-store"}});
    applyGuestCookies(response, tokens);
    return response;
  } catch { return NextResponse.json({ error: "Guest session unavailable" }, { status: 503 }); }
}
