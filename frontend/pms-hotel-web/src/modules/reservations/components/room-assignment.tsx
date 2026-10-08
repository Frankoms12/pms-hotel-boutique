'use client';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/shared/components';
import { useRoomAssignment } from '../hooks/use-room-assignment';
import type { RoomAssignmentScope, RoomAssignmentResult } from '../model/room-assignment';
import styles from './room-assignment.module.css';

interface RoomAssignmentProps extends RoomAssignmentScope {
  sessionId: string;
  allowed: boolean;
  onClose: () => void;
  onAssigned: (result: RoomAssignmentResult) => void;
}
function day(value: string) {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
}
export function RoomAssignment({ onClose, onAssigned, ...props }: Readonly<RoomAssignmentProps>) {
  const action = useRoomAssignment({ propertyId: props.propertyId, reservationId: props.reservationId, stayId: props.stayId }, props.sessionId, props.allowed);
  const [selected, setSelected] = useState('');
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => { if (returnFocus.current?.isConnected) returnFocus.current.focus(); };
  }, []);
  const preview = action.query.data;
  const target = preview?.rooms.find(room => room.id === selected && room.selectable);
  async function confirm() {
    if (!target || action.busy) return;
    const result = await action.assign(target.id);
    if (result) onAssigned(result);
  }
  return <Modal title="Asignar habitación" busy={action.busy} onClose={onClose} footer={<>
    <button className={styles.secondary} type="button" onClick={onClose} disabled={action.busy}>Cancelar</button>
    <button className={styles.primary} type="button" onClick={() => void confirm()}
      disabled={!target || !preview?.canAssign || action.busy || action.query.isFetching}>
      {action.busy ? 'Asignando…' : 'Confirmar asignación'}</button>
  </>}>
    <div className={styles.body} aria-busy={action.busy}>
      {!props.allowed ? <p role="alert">Tu sesión no tiene permiso para gestionar reservas.</p>
        : !action.connected ? <p role="status">La asignación estará disponible al conectar su contrato con Backend.</p>
          : action.query.isPending ? <p role="status">Buscando habitaciones para esta estadía…</p>
            : action.query.isError ? <div role="alert"><p>No pudimos consultar las habitaciones de esta propiedad.</p>
              <button type="button" className={styles.secondary} onClick={() => void action.query.refetch()}>Reintentar</button></div>
              : preview && <>
                <p className={styles.summary}><strong>{preview.roomType}</strong><span>{day(preview.arrival)} → {day(preview.departure)}</span></p>
                <p>Selecciona la habitación física para esta estadía. El tipo reservado y su tarifa se conservan.</p>
                {!preview.canAssign && <p className={styles.notice} role="status">{preview.reason}</p>}
                {preview.rooms.length === 0 ? <p role="status">No hay habitaciones de este tipo en el catálogo de la propiedad.</p>
                  : <fieldset className={styles.choices} disabled={action.busy || !preview.canAssign}>
                    <legend>Habitaciones del mismo tipo</legend>
                    {preview.rooms.map(room => <label key={room.id} className={`${styles.room} ${selected === room.id ? styles.selected : ''} ${!room.selectable ? styles.blocked : ''}`}>
                      <input type="radio" name={`assignment-${props.stayId}`} value={room.id} checked={selected === room.id}
                        disabled={!room.selectable || action.query.isFetching} onChange={() => { setSelected(room.id); action.clearError(); }} />
                      <span><strong>Habitación {room.number}</strong><small>{room.floor === null ? 'Piso no registrado' : `Piso ${room.floor}`}</small>
                        <small>{room.reason ?? 'Disponible para asignación'}</small></span>
                      <span className={styles.badge}>{room.status === 'ACTIVE' ? 'Operativa' : room.status === 'OOO' ? 'Fuera de orden' : 'Fuera de servicio'}</span>
                    </label>)}
                  </fieldset>}
                {preview.canAssign && !preview.rooms.some(room => room.selectable)
                  && <p className={styles.notice} role="status">No hay habitaciones operativas libres para asignar en estas fechas.</p>}
                <p className={styles.note}>Se verificará nuevamente antes de guardar. Esta acción no confirma la reserva ni genera cargos.</p>
              </>}
      {action.error && <p role="alert" className={styles.error}>{action.error}</p>}
    </div>
  </Modal>;
}
