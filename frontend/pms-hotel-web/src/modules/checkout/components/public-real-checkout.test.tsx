import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { GuestSessionProvider } from '@/modules/auth';
import { PublicGlobalCart, PublicBookingProvider, PublicAvailabilityPage, PublicBookingReviewPage } from '@/modules/booking';
import { backendAvailability, publicPropertyId } from '@/test/public-availability-fixture';
import { publicBookingRequest, publicBookingResponse } from '@/test/public-booking-fixture';
import { CheckoutDraftProvider } from './checkout-draft-provider';
import { PublicGuestDataPage } from './public-guest-data-page';
import { PublicCheckoutReviewPage } from './public-checkout-review-page';
import { PublicPaymentReviewPage } from './public-payment-review-page';
import { PublicBookingConfirmationPage } from './public-booking-confirmation-page';
import { PublicBookingResultPage } from './public-booking-result-page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => {
  push.mockClear(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID', publicPropertyId);
  mockServer.use(http.get('*/api/auth/guest/session', () => new HttpResponse(null, { status: 401 })), http.get('*/api/v1/public/availability', () => HttpResponse.json(backendAvailability)));
});
afterEach(() => { clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
async function prepare(quantity = 1, multiple = false) {
  if (multiple) mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...backendAvailability, offers: [...backendAvailability.offers, { ...backendAvailability.offers[0], roomTypeId: '23ec66c1-2d0b-40e5-bccf-a6dc3acfe1d6', roomTypeCode: 'STD', roomTypeName: 'Standard real', ratePlanId: 'DEMO_STANDARD', ratePlanCode: 'DEMO_STANDARD', nightlyRateMinor: 65000, totalMinor: 130000 }] })));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const view = render(<PublicAvailabilityPage initialCriteria={criteria} />, { wrapper: ({ children }) => <QueryClientProvider client={client}><GuestSessionProvider><PublicBookingProvider><PublicGlobalCart /><CheckoutDraftProvider>{children}</CheckoutDraftProvider></PublicBookingProvider></GuestSessionProvider></QueryClientProvider> });
  const card = await screen.findByRole('article', { name: 'Deluxe real' });
  fireEvent.click(within(card).getByRole('button', { name: 'Agregar al carrito' }));
  if (multiple) fireEvent.click(within(screen.getByRole('article', { name: 'Standard real' })).getByRole('button', { name: 'Agregar al carrito' }));
  if (quantity === 2) {
    fireEvent.click(screen.getByRole('button', { name: /^Carrito/ }));
    const plus=await screen.findByRole('button', { name: 'Aumentar cantidad de Deluxe real' }); await waitFor(()=>expect(plus).toBeEnabled()); fireEvent.click(plus);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir explorando' }));
  }
  view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); await screen.findByLabelText('Nombre *');
  return view;
}
function fill() {
  for (const [label, value] of [['Nombre *', ' María José '], ['Apellidos *', "O’Neill-Pérez"], ['Correo electrónico *', ' GUEST@EXAMPLE.COM '], ['Teléfono *', '55555555'], ['Documento de identificación *', ' DOC-1234 ']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
async function approve() {
  fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!);
  await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/checkout/revision?')));
}
async function paymentPage(quantity = 1, multiple = false) {
  const view = await prepare(quantity, multiple); fill(); await approve();
  view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />);
  fireEvent.click(await screen.findByRole('button', { name: /Continuar al pago/ }));
  view.rerender(<PublicPaymentReviewPage initialCriteria={criteria} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar reserva con pago simulado' })).toBeEnabled());
  push.mockClear();
  return view;
}
describe('Real checkout presentation', () => {
  it.each([[1, false, 'Q 1,700.00'], [2, false, 'Q 3,400.00'], [2, true, 'Q 4,700.00']])('accepts GTQ quantity %i with multiple=%s and preserves state on every back link', async (quantity, multiple, total) => {
    const writes = vi.fn(); mockServer.use(http.post('*', ({request}) => { if(new URL(request.url).pathname==='/api/auth/guest/refresh')return new HttpResponse(null,{status:401});writes();return HttpResponse.json({}); }));
    const view = await prepare(quantity, multiple); fill();
    const back = screen.getByRole('link', { name: /Volver al carrito/ }); expect(back).toHaveAttribute('href', expect.stringContaining('/reserva?'));
    view.rerender(<PublicBookingReviewPage initialCriteria={criteria} />);
    expect(await screen.findByRole('article', { name: 'Deluxe real' })).toHaveTextContent('DEMO_DELUXE');
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); expect(await screen.findByLabelText('Nombre *')).toHaveValue(' María José ');
    await approve(); view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />);
    const summary = await screen.findByRole('complementary', { name: 'Total de la reserva' });
    expect(summary).toHaveTextContent(total as string); expect(summary).toHaveTextContent('Alojamiento');
    expect(summary).not.toHaveTextContent(/Impuestos|Cargo de servicio|Pendiente|Por confirmar/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Volver a datos' })).toHaveAttribute('href', expect.stringContaining('/checkout?'));
    expect(within(screen.getByRole('navigation', { name: 'Pasos de la reserva' })).getAllByRole('link')).toHaveLength(2);
    const next = screen.getByRole('button', { name: /Continuar al pago/ }); expect(next).toBeEnabled(); fireEvent.click(next);
    view.rerender(<PublicPaymentReviewPage initialCriteria={criteria} />);
    expect(await screen.findByRole('complementary', { name: 'Resumen de la reserva' })).toHaveTextContent(total as string);
    expect(screen.getByText('María José O’Neill-Pérez')).toBeInTheDocument(); expect(screen.getByText('guest@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Volver a revisión' })).toHaveAttribute('href', expect.stringContaining('/checkout/revision?'));
    expect(screen.getByRole('button', { name: 'Confirmar reserva con pago simulado' })).toBeEnabled();
    expect(screen.queryByTitle('Formulario de tarjeta')).not.toBeInTheDocument(); expect(screen.queryByText(/cotización está incompleta/)).not.toBeInTheDocument();
    view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />); expect(await screen.findByRole('button', { name: /Continuar al pago/ })).toBeEnabled();
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); expect(await screen.findByLabelText('Nombre *')).toHaveValue('María José'); expect(screen.getByLabelText('Documento de identificación *')).toHaveValue('DOC-1234');
    expect(writes).not.toHaveBeenCalled();
  });
  it('shows accessible field errors and prevents bad input advancing', async () => {
    await prepare(); fill();
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Carlos123' } });
    fireEvent.change(screen.getByLabelText('Apellidos *'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico *'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText('Teléfono *'), { target: { value: '5555555' } });
    fireEvent.change(screen.getByLabelText('Documento de identificación *'), { target: { value: '' } });
    fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!);
    expect(screen.getByLabelText('Nombre *')).toHaveFocus();
    for (const label of ['Nombre *', 'Apellidos *', 'Correo electrónico *', 'Teléfono *', 'Documento de identificación *']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true'); expect(screen.getByLabelText(label)).toHaveAccessibleDescription();
    }
    expect(screen.getByText(/exactamente 8 dígitos/)).toBeInTheDocument(); expect(screen.getByText('Ingresa tu documento de identificación.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Teléfono *'), { target: { value: 'abc' } }); expect(screen.getByLabelText('Teléfono *')).toHaveValue('5555555'); expect(screen.getByText('Ingresa solo dígitos en el teléfono.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Documento de identificación *'), { target: { value: 'DOC/123' } }); expect(screen.getByLabelText('Documento de identificación *')).toHaveAttribute('aria-invalid', 'true');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('Real J6 submit', () => {
  it.each([[1, false, 170000], [2, false, 340000], [2, true, 470000]])('posts quantity %i, multiple=%s and total %i once, then shows real identities/code', async (quantity, multiple, total) => {
    const requests: { body: typeof publicBookingRequest; key: string | null }[] = [];
    let response = publicBookingResponse;
    mockServer.use(http.post('*/api/v1/public/bookings', async ({ request }) => {
      const body = await request.json() as typeof publicBookingRequest;
      requests.push({ body, key: request.headers.get('Idempotency-Key') });
      response = { ...publicBookingResponse, totalMinor: body.clientTotalMinor, stays: body.stays.flatMap(stay => Array.from({ length: stay.quantity }, () => ({ ...publicBookingResponse.stays[0], roomTypeId: stay.roomTypeId, reservationStayId: crypto.randomUUID() }))) };
      return HttpResponse.json(response, { status: 201 });
    }));
    const view = await paymentPage(quantity, multiple);
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).not.toBeNull();
    const removal = vi.spyOn(sessionStorage, 'removeItem');
    const submit = screen.getByRole('button', { name: 'Confirmar reserva con pago simulado' });
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')));
    expect(requests).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('0');
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBeNull();
    expect(removal.mock.calls.filter(([key]) => key === 'pms:public-cart:v1:real')).toHaveLength(1);
    expect(requests[0].body).toEqual({ ...publicBookingRequest, clientTotalMinor: total, stays: expect.any(Array) });
    expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.keys(requests[0].body).sort()).toEqual(Object.keys(publicBookingRequest).sort());
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria} />);
    expect(screen.getByRole('heading', { name: publicBookingResponse.confirmationCode })).toBeInTheDocument();
    for (const stay of response.stays) expect(screen.getByText(`Estadía: ${stay.reservationStayId}`)).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toHaveTextContent('Pago simulado aprobado');
    expect(screen.getByRole('complementary')).toHaveTextContent('Q 0.00');
    expect(screen.queryByText(/\*\*\*\*/)).not.toBeInTheDocument();
    const writeText = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(publicBookingResponse.confirmationCode));
    view.rerender(<PublicPaymentReviewPage initialCriteria={criteria} />);
    expect(await screen.findByText('Tu reserva ya está confirmada')).toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });

  it('keeps the confirmed cart empty after a full provider remount without posting again', async () => {
    const writes = vi.fn(() => HttpResponse.json(publicBookingResponse, { status: 201 }));
    mockServer.use(http.post('*/api/v1/public/bookings', writes));
    const view = await paymentPage();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva con pago simulado' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')));
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBeNull();
    view.unmount();
    render(<QueryClientProvider client={clients[0]}><GuestSessionProvider><PublicBookingProvider><PublicGlobalCart /><CheckoutDraftProvider><PublicBookingConfirmationPage initialCriteria={criteria} /></CheckoutDraftProvider></PublicBookingProvider></GuestSessionProvider></QueryClientProvider>);
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('0');
    expect(screen.getByRole('region', { name: 'No hay una confirmación en esta sesión' })).toBeInTheDocument();
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, 'INVALID_REQUEST', /rechazó los datos/], [400, 'INVALID_DATE_RANGE', /fechas no son válidas/],
    [404, 'PROPERTY_NOT_FOUND', /propiedad no está disponible/], [409, 'NO_AVAILABILITY', /no hay disponibilidad/],
    [409, 'PRICE_CHANGED', /tarifa cambió/], [409, 'IDEMPOTENCY_KEY_REUSED', /clave del intento/],
    [422, 'PAYMENT_DECLINED', /pago simulado fue rechazado/], [500, 'BOOKING_FAILED', /No se guardó una reserva parcial/],
    [502, 'UPSTREAM_RESULT_UNKNOWN', /No pudimos verificar el resultado/],
  ])('explains %i/%s without navigating to success', async (status, code, message) => {
    mockServer.use(http.post('*/api/v1/public/bookings', () => HttpResponse.json({ code }, { status: Number(status) })));
    const view = await paymentPage();
    const cartBefore = sessionStorage.getItem('pms:public-cart:v1:real');
    expect(cartBefore).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva con pago simulado' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/error?')));
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBe(cartBefore);
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('1');
    view.rerender(<PublicBookingResultPage initialCriteria={criteria} status="error" />);
    expect(screen.getByRole('alert')).toHaveTextContent(message as RegExp);
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?'));
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria} />);
    expect(screen.getByRole('region', { name: 'No hay una confirmación en esta sesión' })).toBeInTheDocument();
  });
  it.each(['http', 'proxy', 'network'])('preserves the intent after a %s failure inside the replay modal', async mode => {
    const bodies: string[] = [], keys: string[] = [];
    mockServer.use(http.post('*/api/v1/public/bookings', async ({ request }) => {
      bodies.push(await request.text()); keys.push(request.headers.get('Idempotency-Key')!);
      if (bodies.length === 1) return HttpResponse.error();
      await new Promise(resolve => setTimeout(resolve, 80));
      return mode === 'network' ? HttpResponse.error() : HttpResponse.json({ code: mode === 'http' ? 'BOOKING_FAILED' : 'UPSTREAM_RESULT_UNKNOWN' }, { status: mode === 'http' ? 500 : 502 });
    }));
    const view = await paymentPage();
    const cartBefore = sessionStorage.getItem('pms:public-cart:v1:real');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva con pago simulado' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/error?')));
    view.rerender(<PublicBookingResultPage initialCriteria={criteria} status="error" />); push.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar la misma solicitud' }));
    const dialog = screen.getByRole('dialog');
    const retry = within(dialog).getByRole('button', { name: 'Reintentar solicitud' });
    fireEvent.click(retry); fireEvent.click(retry);
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Reintentando solicitud…' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    if (mode === 'http') {
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByRole('alert')).toHaveTextContent('No se guardó una reserva parcial');
      expect(screen.getByRole('link', { name: 'Reintentar reserva' })).toBeInTheDocument();
    } else {
      await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('No pudimos verificar el resultado'));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reintentar la misma solicitud' })).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar la misma solicitud' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('Q 1,700.00');
    }
    expect(push).not.toHaveBeenCalled();
    expect(bodies).toHaveLength(2); expect(bodies[1]).toBe(bodies[0]); expect(keys[1]).toBe(keys[0]);
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBe(cartBefore);
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('1');
    expect(screen.getByText('María José O’Neill-Pérez')).toBeInTheDocument();
  });
  it.each(['lost', 'invalid-response', 'proxy-error', 'cancelled'])('replays the exact saved operation after %s before reading changed availability', async failure => {
    const bodies: string[] = [], keys: string[] = [];
    let creations = 0;
    mockServer.use(http.post('*/api/v1/public/bookings', async ({ request }) => {
      bodies.push(await request.text()); keys.push(request.headers.get('Idempotency-Key')!);
      if (bodies.length === 1) {
        creations++;
        if (failure === 'invalid-response') return HttpResponse.json({ ...publicBookingResponse, stays: [] }, { status: 201 });
        if (failure === 'proxy-error') return HttpResponse.json({ code: 'UPSTREAM_RESULT_UNKNOWN' }, { status: 502 });
        if (failure === 'cancelled') { await new Promise(resolve => setTimeout(resolve, 100)); return HttpResponse.json(publicBookingResponse, { status: 201 }); }
        return HttpResponse.error();
      }
      return HttpResponse.json(publicBookingResponse, { status: 201 });
    }));
    const view = await paymentPage();
    const cartBefore = sessionStorage.getItem('pms:public-cart:v1:real');
    expect(cartBefore).not.toBeNull();
    const removal = vi.spyOn(sessionStorage, 'removeItem');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva con pago simulado' }));
    if (failure === 'cancelled') { await screen.findByRole('button', { name: /Verificando la solicitud/ }); view.rerender(<PublicBookingResultPage initialCriteria={criteria} status="error" />); }
    else await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/error?')));
    await waitFor(() => expect(bodies).toHaveLength(1));
    if (failure === 'cancelled') await new Promise(resolve => setTimeout(resolve, 150));
    view.rerender(<PublicBookingResultPage initialCriteria={criteria} status="error" />);
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBe(cartBefore);
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('1');
    expect(removal.mock.calls.filter(([key]) => key === 'pms:public-cart:v1:real')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Reintentar la misma solicitud' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Volver al inicio' })).toBeDisabled();
    const reads = vi.fn(); mockServer.use(http.get('*/api/v1/public/availability', () => { reads(); return HttpResponse.json({ ...backendAvailability, offers: [] }); }));
    push.mockClear();
    const open = screen.getByRole('button', { name: 'Reintentar la misma solicitud' });
    fireEvent.click(open);
    let dialog = screen.getByRole('dialog', { name: 'Reintentar la misma solicitud' });
    expect(dialog).toHaveTextContent('Deluxe real');
    expect(dialog).toHaveTextContent('1 nov 2026 → 3 nov 2026');
    expect(dialog).toHaveTextContent('Q 1,700.00');
    expect(within(dialog).getByRole('button', { name: 'Reintentar solicitud' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(push).not.toHaveBeenCalled(); expect(bodies).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBe(cartBefore);
    expect(push).not.toHaveBeenCalled(); expect(bodies).toHaveLength(1);
    fireEvent.click(open);
    dialog = screen.getByRole('dialog');
    onlineManager.setOnline(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar solicitud' }));
    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('No pudimos verificar el resultado'));
    expect(bodies).toHaveLength(1);
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBe(cartBefore);
    expect(push).not.toHaveBeenCalled();
    onlineManager.setOnline(true);
    const retry = within(dialog).getByRole('button', { name: 'Reintentar solicitud' });
    fireEvent.click(retry); fireEvent.click(retry);
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?')));
    expect(push).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBeNull();
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('0');
    expect(removal.mock.calls.filter(([key]) => key === 'pms:public-cart:v1:real')).toHaveLength(1);
    expect(reads).not.toHaveBeenCalled(); expect(bodies).toHaveLength(2); expect(bodies[1]).toBe(bodies[0]); expect(keys[1]).toBe(keys[0]); expect(creations).toBe(1);
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria} />);
    expect(screen.getByRole('heading', { name: publicBookingResponse.confirmationCode })).toBeInTheDocument();
  });
});

it('uses the exact approved Guest HTML maxima, country-specific phone limit and requests counter', async () => {
  await prepare();
  for (const [label,maximum] of [['Nombre *',50],['Apellidos *',60],['Correo electrónico *',120],['Teléfono *',8],['Documento de identificación *',25],['Solicitudes especiales',250]] as const) expect(screen.getByLabelText(label)).toHaveAttribute('maxlength',String(maximum));
  for (const label of ['Nombre *','Apellidos *','Correo electrónico *','Teléfono *','Documento de identificación *','País / región *']) expect(screen.getByLabelText(label)).toBeRequired();
  expect(screen.getByLabelText('Caracteres de solicitudes especiales')).toHaveTextContent('0/250');
  fireEvent.change(screen.getByLabelText('Código de país del teléfono'),{target:{value:'+1'}}); expect(screen.getByLabelText('Teléfono *')).toHaveAttribute('maxlength','15');
});
