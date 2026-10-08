import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { publicBookingRequest } from '@/test/public-booking-fixture';
import { sixRoomAvailability } from '@/test/public-six-room-fixture';
import { PublicBookingReplayDialog } from './public-booking-replay-dialog';

const operation = {
  scope: 'scope', selectionKey: 'selection', criteria: {},
  request: { ...publicBookingRequest, clientTotalMinor: 470000, stays: [{ ...publicBookingRequest.stays[0], quantity: 2 }, { roomTypeId: sixRoomAvailability.offers[0].roomTypeId, ratePlanId: sixRoomAvailability.offers[0].ratePlanId, quantity: 1 }], idempotencyKey: 'original-key' },
  roomNames: { [publicBookingRequest.stays[0].roomTypeId]: 'Deluxe real', [sixRoomAvailability.offers[0].roomTypeId]: sixRoomAvailability.offers[0].roomTypeName },
};

describe('Public booking replay dialog', () => {
  it('summarizes the original quantity, dates and total, focuses Cancel and binds both actions without exposing guest data or the key', () => {
    const onCancel = vi.fn(), onConfirm = vi.fn();
    render(<PublicBookingReplayDialog operation={operation} busy={false} error="" onCancel={onCancel} onConfirm={onConfirm} />);
    const dialog = screen.getByRole('dialog', { name: 'Reintentar la misma solicitud' });
    expect(dialog).toHaveTextContent('Deluxe real × 2');
    expect(dialog).toHaveTextContent('Habitación Estándar');
    expect(dialog).toHaveTextContent('1 nov 2026 → 3 nov 2026');
    expect(dialog).toHaveTextContent('Q 4,700.00');
    expect(within(dialog).getByRole('button', { name: 'Reintentar solicitud' })).toBeEnabled();
    expect(dialog).not.toHaveTextContent(operation.request.idempotencyKey);
    expect(dialog).not.toHaveTextContent(operation.request.bookingGuest.email);
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce(); expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar solicitud' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
