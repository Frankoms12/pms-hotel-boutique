import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {http,HttpResponse} from 'msw';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type {AppRouterInstance} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {mockServer} from '@/data/mocks/server';
import {GuestRegistrationForm} from './guest-registration-form';
const navigation=vi.hoisted(()=>({replace:vi.fn(),refresh:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>navigation}));
const requestId='11111111-1111-4111-8111-111111111111';
beforeEach(()=>vi.clearAllMocks());
function mount(pending?:string){const client=new QueryClient();client.setQueryData(['auth','staff','session'],{fixture:'staff'});render(<AppRouterContext.Provider value={navigation as unknown as AppRouterInstance}><QueryClientProvider client={client}><GuestRegistrationForm pendingRequestId={pending}/></QueryClientProvider></AppRouterContext.Provider>);return client;}
function fill(password=' 12345678 ',confirmation=password){fireEvent.change(screen.getByLabelText('Correo electrónico'),{target:{value:' Person@Example.test '}});fireEvent.change(screen.getByLabelText('Contraseña'),{target:{value:password}});fireEvent.change(screen.getByLabelText('Confirmar contraseña'),{target:{value:confirmation}});fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!);}
function verify(){fireEvent.change(screen.getByLabelText('Código de verificación'),{target:{value:'12345678'}});fireEvent.submit(screen.getByLabelText('Código de verificación').closest('form')!);}
describe('Real Guest registration UI',()=>{
 it('shows specific multibyte validation without sending credentials',()=>{const calls=vi.fn();mockServer.use(http.post('*/api/auth/guest/registrations',calls));mount();fill('界'.repeat(25));expect(screen.getByText(/supera 72 bytes UTF-8/)).toBeInTheDocument();expect(calls).not.toHaveBeenCalled();});
 it('202 opens generic OTP without storing credentials or confirmation',async()=>{let body:unknown;mockServer.use(http.post('*/api/auth/guest/registrations',async({request})=>{body=await request.json();return HttpResponse.json({requestId},{status:202});}));mount();fill();expect(await screen.findByRole('heading',{name:'Revisa tu correo'})).toBeInTheDocument();expect(body).toEqual({email:'person@example.test',password:' 12345678 '});expect(screen.getByText(/Si podemos continuar/)).toHaveTextContent('Si podemos continuar con este correo, recibirás instrucciones para verificarlo.');
 expect(screen.queryByText(/Hemos enviado|Te enviamos|Código enviado/i)).not.toBeInTheDocument();expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();expect(localStorage.length).toBe(0);});
 it.each([['short','short'],['12345678','12345678 '],['x'.repeat(51),'x'.repeat(51)]])('rejects registration boundary without transport %#',(password,confirmation)=>{const calls=vi.fn();mockServer.use(http.post('*/api/auth/guest/registrations',calls));mount();fill(password,confirmation);expect(document.querySelector('[aria-invalid="true"]')).not.toBeNull();expect(calls).not.toHaveBeenCalled();});
 it.each([422,429,503])('shows recoverable generic verify failure %s',async status=>{mockServer.use(http.post('*/api/auth/guest/registrations/verify',()=>new HttpResponse(null,{status})));mount(requestId);verify();expect(await screen.findByRole('alert')).toHaveTextContent(status===422?'No pudimos verificar':status===429?'límite temporal':'no está disponible');expect(navigation.replace).not.toHaveBeenCalled();expect(screen.getByLabelText('Código de verificación')).toHaveValue('');});
 it('restores OTP phase from server context and resends without password',async()=>{let body:unknown;mockServer.use(http.post('*/api/auth/guest/registrations/resend',async({request})=>{body=await request.json();return new HttpResponse(null,{status:202});}));mount(requestId);expect(screen.getByRole('heading',{name:'Revisa tu correo'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Reenviar código'}));await waitFor(()=>expect(body).toEqual({requestId}));expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();});
 it('success refetches Guest caches and navigates to account while preserving Staff',async()=>{mockServer.use(http.post('*/api/auth/guest/registrations/verify',()=>HttpResponse.json({authenticated:true,context:'GUEST'})));const client=mount(requestId);const invalidate=vi.spyOn(client,'invalidateQueries');verify();await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/cuenta'));expect(invalidate).toHaveBeenCalledWith({queryKey:['guest-session']});expect(invalidate).toHaveBeenCalledWith({queryKey:['guest']});expect(client.getQueryData(['auth','staff','session'])).toEqual({fixture:'staff'});});
 it('disables OTP actions during verify and prevents double submit',async()=>{
  let release!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;});let calls=0;
  mockServer.use(http.post('*/api/auth/guest/registrations/verify',async()=>{calls++;await blocked;return new HttpResponse(null,{status:422});}));
  mount(requestId);verify();verify();
  expect(screen.getByRole('button',{name:'Verificando…'})).toBeDisabled();expect(screen.getByRole('button',{name:'Verificando…'})).toHaveAttribute('aria-busy','true');
  expect(screen.getByRole('button',{name:'Ir a iniciar sesión'})).toBeDisabled();expect(screen.getByRole('button',{name:'Reenviar código'})).toBeDisabled();
  await waitFor(()=>expect(calls).toBe(1));release();expect(await screen.findByRole('alert')).toBeInTheDocument();
 });

 it('OTP back retains only email and resets touched, submitted and OTP errors without a new request',async()=>{
  const calls=vi.fn(()=>HttpResponse.json({requestId},{status:202}));
  mockServer.use(http.post('*/api/auth/guest/registrations',calls),http.post('*/api/auth/guest/registrations/verify',()=>new HttpResponse(null,{status:422})));
  mount();fill();await screen.findByRole('heading',{name:'Revisa tu correo'});verify();await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'Volver'}));
  expect(screen.getByLabelText('Correo electrónico')).toHaveValue('Person@Example.test');
  expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(document.querySelector('[aria-invalid="true"]')).toBeNull();
  expect(calls).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument();
  fireEvent.blur(screen.getByLabelText('Contraseña'));
  expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid','true');
 });

});
