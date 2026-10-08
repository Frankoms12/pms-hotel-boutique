"use client";

import Link from "next/link";
import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useReservationCenter } from "../hooks/use-reservation-center";
import { WaitlistConversionPanel } from "./waitlist-conversion-panel";

import styles from "./waitlist-board.module.css";

interface WaitlistBoardProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Reservation Center contract. */
  endpoint?: string;
}

function formatShortDate(date: Date | null): string {
  if (date === null) return "—";
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
}

export function WaitlistBoard({ propertyId, endpoint }: Readonly<WaitlistBoardProps>) {
  const { data: center, error, isLoading, refetch } = useReservationCenter(propertyId, endpoint);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!propertyId) {
    return <section className={styles.page} role="status"><h1>Lista de espera</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar la waitlist.</p></section>;
  }

  if (!endpoint) {
    return <section className={styles.page} role="status"><h1>Lista de espera</h1><p>La lista de espera estará disponible al confirmar el contrato API con Backend.</p></section>;
  }

  if (isLoading) {
    return <section className={styles.page} aria-busy="true"><h1>Lista de espera</h1><p>Cargando solicitudes…</p></section>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo cargar la lista de espera."
      : "No se pudo cargar la lista de espera.";
    return (
      <section className={styles.page} role="alert">
        <h1>Lista de espera</h1>
        <p>{message}</p>
        <button type="button" onClick={() => void refetch()}>Reintentar</button>
      </section>
    );
  }

  const queue = (center?.reservations ?? []).filter((item) => item.status === "WAITLIST");

  if (queue.length === 0) {
    return (
      <section className={styles.page}>
        <h1>Lista de espera</h1>
        <p>Sin solicitudes en waitlist para esta propiedad.</p>
        <p><Link href="/reservas">Volver al centro de reservas</Link></p>
      </section>
    );
  }

  const selected = queue.find((item) => item.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Lista de espera</h1>
          <p>{queue.length} solicitudes en cola · selecciona una para ver detalle y disponibilidad.</p>
        </div>
        <Link href="/reservas">Volver al centro de reservas</Link>
      </header>
      <ul className={styles.list}>
        {queue.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
            >
              <span><strong>{item.id}</strong><small>{item.guestName}</small></span>
              <span>{item.roomLabel ?? "Sin habitación"} · {formatShortDate(item.stayStart)} → {formatShortDate(item.stayEnd)}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && propertyId && endpoint ? (
        <WaitlistConversionPanel
          propertyId={propertyId}
          endpoint={endpoint}
          waitlistId={selected.id}
          currency={selected.currency}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
