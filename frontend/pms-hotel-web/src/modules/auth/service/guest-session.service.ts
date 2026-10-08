import { HttpStatusError, httpRequest } from "@/lib/http";
import type { GuestSessionDTO } from "../dtos/guest-session.dto";
const url=(path:string)=>new URL(path,window.location.origin).href;
let refreshInFlight:Promise<unknown>|undefined;
export function refreshGuestSession(){
  refreshInFlight ??= httpRequest({path:url('/api/auth/guest/refresh'),method:'POST',withAuth:false})
    .finally(()=>{refreshInFlight=undefined;});
  return refreshInFlight;
}
export async function getGuestSessionDTO(signal?:AbortSignal):Promise<GuestSessionDTO|null>{
  try{return await httpRequest({path:url('/api/auth/guest/session'),signal,withAuth:false});}
  catch(error){
    if(signal?.aborted || !(error instanceof HttpStatusError) || error.status!==401) throw error;
    try{await refreshGuestSession();}
    catch(refreshError){if(refreshError instanceof HttpStatusError && refreshError.status===401)return null;throw refreshError;}
    try{return await httpRequest({path:url('/api/auth/guest/session'),signal,withAuth:false});}
    catch(retryError){if(retryError instanceof HttpStatusError && retryError.status===401)return null;throw retryError;}
  }
}
export async function logoutGuestSession():Promise<void>{
  // Restore an expired access cookie through the dedicated refresh path before revocation.
  await getGuestSessionDTO();
  await httpRequest({path:url('/api/auth/guest/session'),method:'DELETE',withAuth:false});
}
