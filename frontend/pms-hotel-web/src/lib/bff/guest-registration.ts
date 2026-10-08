import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { passwordLoginInput } from '@/lib/login-input';
import { applyGuestCookies, backendGuestRequest, type GuestTokens } from './guest-auth';
export const registrationCookie='pms_guest_registration';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface Pending { requestId:string; binding:string; expiresAt:number }
export function pendingRegistration(value:string|undefined):Pending|null{
 try{const p=JSON.parse(value??'null') as Pending|null;return p && uuid.test(p.requestId) && /^[a-f0-9]{64}$/.test(p.binding) && p.expiresAt>Date.now()?p:null;}catch{return null;}
}
function failure(status:number){return NextResponse.json({error:'Guest registration could not be completed'},{status,headers:{'Cache-Control':'no-store'}});}
export async function registrationRequest(request:NextRequest,action:'register'|'verify'|'resend'){
 const publicOrigin=new URL(process.env.PMS_WEB_PUBLIC_URL??'http://localhost:3001').origin;
 if(request.headers.get('origin')!==publicOrigin)return failure(403);
 let body:Record<string,unknown>;
 try{const parsed:unknown=await request.json();if(!parsed || typeof parsed!=='object' || Array.isArray(parsed))return failure(400);body=parsed as Record<string,unknown>;}catch{return failure(400);}
 const allowed=action==='register'?['email','password']:action==='verify'?['requestId','otp']:['requestId'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))return failure(400);
 let payload:unknown;let binding:string;let context:Pending|null=null;
 if(action==='register'){
  const credentials=passwordLoginInput(body.email,body.password);
  if(!credentials || credentials.password.length<8)return failure(400);
  payload=credentials;binding=randomBytes(32).toString('hex');
 }else{
  context=pendingRegistration(request.cookies.get(registrationCookie)?.value);
  if(!context || body.requestId!==context.requestId)return failure(403);
  if(action==='verify' && (typeof body.otp!=='string' || !/^[0-9]{8}$/.test(body.otp)))return failure(400);
  binding=context.binding;payload=body;
 }
 try{
  const upstream=await backendGuestRequest('/api/v1/guest-auth/registrations'+(action==='register'?'':'/'+action),{
   method:'POST',headers:{'content-type':'application/json','X-Guest-Registration-Binding':binding},body:JSON.stringify(payload),
  });
  if(!upstream.ok)return failure(upstream.status>=500?503:[400,403,422,429].includes(upstream.status)?upstream.status:503);
  if(action==='verify'){
   if(upstream.status!==201)return failure(503);
   const tokens=await upstream.json() as GuestTokens;
   if(typeof tokens.accessToken!=='string'||!tokens.accessToken||typeof tokens.refreshToken!=='string'||!tokens.refreshToken||!Number.isFinite(tokens.accessTokenExpiresInSeconds)||tokens.accessTokenExpiresInSeconds<=0)return failure(503);
   const response=NextResponse.json({authenticated:true,context:'GUEST'},{headers:{'Cache-Control':'no-store'}});
   applyGuestCookies(response,tokens);
   response.cookies.set(registrationCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
   return response;
  }
  if(upstream.status!==202)return failure(503);
  if(action==='resend')return new NextResponse(null,{status:202,headers:{'Cache-Control':'no-store'}});
  const data=await upstream.json() as {requestId?:unknown};
  if(typeof data.requestId!=='string'||!uuid.test(data.requestId))return failure(503);
  const response=NextResponse.json({requestId:data.requestId},{status:202,headers:{'Cache-Control':'no-store'}});
  response.cookies.set(registrationCookie,JSON.stringify({requestId:data.requestId,binding,expiresAt:Date.now()+30*60*1000}),{
   httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*60,
  });
  return response;
 }catch{return failure(503);}
}
