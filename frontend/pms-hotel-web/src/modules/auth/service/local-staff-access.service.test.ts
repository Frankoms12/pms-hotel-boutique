import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { localStaffAccess } from './local-staff-access.service';

afterEach(() => vi.unstubAllEnvs());
describe('local Staff access transport', () => {
  it.each([
    ['production', 'true'], ['development', 'false'], ['test', 'true'],
  ])('does not send credentials in %s with mock flag %s', async (mode, mock) => {
    vi.stubEnv('NODE_ENV', mode); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', mock);
    const requests = vi.fn();
    mockServer.use(http.post('*/__mock/private-09/login', () => { requests(); return HttpResponse.json({}); }));
    await expect(localStaffAccess('qa_staff@example.test', '12345678', new AbortController().signal)).rejects.toThrow('LOCAL_STAFF_ACCESS_DISABLED');
    expect(requests).not.toHaveBeenCalled();
  });
});
