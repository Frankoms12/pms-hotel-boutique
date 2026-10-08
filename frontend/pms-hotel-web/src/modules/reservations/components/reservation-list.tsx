"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DataTable } from "@/shared/components";

import type { ReservationListItem, ReservationStatus } from "../model/reservation-summary";
import { emptyReservationFilters, filterStaffReservations } from '../model/reservation-search';

import styles from "./reservation-list.module.css";

const PAGE_SIZE = 5;

const STATUS_OPTIONS: ReadonlyArray<{ value: ReservationStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "CONFIRMED", label: "Confirmadas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "WAITLIST", label: "Waitlist" },
  { value: "NO_SHOW_PENDING", label: "No-show pendiente" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "CANCELLED", label: "Canceladas" },
];

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

function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function formatShortDate(date: Date | null): string {
  if (date === null) return "—";
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
}

function pluralize(count: number | null, singular: string, plural: string): string {
  if (count === null) return "—";
  return `${count} ${count === 1 ? singular : plural}`;
}

function financeLine(item: ReservationListItem): string {
  const { finance } = item;
  const total = `Total ${formatMoney(finance.totalAmount, item.currency)}`;

  switch (finance.financeState) {
    case null: return "No disponible";
    case "ESTIMATED":
      return `Tarifa estimada ${formatMoney(finance.totalAmount, item.currency)}`;
    case "PAID":
      return `${total} · Pagado`;
    case "BALANCE": {
      const pending = finance.paidAmount === null ? 0 : Math.max((finance.totalAmount ?? 0) - finance.paidAmount, 0);
      return `${total} · Pendiente ${formatMoney(pending, item.currency)}`;
    }
    case "DEPOSIT":
      return `${total} · Depósito ${formatMoney(finance.paidAmount ?? 0, item.currency)}`;
    case "NO_CAPTURE":
      return `${total} · Sin captura`;
  }
}

function roomSummary(item: ReservationListItem): string {
  if (item.stayRooms) return item.stayRooms.map(s => `${s.roomType} · ${s.room ?? 'Sin asignar'}`).join(', ');
  return item.roomLabel ?? (item.status === 'WAITLIST' ? '' : 'Sin asignar');
}

function buildPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 6) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

interface ReservationListProps {
  reservations: ReadonlyArray<ReservationListItem>;
  /** Usado por el Centro de Reservas para abrir el flujo de conversión de una solicitud WAITLIST. */
  onConvert?: (reservationId: string) => void;
}

