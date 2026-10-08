import { NextRequest, NextResponse } from "next/server";
import { backendGuestRequest, guestAccessCookie } from "@/lib/bff/guest-auth";

export async function GET(request: NextRequest) {
  const access = request.cookies.get(guestAccessCookie)?.value;
  if (!access) return NextResponse.json({ error: "Guest session required" }, { status: 401 });
  try {
    const backend = await backendGuestRequest("/api/v1/guest-auth/me", { headers: { authorization: `Bearer ${access}` } });
    if (!backend.ok) return NextResponse.json({ error: backend.status >= 500 ? "Guest session unavailable" : "Guest session required" }, { status: backend.status >= 500 ? 503 : 401, headers: {"Cache-Control":"no-store"} });
    return NextResponse.json(await backend.json(),{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({ error: "Guest session unavailable" }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  const access = request.cookies.get(guestAccessCookie)?.value;
  // If access has expired, restore once to revoke the persisted session instead of only clearing cookies.
  let logoutAccess=access;
  if(!logoutAccess){
    const {guestRefreshCookie}=await import('@/lib/bff/guest-auth');
    const refresh=request.cookies.get(guestRefreshCookie)?.value;
    if(refresh){try{
      const upstream=await backendGuestRequest('/api/v1/guest-auth/refresh',{method:'POST',headers:{cookie:`${guestRefreshCookie}=${encodeURIComponent(refresh)}`}});
      if(upstream.ok){const pair=await upstream.json();logoutAccess=pair.accessToken;}
      else if(upstream.status!==401)return NextResponse.json({error:'Guest logout unavailable'},{status:503});
    }catch{return NextResponse.json({error:'Guest logout unavailable'},{status:503});}}
  }
  const response = new NextResponse(null, { status: 204 });
  if (logoutAccess) {
    try {
      const backend=await backendGuestRequest("/api/v1/guest-auth/logout",{method:"POST",headers:{authorization:`Bearer ${logoutAccess}`}});
      if(!backend.ok && backend.status!==401)return NextResponse.json({error:"Guest logout unavailable"},{status:503});
    }catch{return NextResponse.json({error:"Guest logout unavailable"},{status:503});}
  }
  const { clearGuestCookies } = await import("@/lib/bff/guest-auth");
  clearGuestCookies(response);
  return response;
}
