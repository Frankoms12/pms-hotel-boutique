'use client';

import { useRef } from 'react';
import { displayMoney } from '@/modules/booking';
import { Button, Modal } from '@/shared/components';
import type { PublicBookingAttempt } from '../domain/public-booking-attempt';
import { bookingDateLabel } from './booking-confirmation-ticket';
import styles from './public-booking-confirmation-page.module.css';

export function PublicBookingReplayDialog({ operation, busy, error, onCancel, onConfirm }: {
  operation: PublicBookingAttempt;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { request, roomNames } = operation;
  return <div className={styles.modalLayer}><Modal title="Reintentar la misma solicitud" busy={busy} onClose={onCancel} initialFocusRef={cancelRef} className={styles.replayDialog}
    footer={<>
      <Button ref={cancelRef} type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</Button>
      <Button type="button" isLoading={busy} loadingText="Reintentando solicitud…" onClick={onConfirm}>Reintentar solicitud</Button>
    </>}>
    <dl className={styles.details}>
      <div><dt>Habitaciones</dt><dd>{request.stays.map((stay, index) => <div key={`${stay.roomTypeId}:${index}`}>{roomNames[stay.roomTypeId]}{stay.quantity > 1 ? ` × ${stay.quantity}` : ''}</div>)}</dd></div>
      <div><dt>Fechas</dt><dd>{bookingDateLabel(request.arrival)} → {bookingDateLabel(request.departure)}</dd></div>
      <div><dt>Total</dt><dd>{displayMoney(request.clientTotalMinor / 100, request.currency, request.currency)}</dd></div>
    </dl>
    {error && <p className={styles.alert} role="alert">{error}</p>}
  </Modal></div>;
}
