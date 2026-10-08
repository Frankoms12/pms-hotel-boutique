import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { backendAvailability, publicPropertyId } from '@/test/public-availability-fixture';
import { publicCatalogueFixture } from '@/data/mocks/public-catalogue';
import { buildPublicAvailabilityMock } from '@/data/mocks/public-availability';
import { resetPublicCheckoutFixtures } from '@/data/mocks/public-checkout-handlers';
import { GuestSessionProvider } from '@/modules/auth';
import { PublicBookingProvider, PublicRoomDetailPage, PublicBookingReviewPage } from '@/modules/booking';
import { CheckoutDraftProvider } from './checkout-draft-provider';
import { PublicGuestDataPage } from './public-guest-data-page';
import { PublicPaymentReviewPage } from './public-payment-review-page';
import { PublicCheckoutReviewPage } from './public-checkout-review-page';
import { PublicBookingConfirmationPage } from './public-booking-confirmation-page';
import { PublicBookingResultPage } from './public-booking-result-page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
// Only this test harness enables synthetic outcomes; public routes do not.
vi.mock('@/modules/payments', async () => {
  const actual = await vi.importActual<typeof import('@/modules/payments')>('@/modules/payments');
  return { ...actual, DemoCardGateway: (props: Parameters<typeof actual.DemoCardGateway>[0]) => <actual.DemoCardGateway {...props} showTestControls /> };
});
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => { push.mockClear(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T12:00:00Z')); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://pms.test'); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetPublicCheckoutFixtures(); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function mount(component = <PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria}/>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(component, { wrapper: ({ children }) => <QueryClientProvider client={client}><GuestSessionProvider><PublicBookingProvider><CheckoutDraftProvider>{children}</CheckoutDraftProvider></PublicBookingProvider></GuestSessionProvider></QueryClientProvider> });
}
async function prepared(multiple = false, useDollars = true) {
  const view = mount(); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' }));
  if (multiple) { view.rerender(<PublicRoomDetailPage roomTypeId="rt_double_superior" initialCriteria={criteria}/>); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' })); }
  view.rerender(<PublicGuestDataPage initialCriteria={criteria}/>); await screen.findByLabelText('Nombre *');
  for (const [label, value] of [['Nombre *','Carlos'],['Apellidos *','Mendoza'],['Correo electrónico *','guest@example.com'],['Teléfono *','55555555'],['Documento de identificación *','DOC-DEMO']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/checkout/revision?'))); push.mockClear();
  view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria}/>); fireEvent.click(await screen.findByRole('button', { name: /Continuar al pago/ })); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/checkout/pago?'))); push.mockClear();
  view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); await screen.findByRole('button', { name: 'Garantizar y confirmar reserva' });
  if (useDollars) fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'USD' } });
  return view;
}
function confirm() { fireEvent.click(screen.getByRole('button', { name: 'Garantizar y confirmar reserva' })); }
describe('Public payment and guarantee journey', () => {
  it('defaults to GTQ, converts a custom input in both directions and confirms the original quote cents', async () => {
    const view = await prepared(false, false);
    expect(screen.getByLabelText('Mostrar precios en')).toHaveValue('GTQ');
    expect(screen.getByRole('complementary')).toHaveTextContent('Q 3,858.89');
    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    expect(screen.getByLabelText('Moneda del monto')).toHaveValue('GTQ');
    const input = screen.getByLabelText('Monto a garantizar (GTQ)');
    expect(input).toHaveAttribute('placeholder', '1286.27');
    fireEvent.change(input, { target: { value: '1286.26' } }); expect(input).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(input, { target: { value: '2294.32' } }); expect(input).toHaveAttribute('aria-invalid', 'false');
    fireEvent.change(screen.getByLabelText('Moneda del monto'), { target: { value: 'USD' } });
    expect(screen.getByLabelText('Monto a garantizar (USD)')).toHaveValue('300.25');
    fireEvent.change(screen.getByLabelText('Moneda del monto'), { target: { value: 'GTQ' } });
    expect(screen.getByLabelText('Monto a garantizar (GTQ)')).toHaveValue('2294.32');
    // The page's display selector is independent of the explicitly labelled input currency.
    fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'USD' } });
    expect(screen.getByLabelText('Monto a garantizar (GTQ)')).toHaveValue('2294.32');
    expect(screen.getByRole('complementary')).toHaveTextContent('US$ 300.25');
    const writes = vi.spyOn(globalThis, 'fetch'); confirm();
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')), { timeout: 3000 });
    const sent = writes.mock.calls.find(([url]) => String(url).includes('/__mock/checkout/confirmations'))!;
    expect(JSON.parse(String(sent[1]?.body))).toMatchObject({ currency: 'USD', total_minor: 50500, guarantee_minor: 30025 });
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>);
    expect(screen.getByRole('complementary')).toHaveTextContent('US$ 204.75');
  }, 10000);
  it.each([['full', 50500], ['half', 25250], ['custom', 30025]] as const)('confirms the selected %s amount and exact remaining balance', async (mode, expected) => {
    const view = await prepared();
    expect(screen.getByRole('radio', { name: /Pagar en el hotel/ })).toBeDisabled();
    if (mode === 'full') fireEvent.click(screen.getByRole('radio', { name: /Pagar ahora/ }));
    else if (mode === 'half') fireEvent.click(screen.getByRole('button', { name: /50% de la estadía/ }));
    else {
      fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
      const input = screen.getByLabelText('Monto a garantizar (USD)');
      fireEvent.change(input, { target: { value: '1' } }); expect(input).toHaveAttribute('aria-invalid', 'true'); expect(screen.getByRole('button', { name: /y confirmar reserva/ })).toBeDisabled();
      fireEvent.change(input, { target: { value: '300.25' } }); expect(input).toHaveAttribute('aria-invalid', 'false');
    }
    const writes = vi.spyOn(globalThis, 'fetch');
    fireEvent.click(screen.getByRole('button', { name: /y confirmar reserva/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')), { timeout: 3000 });
    const sent = writes.mock.calls.find(([url]) => String(url).includes('/__mock/checkout/confirmations'))!;
    expect(JSON.parse(String(sent[1]?.body))).toMatchObject({ total_minor: 50500, guarantee_minor: expected });
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>);
    const summary = screen.getByRole('complementary');
    expect(summary).toHaveTextContent(`US$ ${(expected / 100).toFixed(2)}`); expect(summary).toHaveTextContent(`US$ ${((50500 - expected) / 100).toFixed(2)}`);
  }, 10000);
  it('keeps contact/search, computes guarantee separately, and confirms once without creating an account', async () => {
    const view = await prepared(); const summary = screen.getByRole('complementary');
    expect(summary).toHaveTextContent('US$ 505.00'); expect(summary).toHaveTextContent('US$ 168.33'); expect(summary).toHaveTextContent('US$ 336.67');
    expect(screen.getByRole('link', { name: '← Volver a revisión' })).toHaveAttribute('href', expect.stringContaining('checkIn=2026-10-10'));
    expect(sessionStorage.getItem('pms:public-cart:v1:mock')).not.toBeNull();
    const removal = vi.spyOn(sessionStorage, 'removeItem');
    confirm(); await screen.findByRole('button', { name: /Procesando garantía/ }); expect(screen.getByRole('button', { name: /Procesando garantía/ })).toBeDisabled();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 3000 }); expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?checkIn=2026-10-10'));
    expect(sessionStorage.getItem('pms:public-cart:v1:mock')).toBeNull();
    expect(removal.mock.calls.filter(([key]) => key === 'pms:public-cart:v1:mock')).toHaveLength(1);
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByRole('heading', { name: 'HB-2026-8942' })).toBeInTheDocument(); expect(screen.getByText('Abono confirmado')).toBeInTheDocument(); expect(screen.queryByText(/Sin débito real/)).not.toBeInTheDocument();
    view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); expect(await screen.findByText('Tu reserva ya está confirmada')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Garantizar y confirmar reserva' })).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0); expect(JSON.stringify(sessionStorage.getItem('pms:public-cart:v1:real') ?? sessionStorage.getItem('pms:public-cart:v1:mock'))).not.toMatch(/guest@example|Carlos|DOC-DEMO/);
  });
  it('recovers from declined cards and provider errors and preserves the same guest data', async () => {
    const view = await prepared();
    const cartBefore = sessionStorage.getItem('pms:public-cart:v1:mock');
    expect(cartBefore).not.toBeNull();
    for (const [token, message] of [['demo_card_declined', /rechazada/], ['demo_gateway_error', /no está disponible/]] as const) {
      fireEvent.change(screen.getByLabelText('Resultado de demostración'), { target: { value: token } }); confirm(); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/error?')), { timeout: 3000 });
      expect(sessionStorage.getItem('pms:public-cart:v1:mock')).toBe(cartBefore);
      view.rerender(<PublicBookingResultPage initialCriteria={criteria} status="error"/>); expect(screen.getByRole('heading', { name: 'No pudimos completar tu reserva' })).toBeInTheDocument(); expect(screen.getByRole('alert')).toHaveTextContent(message); expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument(); expect(screen.getByText('guest@example.com')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Reintentar pago con otra tarjeta' })).toHaveAttribute('href', expect.stringContaining('/checkout/pago?checkIn=2026-10-10'));
      view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByRole('region', { name: 'No hay una confirmación en esta sesión' })).toBeInTheDocument();
      push.mockClear(); view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); await screen.findByRole('button', { name: 'Garantizar y confirmar reserva' });
    }
    fireEvent.change(screen.getByLabelText('Resultado de demostración'), { target: { value: 'demo_visa_approved' } }); confirm(); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')), { timeout: 3000 });
  }, 10000);
  it('rejects price changes before submitting a guarantee', async () => {
    await prepared(); const writes = vi.fn(); mockServer.use(http.post('http://pms.test/__mock/checkout/confirmations', () => { writes(); return HttpResponse.json({}); }), http.get('*/api/v1/public/availability', ({ request }) => {
      const dto = structuredClone(buildPublicAvailabilityMock(new URL(request.url).searchParams, publicCatalogueFixture)!);
      const rate = dto.available_room_types[0].rate_plans[0]; rate.base_nightly_rate = '146.00'; rate.total_amount = '438.00'; rate.stay_price_breakdown!.estimated_total = '508.00'; return HttpResponse.json(dto);
    }));
    confirm(); expect(await screen.findByRole('alert')).toHaveTextContent(/tarifa cambió/); expect(writes).not.toHaveBeenCalled(); expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/error?'));
  });
  it('blocks exhausted availability and offline submission', async () => {
    const view = await prepared(); const writes = vi.fn(); mockServer.use(http.post('http://pms.test/__mock/checkout/confirmations', () => { writes(); return HttpResponse.json({}); }));
    onlineManager.setOnline(false); confirm(); expect(await screen.findByRole('alert')).toHaveTextContent(/Sin conexión/); expect(writes).not.toHaveBeenCalled(); onlineManager.setOnline(true); push.mockClear();
    mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => { const dto = structuredClone(buildPublicAvailabilityMock(new URL(request.url).searchParams, publicCatalogueFixture)!); dto.available_room_types[0].available_rooms_count = 0; return HttpResponse.json(dto); }));
    confirm(); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/error?'))); view.rerender(<PublicBookingResultPage initialCriteria={criteria} status="error"/>); expect(screen.getByRole('alert')).toHaveTextContent(/ya no tiene disponibilidad/); expect(screen.getByText('Deluxe King')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Modificar fechas o habitación' })).toHaveAttribute('href', expect.stringContaining('/habitaciones?checkIn=2026-10-10')); expect(writes).not.toHaveBeenCalled();
  });
  it('returns a single confirmation with all stays in a multi-room selection', async () => {
    const view = await prepared(true); expect(screen.getByRole('complementary')).toHaveTextContent('US$ 950.00'); confirm(); await waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 3000 });
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByText(/2 habitaciones/)).toBeInTheDocument(); expect(screen.getByText('Deluxe King')).toBeInTheDocument(); expect(screen.getByText('Doble Superior')).toBeInTheDocument();
  });
  it('guards direct/reloaded confirmation and rejects demo quotes without posting when switched to real mode', async () => {
    const view = mount(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByRole('region', { name: 'No hay una confirmación en esta sesión' })).toBeInTheDocument(); view.unmount();
    const payment = await prepared();
    expect(screen.getByRole('button', { name: 'Garantizar y confirmar reserva' })).toBeEnabled();
    const realSearch = vi.fn();
    mockServer.use(
      http.get('*/api/auth/guest/session', () => new HttpResponse(null, { status: 401 })),
      // Mode-specific session storage invalidates the demo selection before real review.
      http.get('*/api/v1/public/availability', ({ request }) => { realSearch(new URL(request.url).searchParams.get('propertyId')); return HttpResponse.json({ ...backendAvailability, arrival: criteria.checkIn, departure: criteria.checkOut }); }),
    );
    const requests = vi.spyOn(globalThis, 'fetch');
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID', publicPropertyId); payment.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>);
    expect(await screen.findByRole('region', { name: 'Revisa tu selección antes de continuar' })).toBeInTheDocument();
    expect(realSearch).toHaveBeenCalledWith(publicPropertyId);
    expect(realSearch).not.toHaveBeenCalledWith(publicCatalogueFixture.property_id);
    expect(screen.queryByRole('button', { name: 'Garantizar y confirmar reserva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Formulario de tarjeta')).not.toBeInTheDocument();
    expect(requests.mock.calls.filter(([input, init]) => (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase() === 'POST')).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });
  it('retains the same key and card after a lost response across the error/payment navigation', async () => {
    const view = await prepared(); fireEvent.click(screen.getByRole('button', { name: /50% de la estadía/ })); fireEvent.change(screen.getByLabelText('Resultado de demostración'), { target: { value: 'demo_mastercard_approved' } });
    const cartBefore = sessionStorage.getItem('pms:public-cart:v1:mock');
    expect(cartBefore).not.toBeNull();
    const removal = vi.spyOn(sessionStorage, 'removeItem');
    const originalFetch = globalThis.fetch; const keys: string[] = []; const bodies: string[] = []; let lost = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
      const booking = String(input).includes('/__mock/checkout/confirmations');
      if (booking) { keys.push(new Headers(options?.headers).get('Idempotency-Key')!); bodies.push(String(options?.body)); }
      const response = await originalFetch(input, options);
      if (booking && !lost) { lost = true; throw new TypeError('Connection lost after response'); }
      return response;
    });
    confirm(); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/error?')), { timeout: 3000 }); view.rerender(<PublicBookingResultPage initialCriteria={criteria} status="error"/>); expect(screen.getByRole('link', { name: 'Reintentar verificación con la misma tarjeta' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Modificar fechas o habitación' })).toBeDisabled();
    expect(sessionStorage.getItem('pms:public-cart:v1:mock')).toBe(cartBefore);
    expect(removal.mock.calls.filter(([key]) => key === 'pms:public-cart:v1:mock')).toHaveLength(0);
    push.mockClear(); view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); await screen.findByRole('button', { name: 'Garantizar y confirmar reserva' }); expect(screen.getByLabelText('Resultado de demostración')).toHaveValue('demo_mastercard_approved'); expect(screen.getByLabelText('Resultado de demostración')).toBeDisabled(); expect(screen.getByRole('button', { name: /50% de la estadía/ })).toHaveAttribute('aria-pressed', 'true'); expect(screen.getByRole('button', { name: 'Personalizado' })).toBeDisabled(); expect(screen.getByRole('complementary')).toHaveTextContent('US$ 252.50');
    confirm(); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')), { timeout: 3000 }); expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0]); expect(bodies[1]).toBe(bodies[0]);
    expect(sessionStorage.getItem('pms:public-cart:v1:mock')).toBeNull();
    expect(removal.mock.calls.filter(([key]) => key === 'pms:public-cart:v1:mock')).toHaveLength(1);
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByRole('heading', { name: 'HB-2026-8942' })).toBeInTheDocument();
  }, 10000);
  it('clears checkout and cart on the home action while keeping the currency preference', async () => {
    const view = await prepared(); confirm(); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')), { timeout: 3000 });
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'GTQ' } }); fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' })); expect(push).toHaveBeenLastCalledWith('/');
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByRole('region', { name: 'No hay una confirmación en esta sesión' })).toBeInTheDocument();
    view.rerender(<PublicBookingReviewPage initialCriteria={criteria}/>); expect(await screen.findByRole('region', { name: 'Tu selección está vacía' })).toBeInTheDocument();
    view.rerender(<PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria}/>); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' })); view.rerender(<PublicGuestDataPage initialCriteria={criteria}/>); expect(await screen.findByLabelText('Nombre *')).toHaveValue(''); expect(screen.getByLabelText('Mostrar precios en')).toHaveValue('GTQ');
  }, 10000);
});
