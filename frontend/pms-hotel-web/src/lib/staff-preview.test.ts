import { afterEach, describe, expect, it, vi } from 'vitest';
import { staffPreviewEnabled } from './staff-preview';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('explicit local Staff preview', () => {
  it.each([
    ['development', 'true', 'true', 'localhost', true],
    ['development', 'true', 'true', '127.0.0.1', true],
    ['development', 'true', 'true', '[::1]', true],
    ['development', undefined, 'true', 'localhost', false],
    ['development', 'true', 'false', 'localhost', false],
    ['development', 'true', 'true', 'hotel.example', false],
    ['production', 'true', 'true', 'localhost', false],
    ['test', 'true', 'true', 'localhost', false],
  ])('gates runtime=%s flag=%s mocks=%s host=%s', (runtime, flag, mocks, host, allowed) => {
    vi.stubEnv('NODE_ENV', runtime);
    vi.stubEnv('NEXT_PUBLIC_STAFF_PREVIEW', flag);
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', mocks);
    vi.stubGlobal('window', { location: { hostname: host } });
    expect(staffPreviewEnabled()).toBe(allowed);
  });
});
