import { http, HttpResponse, passthrough } from 'msw';
import { staffPreviewEnabled } from '@/lib/staff-preview';
import type { StaffSessionDTO } from '@/modules/auth/dtos/staff-session.dto';

// Dedicated preview contract, not a real Staff session, account or Backend API.
const previewIdentity: StaffSessionDTO = {
  staffUserId: 'PREVIEW-STAFF', sessionId: 'PREVIEW-STAFF-SESSION',
  username: 'Staff · Vista previa', roleCode: 'SUPER_ADMIN',
  permissions: ['RESERVATION_MANAGE', 'OPERATIONS_MANAGE', 'COMMERCIAL_MANAGE'],
  memberships: [{ propertyId: 'GT-HB-01', propertyCode: 'GT-HB-01', name: 'Hotel Boutique Huehue',
    timezone: 'America/Guatemala', currency: 'GTQ' }],
};
let open = true;
export function resetStaffPreview() { open = true; }

export const staffPreviewHandlers = [
  http.get('*/__mock/staff-preview/session', () => !staffPreviewEnabled()
    ? new HttpResponse(null, { status: 404 })
    : open ? HttpResponse.json(previewIdentity) : new HttpResponse(null, { status: 401 })),
  http.post('*/__mock/staff-preview/session', () => {
    if (!staffPreviewEnabled()) return new HttpResponse(null, { status: 404 });
    open = true;
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete('*/__mock/staff-preview/session', () => {
    if (!staffPreviewEnabled()) return new HttpResponse(null, { status: 404 });
    open = false;
    return new HttpResponse(null, { status: 204 });
  }),
];

/** Last browser handler: no unmocked BFF/API request reaches Backend in preview. */
export const staffPreviewTransportGuard = http.all('*/api/*', () => staffPreviewEnabled()
  ? HttpResponse.json({ error: 'STAFF_PREVIEW_BACKEND_DISABLED' }, { status: 503 })
  : passthrough());
