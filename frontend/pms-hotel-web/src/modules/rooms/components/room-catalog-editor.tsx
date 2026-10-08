'use client';
import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components';
import type { RoomCatalogChange, RoomCatalogSnapshot } from '../model/room-catalog';
import { catalogFieldError } from '../model/room-catalog';
import styles from './room-catalog.module.css';
import { roomPresentationDraft, roomPresentationDraftErrors, roomPresentationFromDraft } from '../model/room-type-presentation-draft';
import { RoomTypePresentationFields } from './room-type-presentation-fields';
import { RoomTypePresentationPreview } from './room-type-presentation-preview';

export function RoomCatalogEditor({ kind, id, data, busy, error, onSubmit, onClose }: {
  kind: RoomCatalogChange['kind']; id?: string; data: RoomCatalogSnapshot; busy: boolean; error?: string;
  onSubmit: (change: RoomCatalogChange) => void; onClose: () => void;
}) {
  const isType = kind.endsWith('type'), editing = kind.startsWith('edit');
  const selected = isType ? data.types.find(item => item.id === id) : data.rooms.find(item => item.id === id);
  const [code, setCode] = useState(selected?.code ?? '');
  const [name, setName] = useState(selected && 'name' in selected ? selected.name : '');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [typeMode, setTypeMode] = useState<'existing' | 'new'>(data.types.length ? 'existing' : 'new');
  const [newTypeCode, setNewTypeCode] = useState(''), [newTypeName, setNewTypeName] = useState('');
  const [floor, setFloor] = useState(selected && 'floor' in selected ? selected.floor ?? '' : '');
  const [internalNotes, setInternalNotes] = useState(selected && 'internalNotes' in selected ? selected.internalNotes ?? '' : '');
  const [profile, setProfile] = useState(() => roomPresentationDraft(selected && 'presentation' in selected ? selected.presentation : null));
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null), nameInput = useRef<HTMLInputElement>(null), typeInput = useRef<HTMLSelectElement>(null);
  const codeError = catalogFieldError(code, 64), nameError = isType ? catalogFieldError(name, 160) : undefined;
  const customizing = isType || (kind === 'create-room' && typeMode === 'new');
  const profileErrors = customizing ? roomPresentationDraftErrors(profile) : {};
  const typeError = kind === 'create-room' && typeMode === 'existing' && !data.types.some(item => item.id === roomTypeId) ? 'Selecciona un tipo de esta propiedad.' : undefined;
  const newCodeError = kind === 'create-room' && typeMode === 'new' ? catalogFieldError(newTypeCode, 64) : undefined;
  const newNameError = kind === 'create-room' && typeMode === 'new' ? catalogFieldError(newTypeName, 160) : undefined;
  const floorError = floor.trim().length > 64 ? 'Usa como máximo 64 caracteres.' : undefined;
  const notesError = internalNotes.trim().length > 500 ? 'Usa como máximo 500 caracteres.' : undefined;
  const chosenType = data.types.find(type => type.id === (selected && 'roomTypeId' in selected ? selected.roomTypeId : roomTypeId));
  const previewName = isType ? name : typeMode === 'new' && !editing ? newTypeName : chosenType?.name ?? '';
  const preview = customizing ? roomPresentationFromDraft(profile) : chosenType?.presentation;
  const title = `${editing ? 'Editar' : isType ? 'Nuevo' : 'Nueva'} ${isType ? 'tipo de habitación' : 'habitación'}`;
  function submit(event: FormEvent) {
    event.preventDefault(); if (busy || photoBusy) return; setSubmitted(true);
    if (codeError || nameError || typeError || newCodeError || newNameError || floorError || notesError || Object.keys(profileErrors).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return;
    }
    const presentation = roomPresentationFromDraft(profile);
    if (kind === 'create-type') onSubmit({ kind, code:code.trim(), name:name.trim(), presentation });
    if (kind === 'edit-type' && id) onSubmit({ kind, id, code:code.trim(), name:name.trim(), presentation });
    const physical = { code: code.trim(), floor: floor.trim() || null, internalNotes: internalNotes.trim() || null };
    if (kind === 'create-room') onSubmit(typeMode === 'new'
      ? { kind, ...physical, newType: { code: newTypeCode.trim(), name: newTypeName.trim(), presentation } }
      : { kind, ...physical, roomTypeId });
    if (kind === 'edit-room' && id) onSubmit({ kind, id, ...physical });
  }
  return <Modal title={title} busy={busy || photoBusy} onClose={onClose} initialFocusRef={codeInput} className={styles.editorDialog}
    footer={<div className={styles.actions}><button type="button" disabled={busy || photoBusy} onClick={onClose}>Cancelar</button><button form="catalog-editor-form" className={styles.primary} type="submit" disabled={busy || photoBusy}>{busy ? 'Guardando…' : photoBusy ? 'Preparando fotografías…' : 'Guardar'}</button></div>}>
    <form ref={form} id="catalog-editor-form" className={styles.editorLayout} onSubmit={submit} noValidate aria-busy={busy || photoBusy}>
      <div className={styles.form}>
      <p className={styles.intro}>{isType ? 'Define la ficha que identifica a este tipo de habitación.' : 'Agrega una unidad física y elige la ficha que verá el huésped.'}</p>
      <label htmlFor="catalog-code">{isType ? 'Código del tipo' : 'Número / código de habitación'}</label>
      <input ref={codeInput} id="catalog-code" value={code} required maxLength={64} disabled={busy} autoComplete="off" aria-invalid={submitted && Boolean(codeError)} aria-describedby={submitted && codeError ? 'catalog-code-error' : undefined} onChange={event => setCode(event.target.value)} placeholder={isType ? 'DLX-KING' : '204'} />
      {submitted && codeError && <small id="catalog-code-error" className={styles.error}>{codeError}</small>}
      {isType && <><label htmlFor="catalog-name">Nombre del tipo</label><input ref={nameInput} id="catalog-name" required maxLength={160} value={name} disabled={busy} aria-invalid={submitted && Boolean(nameError)} aria-describedby={submitted && nameError ? 'catalog-name-error' : undefined} onChange={event => setName(event.target.value)} placeholder="Deluxe King" />{submitted && nameError && <small id="catalog-name-error" className={styles.error}>{nameError}</small>}</>}
      {!isType && <><label htmlFor="catalog-floor">Piso / nivel</label><input id="catalog-floor" maxLength={64} value={floor} placeholder="Ej. 2 o Planta baja" disabled={busy} aria-invalid={submitted && Boolean(floorError)} onChange={event => setFloor(event.target.value)} />
        {submitted && floorError && <small className={styles.error}>{floorError}</small>}
        <label htmlFor="catalog-notes">Notas internas de la habitación</label><textarea id="catalog-notes" rows={3} maxLength={500} value={internalNotes} disabled={busy} placeholder="Información para el personal. No se muestra al huésped." aria-invalid={submitted && Boolean(notesError)} onChange={event => setInternalNotes(event.target.value)} />
        <small>{internalNotes.length}/500 · Solo para el personal</small>{submitted && notesError && <small className={styles.error}>{notesError}</small>}</>}
      {kind === 'create-room' && <><div className={styles.modeButtons} role="group" aria-label="Origen de la ficha"><button type="button" disabled={busy || photoBusy || !data.types.length} aria-pressed={typeMode === 'existing'} onClick={() => setTypeMode('existing')}>Usar tipo existente</button><button type="button" disabled={busy || photoBusy} aria-pressed={typeMode === 'new'} onClick={() => setTypeMode('new')}>Crear tipo personalizado</button></div>
        {typeMode === 'existing' ? <><label htmlFor="catalog-type">Tipo de habitación</label><select ref={typeInput} id="catalog-type" required value={roomTypeId} disabled={busy} aria-invalid={submitted && Boolean(typeError)} aria-describedby={submitted && typeError ? 'catalog-type-error' : undefined} onChange={event => setRoomTypeId(event.target.value)}><option value="">Selecciona un tipo</option>{data.types.map(type => <option key={type.id} value={type.id}>{type.name} · {type.code}</option>)}</select>{submitted && typeError && <small id="catalog-type-error" className={styles.error}>{typeError}</small>}<p className={styles.inheritNote}>Esta habitación heredará la ficha del tipo elegido. Para cambiar sus características compartidas, edita el tipo en «Tipos de habitación».</p></>
          : <><label htmlFor="catalog-new-code">Código del nuevo tipo</label><input id="catalog-new-code" maxLength={64} value={newTypeCode} disabled={busy} placeholder="Ej. FAM-TERRAZA" aria-invalid={submitted && Boolean(newCodeError)} onChange={event => setNewTypeCode(event.target.value)} />{submitted && newCodeError && <small className={styles.error}>{newCodeError}</small>}
            <label htmlFor="catalog-new-name">Nombre del nuevo tipo</label><input id="catalog-new-name" maxLength={160} value={newTypeName} disabled={busy} placeholder="Ej. Familiar con terraza" aria-invalid={submitted && Boolean(newNameError)} onChange={event => setNewTypeName(event.target.value)} />{submitted && newNameError && <small className={styles.error}>{newNameError}</small>}</>}
      </>}
      {editing && !isType && <p>La edición conserva el tipo de habitación y su identidad física.</p>}
      {editing && isType && <p className={styles.inheritNote}>Editar esta ficha afecta a las {data.rooms.filter(room => room.roomTypeId === id).length} habitaciones que comparten este tipo. Los datos y precios de las reservas existentes se conservan.</p>}
      {customizing && <RoomTypePresentationFields photoInputRef={photoInput} value={profile} errors={profileErrors} submitted={submitted} busy={busy || photoBusy} onChange={setProfile} onPhotoBusy={setPhotoBusy} />}
      {error && <p className={styles.error} role="alert">{error}</p>}
      </div><RoomTypePresentationPreview name={previewName} presentation={preview} photoUploadDisabled={busy || photoBusy}
        onAddPhotos={customizing ? () => { if (!busy && !photoBusy) photoInput.current?.click(); } : undefined} />
    </form>
  </Modal>;
}
