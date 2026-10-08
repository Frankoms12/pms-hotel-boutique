'use client';
import { useRef, useState } from 'react';
import { getPublicEnvironment } from '@/lib/env';
import { HttpStatusError } from '@/lib/http';
import { DataTable } from '@/shared/components';
import { useRoomCatalog } from '../hooks/use-room-catalog';
import type { RoomCatalogChange } from '../model/room-catalog';
import { RoomCatalogEditor } from './room-catalog-editor';
import styles from './room-catalog.module.css';
import { RoomTypePresentationPreview } from './room-type-presentation-preview';

export function RoomCatalogAdmin({ propertyId, sessionId, canManage }: { propertyId: string; sessionId: string; canManage: boolean }) {
  const { query, mutation } = useRoomCatalog(propertyId,sessionId);
  const [tab, setTab] = useState<'rooms'|'types'>('rooms');
  const [editor, setEditor] = useState<{kind:RoomCatalogChange['kind'];id?:string}>();
  const [selectedId, setSelectedId] = useState<string>();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const trigger = useRef<HTMLElement | null>(null);
  function open(kind:RoomCatalogChange['kind'],id?:string) { trigger.current=document.activeElement as HTMLElement; mutation.reset(); setNotice(''); setEditor({kind,id}); }
  function close() { if (mutation.isPending) return; setEditor(undefined); trigger.current?.focus(); }
  if (!getPublicEnvironment().useMockApi) return <section className={styles.page}><h1>Administrar habitaciones</h1><p role="status">La administración estará disponible cuando se conecte el catálogo del hotel.</p></section>;
  if (query.fetchStatus === 'paused') return <p role="status">Sin conexión. Esperando para cargar el catálogo.</p>;
  if (query.isPending) return <p role="status">Cargando catálogo de habitaciones…</p>;
  if (query.isError || !query.data) return <section className={styles.page}><h1>Administrar habitaciones</h1><p role="alert">No pudimos cargar el catálogo de esta propiedad.</p><button onClick={() => void query.refetch()}>Reintentar</button></section>;
  const data = query.data;
  const queryText = search.trim().toLocaleLowerCase('es');
  const rows = (tab==='types' ? data.types : data.rooms).filter(item => `${item.code} ${'name' in item ? item.name : data.types.find(type => type.id===item.roomTypeId)?.name}`.toLocaleLowerCase('es').includes(queryText));
  const selected = (tab==='types' ? data.types : data.rooms).find(item => item.id===selectedId);
  const mutationError = mutation.error instanceof HttpStatusError && mutation.error.status===409 ? 'Ese código ya existe en esta propiedad. Usa otro código.' : 'No pudimos guardar. Conservamos tus datos para que puedas reintentar.';
  return <section className={styles.page}>
    <header className={styles.header}><div><p className={styles.overline}>INVENTARIO FÍSICO</p><h1>Administrar habitaciones</h1><p>{data.rooms.length} habitaciones · {data.types.length} tipos en esta propiedad</p></div>
      {canManage && <button className={styles.primary} onClick={() => open(tab==='types'?'create-type':'create-room')} disabled={mutation.isPending}>{tab==='types'?'Nuevo tipo':'Nueva habitación'}</button>}
    </header>
    <div className={styles.tabs} role="tablist" aria-label="Catálogo de inventario">{(['rooms','types'] as const).map(value => <button key={value} id={`catalog-tab-${value}`} role="tab" aria-selected={tab===value} aria-controls="catalog-panel" onClick={() => { setTab(value);setSelectedId(undefined);setSearch('');setNotice(''); }}>{value==='rooms'?'Habitaciones físicas':'Tipos de habitación'}</button>)}</div>
    <div id="catalog-panel" role="tabpanel" aria-labelledby={`catalog-tab-${tab}`} className={styles.card}>
      <label className={styles.search}>Buscar en el catálogo<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Código o nombre" /></label>
      {tab==='rooms' && !data.types.length && <p>Puedes crear un tipo personalizado y su primera habitación desde «Nueva habitación».</p>}
      {!canManage && <p>Tu sesión permite consultar este catálogo. La creación y edición requieren permisos de administración.</p>}
      <DataTable label={tab==='rooms'?'Habitaciones físicas':'Tipos de habitación'} rows={rows} getRowKey={item => item.id} minWidth={480} emptyState="No hay registros con estos criterios." columns={[
        { key:'code',header:'Código',render:item => <button className={styles.code} onClick={() => setSelectedId(item.id)}>{item.code}</button> },
        { key:'name',header:tab==='rooms'?'Tipo de habitación':'Nombre',render:item => 'name' in item ? item.name : data.types.find(type => type.id===item.roomTypeId)?.name },
        { key:'edit',header:'Acciones',render:item => canManage ? <button onClick={() => open(tab==='types'?'edit-type':'edit-room',item.id)}>Editar {item.code}</button> : 'Consulta' },
      ]} />
      {selected && <aside className={styles.detail} aria-label="Detalle del catálogo"><strong>{selected.code}</strong><p>{'name' in selected ? selected.name : data.types.find(type => type.id===selected.roomTypeId)?.name}</p><p>{'name' in selected ? `${data.rooms.filter(room=>room.roomTypeId===selected.id).length} habitaciones de este tipo` : 'Unidad física del inventario del hotel.'}</p>
        {!('name' in selected) && <><p>Piso: {selected.floor ?? 'Sin registrar'}</p><p>Notas internas: {selected.internalNotes ?? 'Sin notas'}</p></>}
        <RoomTypePresentationPreview name={'name' in selected ? selected.name : data.types.find(type => type.id === selected.roomTypeId)?.name ?? ''}
          presentation={'name' in selected ? selected.presentation : data.types.find(type => type.id === selected.roomTypeId)?.presentation} />
      </aside>}
      {notice && <p role="status" className={styles.success}>{notice}</p>}
    </div>
    <p className={styles.note}>Crear un tipo no agrega habitaciones físicas. El estado operativo y la ocupación se consultan por separado.</p>
    {editor && <RoomCatalogEditor {...editor} data={data} busy={mutation.isPending} error={mutation.isError?mutationError:undefined} onClose={close} onSubmit={change => { if (!canManage || mutation.isPending) return; mutation.mutate(change,{onSuccess:()=>{setEditor(undefined);setNotice('Cambios guardados. El catálogo está actualizado.');trigger.current?.focus();}}); }} />}
  </section>;
}
