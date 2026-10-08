import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const upstream = vi.fn<typeof fetch>();
let callback: typeof import('./route');
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080');
  vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001');
  vi.stubEnv('NODE_ENV', 'production');
  upstream.mockReset(); vi.stubGlobal('fetch', upstream);
  callback = await import('./route');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Google callback confirmation destination', () => {
  it('opens the linked-account view after exchange while retaining Guest cookie isolation', async () => {
    upstream.mockResolvedValue(Response.json({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', accessTokenExpiresInSeconds: 900 }));
    const response = await callback.GET(new NextRequest('http://localhost:3001/api/auth/guest/google/callback?code=synthetic-code&state=synthetic-state'));
    expect(response.headers.get('location')).toBe('http://localhost:3001/acceso');
    expect(upstream).toHaveBeenCalledExactlyOnceWith('http://backend:8080/api/v1/guest-auth/google/exchange', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'synthetic-code', state: 'synthetic-state' }), cache: 'no-store',
    });
    expect(response.cookies.getAll().map(cookie => cookie.name).sort()).toEqual(['pms_guest_access', 'pms_guest_refresh']);
    expect(response.cookies.get('pms_guest_access')).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 900 });
    expect(response.cookies.get('pms_guest_refresh')).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/api/auth/guest/refresh' });
    expect(response.headers.get('location')).not.toMatch(/synthetic-/);
  });
  it('does not exchange incomplete callbacks or create a session', async () => {
    const response = await callback.GET(new NextRequest('http://localhost:3001/api/auth/guest/google/callback?code=synthetic-code'));
    expect(response.headers.get('location')).toBe('http://localhost:3001/acceso?error=google');
    expect(upstream).not.toHaveBeenCalled(); expect(response.cookies.getAll()).toHaveLength(0);
  });
  it('keeps rejected exchanges on the error path without cookies', async () => {
    upstream.mockResolvedValue(new Response(null, { status: 401 }));
    const response = await callback.GET(new NextRequest('http://localhost:3001/api/auth/guest/google/callback?code=synthetic-code&state=synthetic-state'));
    expect(response.headers.get('location')).toBe('http://localhost:3001/acceso?error=google');
    expect(response.cookies.getAll()).toHaveLength(0);
  });
});
