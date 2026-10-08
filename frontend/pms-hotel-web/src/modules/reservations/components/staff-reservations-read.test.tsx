import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { mapStaffReservationCenter, mapStaffReservationDetail } from '../mappers/staff-reservation.mapper';
import { ReservationCenter } from './reservation-center';
import { ReservationDetail } from './reservation-detail';

const mocks = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn() }));
vi.mock('../hooks/use-reservation-center', () => ({ useReservationCenter: mocks.list }));
vi.mock('../hooks/use-reservation-detail', () => ({ useReservationDetail: mocks.detail }));
afterEach(cleanup);
beforeEach(() => {
  mocks.list.mockReset(); mocks.detail.mockReset();
  mocks.list.mockReturnValue({ data: mapStaffReservationCenter([staffReservationFixture()]), refetch: vi.fn() });
  mocks.detail.mockReturnValue({ data: mapStaffReservationDetail(staffReservationFixture()), refetch: vi.fn() });
});

describe('existing Staff UI with real read data', () => {
  it('lists persisted code linking to reservation UUID, without invented KPI, occupancy or captured balance', () => {
    const dto = staffReservationFixture();
    render(<ReservationCenter propertyId={dto.propertyId} endpoint="/api/staff/reservations" />);
    expect(screen.getByRole('link', { name: dto.confirmationCode })).toHaveAttribute('href', `/reservas/${dto.reservationId}`);
    expect(screen.getByText('Real Responsible')).toBeInTheDocument();
    expect(screen.getByText('WEB_DIRECTA · Deluxe · Sin asignar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Resumen del día')).not.toBeInTheDocument();
    expect(screen.queryByText(/adultos|Pagado|Sin captura|Sin alertas/)).not.toBeInTheDocument();
  });
  it('shows real stays and responsibility while hiding unsupported details and mutations', () => {
    const dto = staffReservationFixture();
    render(<ReservationDetail propertyId={dto.propertyId} reservationId={dto.reservationId} endpoint="/api/staff/reservations" sessionId="staff" canManage />);
    expect(screen.getByRole('heading', { name: `Reserva ${dto.confirmationCode}` })).toBeInTheDocument();
    expect(screen.getByText(dto.reservationId)).toBeInTheDocument();
    expect(screen.getByText('Responsable de la reserva')).toBeInTheDocument();
    for (const label of ['Huéspedes', 'Teléfono', 'Tarifa', 'Política aplicable', 'Notas / solicitudes especiales', 'Resumen financiero']) expect(screen.queryByText(label)).not.toBeInTheDocument();
    for (const name of ['Cancelar reserva', 'Asignar habitación', 'Cambiar habitación', 'Extender estadía']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });
  it('renders historical header without a fabricated stay and an empty list', () => {
    const dto = staffReservationFixture(); dto.stays = []; dto.responsibleGuest = null;
    mocks.detail.mockReturnValue({ data: mapStaffReservationDetail(dto) });
    const view = render(<ReservationDetail propertyId={dto.propertyId} reservationId={dto.reservationId} endpoint="/api/staff/reservations" />);
    expect(screen.getByText('Sin estadías registradas.')).toBeInTheDocument();
    view.unmount(); mocks.list.mockReturnValue({ data: mapStaffReservationCenter([]) });
    render(<ReservationCenter propertyId={dto.propertyId} endpoint="/api/staff/reservations" />);
    expect(screen.getByText('No hay reservas para esta propiedad.')).toBeInTheDocument();
  });
});
