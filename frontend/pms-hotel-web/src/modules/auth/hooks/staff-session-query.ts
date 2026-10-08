import { HttpStatusError } from "@/lib/http";
import { mapStaffSession } from "../mappers/staff-session.mapper";
import { getActiveStaffSessionDTO } from "../service/staff-session.service";

export const staffSessionKey = ["auth", "staff", "session"] as const;

export const staffSessionQuery = {
  queryKey: staffSessionKey,
  queryFn: async ({ signal }: { signal: AbortSignal }) => {
    try { return mapStaffSession(await getActiveStaffSessionDTO(signal)); }
    catch (error) {
      // Only a definitive 401 after the bounded restoration is signed-out.
      if (error instanceof HttpStatusError && error.status === 401) return null;
      throw error;
    }
  },
  retry: false,
};
