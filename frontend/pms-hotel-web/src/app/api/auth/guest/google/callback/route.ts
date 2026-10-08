import { NextRequest, NextResponse } from "next/server";
import { applyGuestCookies, backendGuestRequest, type GuestTokens } from "@/lib/bff/guest-auth";

function redirectToApp(path: string) {
  return NextResponse.redirect(new URL(path, process.env.PMS_WEB_PUBLIC_URL ?? "http://localhost:3001"));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) return redirectToApp("/acceso?error=google");
  try {
    const exchange = await backendGuestRequest("/api/v1/guest-auth/google/exchange", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, state }) });
    if (!exchange.ok) return redirectToApp("/acceso?error=google");
    const tokens = await exchange.json() as GuestTokens;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.accessTokenExpiresInSeconds) return redirectToApp("/acceso?error=google");
    const response = redirectToApp("/acceso");
    applyGuestCookies(response, tokens);
    return response;
  } catch {
    return redirectToApp("/acceso?error=google");
  }
}
