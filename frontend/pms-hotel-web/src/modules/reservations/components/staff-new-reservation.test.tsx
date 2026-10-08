import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { reservationHandlers } from '@/data/mocks/reservation-handlers';
import { resetStaffCreatedReservations } from '@/data/mocks/staff-reservation-create';
import { resetStaffRoomCatalog } from '@/data/mocks/staff-room-catalog';
import { StaffNewReservation } from './staff-new-reservation';

const clients: QueryClient[] = [];
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
  resetStaffCreatedReservations(); resetStaffRoomCatalog(); mockServer.use(...reservationHandlers);
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); vi.useRealTimers(); resetStaffCreatedReservations(); resetStaffRoomCatalog(); });
function setup(canCreate = true, propertyId = 'GT-HB-01') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  render(<QueryClientProvider client={client}><StaffNewReservation propertyId={propertyId} propertyName="Hotel Boutique" timezone="America/Guatemala" sessionId="staff-one" canCreate={canCreate} /></QueryClientProvider>);
  return { user: userEvent.setup(), client };
}
function fill() {
  fireEvent.change(screen.getByLabelText('Check-in *'), { target: { value: '2026-11-10' } });
  fireEvent.change(screen.getByLabelText('Check-out *'), { target: { value: '2026-11-12' } });
  fireEvent.change(screen.getByLabelText('Habitaciones *'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Nombre completo *'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico *'), { target: { value: 'ana@example.test' } });
  fireEvent.change(screen.getByLabelText('Teléfono *'), { target: { value: '+502 5555 5555' } });
  fireEvent.change(screen.getByLabelText('Notas y solicitudes especiales'), { target: { value: 'Llegada tardía' } });
}
async function select(user: ReturnType<typeof userEvent.setup>) {
  fill(); await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/ }));
  await user.click(await screen.findByRole('radio', { name: /Estandar Doble/ }));
  await user.click(screen.getByRole('button', { name: /Revisar reserva/ }));
}

describe('Staff new reservation journey', () => {
  it('validates the guest, date range and occupancy before making a request and focuses the first field', async () => {
    const requests = vi.fn(() => HttpResponse.json({})); mockServer.use(http.get('*/__mock/staff-reservations/:propertyId/quotes', requests));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/ }));
    expect(screen.getByLabelText('Nombre completo *')).toHaveFocus();
    expect(screen.getByLabelText('Correo electrónico *')).toHaveAttribute('aria-invalid', 'true');
    expect(requests).not.toHaveBeenCalled();
    fill(); fireEvent.change(screen.getByLabelText('Adultos *'), { target: { value: '0' } });
    await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/ }));
    expect(screen.getByText('Indica al menos un adulto en la reserva.')).toBeInTheDocument();
    expect(requests).not.toHaveBeenCalled();
  });
  it('preserves inputs when editing, creates N stays and invalidates only the selected property', async () => {
    const { user, client } = setup();
    client.setQueryData(['reservations', 'OTHER-PROPERTY', 'list'], { protected: true });
    await select(user);
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    expect(screen.getByLabelText('Nombre completo *')).toHaveValue('Ana Pérez');
    expect(screen.getByLabelText('Notas y solicitudes especiales')).toHaveValue('Llegada tardía');
    expect(screen.getByLabelText('Habitaciones *')).toHaveValue(2);
    await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/ }));
    await user.click(await screen.findByRole('radio', { name: /Estandar Doble/ }));
    await user.click(screen.getByRole('button', { name: /Revisar reserva/ }));
    await user.click(screen.getByRole('button', { name: 'Crear reserva local' }));
    expect(await screen.findByRole('heading', { name: 'Reserva registrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalle de la reserva' })).toHaveAttribute('href', expect.stringMatching(/^\/reservas\/LOCAL-/));
    expect(screen.getByText(/Pendiente · Sin captura/)).toBeInTheDocument();
    expect(client.getQueryState(['reservations', 'OTHER-PROPERTY', 'list'])?.isInvalidated).toBe(false);
  });
  it('keeps input after a conflict and allows returning to fresh availability', async () => {
    mockServer.use(http.post('*/__mock/staff-reservations/:propertyId', () => new HttpResponse(null, { status: 409 })));
    const { user } = setup(); await select(user);
    await user.click(screen.getByRole('button', { name: 'Crear reserva local' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La disponibilidad cambió');
    expect(screen.queryByRole('heading', { name: 'Reserva registrada' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Volver a disponibilidad' }));
    expect(await screen.findByRole('radio', { name: /Estandar Doble/ })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Volver a datos' }));
    expect(screen.getByLabelText('Correo electrónico *')).toHaveValue('ana@example.test');
  });
  it('blocks double submission while pending and uses one idempotency key on retry', async () => {
    const keys: string[] = []; let finish!: () => void; let fail = true;
    mockServer.use(http.post('*/__mock/staff-reservations/:propertyId', async ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key')!);
      await new Promise<void>(resolve => { finish = resolve; });
      return new HttpResponse(null, { status: fail ? 503 : 409 });
    }));
    const { user } = setup(); await select(user);
    const button = screen.getByRole('button', { name: 'Crear reserva local' });
    fireEvent.click(button); fireEvent.click(button); await waitFor(() => expect(finish).toBeDefined());
    expect(button).toBeDisabled(); expect(keys).toHaveLength(1);
    finish(); expect(await screen.findByRole('alert')).toHaveTextContent('Conservamos los datos');
    fail = false; finish = undefined as unknown as () => void;
    await user.click(screen.getByRole('button', { name: 'Crear reserva local' }));
    await waitFor(() => expect(keys).toHaveLength(2)); await waitFor(() => expect(finish).toBeDefined()); finish();
    expect(await screen.findByRole('alert')).toHaveTextContent('La disponibilidad cambió');
    expect(keys[1]).toBe(keys[0]);
  });
  it('shows a useful empty state for another property without copying the first property inventory', async () => {
    const { user } = setup(true, 'OTHER-PROPERTY'); fill();
    await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/ }));
    expect(await screen.findByRole('heading', { name: 'No hay tipos con tarifa disponibles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revisar reserva/ })).toBeDisabled();
  });
  it('does not send a synthetic command in real mode and does not fake a created reservation', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); const { user } = setup(); fill();
    await user.click(screen.getByRole('button', { name: /Consultar disponibilidad/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('todavía no están conectadas');
    expect(screen.getByLabelText('Nombre completo *')).toHaveValue('Ana Pérez');
    expect(screen.queryByRole('heading', { name: 'Reserva registrada' })).not.toBeInTheDocument();
  });
  it('denies the creation UI when the staff permission is absent', () => {
    setup(false);
    expect(screen.getByRole('status')).toHaveTextContent('no tiene permiso');
    expect(screen.queryByRole('button', { name: /Consultar disponibilidad/ })).not.toBeInTheDocument();
  });
});
