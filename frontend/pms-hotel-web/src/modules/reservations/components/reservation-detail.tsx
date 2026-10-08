"use client";

import { useRef, useState } from "react";
import Link from 'next/link';

import { HttpNetworkError } from "@/lib/http/errors";
import { RoomMove, StayExtension } from "@/modules/stays";

import { useReservationDetail } from "../hooks/use-reservation-detail";
import type { ReservationDetailData, ReservationStayDetail, StayTravelState } from "../model/reservation-detail";
import type { ReservationStatus } from "../model/reservation-summary";
import { ReservationCancellation } from "./reservation-cancellation";
import { ReservationNoShow } from "./reservation-no-show";
import { RoomAssignment } from './room-assignment';

import styles from "./reservation-detail.module.css";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  WAITLIST: "Waitlist",
  NO_SHOW_PENDING: "No-show pendiente",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  CONFIRMED: styles.statusConfirmed,
  PENDING: styles.statusPending,
  WAITLIST: styles.statusWaitlist,
  NO_SHOW_PENDING: styles.statusNoShow,
  NO_SHOW: styles.statusNoShow,
  CANCELLED: styles.statusCancelled,
};

const TRAVEL_STATE_LABELS: Record<StayTravelState, string> = {
  RESERVED: "Reservada",
  IN_HOUSE: "En casa",
  CHECKED_OUT: "Salida",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function occupancyLabel(detail: ReservationDetailData): string {
  const { guest } = detail;
  if (guest.adults === null) return "No disponible";
  const base = pluralize(guest.adults, "adulto", "adultos");

  if (guest.children === null) {
    return base;
  }

  return `${base} · ${pluralize(guest.children, "niño", "niños")}`;
}

function paymentLine(detail: ReservationDetailData): string {
  const { currency, finance } = detail;

  switch (finance.financeState) {
    case null: return "No disponible";
    case "ESTIMATED":
      return `Tarifa estimada ${formatMoney(finance.totalAmount, currency)}`;
    case "PAID":
      return "Pagado";
    case "BALANCE": {
      const pending = finance.paidAmount === null ? 0 : Math.max((finance.totalAmount ?? 0) - finance.paidAmount, 0);
      return `Pendiente ${formatMoney(pending, currency)}`;
    }
    case "DEPOSIT":
      return `Depósito ${formatMoney(finance.paidAmount ?? 0, currency)}`;
    case "NO_CAPTURE":
      return "Sin captura";
  }
}

const ACTIVE_TRAVEL_STATES: ReadonlySet<StayTravelState> = new Set(["RESERVED", "IN_HOUSE"]);

function StayBlock({
  stay,
  onRoomMove,
  onExtend,
  onAssign,
}: Readonly<{ stay: ReservationStayDetail; singleRoom: boolean; onRoomMove?: () => void; onExtend?: () => void; onAssign?: () => void }>) {
  const moveable = stay.roomId !== null && onRoomMove !== undefined && ACTIVE_TRAVEL_STATES.has(stay.travelState);
  const extensible = onExtend !== undefined && ACTIVE_TRAVEL_STATES.has(stay.travelState);

  return (
    <div className={styles.stayItem} role="group" aria-label={`Estadía ${stay.id}`}>
      <p className={styles.stayRoom}>{stay.roomLabel ?? 'Sin asignar'} · {stay.roomType}</p>
      <p className={styles.stayMeta}>
        {formatShortDate(stay.checkIn)} → {formatShortDate(stay.checkOut)} · {pluralize(stay.nights, "noche", "noches")}
      </p>
      <p className={styles.stayMeta}>Estado de la estadía: <span>{TRAVEL_STATE_LABELS[stay.travelState]}</span></p>
      <div className={styles.stayActions}>
      {stay.roomId === null && stay.travelState === 'RESERVED' && onAssign
        ? <button className={styles.assignAction} type="button" onClick={onAssign}>Asignar habitación</button> : null}
      {moveable ? (
        <button className={styles.stayAction} type="button" onClick={onRoomMove}>
          Cambiar habitación
        </button>
      ) : null}
      {extensible ? (
        <button className={styles.stayAction} type="button" onClick={onExtend}>
          Extender estadía
        </button>
      ) : null}
      </div>
    </div>
  );
}

interface ReservationDetailProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Reservation Detail contract. */
  endpoint?: string;
  reservationId?: string;
  sessionId?: string;
  canManage?: boolean;
}

