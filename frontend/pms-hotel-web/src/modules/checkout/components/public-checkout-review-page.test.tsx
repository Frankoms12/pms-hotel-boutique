import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { buildPublicAvailabilityMock } from '@/data/mocks/public-availability';
import { publicCatalogueFixture } from '@/data/mocks/public-catalogue';
import { GuestSessionProvider } from '@/modules/auth';
import { PublicBookingProvider, PublicRoomDetailPage } from '@/modules/booking';
import { CheckoutDraftProvider } from './checkout-draft-provider';
import { PublicGuestDataPage } from './public-guest-data-page';
import { PublicCheckoutReviewPage } from './public-checkout-review-page';
import { PublicPaymentReviewPage } from './public-payment-review-page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => { push.mockClear(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T12:00:00Z')); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://pms.test'); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.useRealTimers(); vi.unstubAllEnvs(); });
function mount(component = <PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria}/>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(component, { wrapper: ({ children }) => <QueryClientProvider client={client}><GuestSessionProvider><PublicBookingProvider><CheckoutDraftProvider>{children}</CheckoutDraftProvider></PublicBookingProvider></GuestSessionProvider></QueryClientProvider> });
}
async function prepared(multiple = false, requests = '') {
  const view = mount(); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' }));
  if (multiple) { view.rerender(<PublicRoomDetailPage roomTypeId="rt_double_superior" initialCriteria={criteria}/>); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' })); }
  view.rerender(<PublicGuestDataPage initialCriteria={criteria}/>); await screen.findByLabelText('Nombre *');
  for (const [label, value] of [['Nombre *','Carlos'],['Apellidos *','Mendoza'],['Correo electrónico *','guest@example.com'],['Teléfono *','55555555'],['Documento de identificación *','DOC-DEMO'],['Solicitudes especiales',requests]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/checkout/revision?'))); push.mockClear();
  view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria}/>); await screen.findByRole('button', { name: /Continuar al pago/ }); return view;
}
describe('Final checkout review', () => {
  it('shows captured guest, stay, four steps and the complete quote without mutations', async () => {
    const writes = vi.fn(); mockServer.use(http.post('*', ({request}) => { if(new URL(request.url).pathname==='/api/auth/guest/refresh')return new HttpResponse(null,{status:401});writes();return HttpResponse.json({}); }));
    await prepared(false, 'Llegada tardía después de las 20:00 h');
    expect(screen.getByRole('heading', { name: 'Revisa y confirma tu reserva' })).toBeInTheDocument();
    const steps = within(screen.getByRole('navigation', { name: 'Pasos de la reserva' })).getAllByRole('listitem');
    expect(steps).toHaveLength(4); expect(steps[2]).toHaveAttribute('aria-current', 'step'); expect(steps[0]).toHaveTextContent('✓'); expect(steps[3]).toHaveTextContent('Pago y garantía');
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument(); expect(screen.getByText(/guest@example.com · \+50255555555/)).toBeInTheDocument(); expect(screen.getByText('Guatemala')).toBeInTheDocument(); expect(screen.getByText(/Llegada tardía después/)).toBeInTheDocument();
    expect(screen.getByText(/3 noches · 2 huéspedes · 1 habitación/)).toBeInTheDocument();
    const total = screen.getByRole('complementary'); for (const amount of ['Q 3,323.99','Q 168.11','Q 366.79','Q 3,858.89']) expect(total).toHaveTextContent(amount);
    fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ })); expect(push).toHaveBeenCalledWith('/reserva/checkout/pago?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1');
    expect(writes).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0); expect(JSON.stringify(sessionStorage.getItem('pms:public-cart:v1:real') ?? sessionStorage.getItem('pms:public-cart:v1:mock'))).not.toMatch(/guest@example|Carlos|DOC-DEMO/);
  });
  it('keeps search and input values through editing and prevents bypassing review', async () => {
    const view = await prepared();
    expect(screen.getByText('Sin solicitudes adicionales')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar estadía' })).toHaveAttribute('href', '/reserva?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1');
    expect(screen.getByRole('link', { name: 'Editar huésped principal' })).toHaveAttribute('href', expect.stringContaining('/checkout?checkIn=2026-10-10'));
    expect(screen.getByRole('link', { name: 'Editar solicitudes especiales' })).toHaveAttribute('href', expect.stringContaining('#guest-specialRequests'));
    view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); expect(await screen.findByRole('region', { name: 'Revisa tu reserva antes de continuar' })).toBeInTheDocument(); expect(screen.queryByTitle('Formulario de tarjeta')).not.toBeInTheDocument();
    view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria}/>); fireEvent.click(await screen.findByRole('button', { name: /Continuar al pago/ }));
    push.mockClear(); view.rerender(<PublicGuestDataPage initialCriteria={criteria}/>); expect(await screen.findByLabelText('Nombre *')).toHaveValue('Carlos'); fireEvent.change(screen.getByLabelText('Correo electrónico *'), { target: { value: 'corrected@example.com' } }); fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/checkout/revision?')));
    view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); expect(await screen.findByRole('region', { name: 'Revisa tu reserva antes de continuar' })).toBeInTheDocument();
    view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria}/>); expect(await screen.findByText(/corrected@example.com/)).toBeInTheDocument();
  }, 10000); // Multiple page transitions and two validated guest-form submissions.
  it('totals multiple rooms and retains the selected display currency', async () => {
    await prepared(true); expect(screen.getByRole('complementary')).toHaveTextContent('Q 7,259.29'); expect(screen.getByText('Doble Superior')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'GTQ' } }); expect(screen.getByRole('complementary')).toHaveTextContent('Q 7,259.29');
  });
  it('guards direct access without a selected room', async () => {
    mount(<PublicCheckoutReviewPage initialCriteria={criteria}/>); expect(await screen.findByRole('region', { name: 'Revisa tu selección antes de continuar' })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Continuar al pago/ })).not.toBeInTheDocument();
  });
  it('requires guest approval before displaying personal information', async () => {
    const view = mount(); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' })); view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria}/>); expect(await screen.findByRole('region', { name: 'Completa tus datos antes de continuar' })).toBeInTheDocument();
  });
  it('requires a new review if the quoted price changes after acknowledgement', async () => {
    const view = await prepared(); fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ }));
    mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => { const dto = structuredClone(buildPublicAvailabilityMock(new URL(request.url).searchParams, publicCatalogueFixture)!); const rate = dto.available_room_types[0].rate_plans[0]; rate.base_nightly_rate = '146.00'; rate.total_amount = '438.00'; rate.stay_price_breakdown!.estimated_total = '508.00'; return HttpResponse.json(dto); }));
    await clients[0].invalidateQueries(); view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>);
    expect(await screen.findByRole('region', { name: 'Revisa tu reserva antes de continuar' })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Garantizar y confirmar reserva' })).not.toBeInTheDocument();
    view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria}/>); expect(await screen.findByRole('button', { name: /Continuar al pago/ })).toBeEnabled(); expect(screen.getByRole('complementary')).toHaveTextContent('Q 3,881.81');
    fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ })); view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); expect(await screen.findByRole('button', { name: 'Garantizar y confirmar reserva' })).toBeEnabled();
  });
  it('never treats missing estimated taxes as zero or allows payment with incomplete quotes', async () => {
    const view = await prepared();
    mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => { const dto = structuredClone(buildPublicAvailabilityMock(new URL(request.url).searchParams, publicCatalogueFixture)!); delete dto.available_room_types[0].rate_plans[0].stay_price_breakdown; return HttpResponse.json(dto); }));
    await clients[0].invalidateQueries(); view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria}/>);
    expect(await screen.findByRole('button', { name: /Continuar al pago/ })).toBeDisabled(); expect(screen.getByRole('complementary')).toHaveTextContent('Por confirmar'); expect(screen.getByRole('alert')).toHaveTextContent('cotización está incompleta');
  });
});
