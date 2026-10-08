import {activateGuestFixture} from '@/test/guest-session-fixture';
import {useQueryClient} from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import {  GuestSessionProvider, useGuestSession } from '@/modules/auth';
import { PublicBookingProvider, PublicRoomDetailPage } from '@/modules/booking';
import { CheckoutDraftProvider } from './checkout-draft-provider';
import { PublicGuestDataPage } from './public-guest-data-page';
import { PublicCheckoutReviewPage } from './public-checkout-review-page';

const push = vi.hoisted(() => vi.fn());
const appRouter = { push, replace: push, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'guest-checkout-test' };
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }));
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => { push.mockClear(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T12:00:00Z')); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://pms.test'); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.useRealTimers(); vi.unstubAllEnvs(); });
function mount(detail = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const wrapper = ({ children }: { children: React.ReactNode }) => <AppRouterContext.Provider value={appRouter}><QueryClientProvider client={client}><GuestSessionProvider><PublicBookingProvider><CheckoutDraftProvider>{children}</CheckoutDraftProvider></PublicBookingProvider></GuestSessionProvider></QueryClientProvider></AppRouterContext.Provider>;
  return render(detail ? <PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria} /> : <PublicGuestDataPage initialCriteria={criteria} />, { wrapper });
}
async function selected() {
  const view = mount(true); await screen.findByRole('heading', { name: 'Deluxe King', level: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habitación' })); push.mockClear();
  view.rerender(<PublicGuestDataPage initialCriteria={criteria} />);
  await screen.findByLabelText('Nombre *'); return view;
}
function fill() {
  for (const [label, value] of [['Nombre *', 'Carlos'], ['Apellidos *', 'Mendoza Pérez'], ['Correo electrónico *', 'guest@example.com'], ['Teléfono *', '55555555'], ['Documento de identificación *', 'DOC-DEMO'], ['Solicitudes especiales', 'Llegada tardía']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function submit() { fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!); }

function FixtureSignIn() {
  const { account } = useGuestSession();const client=useQueryClient();
  return account ? <p>Sesión preparada</p> : <button onClick={() => void activateGuestFixture({ method: 'EMAIL', email: 'access@example.com' },client)}>Preparar sesión Guest</button>;
}
describe('Guest checkout data', () => {
  it('requires selection and preserves search', async () => {
    mount(); expect(await screen.findByRole('region', { name: 'Revisa tu selección antes de continuar' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre *')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al carrito/ })).toHaveAttribute('href', '/reserva?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1');
  });
  it('focuses required errors and revalidates contact while editing', async () => {
    await selected(); submit(); expect(screen.getByLabelText('Nombre *')).toHaveFocus();
    expect(screen.getByText('Ingresa tus apellidos.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Carlos' } });
    expect(screen.getByLabelText('Nombre *')).toHaveAttribute('aria-invalid', 'false');
    fireEvent.change(screen.getByLabelText('Correo electrónico *'), { target: { value: 'invalid' } });
    expect(screen.getByText(/Ingresa un correo válido/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Teléfono *'), { target: { value: 'abc' } });
    expect(screen.getByLabelText('Teléfono *')).toHaveValue(''); expect(push).not.toHaveBeenCalled();
    fill(); expect(screen.queryByRole('alert')).not.toBeInTheDocument(); expect(screen.getByLabelText('País / región *')).toHaveValue('GT');
    expect(screen.getByLabelText('Caracteres de solicitudes especiales')).toHaveTextContent('14/250');
    expect(screen.getByLabelText('Solicitudes especiales')).toHaveAttribute('maxlength', '250');
  });
  it('retains data to step 3 and back without financial writes or browser storage', async () => {
    const mutations = vi.fn(); mockServer.use(http.post('*', ({request}) => { if(new URL(request.url).pathname==='/api/auth/guest/refresh')return new HttpResponse(null,{status:401});mutations();return HttpResponse.json({}); }));
    const view = await selected(); fill(); expect(screen.getByRole('complementary')).toHaveTextContent('Q 3,858.89');
    submit(); submit(); expect(screen.getByRole('button', { name: /Procesando/ })).toBeDisabled();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/reserva/checkout/revision?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1');
    view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />);
    expect(await screen.findAllByText('Carlos Mendoza Pérez')).toHaveLength(1); expect(screen.getByText(/\+50255555555/)).toBeInTheDocument();
    expect(screen.getByText('Llegada tardía')).toBeInTheDocument(); expect(screen.queryByText(/Sin cobros, correos ni reservas reales/)).not.toBeInTheDocument(); expect(screen.queryByText(/verificará nuevamente la disponibilidad/)).not.toBeInTheDocument();
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />);
    expect(await screen.findByLabelText('Nombre *')).toHaveValue('Carlos');
    expect(screen.getByLabelText('Documento de identificación *')).toHaveValue('DOC-DEMO');
    expect(JSON.stringify(sessionStorage.getItem('pms:public-cart:v1:real') ?? sessionStorage.getItem('pms:public-cart:v1:mock'))).not.toMatch(/guest@example|Carlos|DOC-DEMO/); expect(localStorage.length).toBe(0); expect(mutations).not.toHaveBeenCalled();
  });
  it('guards direct step 3 and invalidates approval after editing', async () => {
    const view = await selected(); fill(); view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />);
    expect(await screen.findByRole('region', { name: 'Completa tus datos antes de continuar' })).toBeInTheDocument();
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); await screen.findByLabelText('Nombre *'); submit();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Correo electrónico *'), { target: { value: 'changed@example.com' } });
    view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />);
    expect(await screen.findByRole('region', { name: 'Completa tus datos antes de continuar' })).toBeInTheDocument();
  });
  it('retains currency and isolates guest data after an accepted, revalidated search change', async () => {
    const view = await selected(); fill(); fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'GTQ' } });
    expect(screen.getByRole('complementary')).toHaveTextContent('Q 3,858.89');
    view.rerender(<PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={{ ...criteria, checkIn: '2026-10-11' }} />);
    await screen.findByRole('button', { name: 'Revisar mi selección' });
    fireEvent.click(screen.getByRole('button',{name:'Modificar fechas y huéspedes'}));
    fireEvent.change(screen.getByLabelText(/Fecha de Llegada/),{target:{value:'2026-10-11'}});
    fireEvent.click(screen.getByRole('button',{name:'Buscar Disponibilidad'}));
    await waitFor(()=>expect(screen.getByRole('complementary',{name:'Tu estadía'})).toHaveTextContent('2 noches'));
    view.rerender(<PublicGuestDataPage initialCriteria={{ ...criteria, checkIn: '2026-10-11' }} />);
    expect(await screen.findByLabelText('Nombre *')).toHaveValue(''); expect(screen.getByLabelText('Mostrar precios en')).toHaveValue('GTQ');
  });
  it('returns from Guest login and fills empty fields using the linked profile', async () => {
    const profileRead = vi.fn();
    mockServer.use(http.get('http://pms.test/profile/:profileId', ({ request, params }) => {
      profileRead(params.profileId, new URL(request.url).searchParams.get('accountId'));
      return HttpResponse.json({ profile_id: params.profileId, first_name: 'Alan', last_name: 'Palacios', email: 'contact@example.com', phone: '+502 5555 5555', country: 'Guatemala', preferred_language: 'Español', preferences: { bed_type: 'King', room_vibe: 'tranquila', floor_preference: 'Piso alto', privacy_level: 'SOLO CUENTA', revocable_consent: true } });
    }));
    const view = await selected(); fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Nombre manual' } });
    expect(screen.getByRole('link', { name: /Inicia sesión para autocompletar/ })).toHaveAttribute('href', expect.stringContaining('/acceso?returnTo='));
    view.rerender(<FixtureSignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Preparar sesión Guest' }));
    await screen.findByText('Sesión preparada');
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); fireEvent.click(await screen.findByRole('button', { name: 'Usar datos de mi cuenta' }));
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Nombre manual'); expect(screen.getByLabelText('Apellidos *')).toHaveValue('Palacios');
    expect(screen.getByLabelText('Correo electrónico *')).toHaveValue('contact@example.com');
    expect(profileRead).toHaveBeenCalledWith('profile-guest-demo-01', 'guest-demo-01');
    expect(screen.getByLabelText('Teléfono *')).toHaveValue('55555555'); expect(screen.getByLabelText('Documento de identificación *')).toHaveValue('');
  });
  it('blocks the form when availability fails', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => new HttpResponse(null, { status: 500 })));
    mount(); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar tu selección');
    expect(screen.queryByLabelText('Correo electrónico *')).not.toBeInTheDocument();
  });
});
