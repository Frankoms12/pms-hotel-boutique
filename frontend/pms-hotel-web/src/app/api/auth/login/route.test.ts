import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const backend=vi.fn<typeof fetch>();
let login: typeof import('./route');
const tokens={accessToken:'synthetic-access',refreshToken:'synthetic-refresh',accessTokenExpiresInSeconds:900};
const body={email:' PERSON@Example.test ',password:'synthetic-password'};
function request(value: unknown=body,origin?: string){return new NextRequest('http://localhost:3001/api/auth/login',{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:typeof value==='string'?value:JSON.stringify(value)});}
beforeEach(async()=>{vi.resetModules();backend.mockReset();vi.stubGlobal('fetch',backend);vi.stubEnv('PMS_BACKEND_INTERNAL_URL','http://backend:8080');vi.stubEnv('NODE_ENV','production');vi.stubEnv('PMS_WEB_PUBLIC_URL','http://localhost:3001');login=await import('./route');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Universal BFF boundary',()=>{
 it('rejects excessive UTF-8 bytes with generic credentials and no Backend request',async()=>{
   for(const email of ['known@example.test','unknown@example.test']){
    const response=await login.POST(request({email,password:'界'.repeat(25)}));
    expect(response.status).toBe(401);expect(await response.json()).toEqual({error:'Invalid credentials'});expect(response.cookies.getAll()).toEqual([]);
   }expect(backend).not.toHaveBeenCalled();
 });
 it.each(['STAFF','GUEST'])('accepts exact 50-character email/password for %s after email normalization',async context=>{
  backend.mockResolvedValue(Response.json({...tokens,context},{status:201}));
  const email='a'.repeat(37)+'@example.test', password=' '+'X!'.repeat(24)+' ';
  const response=await login.POST(request({email:' '+email.toUpperCase()+' ',password}));
  expect(response.status).toBe(201);
  expect(JSON.parse(backend.mock.calls[0][1]?.body as string)).toEqual({email,password});
 });
 it.each([
  {email:'a'.repeat(38)+'@example.test',password:'x'},
  {email:'valid@example.test',password:'x'.repeat(51)},
  {email:'valid@example.test',password:''}, {email:'',password:'x'},
 ])('rejects limit/required case %# before Backend',async body=>{
  expect((await login.POST(request(body))).status).toBe(400);
  expect(backend).not.toHaveBeenCalled();
 });
 it.each(['STAFF','GUEST'])('creates only %s cookies and never exposes raw tokens',async context=>{
  backend.mockResolvedValue(Response.json({...tokens,context},{status:201}));const response=await login.POST(request());
  expect(response.status).toBe(201);expect(await response.json()).toEqual({authenticated:true,context});
  const prefix=context.toLowerCase();expect(response.cookies.getAll().map(c=>c.name).sort()).toEqual([`pms_${prefix}_access`,`pms_${prefix}_refresh`]);
  expect(response.cookies.get(`pms_${prefix}_access`)).toMatchObject({value:tokens.accessToken,httpOnly:true,secure:true,sameSite:'lax',path:'/'});
  expect(response.cookies.get(`pms_${prefix}_refresh`)).toMatchObject({value:tokens.refreshToken,httpOnly:true,secure:true,sameSite:'lax',path:`/api/auth/${prefix}/refresh`});
  expect(backend).toHaveBeenCalledExactlyOnceWith('http://backend:8080/api/v1/auth/sessions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'person@example.test',password:body.password}),cache:'no-store'});
  expect(response.headers.get('cache-control')).toBe('no-store');
 });
 it('returns a selector without cookies/tokens and revalidates explicit selection',async()=>{
  backend.mockResolvedValueOnce(Response.json({contexts:['STAFF','GUEST']})).mockResolvedValueOnce(Response.json({...tokens,context:'GUEST'},{status:201}));
  const selection=await login.POST(request());expect(await selection.json()).toEqual({authenticated:false,contexts:['STAFF','GUEST']});expect(selection.cookies.getAll()).toEqual([]);
  const selected=await login.POST(request({...body,context:'GUEST'}));expect(await selected.json()).toEqual({authenticated:true,context:'GUEST'});
  expect(JSON.parse(backend.mock.calls[1][1]?.body as string).context).toBe('GUEST');
 });
 it.each([401,403])('does not reveal contexts on rejected credentials (%s)',async status=>{
  backend.mockResolvedValue(Response.json({contexts:['STAFF'],error:'known staff email'},{status}));const response=await login.POST(request());
  expect(response.status).toBe(401);expect(await response.json()).toEqual({error:'Invalid credentials'});expect(response.cookies.getAll()).toEqual([]);
 });
 it.each([500,503])('maps backend %s to unavailable',async status=>{backend.mockResolvedValue(new Response(null,{status}));expect((await login.POST(request())).status).toBe(503);});
 it('handles transport failure without creating cookies',async()=>{backend.mockRejectedValue(new Error('offline'));const response=await login.POST(request());expect(response.status).toBe(503);expect(response.cookies.getAll()).toEqual([]);});
 it.each(['{',{}, {username:'legacy',password:'secret'}, {email:'malformed',password:'secret'}, {email:'valid@example.test',password:''}, {...body,context:'ADMIN'}])('rejects invalid inputs before backend (%j)',async value=>{expect((await login.POST(request(value))).status).toBe(400);expect(backend).not.toHaveBeenCalled();});
 it('uses the public origin even when Next sees the internal Docker URL',async()=>{
  backend.mockResolvedValue(Response.json({...tokens,context:'GUEST'},{status:201}));
  // This URL is internal to the Next process; Browser still uses localhost:3001.
  const internal=new NextRequest('http://web:3000/api/auth/login',{method:'POST',headers:{'origin':'http://localhost:3001','content-type':'application/json'},body:JSON.stringify(body)});
  const response=await login.POST(internal);expect(response.status).toBe(201);
 });
 it('rejects cross-origin credential submission',async()=>{expect((await login.POST(request(body,'https://evil.test'))).status).toBe(403);expect(backend).not.toHaveBeenCalled();});
 it.each([{...tokens,context:'ADMIN'}, {context:'GUEST'}, {contexts:['STAFF']}, {...tokens,context:'STAFF',accessTokenExpiresInSeconds:-1}])('rejects malformed backend data without cookies',async value=>{backend.mockResolvedValue(Response.json(value,{status:201}));const response=await login.POST(request());expect(response.status).toBe(503);expect(response.cookies.getAll()).toEqual([]);});
});
