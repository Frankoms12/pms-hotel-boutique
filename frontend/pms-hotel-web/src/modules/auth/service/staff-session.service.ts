import { refreshStaffBffSession, staffBffRead } from "@/lib/http/staff-bff";
import { httpRequest } from "@/lib/http";
import type { StaffIdentityDTO, StaffSessionDTO } from "../dtos/staff-session.dto";

function bffUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

export function getStaffIdentityDTO(signal?: AbortSignal): Promise<StaffIdentityDTO> {
  return httpRequest({ path: bffUrl("/__mock/private-09/session"), signal });
}

export function getStaffSessionDTO(signal?: AbortSignal): Promise<StaffSessionDTO> {
  return httpRequest({ path: bffUrl("/api/auth/staff/session"), signal, withAuth: false });
}

export const refreshStaffSession = refreshStaffBffSession;

export function getActiveStaffSessionDTO(signal?: AbortSignal): Promise<StaffSessionDTO> {
  return staffBffRead('/api/auth/staff/session', signal);
}

export function logoutStaffSession(): Promise<void> {
  return httpRequest<void>({ path: bffUrl("/api/auth/staff/session"), method: "DELETE", withAuth: false });
}
