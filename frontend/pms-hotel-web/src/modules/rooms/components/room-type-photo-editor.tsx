'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { isRoomPhotoSource, ROOM_PHOTO_BYTES, ROOM_PHOTO_LIMIT } from '../model/room-type-presentation';
import styles from './room-catalog.module.css';

export function RoomTypePhotoEditor({ images, disabled, onChange, onBusyChange, inputRef }: {
  images: string[]; disabled: boolean; onChange: (images: string[]) => void; onBusyChange: (busy: boolean) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [reading, setReading] = useState(false);
  const mounted = useRef(true), request = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function addUrl() {
    if (disabled || reading) return;
    const photo = url.trim();
    if (!isRoomPhotoSource(photo)) { setError('Usa una URL HTTPS de una fotografía o una imagen del catálogo.'); return; }
    if (images.includes(photo)) { setError('Esta fotografía ya está agregada.'); return; }
    if (images.length >= ROOM_PHOTO_LIMIT) { setError('Puedes agregar hasta 5 fotografías.'); return; }
    onChange([...images, photo]); setUrl(''); setError('');
  }
  async function upload(files: File[]) {
    if (disabled || request.current || !files.length) return;
    if (images.length + files.length > ROOM_PHOTO_LIMIT) { setError('Puedes agregar hasta 5 fotografías.'); return; }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > ROOM_PHOTO_BYTES || file.size === 0)) {
      setError('Selecciona fotos JPG, PNG o WebP de hasta 2 MB cada una.'); return;
    }
    request.current = true; setReading(true); setError(''); onBusyChange(true);
    try {
      const photos = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' && isRoomPhotoSource(reader.result) ? resolve(reader.result) : reject(new Error('INVALID_PHOTO'));
        reader.onerror = () => reject(new Error('PHOTO_READ_FAILED')); reader.readAsDataURL(file);
      })));
      if (mounted.current) onChange([...new Set([...images, ...photos])]);
    } catch { if (mounted.current) setError('No pudimos leer las fotografías. Vuelve a seleccionarlas.'); }
    finally { request.current = false; if (mounted.current) { setReading(false); onBusyChange(false); } }
  }
  return <fieldset className={styles.photoEditor} disabled={disabled || reading}>
    <legend>Fotografías del tipo</legend><p>Hasta 5 fotografías. La primera será la portada.</p>
    <label htmlFor="catalog-photos">Seleccionar fotografías<input ref={inputRef} id="catalog-photos" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => {
      const files = Array.from(event.target.files ?? []); event.target.value = ''; void upload(files);
    }} /></label>
    <p>JPG, PNG o WebP · máximo 2 MB por foto.</p>
    <label htmlFor="catalog-photo-url">O agregar una URL de fotografía</label>
    <div className={styles.urlRow}><input id="catalog-photo-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /><button type="button" onClick={addUrl}>Agregar foto</button></div>
    {reading && <p role="status">Preparando fotografías…</p>}{error && <p className={styles.error} role="alert">{error}</p>}
    <ol className={styles.photoList}>{images.map((src, index) => <li key={src}><div className={styles.photoThumb}><Image src={src} alt={`Fotografía ${index + 1}`} fill sizes="100px" /></div><span>{index === 0 ? 'Portada' : `Foto ${index + 1}`}</span>
      <button type="button" aria-label={`Usar foto ${index + 1} como portada`} disabled={index === 0} onClick={() => onChange([src, ...images.filter(value => value !== src)])}>Portada</button>
      <button type="button" aria-label={`Eliminar foto ${index + 1}`} onClick={() => onChange(images.filter(value => value !== src))}>Quitar</button></li>)}</ol>
  </fieldset>;
}
