'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { RoomTypePresentation } from '../model/room-type-presentation';
import styles from './room-catalog.module.css';

export function RoomTypePresentationPreview({ name, presentation, onAddPhotos, photoUploadDisabled = false }: {
  name: string; presentation?: RoomTypePresentation | null; onAddPhotos?: () => void; photoUploadDisabled?: boolean;
}) {
  const [active, setActive] = useState(0), [failed, setFailed] = useState<string[]>([]);
  const images = presentation?.images ?? [], index = active < images.length ? active : 0;
  const src = images[index];
  return <section className={styles.publicPreview} aria-label="Vista previa de la ficha pública">
    <p className={styles.overline}>VISTA PREVIA PÚBLICA</p>
    <div className={styles.previewPhoto}>{src && !failed.includes(src)
      ? <Image src={src} alt={name || 'Habitación'} fill sizes="(max-width: 720px) 90vw, 350px" onError={() => setFailed(values => [...values, src])} />
      : !src && onAddPhotos ? <button type="button" className={styles.previewUpload} disabled={photoUploadDisabled} onClick={onAddPhotos}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4" /></svg>
        <strong>Agrega fotografías del tipo</strong><small>Selecciona una foto desde tu dispositivo</small>
      </button> : <span>{src ? 'Fotografía no disponible' : 'Agrega fotografías del tipo'}</span>}
      {images.length > 1 && <div className={styles.photoNav}><button type="button" aria-label="Foto anterior de la ficha" onClick={() => setActive((index - 1 + images.length) % images.length)}>←</button><span>{index + 1} / {images.length}</span><button type="button" aria-label="Foto siguiente de la ficha" onClick={() => setActive((index + 1) % images.length)}>→</button></div>}
    </div>
    <h3>{name || 'Nombre del tipo'}</h3>
    <p>{presentation?.maxOccupancy ? `${presentation.maxOccupancy} huéspedes` : 'Capacidad por completar'}{presentation?.bedDescription && ` · ${presentation.bedDescription}`}{presentation?.areaSquareMeters && ` · ${presentation.areaSquareMeters} m²`}</p>
    {presentation?.viewDescription && <span className={styles.viewBadge}>{presentation.viewDescription}</span>}
    <p>{presentation?.description ?? 'Describe el confort y las características que encontrará el huésped.'}</p>
    {!!presentation?.amenities.length && <ul className={styles.amenityPills}>{presentation.amenities.map(item => <li key={item}>✓ {item}</li>)}</ul>}
    <p className={styles.note}>Las tarifas, los servicios incluidos en cada plan y las políticas de cancelación se configuran por separado.</p>
  </section>;
}
