import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { reservationHandlers } from '@/data/mocks/reservation-handlers';
import { resetRoomAssignments } from '@/data/mocks/room-assignment';
import { resetStaffCreatedReservations } from '@/data/mocks/staff-reservation-create';
import { operationalRoomFixture, resetStaffRoomCatalog } from '@/data/mocks/staff-room-catalog';
import { mapStaffReservationQuote } from '../mappers/staff-reservation-create.mapper';
import { createStaffReservation, readStaffReservationQuote } from '../service/staff-reservation-create.service';
import { getReservationDetail } from '../service/reservation.service';
import { RoomAssignment } from './room-assignment';
import { ReservationDetail } from './reservation-detail';

const propertyId = 'GT-HB-01', endpoint = 'http://pms.test/contract/reservations';
const path = '*/__mock/staff-reservations/:propertyId/:reservationId/stays/:stayId/room-assignment';
const clients: QueryClient[] = [];
async function booking(rooms = 1) {
  const search = { checkIn: '2026-11-10', checkOut: '2026-11-12', adults: 2, children: 0, rooms };
  const quote = mapStaffReservationQuote(await readStaffReservationQuote(propertyId, search), propertyId, search);
  return createStaffReservation(quote, quote.options[0], { fullName: 'Ana Pérez', email: 'ana@example.test', phone: '+502 5555 5555', notes: '' }, crypto.randomUUID());
}
function mount(element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return { ...render(<QueryClientProvider client={client}>{element}</QueryClientProvider>), client };
}
function props(detail: Awaited<ReturnType<typeof booking>>) {
  return { propertyId, reservationId: detail.reservation_id, stayId: detail.stays[0].stay_id, sessionId: 'staff-qa', allowed: true, onClose: vi.fn(), onAssigned: vi.fn() };
}
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetRoomAssignments(); resetStaffCreatedReservations(); resetStaffRoomCatalog(); mockServer.use(...reservationHandlers); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); resetRoomAssignments(); resetStaffCreatedReservations(); resetStaffRoomCatalog(); });

describe('Staff initial room assignment UI', () => {
  it('assigns N stays separately and updates the detail without confirming the pending reservation', async () => {
    const detail = await booking(2);
    mount(<ReservationDetail propertyId={propertyId} endpoint={endpoint} reservationId={detail.reservation_id} sessionId="staff-qa" canManage />);
    expect(await screen.findAllByRole('button', { name: 'Asignar habitación' })).toHaveLength(2);
    for (const [index, number] of ['101', '102'].entries()) {
      const group = screen.getByRole('group', { name: `Estadía ${detail.stays[index].stay_id}` });
      fireEvent.click(within(group).getByRole('button', { name: 'Asignar habitación' }));
      const dialog = screen.getByRole('dialog', { name: 'Asignar habitación' });
      const candidate = await within(dialog).findByRole('radio', { name: new RegExp(`Habitación ${number}`) });
      expect(within(dialog).getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
      expect(within(dialog).getByRole('radio', { name: /Habitación 103/ })).toBeDisabled();
      if (index) expect(within(dialog).getByRole('radio', { name: /Habitación 101/ })).toBeDisabled();
      fireEvent.click(candidate);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar asignación' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByRole('status')).toHaveTextContent(`Habitación ${number} asignada`);
      expect(within(group).getByText(`${number} · Estandar Doble`)).toBeInTheDocument();
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: `Reserva ${detail.reservation_id}` }));
    }
    expect(screen.queryByRole('button', { name: 'Asignar habitación' })).not.toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    const updated = await getReservationDetail({ endpoint, propertyId, reservationId: detail.reservation_id });
    expect(updated.total_amount).toBe(detail.total_amount);
    expect(updated.finance_state).toBe('NO_CAPTURE');
    expect(updated.stays.map(stay => stay.travel_state)).toEqual(['RESERVED', 'RESERVED']);
  });
  it('refreshes conflicts, disables the stale room and allows another selection without a false success', async () => {
    const detail = await booking(), input = props(detail);
    mount(<RoomAssignment {...input} />);
    fireEvent.click(await screen.findByRole('radio', { name: /Habitación 101/ }));
    operationalRoomFixture(propertyId).find(room => room.number === '101')!.status = 'OOO';
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La habitación o la estadía cambiaron');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Habitación 101/ })).toBeDisabled());
    expect(input.onAssigned).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Habitación 102/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
    await waitFor(() => expect(input.onAssigned).toHaveBeenCalledWith(expect.objectContaining({ roomId: 'ROOM-102' })));
  });
  it('keeps input on a failed submit and prevents duplicate clicks while a retry is pending', async () => {
    const detail = await booking(), input = props(detail);
    let attempts = 0;
    mockServer.use(http.put(path, async () => { attempts++; await delay(200); return new HttpResponse(null, { status: 503 }); }));
    mount(<RoomAssignment {...input} />);
    const radio = await screen.findByRole('radio', { name: /Habitación 101/ });
    fireEvent.click(radio);
    const confirm = screen.getByRole('button', { name: 'Confirmar asignación' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(await screen.findByRole('button', { name: 'Asignando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(input.onClose).not.toHaveBeenCalled();
    await screen.findByRole('alert');
    expect(radio).toBeChecked();
    expect(input.onAssigned).not.toHaveBeenCalled();
    expect(attempts).toBe(1);
    mockServer.use(...reservationHandlers);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
    await waitFor(() => expect(input.onAssigned).toHaveBeenCalledTimes(1));
  });
  it('shows loading errors/retry and an honest empty result for a terminal reservation', async () => {
    const detail = await booking(), input = props(detail);
    mockServer.use(http.get(path, () => new HttpResponse(null, { status: 503 })));
    const view = mount(<RoomAssignment {...input} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar');
    mockServer.use(...reservationHandlers);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('radio', { name: /Habitación 101/ });
    view.unmount();
    mount(<RoomAssignment {...input} reservationId="HB-2026-08055" stayId="STAY-2026-08055-A" />);
    expect(await screen.findByText('El estado de esta reserva o estadía no permite una asignación inicial.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
  });
  it('does not query/submit without permission or an approved real transport', async () => {
    const detail = await booking(), input = props(detail), read = vi.fn(() => new HttpResponse(null, { status: 500 }));
    mockServer.use(http.get(path, read));
    const view = mount(<RoomAssignment {...input} allowed={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent('no tiene permiso');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    mount(<RoomAssignment {...input} />);
    expect(screen.getByRole('status')).toHaveTextContent('al conectar su contrato con Backend');
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
    expect(read).not.toHaveBeenCalled();
  });
  it('never publishes a late success after leaving the selected stay', async () => {
    const detail = await booking(), input = props(detail);
    let started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    mockServer.use(http.put(path, async () => {
      started(); await delay(150);
      return HttpResponse.json({ property_id: propertyId, reservation_id: detail.reservation_id, stay_id: input.stayId, room_id: 'ROOM-101', number: '101' });
    }));
    const view = mount(<RoomAssignment {...input} />);
    fireEvent.click(await screen.findByRole('radio', { name: /Habitación 101/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
    await waiting; view.unmount();
    await delay(200);
    expect(input.onAssigned).not.toHaveBeenCalled();
  });
});
