'use client';

import { useState } from 'react';
import type { BookingConfirmation } from '@/modules/reservations';
import { confirmationCalendar } from '../domain/confirmation-calendar';

export function useConfirmationActions(confirmation: BookingConfirmation) {
  const [feedback, setFeedback] = useState('');
  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(('confirmationCode' in confirmation ? confirmation.confirmationCode : confirmation.reservationId));
      setFeedback('¡Código copiado al portapapeles!');
    } catch { setFeedback('No pudimos copiar el código. Puedes seleccionarlo y copiarlo manualmente.'); }
  }
  function printReceipt() {
    try { window.print(); } catch { setFeedback('No pudimos abrir la impresión. Usa la opción de imprimir de tu navegador.'); }
  }
  function downloadCalendar() {
    let url: string | undefined;
    try {
      url = URL.createObjectURL(new Blob([confirmationCalendar(confirmation)], { type: 'text/calendar;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `${('confirmationCode' in confirmation ? confirmation.confirmationCode : confirmation.reservationId).replace(/[^a-zA-Z0-9_-]/g, '')}.ics`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setFeedback('Calendario descargado. Puedes importarlo en Google Calendar o iCal.');
    } catch { setFeedback('No pudimos descargar el calendario. Inténtalo nuevamente.'); }
    finally { if (url) { const objectUrl = url; const revoke = URL.revokeObjectURL.bind(URL); setTimeout(() => revoke(objectUrl), 1000); } }
  }
  return { copyCode, printReceipt, downloadCalendar, feedback };
}
