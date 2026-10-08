'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { displayMoney, PublicCurrencySelector, publicResultsHref, usePublicDisplayCurrency, useResetPublicBooking, type BookingSearchCriteria } from '@/modules/booking';
import { Button, EmptyState } from '@/shared/components';
import { useCheckoutConfirmation, useCheckoutFailure, usePendingPublicBooking, useResetCheckout } from './checkout-draft-provider';
import { BookingConfirmationTicket, bookingDateLabel } from './booking-confirmation-ticket';
import { publicPaymentHref, publicCheckoutReviewHref } from '../domain/checkout-navigation';
import { usePublicCheckout } from '../hooks/use-public-checkout';
import { PublicBookingReplayDialog } from './public-booking-replay-dialog';
import styles from './public-booking-confirmation-page.module.css';

/** Editable hotel contact. Configure the approved reception number before publishing. */
const reception = { phone: '+502 2222 0000' };

export function PublicBookingResultPage({ initialCriteria: criteria, status }: { initialCriteria: Partial<BookingSearchCriteria>; status: 'success' | 'error' }) {
  const success = useCheckoutConfirmation(criteria);
  const failed = useCheckoutFailure(criteria);
  const pendingOperation = usePendingPublicBooking();
  const replay = usePublicCheckout(null, criteria, { navigateOnError: false });
  const resetDraft = useResetCheckout();
  const resetCart = useResetPublicBooking();
  const preferredCurrency = usePublicDisplayCurrency();
  const router = useRouter();
  const [leaving, startNavigation] = useTransition();
  const [showHelp, setShowHelp] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const replayTrigger = useRef<HTMLButtonElement>(null);
  const cancelReplay = useCallback(() => {
    if (replay.isPending) return;
    setReplayOpen(false);
    replayTrigger.current?.focus();
  }, [replay.isPending]);
  async function confirmReplay() {
    const result = await replay.submit();
    if (result?.confirmed || result?.outcomeUnknown === false) setReplayOpen(false);
  }
  const confirmation = status === 'success' ? success.confirmation : undefined;
  const failure = status === 'error' ? failed.failure : undefined;
  const real = confirmation && 'source' in confirmation || failure?.source === 'backend';
  const currency = real ? 'GTQ' : preferredCurrency;
  function finish() { startNavigation(() => { resetCart(); resetDraft(); router.push('/'); }); }
  const valid = confirmation || failure;
  const recoveryHref = failure?.outcomeUnknown ? publicPaymentHref(criteria) : ['availability', 'property'].includes(failure?.kind ?? '') ? publicResultsHref(criteria) : ['quote', 'invalid'].includes(failure?.kind ?? '') ? publicCheckoutReviewHref(criteria) : publicPaymentHref(criteria);
  const recoveryLabel = real ? failure?.outcomeUnknown ? 'Reintentar la misma solicitud' : ['availability', 'property'].includes(failure?.kind ?? '') ? 'Revisar búsqueda y disponibilidad' : ['quote', 'invalid'].includes(failure?.kind ?? '') ? 'Revisar datos y tarifa' : 'Reintentar reserva' : failure?.outcomeUnknown ? 'Reintentar verificación con la misma tarjeta' : failure?.kind === 'availability' ? 'Buscar otra habitación' : failure?.kind === 'quote' ? 'Revisar disponibilidad y tarifa' : 'Reintentar pago con otra tarjeta';
  return <div className={styles.page}>
    <div className={styles.topBar}><button type="button" className={styles.back} disabled={leaving || Boolean(failure?.outcomeUnknown && real)} onClick={finish}>← Volver al inicio</button><PublicCurrencySelector id="confirmation-display-currency" quotedCurrency={real ? 'GTQ' : undefined} /></div>
    {!valid ? <><EmptyState title={status === 'success' ? 'No hay una confirmación en esta sesión' : 'No hay un intento fallido en esta sesión'} description="No pudimos recuperar el resultado de tu reserva. Si ya recibiste un código de confirmación, consulta «Mis reservas» antes de realizar otro intento."/><Link className={styles.back} href={publicResultsHref(criteria)}>Explorar habitaciones →</Link></> : <>
      <header className={styles.header}><span className={status === 'success' ? styles.check : styles.warning} aria-hidden="true">{status === 'success' ? '✓' : '!'}</span><p className={styles.eyebrow}>{status === 'success' ? 'RESERVA CONFIRMADA' : 'ESTAMOS AQUÍ PARA AYUDARTE'}</p><h1>{status === 'success' ? 'Tu reserva está confirmada' : 'No pudimos completar tu reserva'}</h1><p>{status === 'success' ? 'Guarda este código para consultar tu próxima estadía.' : 'Ocurrió un inconveniente al procesar la garantía o verificar la disponibilidad.'}</p></header>
      {confirmation ? <div className={styles.layout}><BookingConfirmationTicket confirmation={confirmation} guest={success.guest} criteria={criteria} currency={currency}/>
        <aside className={`${styles.card} ${styles.summary}`} aria-labelledby="confirmation-price-title"><h2 id="confirmation-price-title">Resumen de la reserva</h2><dl className={styles.amounts}><div><dt>{real ? 'Total confirmado' : 'Total estimado'}</dt><dd>{displayMoney(confirmation.totalMinor / 100, confirmation.currency, currency)}</dd></div><div className={styles.guarantee}><dt>{real ? 'Pago simulado aprobado' : 'Abono confirmado'}</dt><dd>{displayMoney(confirmation.guaranteeMinor / 100, confirmation.currency, currency)}</dd></div><div><dt>Restante en check-in</dt><dd>{displayMoney(confirmation.remainingMinor / 100, confirmation.currency, currency)}</dd></div></dl><p className={styles.paymentMethod}>{'payment' in confirmation ? `SIMULATED · ${confirmation.payment.reference}` : `${confirmation.guarantee.cardBrand} · **** ${confirmation.guarantee.last4}`}</p><p className={styles.note}>El saldo restante corresponde al importe pendiente para tu check-in.</p><Button type="button" className={styles.primary} isLoading={leaving} loadingText="Volviendo al inicio…" onClick={finish}>Volver al inicio</Button></aside>
      </div> : failure && <section className={`${styles.card} ${styles.failureCard}`} aria-labelledby="failure-intent-title">
        <div className={styles.alert} role="alert"><strong>{failure.message}</strong><p>{failure.outcomeUnknown ? real ? 'No cambies los datos ni la selección hasta verificar el resultado. Conservamos la misma solicitud para el reintento.' : 'No cambies la tarjeta ni repitas el intento con otros datos hasta verificar el resultado. Conservamos la misma solicitud para el reintento.' : 'El intento no produjo una confirmación válida. Conservamos tus datos para que puedas continuar.'}</p></div>
        <h2 id="failure-intent-title">Tu intención de reserva</h2><dl className={styles.details}><div><dt>Habitación{failure.roomNames.length > 1 ? 'es' : ''}</dt><dd>{failure.roomNames.join(' · ')}</dd></div><div><dt>Fechas</dt><dd>{bookingDateLabel(criteria.checkIn!)} → {bookingDateLabel(criteria.checkOut!)}</dd></div><div><dt>Huésped</dt><dd>{failed.guest.firstName} {failed.guest.lastName}<small>{failed.guest.email}</small></dd></div></dl>
        <div className={styles.failureActions}>{real && failure.outcomeUnknown && pendingOperation ? <Button ref={replayTrigger} className={styles.primary} type="button" disabled={replay.isPending} onClick={() => { replay.clearError(); setReplayOpen(true); }}>Reintentar la misma solicitud</Button> : <Link className={styles.primary} href={recoveryHref}>{recoveryLabel}</Link>}{failure.outcomeUnknown ? <button type="button" className={styles.secondary} disabled>Modificar fechas o habitación</button> : <Link className={styles.secondary} href={publicResultsHref(criteria)}>Modificar fechas o habitación</Link>}</div>
        <button type="button" className={styles.help} aria-expanded={showHelp} onClick={() => setShowHelp(value => !value)}>☎ ¿Necesitas ayuda? Contacta a Recepción al {reception.phone}</button>{showHelp && <p className={styles.helpMessage}>Ten a mano las fechas y los datos de tu reserva al comunicarte con recepción.</p>}
      </section>}
    </>}
    {replayOpen && pendingOperation && <PublicBookingReplayDialog operation={pendingOperation} busy={replay.isPending} error={replay.error} onCancel={cancelReplay} onConfirm={() => void confirmReplay()} />}
  </div>;
}
