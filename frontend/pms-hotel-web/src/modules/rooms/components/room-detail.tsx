import { StatusBadge } from "@/shared/components";
import Link from 'next/link';

import type { Room } from "../model/room";
import type { RoomOccupancy } from '../model/room-occupancy';
import { OCCUPANCY_LABELS, OCCUPANCY_VARIANTS } from './room-occupancy-labels';
import { ROOM_STATUS_LABELS, ROOM_STATUS_VARIANTS } from "./room-status-labels";
import { RoomStatusPanel } from "./room-status-panel";

import styles from "./room-board.module.css";

interface RoomDetailProps {
  room: Room;
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Rooms contract. */
  endpoint?: string;
  occupancy?: RoomOccupancy;
  occupancyDate?: string;
}

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function RoomDetail({ room, propertyId, endpoint, occupancy, occupancyDate }: Readonly<RoomDetailProps>) {
  return <section className={styles.detail} aria-labelledby="room-detail-title">
    <p className={styles.eyebrow}>Habitación</p>
    <h2 id="room-detail-title">{room.number}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Número / código" value={room.number} />
      <Reference label="Piso" value={room.floor} />
      <Reference label="Propiedad" value={room.propertyId} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="room-status-title">
        <h3 id="room-status-title">Estado de habitación</h3>
        <StatusBadge variant={ROOM_STATUS_VARIANTS[room.status]}>{ROOM_STATUS_LABELS[room.status]}</StatusBadge>
        <p className={styles.note}>
          OOO (Fuera de orden) y OOS (Fuera de servicio) no eliminan la habitación del sistema.
        </p>
        {!occupancy && <p className={styles.note}>Ocupación: no disponible en esta consulta. Una habitación operativa puede estar libre u ocupada.</p>}
      </section>
      {occupancy && <section className={styles.occupancyCard} aria-labelledby="room-occupancy-title">
        <h3 id="room-occupancy-title">Estadías · {occupancyDate}</h3>
        <StatusBadge variant={OCCUPANCY_VARIANTS[occupancy.state]}>{OCCUPANCY_LABELS[occupancy.state]}</StatusBadge>
        {occupancy.state === 'FREE' && <p className={styles.note}>No hay estadías asignadas para esta fecha. Esto no garantiza disponibilidad vendible ni autorización para asignar.</p>}
        {occupancy.state === 'CONFLICT' && <p className={styles.note}>Más de una estadía coincide en esta habitación. Revisa las asignaciones.</p>}
        {occupancy.stays.map(stay => <article key={stay.stayId} className={styles.staySummary}>
          <strong>{stay.guestName}</strong><p>{stay.arrival} → {stay.departure}</p>
          <p>{stay.state === 'IN_HOUSE' ? 'En el hotel' : 'Estadía reservada'} · {stay.roomType}</p>
          <Link href={`/reservas/${encodeURIComponent(stay.reservationId)}`} className={styles.reservationLink}>Abrir reserva {stay.reservationId} →</Link>
        </article>)}
      </section>}
      <section className={styles.detailCard} aria-labelledby="room-type-title">
        <h3 id="room-type-title">Tipo de habitación</h3>
        <p>{room.roomTypeLabel}</p>
      </section>
      {propertyId && endpoint ? (
        <RoomStatusPanel room={room} propertyId={propertyId} endpoint={endpoint} />
      ) : null}
    </div>
  </section>;
}
