import {activateGuestFixture} from '@/test/guest-session-fixture';
import {useQueryClient} from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { initializeAccountFixture, peekAccountFixture, resetAccountFixtures } from '@/data/mocks/account-fixtures';
import { GuestLinkedAccount, GuestAccountGate, GuestSessionProvider, useGuestSession } from '@/modules/auth';
import { HistoryPage } from './history-page';
import { ReservationLinkPage } from './reservation-link-page';

const clients: QueryClient[] = [];
const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'reservation-link-page-test' };
let fixtureEmail = 'guest.google@example.com';
const path = '/cuenta/reservas/vincular';
type View = 'access' | 'link' | 'history';
beforeEach(() => { fixtureEmail = 'guest.google@example.com'; resetAccountFixtures(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); vi.clearAllMocks(); });

function FixtureAccess() {
  const { account } = useGuestSession();const client=useQueryClient();
  return account ? <GuestLinkedAccount authProvider="email" returnTo={path} /> : <button onClick={() => void activateGuestFixture({ method: 'EMAIL', email: fixtureEmail, registration: { fullName: 'José Pérez' } },client)}>Preparar cuenta email</button>;
}
function setup(initial: View = 'access') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  function Harness({ view }: { view: View }) {
    return <AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><GuestSessionProvider>
      {view === 'access' ? <FixtureAccess /> : <GuestAccountGate returnTo={path}>
        {view === 'link' ? <ReservationLinkPage /> : <HistoryPage />}
      </GuestAccountGate>}
    </GuestSessionProvider></QueryClientProvider></AppRouterContext.Provider>;
  }
  const result = render(<Harness view={initial} />);
  return { user: userEvent.setup(), navigate: (view: View) => result.rerender(<Harness view={view} />) };
}
async function register(_provider: 'email' | 'google', email = 'guest.google@example.com') {
  fixtureEmail = email;
  fireEvent.click(screen.getByRole('button', { name: 'Preparar cuenta email' }));
  await screen.findByRole('heading', { name: 'Cuenta vinculada' });
}

function request(reference = 'HB-2026-10420') {
  fireEvent.change(screen.getByLabelText('Referencia de reserva'), { target: { value: reference } });
  fireEvent.submit(screen.getByLabelText('Referencia de reserva').closest('form')!);
}
async function verify(code = '12345678') {
  const field = await screen.findByLabelText('Código de verificación');
  fireEvent.change(field, { target: { value: code } }); fireEvent.submit(field.closest('form')!);
}

describe('Dedicated existing-reservation link screen', () => {
  it('links to the existing account only after verification and refreshes history without duplicates', async () => {
    const currentId = 'guest-demo-register';
    const otherId = 'guest-demo-google';
    initializeAccountFixture(otherId, 'other@example.com');
    const { navigate } = setup(); await register('email');
    expect(screen.getByRole('link', { name: 'Vincular reserva existente' })).toHaveAttribute('href', path);
    navigate('link');
    expect(screen.getByRole('heading', { name: 'Vincular reserva existente' })).toHaveFocus();
    expect(screen.getByRole('complementary', { name: 'Antes de comenzar' })).toHaveTextContent('guest.google@example.com');
    fireEvent.submit(screen.getByLabelText('Referencia de reserva').closest('form')!);
    expect(screen.getByLabelText('Referencia de reserva')).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa la referencia');
    request(); fireEvent.submit(screen.getByLabelText('Referencia de reserva').closest('form')!);
    expect(screen.getByRole('button', { name: 'Solicitando código…' })).toBeDisabled();
    expect(await screen.findByLabelText('Código de verificación')).toHaveFocus();
    expect(peekAccountFixture(currentId)?.reservations).toHaveLength(0);
    await verify('00000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar la reserva');
    expect(peekAccountFixture(currentId)?.reservations).toHaveLength(0);
    await verify();
    expect(await screen.findByRole('heading', { name: 'Reserva HB-2026-10420 vinculada.' })).toHaveFocus();
    expect(peekAccountFixture(currentId)?.reservations).toHaveLength(1);
    expect(peekAccountFixture(otherId)?.reservations).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Vincular otra reserva' }));
    await waitFor(() => expect(screen.getByLabelText('Referencia de reserva')).toHaveFocus());
    request(); await verify(); await screen.findByText('Reserva HB-2026-10420 vinculada.');
    navigate('history');
    expect(await screen.findByText('1 reserva vinculada')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'HB-2026-10420' })).toHaveLength(1);
    expect(screen.getByText(/2 estadías · Responsable/)).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
  });
  it('preserves the destination for anonymous access and never exposes the reservation form', async () => {
    setup('link');
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/acceso?returnTo=%2Fcuenta%2Freservas%2Fvincular');
    expect(screen.queryByLabelText('Referencia de reserva')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Vincular reserva existente' })).not.toBeInTheDocument();
  });
  it('rejects a booking for another email without revealing it or modifying either account', async () => {
    const { navigate } = setup(); await register('email', 'other@example.com'); navigate('link'); request(); await verify();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar la reserva');
    expect(peekAccountFixture('guest-demo-register')?.reservations).toHaveLength(0);
    expect(screen.queryByText('Deluxe King')).not.toBeInTheDocument();
    expect(screen.queryByText('Carlos Mendoza')).not.toBeInTheDocument();
  });
  it('keeps the real Guest session intact without sending mock or new Backend link requests', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    const linkRequest = vi.fn();
    mockServer.use(http.get('*/api/auth/guest/session', () => HttpResponse.json({ guestAccountId: 'real', sessionId: 'real-session', email: 'real@example.test', context: 'GUEST' })),
      http.post('http://pms.test/__mock/reservation-links/*', () => { linkRequest(); return HttpResponse.json({}); }));
    setup('link');
    expect(await screen.findByText(/La vinculación no está disponible/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vincular reserva existente' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Referencia de reserva')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(linkRequest).not.toHaveBeenCalled();
  });
});
