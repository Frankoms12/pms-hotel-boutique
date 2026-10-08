/** Test-only BFF identity paired with provisional account data fixtures. */
import type {QueryClient} from '@tanstack/react-query';
import {http,HttpResponse} from 'msw';
import {mockServer} from '@/data/mocks/server';
import {simulateGuestAccess} from '@/modules/auth/service/guest-access.service';
import {mapGuestSession} from '@/modules/auth/mappers/guest-session.mapper';
import type {GuestAccessInput} from '@/modules/auth/model/guest-access';
export async function activateGuestFixture(input:GuestAccessInput,client:QueryClient){
 const account=await simulateGuestAccess(input,new AbortController().signal);
 const dto={guestAccountId:account.account_id,sessionId:'fixture-'+account.account_id,email:account.email!,context:'GUEST' as const};
 mockServer.use(http.get('*/api/auth/guest/session',()=>HttpResponse.json(dto)));
 await client.cancelQueries({queryKey:['guest-session']});client.setQueryData(['guest-session'],mapGuestSession(dto));
}