export function ReservationList({ reservations, onConvert }: Readonly<ReservationListProps>) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [arrivalFrom, setArrivalFrom] = useState('');
  const [arrivalTo, setArrivalTo] = useState('');

  const filtered = useMemo(() => {
    return filterStaffReservations(reservations, { query, status: statusFilter, arrivalFrom, arrivalTo });
  }, [reservations, query, statusFilter, arrivalFrom, arrivalTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = Boolean(query || statusFilter !== "ALL" || arrivalFrom || arrivalTo);

  function clearFilters() {
    setQuery(emptyReservationFilters.query);
    setStatusFilter(emptyReservationFilters.status);
    setArrivalFrom('');
    setArrivalTo('');
    setPage(1);
  }

  return (
    <section className={styles.panel} aria-label="Lista de reservas de la propiedad">
      <div className={styles.filters}>
        <div className={styles.filterHeading}>
          <div><h2>Encuentra una reserva</h2><p>Busca por referencia o huésped y afina los resultados.</p></div>
          <button className={styles.clearButton} type="button" onClick={clearFilters} disabled={!hasFilters}>Limpiar filtros</button>
        </div>
        <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span>Buscar reservas</span>
          <span className={styles.searchControl}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Código, huésped, canal o habitación"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          </span>
        </label>
        <label className={styles.filterField}>
          <span>Filtrar por estado</span>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as ReservationStatus | "ALL");
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>Llegada desde<input className={styles.filterSelect} type="date" value={arrivalFrom} max={arrivalTo || undefined} onChange={event => { setArrivalFrom(event.target.value); setPage(1); }} /></label>
        <label className={styles.filterField}>Llegada hasta<input className={styles.filterSelect} type="date" value={arrivalTo} min={arrivalFrom || undefined} onChange={event => { setArrivalTo(event.target.value); setPage(1); }} /></label>
        </div>
        {arrivalFrom && arrivalTo && arrivalFrom > arrivalTo && <p className={styles.filterError} role="alert">La fecha de llegada final debe ser igual o posterior a la inicial.</p>}
      </div>

      <div className={styles.resultsHeading}>
        <div><h2>Reservas de la propiedad <span className={styles.resultCount} role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'reserva' : 'reservas'}</span></h2><p>Abre el detalle para consultar el huésped, las estadías y el resumen financiero.</p></div>
      </div>

      {pageItems.length === 0 ? (
        <div className={styles.emptyResults}><h3>{hasFilters ? 'No encontramos coincidencias' : 'Aún no hay reservas'}</h3><p>{hasFilters ? "Sin resultados con los filtros actuales." : "No hay reservas para esta propiedad."}</p><p>{hasFilters ? 'Prueba otro código o nombre, amplía las fechas o limpia los filtros.' : 'Las reservas de esta propiedad aparecerán aquí.'}</p></div>
      ) : (
        <>
          <div className={styles.tableRegion}>
          <p className={styles.scrollHint}>Desliza la tabla para ver todos los detalles y acciones.</p>
          <DataTable
            label="Reservas de la propiedad"
            minWidth={940}
            rows={pageItems}
            getRowKey={(item) => item.id}
            columns={[
              {
                key: "reservation",
                header: "Reserva / Huésped",
                render: (item) => (
                  <>
                    <Link className={`${styles.reference} ${styles.referenceLink}`} href={`/reservas/${encodeURIComponent(item.id)}`}>
                      {item.confirmationCode ?? item.id}
                    </Link>
                    <span className={styles.guestName}>{item.guestName ?? "Responsable no registrado"}</span>
                  </>
                ),
              },
              {
                key: "stay",
                header: "Estadía / Canal",
                render: (item) => (
                  <>
                    <p className={styles.cellLine}>{item.sourceLabel ?? "Origen no registrado"}{roomSummary(item) ? ` · ${roomSummary(item)}` : ''}</p>
                    {item.sourceReference ? <p className={styles.cellMuted}>{item.sourceReference}</p> : null}
                    <p className={styles.cellMuted}>
                      {formatShortDate(item.stayStart)} → {formatShortDate(item.stayEnd)} · {pluralize(item.nights, "noche", "noches")}
                    </p>
                    <p className={styles.cellMuted}>
                      {item.adults === null ? "" : `${pluralize(item.adults, "adulto", "adultos")} · `} {item.roomCount === null ? "solicitud" : pluralize(item.roomCount, "habitación", "habitaciones")}
                    </p>
                  </>
                ),
              },
              {
                key: "finance",
                header: "Finanzas / Alerta",
                render: (item) => (
                  <>
                    <p className={styles.finance}>{financeLine(item)}</p>
                    <p className={styles.cellMuted}>{item.readOnly ? "" : item.alertText ?? "Sin alertas"}</p>
                  </>
                ),
              },
              {
                key: "status",
                header: "Estado",
                render: (item) => (
                  <>
                    <span className={`${styles.badge} ${STATUS_BADGE[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                    {item.statusDetail ? <p className={styles.statusDetail}>{item.statusDetail}</p> : null}
                    {item.status === "WAITLIST" && onConvert ? (
                      <button className={styles.convertButton} type="button" onClick={() => onConvert(item.id)}>
                        Convertir a reserva
                      </button>
                    ) : null}
                  </>
                ),
              },
              {
                key: "detail",
                header: "Detalle",
                render: (item) => <Link className={styles.detailLink} href={`/reservas/${encodeURIComponent(item.id)}`} aria-label={`Ver detalle de ${item.id}`}>Ver detalle <span aria-hidden="true">→</span></Link>,
              },
            ]}
          />
          </div>

          <nav className={styles.pagination} aria-label="Paginación de reservas">
            <p className={styles.paginationSummary}>{from}–{to} de {filtered.length} reservas</p>
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.pageButton}
                aria-label="Página anterior"
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
              >
                ‹
              </button>
              {buildPageNumbers(safePage, pageCount).map((entry, index) =>
                entry === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>…</span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    className={`${styles.pageButton} ${entry === safePage ? styles.pageButtonActive : ""}`}
                    aria-current={entry === safePage ? "page" : undefined}
                    onClick={() => setPage(entry)}
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                className={styles.pageButton}
                aria-label="Página siguiente"
                disabled={safePage === pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                ›
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
