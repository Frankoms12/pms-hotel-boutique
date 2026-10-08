import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { GuestSessionProvider } from '@/modules/auth';
import { GuestIdentityAccess } from './guest-identity-access';
const clients: QueryClient[]=[];
const navigation={replace:vi.fn(),push:vi.fn(),back:vi.fn(),forward:vi.fn(),refresh:vi.fn(),prefetch:vi.fn(),bfcacheId:'unified-access-app'};
beforeEach(()=>{vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API','false');mockServer.use(
 http.get('*/api/auth/guest/session',()=>new HttpResponse(null,{status:401})),
 http.get('*/api/auth/staff/session',()=>new HttpResponse(null,{status:401})),
 http.post('*/api/auth/staff/refresh',()=>new HttpResponse(null,{status:401})));});
afterEach(()=>{cleanup();clients.splice(0).forEach(c=>c.clear());vi.unstubAllEnvs();vi.clearAllMocks();});
function setup(googleError = false){const client=new QueryClient();clients.push(client);render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><GuestSessionProvider><GuestIdentityAccess googleError={googleError} /></GuestSessionProvider></QueryClientProvider></AppRouterContext.Provider>);}
describe('Canonical /acceso composition',()=>{
 it('renders the restored tabs with one real login form active by default',async()=>{setup();await screen.findByLabelText('Correo electrónico');expect(screen.getAllByRole('button',{name:'Iniciar sesión'})).toHaveLength(1);expect(screen.getByRole('tab',{name:'Crear cuenta'})).toHaveAttribute('aria-selected','false');expect(screen.queryByLabelText('Nombre completo')).not.toBeInTheDocument();});
 it('shows a recoverable generic error after a failed Google callback',async()=>{
  setup(true);expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos completar el acceso');
  expect(screen.getByRole('link',{name:'Continuar como invitado'})).toHaveAttribute('href','/');
 });
 it('redirects an existing real Guest without fetching a registration/profile summary',async()=>{
  const summary=vi.fn();mockServer.use(http.get('*/api/auth/guest/session',()=>HttpResponse.json({guestAccountId:'own',sessionId:'own-session',email:'own@example.test',context:'GUEST'})),http.get('*/api/auth/guest/account/summary',()=>{summary();return HttpResponse.json({});}));
  setup();await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/cuenta'));expect(summary).not.toHaveBeenCalled();expect(screen.queryByText('Cuenta vinculada')).not.toBeInTheDocument();
 });
 it('redirects an existing Staff session to dashboard',async()=>{
  mockServer.use(http.get('*/api/auth/staff/session',()=>HttpResponse.json({staffUserId:'staff-1',sessionId:'session-1',username:'display-only',roleCode:'SUPER_ADMIN',permissions:['STAFF_MANAGE'],memberships:[]})));
  setup();await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/dashboard'));
 });
});
