import { HttpStatusError, httpRequest } from '@/lib/http';
import { staffPreviewEnabled } from '@/lib/staff-preview';
import type { StaffSessionDTO } from '../dtos/staff-session.dto';

function previewUrl() {
  if (!staffPreviewEnabled()) throw new Error('STAFF_PREVIEW_DISABLED');
  return new URL('/__mock/staff-preview/session', window.location.origin).href;
}
export async function getStaffPreviewDTO(signal?: AbortSignal): Promise<StaffSessionDTO | null> {
  try { return await httpRequest({ path: previewUrl(), signal, withAuth: false }); }
  catch (error) {
    if (error instanceof HttpStatusError && error.status === 401) return null;
    throw error;
  }
}
export async function closeStaffPreview(): Promise<void> {
  return httpRequest({ path: previewUrl(), method: 'DELETE', withAuth: false });
}
export async function openStaffPreview(): Promise<void> {
  return httpRequest({ path: previewUrl(), method: 'POST', withAuth: false });
}
