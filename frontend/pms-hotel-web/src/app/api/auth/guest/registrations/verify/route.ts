import {NextRequest} from 'next/server';
import {registrationRequest} from '@/lib/bff/guest-registration';
export function POST(request:NextRequest){return registrationRequest(request,'verify');}
