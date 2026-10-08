'use client';
import { useState, type RefObject } from 'react';
import type { RoomPresentationDraft, RoomPresentationErrors } from '../model/room-type-presentation-draft';
import { RoomTypePhotoEditor } from './room-type-photo-editor';
import styles from './room-catalog.module.css';
const amenityOptions = ['Wi-Fi de alta velocidad', 'Aire acondicionado', 'Smart TV', 'Caja de seguridad', 'Minibar', 'Terraza', 'Servicio de limpieza', 'Accesibilidad'];
export function RoomTypePresentationFields({ value, errors, submitted, busy, onChange, onPhotoBusy, photoInputRef }: {
  value: RoomPresentationDraft; errors: RoomPresentationErrors; submitted: boolean; busy: boolean;
  onChange: (draft: RoomPresentationDraft) => void; onPhotoBusy: (busy: boolean) => void;
  photoInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [touched, setTouched] = useState<Partial<Record<keyof RoomPresentationDraft, boolean>>>({});
  const show = (key: keyof RoomPresentationDraft) => (submitted || touched[key]) && errors[key];
  function field(key: 'capacity' | 'beds' | 'area' | 'view', label: string, placeholder: string, numeric = false) {
    const error = show(key);
    return <div className={styles.field}><label htmlFor={`catalog-${key}`}>{label}</label><input id={`catalog-${key}`} type={numeric ? 'number' : 'text'} min={numeric ? key === 'capacity' ? 1 : 0.01 : undefined}
      step={numeric ? key === 'capacity' ? '1' : 'any' : undefined} maxLength={numeric ? undefined : 160} value={value[key]} placeholder={placeholder} disabled={busy}
      aria-invalid={Boolean(error)} aria-describedby={error ? `catalog-${key}-error` : undefined} onBlur={() => setTouched(previous => ({ ...previous, [key]: true }))}
      onChange={event => onChange({ ...value, [key]: event.target.value })} />{error && <small className={styles.error} id={`catalog-${key}-error`}>{error}</small>}</div>;
  }
  return <fieldset className={styles.profileFields} disabled={busy}><legend>Ficha del tipo para el huésped</legend>
    <p>Estos datos describen el tipo completo y se comparten entre sus habitaciones.</p>
    <div className={styles.fieldGrid}>{field('capacity', 'Capacidad máxima', 'Ej. 2', true)}{field('area', 'Tamaño (m²)', 'Ej. 32', true)}
      {field('beds', 'Configuración de camas', 'Ej. King o dos camas dobles')}{field('view', 'Vista / característica destacada', 'Ej. Vista al jardín')}</div>
    <label htmlFor="catalog-category">Categoría del catálogo</label><select id="catalog-category" value={value.category ?? ''} onChange={event => onChange({ ...value, category: (event.target.value || null) as RoomPresentationDraft['category'] })}>
      <option value="">Sin categoría</option><option value="DELUXE">Deluxe</option><option value="SUITE">Suite</option><option value="SUPERIOR">Superior</option></select>
    <label htmlFor="catalog-description">Descripción para el huésped</label><textarea id="catalog-description" rows={4} maxLength={2000} value={value.description} placeholder="Describe el confort, la iluminación y lo que hace especial este tipo de habitación."
      aria-invalid={Boolean(show('description'))} onChange={event => onChange({ ...value, description: event.target.value })} onBlur={() => setTouched(previous => ({ ...previous, description: true }))} />
    {show('description') && <small className={styles.error}>{errors.description}</small>}
    <fieldset className={styles.amenityChoices}><legend>Amenidades de la habitación</legend><div>{amenityOptions.map(amenity => <label key={amenity}><input type="checkbox" checked={value.amenities.includes(amenity)} onChange={event => onChange({ ...value, amenities: event.target.checked ? [...value.amenities, amenity] : value.amenities.filter(item => item !== amenity) })} />{amenity}</label>)}</div></fieldset>
    <label htmlFor="catalog-amenities">Otras amenidades (separadas por comas)</label><input id="catalog-amenities" value={value.amenities.filter(item => !amenityOptions.includes(item)).join(', ')}
      aria-invalid={Boolean(show('amenities'))} onBlur={() => setTouched(previous => ({ ...previous, amenities: true }))}
      onChange={event => onChange({ ...value, amenities: [...value.amenities.filter(item => amenityOptions.includes(item)), ...event.target.value.split(',').map(item => item.trim())] })} />
    {show('amenities') && <small className={styles.error}>{errors.amenities}</small>}
    <RoomTypePhotoEditor inputRef={photoInputRef} images={value.images} disabled={busy} onChange={images => onChange({ ...value, images })} onBusyChange={onPhotoBusy} />
  </fieldset>;
}
