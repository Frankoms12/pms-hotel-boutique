import { NextRequest, NextResponse } from 'next/server';
import { applyStaffCookies, backendStaffRequest, type StaffTokens } from '@/lib/bff/staff-auth';
import { applyGuestCookies } from '@/lib/bff/guest-auth';
import { passwordExceedsByteLimit } from '@/lib/login-input';
import { loginCredentials } from '@/lib/bff/login-credentials';

const failure = (status: number) => NextResponse.json({ error: status === 503 ? 'Authentication unavailable' : 'Invalid credentials' }, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Next's request origin can contain the container's internal hostname/port.
  const publicOrigin = new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin;
  if (origin && origin !== publicOrigin) return failure(403);
  let body: unknown;
  try { body = await request.json(); } catch { return failure(400); }
  if (body && typeof body === "object" && passwordExceedsByteLimit((body as Record<string,unknown>).password)) return failure(401);
  const credentials = loginCredentials(body);
  if (!credentials) return failure(400);
  try {
    const backend = await backendStaffRequest('/api/v1/auth/sessions', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
    });
    if (!backend.ok) return failure(backend.status >= 500 ? 503 : 401);
    const result = await backend.json() as Partial<StaffTokens> & { context?: string; contexts?: string[] };
    if (backend.status === 200 && result.contexts?.length === 2 && result.contexts.includes('STAFF') && result.contexts.includes('GUEST')) {
      return NextResponse.json({ authenticated: false, contexts: ['STAFF', 'GUEST'] }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (backend.status !== 201 || (result.context !== 'STAFF' && result.context !== 'GUEST')
      || typeof result.accessToken !== 'string' || !result.accessToken
      || typeof result.refreshToken !== 'string' || !result.refreshToken
      || typeof result.accessTokenExpiresInSeconds !== 'number' || result.accessTokenExpiresInSeconds <= 0) return failure(503);
    const response = NextResponse.json({ authenticated: true, context: result.context }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    const tokens = result as StaffTokens;
    if (result.context === 'STAFF') applyStaffCookies(response, tokens);
    else applyGuestCookies(response, tokens);
    return response;
  } catch { return failure(503); }
}
