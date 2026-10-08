import { getPublicEnvironment } from '@/lib/env';

/** Approved disposable frontend identity; never a Backend login identifier or authorization rule. */
export const localStaffEmail = 'qa_staff@example.test';
export function localStaffAccessEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && getPublicEnvironment().useMockApi;
}
export function isLocalStaffLogin(email: string): boolean {
  return localStaffAccessEnabled() && email.trim().toLowerCase() === localStaffEmail;
}
