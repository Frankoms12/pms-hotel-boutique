import { HttpNetworkError, HttpStatusError } from '@/lib/http/errors';
import { CheckoutAttemptError, type BookingFailure, type BookingFailureKind } from './booking-failure';

export function publicBookingFailure(problem: unknown, sent: boolean, propertyId: string, roomNames: string[]): BookingFailure {
  let kind: BookingFailureKind = 'unknown';
  let message = 'No pudimos verificar el resultado. Reintenta exactamente la misma solicitud antes de cambiar tus datos o selección.';
  let outcomeUnknown = sent;
  if (problem instanceof HttpStatusError) {
    const data = problem.responseData;
    const code = data && typeof data === 'object' && 'code' in data ? data.code : undefined;
    outcomeUnknown = false;
    switch (problem.status) {
      case 400: kind = 'invalid'; message = code === 'INVALID_DATE_RANGE' ? 'Las fechas no son válidas. Revisa la búsqueda antes de confirmar.' : 'El servicio rechazó los datos de la solicitud. Revisa los datos de la reserva antes de confirmar.'; break;
      case 404: kind = 'property'; message = 'La propiedad no está disponible para nuevas reservas. Revisa la búsqueda.'; break;
      case 409:
        if (code === 'PRICE_CHANGED') { kind = 'quote'; message = 'La tarifa cambió. Revisa el total vigente antes de confirmar.'; }
        else if (code === 'IDEMPOTENCY_KEY_REUSED') { kind = 'idempotency'; outcomeUnknown = true; message = 'La clave del intento ya corresponde a otra solicitud. No inicies otra reserva; verifica el intento original con recepción.'; }
        else { kind = 'availability'; message = 'Ya no hay disponibilidad para la selección. Busca otra habitación o fechas.'; }
        break;
      case 422: kind = 'declined'; message = 'El pago simulado fue rechazado. La reserva no se confirmó; puedes reintentar.'; break;
      case 500:
        if (code === 'BOOKING_FAILED') { kind = 'gateway'; message = 'El servicio no pudo completar la reserva. No se guardó una reserva parcial; puedes reintentar.'; }
        else outcomeUnknown = sent;
        break;
      default: outcomeUnknown = sent;
    }
  } else if (problem instanceof CheckoutAttemptError) { kind = problem.kind; message = problem.message; }
  else if (problem instanceof HttpNetworkError) {
    kind = 'network';
    if (!sent) message = 'Sin conexión. Recupera la conexión para confirmar la reserva.';
  }
  return { source: 'backend', kind, message, outcomeUnknown, propertyId, roomNames };
}
