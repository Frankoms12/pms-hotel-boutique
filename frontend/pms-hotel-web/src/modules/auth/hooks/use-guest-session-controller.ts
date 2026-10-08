"use client";
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useRef} from 'react';
import {useContext} from 'react';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {DomainMappingError} from '@/lib/errors/domain-mapping-error';
import {mapGuestSession} from '../mappers/guest-session.mapper';
import {getGuestSessionDTO,logoutGuestSession} from '../service/guest-session.service';
import type {GuestAccessInput} from '../model/guest-access';
const sessionKey=['guest-session'] as const;
export function useGuestSessionController(){
 const client=useQueryClient();const router=useContext(AppRouterContext);const closing=useRef(false);
 const session=useQuery({queryKey:sessionKey,queryFn:async({signal})=>{
  const dto=await getGuestSessionDTO(signal);return dto===null?null:mapGuestSession(dto);
 },retry:false,gcTime:0,networkMode:'always',refetchOnWindowFocus:false,refetchOnReconnect:false});
 const logout=useMutation({mutationFn:logoutGuestSession,retry:false,gcTime:0,networkMode:'always'});
 const invalid=session.error instanceof DomainMappingError;
 const account=invalid?null:session.data?.account??null;
 async function signOut(){
  if(closing.current)return false;closing.current=true;
  try{
   await logout.mutateAsync();
   await client.cancelQueries({queryKey:sessionKey});await client.cancelQueries({queryKey:['guest']});
   client.removeQueries({queryKey:['guest']});client.setQueryData(sessionKey,null);
   router?.replace('/acceso');return true;
  }catch{return false;}finally{closing.current=false;}
 }
 return {account,accessMethod:null,status:session.isPending?'checking' as const:session.isError?'error' as const:account?'signed-in' as const:'signed-out' as const,
  isPending:logout.isPending,error:session.error??logout.error,resetError:logout.reset,
  retrySession:()=>{if(!closing.current)void session.refetch();},
  // Kept for legacy callers; canonical authentication never creates a fixture identity.
  signIn:async(_input:GuestAccessInput):Promise<boolean>=>false,signOut};
}
