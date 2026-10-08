"use client";

import { useState } from "react";
import Link from 'next/link';

import { HttpNetworkError } from "@/lib/http/errors";
import { StatusBadge } from "@/shared/components";

import { useRooms } from "../hooks/use-rooms";
import { useRoomOccupancy } from '../hooks/use-room-occupancy';
import { hotelOccupancyDay, isOccupancyDay, type RoomOccupancyState } from '../model/room-occupancy';
import { OCCUPANCY_LABELS, OCCUPANCY_VARIANTS } from './room-occupancy-labels';
import { ROOM_STATUS_LABELS, ROOM_STATUS_VARIANTS } from "./room-status-labels";
import { RoomDetail } from "./room-detail";
import styles from "./room-board.module.css";

interface RoomBoardProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Rooms contract. */
  endpoint?: string;
  sessionId?: string;
  timezone?: string;
  propertyName?: string;
}

export function RoomBoard({ propertyId, endpoint, sessionId, timezone, propertyName }: Readonly<RoomBoardProps>) {
  const { data: rooms, error, isLoading, refetch } = useRooms(propertyId, endpoint);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [date, setDate] = useState(() => hotelOccupancyDay(timezone));
  const [occupancyFilter, setOccupancyFilter] = useState<RoomOccupancyState | 'ALL' | 'UNKNOWN'>('ALL');
  const [roomType, setRoomType] = useState('ALL');
  const [floor, setFloor] = useState('ALL');
  const occupancy = useRoomOccupancy(propertyId, sessionId, date, !!endpoint);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Habitaciones</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar habitaciones.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Habitaciones</h1><p>El tablero de habitaciones estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando tablero de habitaciones…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar habitaciones."
      : "No se pudo cargar el tablero de habitaciones.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!rooms?.length) {
    return <main className={styles.page}><h1>Habitaciones</h1><p>No hay habitaciones para esta propiedad.</p></main>;
  }

  const snapshot = occupancy.query.isSuccess && occupancy.query.data?.propertyId === propertyId
    && occupancy.query.data.date === date ? occupancy.query.data : undefined;
  const occupancyByRoom = new Map(snapshot?.rooms.map(room => [room.roomId, room]));
  const types = [...new Set(rooms.map(room => room.roomTypeLabel))].sort();
  const floors = [...new Set(rooms.map(room => room.floor))].sort((a, b) => (a ?? '').localeCompare(b ?? '', 'es', { numeric: true }));
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const visible = rooms.filter(room => (status === 'ALL' || room.status === status)
    && (occupancyFilter === 'ALL' || (occupancyByRoom.get(room.id)?.state ?? 'UNKNOWN') === occupancyFilter)
    && (roomType === 'ALL' || room.roomTypeLabel === roomType) && (floor === 'ALL' || (room.floor ?? 'UNKNOWN') === floor)
    && normalize(`${room.number} ${room.roomTypeLabel}`).includes(normalize(search.trim())))
    .sort((a, b) => a.number.localeCompare(b.number, 'es', { numeric: true }));
  const selectedRoom = visible.find(room => room.id === selectedRoomId) ?? visible[0];
  const count = (state: RoomOccupancyState | 'UNKNOWN') => rooms.filter(room => (occupancyByRoom.get(room.id)?.state ?? 'UNKNOWN') === state).length;
  const clear = () => { setSearch(''); setStatus('ALL'); setOccupancyFilter('ALL'); setRoomType('ALL'); setFloor('ALL'); };

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Operaciones</p>
      <h1>Habitaciones</h1>
      <p>{propertyName ?? propertyId} · Inventario físico y estadías asignadas</p>
      <p className={styles.note}>Consulta una fecha para organizar recepción. El estado operativo y la ocupación se muestran por separado.</p>
    </header>
    <section className={styles.datePanel} aria-label="Fecha de ocupación">
      <div><h2 className={styles.sectionTitle}>Una mirada a tus habitaciones</h2><p className={styles.note}>La consulta usa la fecha local del hotel{timezone ? ` · ${timezone}` : ''}.</p></div>
      <label>Fecha de consulta<input type="date" value={date} onChange={event => setDate(event.target.value)} aria-invalid={!isOccupancyDay(date)} /></label>
      <button type="button" className={styles.actionButton} disabled={!hotelOccupancyDay(timezone)} onClick={() => setDate(hotelOccupancyDay(timezone))}>Hoy</button>
      <button type="button" className={styles.actionButton} disabled={occupancy.query.isFetching} onClick={() => {
        void refetch();
        if (occupancy.connected && sessionId && isOccupancyDay(date)) void occupancy.query.refetch();
      }}>Actualizar</button>
    </section>
    {!isOccupancyDay(date) && <p role="alert" className={styles.note}>Elige una fecha válida para consultar las estadías.</p>}
    <div className={styles.metrics} role="group" aria-label="Filtrar por ocupación">
      <button type="button" aria-pressed={occupancyFilter === 'ALL'} onClick={() => setOccupancyFilter('ALL')}><strong>{rooms.length}</strong>{' '}<span>Total físico</span></button>
      {(['FREE', 'RESERVED', 'OCCUPIED'] as const).map(state => <button key={state} type="button" aria-pressed={occupancyFilter === state}
        disabled={!snapshot} onClick={() => setOccupancyFilter(state)}><strong>{snapshot ? count(state) : '—'}</strong>{' '}<span>{OCCUPANCY_LABELS[state]}</span></button>)}
    </div>
    <p className={styles.note}>Libre de estadías no significa disponible para venta: revisa también el estado operativo y la disponibilidad del tipo.</p>
    {occupancy.query.isFetching && <p role="status" className={styles.notice}>Consultando estadías…</p>}
    {!occupancy.connected && <p className={styles.notice}>La consulta de estadías requiere el contrato de ocupación de Backend.</p>}
    {occupancy.query.isError && <div className={styles.notice} role="alert">No pudimos consultar la ocupación. Las habitaciones mantienen su estado operativo; su ocupación es desconocida. <button className={styles.actionButton} onClick={() => void occupancy.query.refetch()}>Reintentar ocupación</button></div>}
    {!!count('CONFLICT') && <p role="alert" className={styles.notice}>Hay {count('CONFLICT')} habitaciones con estadías superpuestas. Revisa sus reservas antes de asignarlas.</p>}
    {!!snapshot?.unassigned.length && <aside className={styles.notice} aria-label="Estadías sin habitación asignada"><strong>{snapshot.unassigned.length} estadías sin habitación física para esta fecha</strong>
      <p>No se marcan como ocupación de una habitación concreta.</p><ul>{snapshot.unassigned.map(stay => <li key={stay.stayId}>
        <Link href={`/reservas/${encodeURIComponent(stay.reservationId)}`}>{stay.reservationId}</Link> · {stay.guestName} · {stay.roomType}</li>)}</ul></aside>}
    <div className={styles.boardFilters}>
      <label>Buscar habitación<input type="search" value={search} placeholder="Número o tipo" onChange={event => setSearch(event.target.value)} /></label>
      <label>Ocupación<select value={occupancyFilter} onChange={event => setOccupancyFilter(event.target.value as typeof occupancyFilter)}>
        <option value="ALL">Todas</option>{Object.entries(OCCUPANCY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="UNKNOWN">Sin información</option></select></label>
      <label>Estado operativo<select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Todos</option><option value="ACTIVE">Operativa</option><option value="OOO">OOO · Fuera de orden</option><option value="OOS">OOS · Fuera de servicio</option></select></label>
      <label>Tipo de habitación<select value={roomType} onChange={event => setRoomType(event.target.value)}><option value="ALL">Todos los tipos</option>{types.map(type => <option key={type}>{type}</option>)}</select></label>
      <label>Piso<select value={floor} onChange={event => setFloor(event.target.value)}><option value="ALL">Todos los pisos</option>{floors.map(value => <option key={value ?? 'UNKNOWN'} value={value ?? 'UNKNOWN'}>{value ?? 'Sin piso registrado'}</option>)}</select></label>
      <button type="button" className={styles.actionButton} onClick={clear}>Limpiar filtros</button>
    </div>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="room-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Inventario</p><h2 id="room-list-title" className={styles.sectionTitle}>Habitaciones del hotel</h2></div>
          <span className={styles.count} aria-live="polite">{rooms.length} registradas · {visible.length} visibles</span>
        </div>
        {!visible.length && <p role="status">No hay habitaciones con estos filtros.</p>}
        <ul className={styles.list}>
          {visible.map((room) => <li key={room.id}>
            <button
              className={styles.roomButton}
              type="button"
              aria-pressed={room.id === selectedRoom?.id}
              onClick={() => setSelectedRoomId(room.id)}
            >
              <span><strong>{room.number}</strong><small>{room.roomTypeLabel}</small><small>{room.floor ? `Piso ${room.floor}` : 'Piso sin registrar'}</small></span>
              <span className={styles.roomBadges}>
              <StatusBadge variant={occupancyByRoom.has(room.id) ? OCCUPANCY_VARIANTS[occupancyByRoom.get(room.id)!.state] : 'neutral'} size="sm">
                {occupancyByRoom.has(room.id) ? OCCUPANCY_LABELS[occupancyByRoom.get(room.id)!.state] : 'Sin información'}
              </StatusBadge>
              <StatusBadge variant={ROOM_STATUS_VARIANTS[room.status]} size="sm">
                {ROOM_STATUS_LABELS[room.status]}
              </StatusBadge>
              </span>
            </button>
          </li>)}
        </ul>
      </section>
      {selectedRoom && <RoomDetail key={selectedRoom.id} room={selectedRoom} propertyId={propertyId} endpoint={endpoint}
        occupancy={occupancyByRoom.get(selectedRoom.id)} occupancyDate={date} />}
    </div>
  </main>;
}
