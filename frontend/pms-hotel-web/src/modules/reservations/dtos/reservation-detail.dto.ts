/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 * Contrato del detalle de Reservation (V3 - 01 Reservation Engine, Reservation Detail).
 */

import type { ReservationFinanceStateDto, ReservationStatusDto } from "./reservation-list.dto";

export type StayTravelStateDto = "RESERVED" | "IN_HOUSE" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";

/** Una ReservationStay dentro de la Reservation. Multi-room => varias entradas. */
export interface ReservationStayDetailDto {
  stay_id: string;
  room_id: string | null;
  /** Etiqueta de habitación, ej. "203". */
  room_label: string | null;
  /** Tipo de habitación, ej. "Deluxe King". */
  room_type: string;
  /** Fechas ISO "YYYY-MM-DD". */
  check_in: string;
  check_out: string;
  nights: number;
  /** Estado de viaje de la estadía (independiente del status de la Reservation). */
  travel_state: StayTravelStateDto;
}

export interface ReservationGuestSummaryDto {
  primary_name: string;
  /** Contacto internacional del booking. */
  phone: string | null;
  adults: number;
  /** Null cuando el booking no declara menores. */
  children: number | null;
}

export interface ReservationFinanceLineDto {
  /** Ej. "Habitación · 3 noches", "Impuestos", "Servicio". */
  label: string;
  /** Amount como string numérico. */
  amount: string;
}

export interface ReservationDetailDto {
  reservation_id: string;
  property_id: string;
  status: ReservationStatusDto;
  /** Fecha ISO "YYYY-MM-DD" de creación del booking. */
  created_at: string;
  source: {
    label: string;
    /** Referencia comercial opcional: voucher, folio de agencia, booking ID. */
    reference: string | null;
  };
  /** Snapshot resumido de política aplicable, ej. "Flexible 48h · Viajes Maya". */
  policy_label: string;
  guest: ReservationGuestSummaryDto;
  /** Al menos una estadía: una Reservation contiene N ReservationStay. */
  stays: ReservationStayDetailDto[];
  /** Notas / solicitudes especiales del booking. */
  notes: string | null;
  currency: string;
  total_amount: string;
  paid_amount: string | null;
  finance_state: ReservationFinanceStateDto;
  /** Tarifa por noche, ej. "1160". */
  rate_per_night: string;
  /** Desglose resumido para el Resumen financiero (no sustituye al Folio). */
  lines: ReservationFinanceLineDto[];
}
