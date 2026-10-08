'use client';

import Link from 'next/link';
import { displayMoney, type BookingSearchCriteria, type usePublicDisplayCurrency } from '@/modules/booking';
import type { BookingConfirmation } from '@/modules/reservations';
import type { GuestDetails } from '../domain/guest-details';
import { useConfirmationActions } from '../hooks/use-confirmation-actions';
import styles from './public-booking-confirmation-page.module.css';

export const bookingDateLabel = (value: string) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

export function BookingConfirmationTicket({ confirmation, guest, criteria, currency }: { confirmation: BookingConfirmation; guest: Pick<GuestDetails, 'firstName' | 'lastName' | 'email'>; criteria: Partial<BookingSearchCriteria>; currency: ReturnType<typeof usePublicDisplayCurrency> }) {
  const actions = useConfirmationActions(confirmation);
  return <section className={`${styles.card} ${styles.receipt}`} data-booking-receipt aria-labelledby="confirmation-title">
    <p className={styles.printTitle}>Hotel Boutique · Comprobante de reserva</p>
    <div className={styles.codeHeading}><div><p className={styles.eyebrow}>CÓDIGO DE RESERVA</p><h2 id="confirmation-title" className={styles.reference}>{'confirmationCode' in confirmation ? confirmation.confirmationCode : confirmation.reservationId}</h2></div><button type="button" className={styles.copy} onClick={() => void actions.copyCode()} aria-label="Copiar código"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>Copiar código</span></button></div>
    <dl className={styles.details}><div><dt>{confirmation.stays.length === 1 ? 'Habitación' : 'Habitaciones'}</dt><dd><ul className={styles.stays}>{confirmation.stays.map(stay => <li key={stay.id}><strong>{stay.roomName}</strong><small>Estadía: {stay.id}</small></li>)}</ul></dd></div>
      <div><dt>Check-in</dt><dd>{bookingDateLabel(confirmation.arrival)}</dd></div><div><dt>Check-out</dt><dd>{bookingDateLabel(confirmation.departure)}</dd></div>
      <div><dt>Huéspedes</dt><dd>{criteria.adults} {criteria.adults === 1 ? 'adulto' : 'adultos'}{criteria.children ? ` · ${criteria.children} ${criteria.children === 1 ? 'niño' : 'niños'}` : ''}</dd></div>
      <div><dt>Responsable</dt><dd>{guest.firstName} {guest.lastName}</dd></div><div><dt>Correo</dt><dd>{guest.email}</dd></div>
      <div><dt>Importe</dt><dd className={styles.import}>{displayMoney(confirmation.totalMinor / 100, confirmation.currency, currency)}</dd></div>
      <div><dt>Estado</dt><dd><span className={styles.badge}>✓ Confirmada</span><small className={styles.stayCount}>{confirmation.stays.length} {confirmation.stays.length === 1 ? 'habitación' : 'habitaciones'}</small></dd></div>
    </dl>
    <p className={styles.note}>Guarda este comprobante y tu código de reserva para consultar los detalles de tu estadía.</p>
    <div className={styles.actions}><Link className={styles.secondary} href="/mis-reservas">Ver mis reservas <span aria-hidden="true">↗</span></Link><button type="button" className={styles.secondary} onClick={actions.printReceipt}>Imprimir / Guardar PDF</button><button type="button" className={styles.secondary} onClick={actions.downloadCalendar}>Agregar al calendario (.ics)</button></div>
    <p className={`${styles.note} ${styles.exportNote}`}>La impresión permite guardar un PDF desde tu navegador. El calendario es compatible con importación en Google Calendar e iCal.</p>
    <div className={styles.next}><h3>¿Reservaste como invitado?</h3><p>Tu reserva no requiere una cuenta. Para consultarla desde «Mis reservas», inicia sesión y vincúlala con tu código de reserva y la verificación de tu correo.</p></div>
    {actions.feedback && <p className={styles.toast} role="status">{actions.feedback}</p>}
  </section>;
}
