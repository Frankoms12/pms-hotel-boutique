'use client';
import { GuestAccessPage } from '@/modules/auth';
export function GuestIdentityAccess({ returnTo, googleError, pendingRequestId }: { returnTo?: string; googleError?: boolean; pendingRequestId?:string }) {
  return <GuestAccessPage pendingRequestId={pendingRequestId} returnTo={returnTo} googleError={googleError} />;
}
