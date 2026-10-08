'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { HttpStatusError } from '@/lib/http';
import { getRoomAssignmentPreview, assignStayRoom } from '../service/room-assignment.service';
import { mapRoomAssignmentPreview, mapRoomAssignmentResult } from '../mappers/room-assignment.mapper';
import type { RoomAssignmentScope } from '../model/room-assignment';

export function useRoomAssignment(scope: RoomAssignmentScope, sessionId: string, allowed: boolean) {
  const client = useQueryClient();
  const connected = getPublicEnvironment().useMockApi;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const request = useRef<AbortController | null>(null);
  const identity = JSON.stringify([sessionId, scope.propertyId, scope.reservationId, scope.stayId]);
  const current = useRef(identity);
  useEffect(() => {
    current.current = identity;
    return () => { current.current = ''; request.current?.abort(); };
  }, [identity]);
  const query = useQuery({ queryKey: ['staff-room-assignment', sessionId, scope.propertyId, scope.reservationId, scope.stayId],
    enabled: connected && allowed, retry: false, staleTime: 0,
    queryFn: async ({ signal }) => mapRoomAssignmentPreview(await getRoomAssignmentPreview(scope, signal), scope) });
  async function assign(roomId: string) {
    if (request.current || !connected || !allowed || !query.data?.canAssign
      || !query.data.rooms.some(room => room.id === roomId && room.selectable)) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(undefined);
    try {
      const result = mapRoomAssignmentResult(await assignStayRoom(scope, roomId, controller.signal), scope, roomId);
      if (controller.signal.aborted || current.current !== identity) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['reservations', scope.propertyId] }),
        client.invalidateQueries({ queryKey: ['staff-room-assignment', sessionId, scope.propertyId] }),
        client.invalidateQueries({ queryKey: ['staff-room-occupancy', sessionId, scope.propertyId] }),
      ]);
      if (!controller.signal.aborted && current.current === identity) return result;
    } catch (failure) {
      if (!controller.signal.aborted && current.current === identity) {
        setError(failure instanceof HttpStatusError && failure.status === 409
          ? 'La habitación o la estadía cambiaron. Revisa las opciones actualizadas y elige otra habitación.'
          : 'No pudimos asignar la habitación. La reserva conserva sus datos; puedes reintentar.');
        if (failure instanceof HttpStatusError && failure.status === 409) await query.refetch();
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return { connected, query, assign, busy, error, clearError: () => setError(undefined) };
}
