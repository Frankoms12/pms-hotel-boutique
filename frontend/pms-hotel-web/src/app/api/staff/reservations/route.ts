import type { NextRequest } from 'next/server';
import { proxyStaffReservations } from './proxy';

export function GET(request: NextRequest) { return proxyStaffReservations(request); }
