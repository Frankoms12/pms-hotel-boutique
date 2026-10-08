import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { resetStaffPreview, staffPreviewTransportGuard } from '@/data/mocks/staff-preview';
import { httpRequest } from '@/lib/http';
import { closeStaffPreview, getStaffPreviewDTO, openStaffPreview } from './staff-preview.service';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_STAFF_PREVIEW', 'true');
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true');
  resetStaffPreview();
});
afterEach(() => vi.unstubAllEnvs());
describe('Staff preview transport', () => {
  it('uses a dedicated mock contract and can close/reopen without credentials or a BFF', async () => {
    const session = await getStaffPreviewDTO();
    expect(session).toMatchObject({ roleCode: 'SUPER_ADMIN', memberships: [{ propertyId: 'GT-HB-01' }] });
    await closeStaffPreview();
    expect(await getStaffPreviewDTO()).toBeNull();
    await openStaffPreview();
    expect(await getStaffPreviewDTO()).toEqual(session);
  });
  it.each(['production', 'test'])('cannot open a preview session in %s even with flags set', async runtime => {
    vi.stubEnv('NODE_ENV', runtime);
    await expect(getStaffPreviewDTO()).rejects.toThrow('STAFF_PREVIEW_DISABLED');
    await expect(openStaffPreview()).rejects.toThrow('STAFF_PREVIEW_DISABLED');
    await expect(closeStaffPreview()).rejects.toThrow('STAFF_PREVIEW_DISABLED');
  });
  it('blocks unmocked API calls in the browser preview rather than reaching a real BFF', async () => {
    mockServer.use(staffPreviewTransportGuard);
    for (const path of ['/api/auth/login', '/api/auth/staff/session', '/api/v1/private/unconfigured']) {
      await expect(httpRequest({ path: new URL(path, window.location.origin).href, method: 'POST', withAuth: false }))
        .rejects.toMatchObject({ status: 503, responseData: { error: 'STAFF_PREVIEW_BACKEND_DISABLED' } });
    }
  });
  it('returns a transport error without inventing an identity if mocks are unavailable', async () => {
    mockServer.use(http.get('*/__mock/staff-preview/session', () => new HttpResponse(null, { status: 503 })));
    await expect(getStaffPreviewDTO()).rejects.toMatchObject({ status: 503 });
  });
});
