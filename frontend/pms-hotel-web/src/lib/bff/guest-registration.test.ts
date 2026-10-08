import {NextRequest} from 'next/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const fetchBackend=vi.fn<typeof fetch>();let bff:typeof import('./guest-registration');
const requestId='11111111-1111-4111-8111-111111111111';
function request(action:string,body:unknown,cookie?:string,origin='http://localhost:3001'){
 return new NextRequest('http://localhost:3001/api/auth/guest/registrations'+action,{method:'POST',headers:{'content-type':'application/json',origin,...(cookie?{cookie}: {})},body:JSON.stringify(body)});
}
beforeEach(async()=>{vi.resetModules();vi.stubEnv('PMS_BACKEND_INTERNAL_URL','http://backend:8080');vi.stubEnv('PMS_WEB_PUBLIC_URL','http://localhost:3001');vi.stubEnv('NODE_ENV','production');vi.stubGlobal('fetch',fetchBackend);fetchBackend.mockReset();bff=await import('./guest-registration');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Guest registration BFF',()=>{
 it('normalizes email, preserves password, rejects confirmation/name/IDs, and stores binding only HttpOnly',async()=>{
  fetchBackend.mockResolvedValue(Response.json({requestId},{status:202}));const password=' 12345678 ';
  const response=await bff.registrationRequest(request('',{email:' Person@Example.test ',password}),'register');
  expect(response.status).toBe(202);expect(await response.json()).toEqual({requestId});
  const cookie=response.cookies.get('pms_guest_registration');expect(cookie).toMatchObject({httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:1800});
  expect(JSON.parse(fetchBackend.mock.calls[0][1]?.body as string)).toEqual({email:'person@example.test',password});
  expect(JSON.parse(cookie!.value).binding).toMatch(/^[a-f0-9]{64}$/);
  expect((await bff.registrationRequest(request('',{email:'person@example.test',password,confirmation:password}),'register')).status).toBe(400);
 });
 it.each(['short','x'.repeat(51),'','界'.repeat(25),'😀'.repeat(19)])('rejects invalid registration password before upstream',async password=>{
  expect((await bff.registrationRequest(request('',{email:'a@example.test',password}),'register')).status).toBe(400);expect(fetchBackend).not.toHaveBeenCalled();
 });
 it('rejects cross-origin and missing binding without upstream',async()=>{
  expect((await bff.registrationRequest(request('',{email:'a@example.test',password:'12345678'},undefined,'https://evil.test'),'register')).status).toBe(403);
  expect((await bff.registrationRequest(request('/verify',{requestId,otp:'12345678'}),'verify')).status).toBe(403);expect(fetchBackend).not.toHaveBeenCalled();
 });
 it('consumes only Guest tokens into cookies without changing Staff or exposing secrets',async()=>{
  const binding='a'.repeat(64),cookie='pms_guest_registration='+JSON.stringify({requestId,binding,expiresAt:Date.now()+60000});
  fetchBackend.mockResolvedValue(Response.json({accessToken:'fixture-access',refreshToken:'fixture-refresh',accessTokenExpiresInSeconds:900},{status:201}));
  const response=await bff.registrationRequest(request('/verify',{requestId,otp:'12345678'},cookie),'verify');
  expect(await response.json()).toEqual({authenticated:true,context:'GUEST'});
  expect(response.cookies.getAll().some(c=>c.name.startsWith('pms_staff'))).toBe(false);
  expect(response.cookies.get('pms_guest_registration')?.maxAge).toBe(0);expect(response.cookies.get('pms_guest_access')?.httpOnly).toBe(true);
 });
 it.each([400,403,422,429,500,503])('propagates safe status for upstream %s',async status=>{
  const cookie='pms_guest_registration='+JSON.stringify({requestId,binding:'a'.repeat(64),expiresAt:Date.now()+60000});
  fetchBackend.mockResolvedValue(Response.json({detail:'private upstream information'},{status}));
  const response=await bff.registrationRequest(request('/verify',{requestId,otp:'12345678'},cookie),'verify');
  expect(response.status).toBe(status>=500?503:status);expect(JSON.stringify(await response.json())).not.toContain('private upstream');expect(response.cookies.getAll()).toEqual([]);
 });
 it('restores pending state without credentials and refuses expired contexts',()=>{
  const value=JSON.stringify({requestId,binding:'a'.repeat(64),expiresAt:Date.now()+60000});expect(bff.pendingRegistration(value)?.requestId).toBe(requestId);
  expect(bff.pendingRegistration(JSON.stringify({requestId,binding:'a'.repeat(64),expiresAt:Date.now()-1}))).toBeNull();
 });
});
