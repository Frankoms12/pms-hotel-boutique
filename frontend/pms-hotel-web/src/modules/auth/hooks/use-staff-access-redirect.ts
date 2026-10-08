"use client";
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getPublicEnvironment } from '@/lib/env';
import { staffSessionQuery } from './staff-session-query';
export function useStaffAccessRedirect(enabled: boolean) {
  const router = useRouter();
  const staff = useQuery({ ...staffSessionQuery, enabled: enabled && !getPublicEnvironment().useMockApi });
  useEffect(() => { if (enabled && staff.data) router.replace('/dashboard'); }, [enabled, staff.data, router]);
}
