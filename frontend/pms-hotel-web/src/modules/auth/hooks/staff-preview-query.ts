import { getStaffPreviewDTO } from '../service/staff-preview.service';
import { mapStaffSession } from '../mappers/staff-session.mapper';

export const staffPreviewKey = ['staff-preview', 'session'] as const;
export const staffPreviewQuery = {
  queryKey: staffPreviewKey,
  queryFn: async ({ signal }: { signal: AbortSignal }) => {
    const dto = await getStaffPreviewDTO(signal);
    return dto === null ? null : mapStaffSession(dto);
  },
  retry: false,
};
