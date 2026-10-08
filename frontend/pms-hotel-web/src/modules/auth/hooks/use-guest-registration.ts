'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {HttpStatusError} from '@/lib/http';
import {registerGuest,verifyGuestRegistration,resendGuestRegistration} from '../service/guest-registration.service';
import {mapRegistrationAccepted,mapRegistrationVerified} from '../mappers/guest-registration.mapper';
export type RegistrationPhase='base'|'submitting'|'awaitingOtp'|'verifying'|'resending'|'success'|'invalidOtp'|'expired'|'rateLimited'|'unavailable';
export function useGuestRegistration(initialRequestId?:string){
 const [requestId,setRequestId]=useState(initialRequestId);const [phase,setPhase]=useState<RegistrationPhase>(initialRequestId?'awaitingOtp':'base');
 const active=useRef(false);const client=useQueryClient();const router=useRouter();
 const [resendAt,setResendAt]=useState(0);
 function error(failure:unknown){setPhase(failure instanceof HttpStatusError && failure.status===422?'invalidOtp':failure instanceof HttpStatusError && failure.status===429?'rateLimited':failure instanceof HttpStatusError && failure.status===403?'expired':'unavailable');}
 async function register(email:string,password:string){if(active.current)return false;active.current=true;setPhase('submitting');
  try{setRequestId(mapRegistrationAccepted(await registerGuest(email,password)));setResendAt(Date.now()+60000);setPhase('awaitingOtp');return true;}
  catch(failure){error(failure);return false;}finally{active.current=false;}}
 async function verify(otp:string){if(active.current||!requestId)return;active.current=true;setPhase('verifying');
  try{mapRegistrationVerified(await verifyGuestRegistration(requestId,otp));setPhase('success');await client.invalidateQueries({queryKey:['guest-session']});
   await client.invalidateQueries({queryKey:['guest']});router.replace('/cuenta');router.refresh();}
  catch(failure){error(failure);}finally{active.current=false;}}
 async function resend(){if(active.current||!requestId)return;active.current=true;setPhase('resending');
  try{await resendGuestRegistration(requestId);setResendAt(Date.now()+60000);setPhase('awaitingOtp');}catch(failure){error(failure);}finally{active.current=false;}}
 function back(){if(active.current)return;setRequestId(undefined);setResendAt(0);setPhase('base');}
 return {requestId,phase,register,verify,resend,back,resendAt,busy:['submitting','verifying','resending','success'].includes(phase)};
}
