import {httpRequest} from '@/lib/http';
import {passwordLoginInput} from '@/lib/login-input';
import type {GuestRegistrationAcceptedDTO,GuestRegistrationVerifiedDTO} from '../dtos/guest-registration.dto';
function post<T>(suffix:string,body:object):Promise<T>{return httpRequest({path:new URL('/api/auth/guest/registrations'+suffix,window.location.origin).href,method:'POST',withAuth:false,headers:{'content-type':'application/json'},body:JSON.stringify(body)});}
export function registerGuest(email:string,password:string){
 const input=passwordLoginInput(email,password);if(!input||input.password.length<8)throw new Error('INVALID_REGISTRATION_INPUT');
 return post<GuestRegistrationAcceptedDTO>('',input);
}
export function verifyGuestRegistration(requestId:string,otp:string){return post<GuestRegistrationVerifiedDTO>('/verify',{requestId,otp});}
export function resendGuestRegistration(requestId:string){return post<void>('/resend',{requestId});}
