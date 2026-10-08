import type { NextRequest } from 'next/server';
import { proxyStaffReservations } from '../proxy';

export async function GET(request: NextRequest, context: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await context.params;
  return proxyStaffReservations(request, reservationId);
}