export function ReservationDetail({ propertyId, endpoint, reservationId, sessionId, canManage = false }: Readonly<ReservationDetailProps>) {
  const { data: detail, error, isLoading, refetch } = useReservationDetail(propertyId, endpoint, reservationId);
  const [cancelling, setCancelling] = useState(false);
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const [movingRoom, setMovingRoom] = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  const title = reservationId ? `Reserva ${reservationId}` : "Detalle de reserva";

  if (!propertyId) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar la reserva.</p></section>;
  }

  if (!endpoint) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>El detalle de reserva estará disponible al confirmar el contrato API con Backend.</p></section>;
  }

  if (!reservationId) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>Selecciona una reserva para ver su detalle.</p></section>;
  }

  if (isLoading) {
    return <section className={styles.page} aria-busy="true"><p>Cargando detalle de la reserva…</p></section>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo cargar el detalle de la reserva."
      : "No se pudo cargar el detalle de la reserva.";

    return (
      <section className={styles.page} role="alert">
        <h1>{title}</h1>
        <p>{message}</p>
        <button className={styles.retryButton} type="button" onClick={() => void refetch()}>Reintentar</button>
      </section>
    );
  }

  if (!detail) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>No se encontró la reserva solicitada.</p></section>;
  }

  const singleRoom = detail.stays.length === 1;
  const reference = detail.source.reference ? ` · ${detail.source.reference}` : "";
  const cancellable = !detail.readOnly && (detail.status === "CONFIRMED" || detail.status === "PENDING");
  const noShowPending = !detail.readOnly && detail.status === "NO_SHOW_PENDING";

  return (
    <div className={styles.page}>
      <Link className={styles.stayAction} href="/reservas">← Volver a reservas</Link>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 ref={heading} tabIndex={-1}>{detail.confirmationCode ? `Reserva ${detail.confirmationCode}` : title}</h1>
          <p className={styles.subtitle}>
            <span className={`${styles.badge} ${STATUS_BADGE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
          </p>
          <p className={styles.origin}>Origen: {detail.source.label ?? "No registrado"}{reference} · Creada {formatLongDate(detail.createdAt)}</p>
          {cancellable ? (
            <button
              className={styles.cancelAction}
              type="button"
              onClick={() => setCancelling(true)}
              disabled={cancelling}
            >
              Cancelar reserva
            </button>
          ) : null}
          {noShowPending ? (
            <button
              className={styles.cancelAction}
              type="button"
              onClick={() => setMarkingNoShow(true)}
              disabled={markingNoShow}
            >
              Marcar no-show
            </button>
          ) : null}
        </div>
      </header>
      {assignmentMessage && <p className={styles.assignmentNotice} role="status">{assignmentMessage}</p>}
      {assigning && sessionId && canManage && <RoomAssignment key={assigning} propertyId={propertyId} reservationId={reservationId}
        stayId={assigning} sessionId={sessionId} allowed={canManage} onClose={() => setAssigning(null)}
        onAssigned={result => { setAssigning(null); setAssignmentMessage(`Habitación ${result.roomNumber} asignada a la estadía. Estado y tarifa conservados.`);
          queueMicrotask(() => heading.current?.focus()); }} />}

      {cancelling && propertyId && endpoint && reservationId ? (
        <ReservationCancellation
          propertyId={propertyId}
          endpoint={endpoint}
          reservationId={reservationId}
          currency={detail.currency}
          onClose={() => setCancelling(false)}
        />
      ) : null}

      {markingNoShow && propertyId && endpoint && reservationId ? (
        <ReservationNoShow
          propertyId={propertyId}
          endpoint={endpoint}
          reservationId={reservationId}
          currency={detail.currency}
          onClose={() => setMarkingNoShow(false)}
        />
      ) : null}

      {movingRoom && propertyId && endpoint && reservationId ? (
        <RoomMove
          propertyId={propertyId}
          endpoint={endpoint}
          reservationId={reservationId}
          stayId={movingRoom}
          onClose={() => setMovingRoom(null)}
        />
      ) : null}

      {extending && propertyId && endpoint && reservationId ? (
        <StayExtension
          propertyId={propertyId}
          endpoint={endpoint}
          reservationId={reservationId}
          stayId={extending}
          onClose={() => setExtending(null)}
        />
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="reservation-data-title">
          <h2 id="reservation-data-title">Datos de la reserva</h2>
          <dl className={styles.definitionList}>
            {detail.readOnly && <div className={styles.definitionRow}><dt>ID de reserva</dt><dd>{detail.id}</dd></div>}
            {singleRoom && (
              <>
                <div className={styles.definitionRow}>
                  <dt>Check-in</dt>
                  <dd>{formatLongDate(detail.stays[0].checkIn)}</dd>
                </div>
                <div className={styles.definitionRow}>
                  <dt>Check-out</dt>
                  <dd>{formatLongDate(detail.stays[0].checkOut)}</dd>
                </div>
              </>
            )}
            <div className={styles.definitionRow}>
              <dt>{singleRoom ? "Habitación" : "Habitaciones"}</dt>
              <dd>
                {detail.stays.length === 0 ? <p>Sin estadías registradas.</p> : <StayBlock stay={detail.stays[0]} singleRoom={singleRoom} onRoomMove={detail.readOnly ? undefined : () => setMovingRoom(detail.stays[0].id)} onExtend={detail.readOnly ? undefined : () => setExtending(detail.stays[0].id)}
                  onAssign={canManage && sessionId && cancellable ? () => setAssigning(detail.stays[0].id) : undefined} />}
                {detail.stays.slice(1).map((stay) => (
                  <StayBlock key={stay.id} stay={stay} singleRoom={false} onRoomMove={detail.readOnly ? undefined : () => setMovingRoom(stay.id)} onExtend={detail.readOnly ? undefined : () => setExtending(stay.id)}
                    onAssign={canManage && sessionId && cancellable ? () => setAssigning(stay.id) : undefined} />
                ))}
              </dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>{detail.readOnly ? "Responsable de la reserva" : "Huésped principal"}</dt>
              <dd>{detail.guest.primaryName ?? "No registrado"}</dd>
            </div>
            {!detail.readOnly && <>
            <div className={styles.definitionRow}>
              <dt>Huéspedes</dt>
              <dd>{occupancyLabel(detail)}</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Teléfono</dt>
              <dd>{detail.guest.phone ?? "—"}</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Tarifa</dt>
              <dd>{formatMoney(detail.finance.ratePerNight, detail.currency)} / noche</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Política aplicable</dt>
              <dd>{detail.policyLabel}</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Notas / solicitudes especiales</dt>
              <dd>{detail.notes ?? "—"}</dd>
            </div>
            </>}
          </dl>
        </section>

        {!detail.readOnly && <section className={styles.card} aria-labelledby="reservation-finance-title">
          <h2 id="reservation-finance-title">Resumen financiero</h2>
          <ul className={styles.financeLines}>
            {detail.finance.lines.map((line, index) => (
              <li key={`${line.label}-${index}`}>
                <span>{line.label}</span>
                <strong>{formatMoney(line.amount, detail.currency)}</strong>
              </li>
            ))}
          </ul>
          <p className={styles.totalLine}>
            <span>Total original</span>
            <strong>{formatMoney(detail.finance.totalAmount, detail.currency)}</strong>
          </p>
          <p className={styles.paymentLine}>{paymentLine(detail)}</p>
          <p className={styles.folioHint}>El folio completo se consulta vía el módulo Folio (API pública).</p>
        </section>}
      </div>
    </div>
  );
}
