import {beforeEach,describe,expect,it} from 'vitest';
import {http,HttpResponse} from 'msw';
import {mockServer} from '@/data/mocks/server';
import {getGuestSessionDTO} from './guest-session.service';
const dto={context:'GUEST',guestAccountId:'guest',sessionId:'session',email:'fixture@example.test'};
beforeEach(()=>{});
describe('Bounded Guest restoration',()=>{
 it('401 → one refresh → one retry',async()=>{let reads=0,refreshes=0;
  mockServer.use(http.get('*/api/auth/guest/session',()=>++reads===1?new HttpResponse(null,{status:401}):HttpResponse.json(dto)),http.post('*/api/auth/guest/refresh',()=>{refreshes++;return HttpResponse.json({refreshed:true});}));
  expect(await getGuestSessionDTO()).toEqual(dto);expect(reads).toBe(2);expect(refreshes).toBe(1);
 });
 it('shares only one refresh for concurrent Guest 401 responses',async()=>{let reads=0,refreshes=0;
  mockServer.use(http.get('*/api/auth/guest/session',()=>++reads<=2?new HttpResponse(null,{status:401}):HttpResponse.json(dto)),http.post('*/api/auth/guest/refresh',async()=>{refreshes++;await new Promise(r=>setTimeout(r,30));return HttpResponse.json({refreshed:true});}));
  expect(await Promise.all([getGuestSessionDTO(),getGuestSessionDTO()])).toEqual([dto,dto]);expect(refreshes).toBe(1);expect(reads).toBe(4);
 });
 it('second 401 terminates without loop',async()=>{let refreshes=0;mockServer.use(http.get('*/api/auth/guest/session',()=>new HttpResponse(null,{status:401})),http.post('*/api/auth/guest/refresh',()=>{refreshes++;return HttpResponse.json({refreshed:true});}));expect(await getGuestSessionDTO()).toBeNull();expect(refreshes).toBe(1);});
 it('refresh 401 means signed out',async()=>{mockServer.use(http.get('*/api/auth/guest/session',()=>new HttpResponse(null,{status:401})),http.post('*/api/auth/guest/refresh',()=>new HttpResponse(null,{status:401})));expect(await getGuestSessionDTO()).toBeNull();});
 it.each([500,503])('preserves unavailable %s rather than signed out',async status=>{mockServer.use(http.get('*/api/auth/guest/session',()=>new HttpResponse(null,{status})));await expect(getGuestSessionDTO()).rejects.toMatchObject({status});});
});
