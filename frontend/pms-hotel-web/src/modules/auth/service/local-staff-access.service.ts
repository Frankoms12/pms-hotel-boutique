import { httpRequest } from '@/lib/http';
import { localStaffAccessEnabled } from '../model/local-staff-access';
import type { StaffIdentityDTO } from '../dtos/staff-session.dto';

/** MSW-only. No real authentication route, token, cookie or credential persistence. */
export function localStaffAccess(email: string, password: string, signal: AbortSignal): Promise<StaffIdentityDTO> {
  if (!localStaffAccessEnabled()) return Promise.reject(new Error('LOCAL_STAFF_ACCESS_DISABLED'));
  return httpRequest({
    path: new URL('/__mock/private-09/login', window.location.origin).href,
    method: 'POST', withAuth: false, headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }), signal,
  });
}
