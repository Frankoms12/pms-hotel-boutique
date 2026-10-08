'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useStaffReservationCreate } from '../hooks/use-staff-reservation-create';
import { staffCreateErrors, stayNights, canChooseStaffOption, type StaffStaySearch, type StaffBookingGuest, type StaffCreateField } from '../model/staff-reservation-create';
import styles from './staff-new-reservation.module.css';

interface StaffNewReservationProps {
  propertyId: string; propertyName: string; timezone: string; sessionId: string; canCreate: boolean;
}
function hotelDay(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = (type: string) => parts.find(part => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch { return ''; }
}
function nextDay(day: string): string {
  return day ? new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) : '';
}
function money(minor: number, currency = 'GTQ') {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency }).format(minor / 100);
}

export function StaffNewReservation({ propertyId, propertyName, timezone, sessionId, canCreate }: StaffNewReservationProps) {
  const today = hotelDay(timezone);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState<StaffStaySearch>(() => ({ checkIn: today, checkOut: nextDay(today), adults: 2, children: 0, rooms: 1 }));
  const [guest, setGuest] = useState<StaffBookingGuest>({ fullName: '', email: '', phone: '', notes: '' });
  const [criteria, setCriteria] = useState<StaffStaySearch>();
  const [selected, setSelected] = useState('');
  const [touched, setTouched] = useState<Partial<Record<StaffCreateField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string>();
  const form = useRef<HTMLFormElement>(null);
  const booking = useStaffReservationCreate(propertyId, sessionId, canCreate, step > 1 ? criteria : undefined);
  const quote = booking.query.data;
  const option = quote?.options.find(item => `${item.roomTypeId}:${item.ratePlanId}` === selected);
  const errors = staffCreateErrors(search, guest, today);
  const visibleError = (field: StaffCreateField) => submitted || touched[field] ? errors[field] : undefined;
  const touch = (field: StaffCreateField) => setTouched(current => ({ ...current, [field]: true }));
  const fieldProps = (field: StaffCreateField) => ({ 'aria-invalid': !!visibleError(field),
    'aria-describedby': visibleError(field) ? `new-${field}-error` : undefined, onBlur: () => touch(field) });
  const errorText = (field: StaffCreateField) => visibleError(field) ? <p className={styles.fieldError} id={`new-${field}-error`}>{visibleError(field)}</p> : null;
  const nights = stayNights(search.checkIn, search.checkOut);

  function consult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitted(true); setNotice(undefined);
    const first = (['checkIn', 'checkOut', 'rooms', 'adults', 'children', 'fullName', 'email', 'phone', 'notes'] as const).find(field => errors[field]);
    if (first) { form.current?.querySelector<HTMLInputElement>(`#new-${first}`)?.focus(); return; }
    if (!booking.connected) { setNotice('La consulta y creación de reservas Staff todavía no están conectadas. Los datos permanecen en este formulario.'); return; }
    setCriteria({ ...search }); setSelected(''); booking.clearError(); setStep(2);
  }
  function edit() { booking.clearError(); setSelected(''); setStep(1); }

  if (!canCreate) return <section className={styles.page}><Link href="/reservas">← Volver a reservas</Link><h1>Nueva reserva</h1>
    <p role="status">Tu sesión no tiene permiso para gestionar reservas en esta propiedad.</p></section>;
  if (!today) return <section className={styles.page}><h1>Nueva reserva</h1><p role="alert">No se pudo resolver la zona horaria de la propiedad.</p></section>;
  if (booking.result) return <section className={styles.page}>
    <div className={styles.success} role="status"><span className={styles.successIcon} aria-hidden="true">✓</span>
      <p className={styles.overline}>RECEPCIÓN · RESERVA LOCAL</p><h1>Reserva registrada</h1>
      <p>La selección está guardada en este recorrido del frontend. No se ha creado una reserva en la base de datos ni realizado un cobro.</p>
      <strong className={styles.reference}>{booking.result.id}</strong>
      <dl><div><dt>Huésped principal</dt><dd>{booking.result.guest.primaryName}</dd></div>
        <div><dt>Estadía</dt><dd>{search.checkIn} → {search.checkOut} · {nights} {nights === 1 ? 'noche' : 'noches'}</dd></div>
        <div><dt>Habitaciones</dt><dd>{booking.result.stays.length} · {booking.result.stays[0].roomType} · Sin asignar</dd></div>
        <div><dt>Estado</dt><dd>Pendiente · Sin captura de pago</dd></div></dl>
      <div className={styles.actions}><Link className={styles.primary} href={`/reservas/${encodeURIComponent(booking.result.id)}`}>Ver detalle de la reserva</Link>
        <Link className={styles.secondary} href="/reservas">Ir al Centro de Reservas</Link></div>
    </div>
  </section>;

  return <section className={styles.page} aria-labelledby="new-reservation-title" aria-busy={booking.busy}>
    <Link className={styles.back} href="/reservas" aria-disabled={booking.busy || undefined} onClick={event => { if (booking.busy) event.preventDefault(); }}>← Volver a reservas</Link>
    <header className={styles.header}><p className={styles.overline}>RECEPCIÓN · {propertyName}</p><h1 id="new-reservation-title">Nueva reserva</h1>
      <p>Organiza la estadía, elige un tipo de habitación y revisa los datos antes de registrar la reserva.</p></header>
    <ol className={styles.steps} aria-label="Pasos de nueva reserva">
      {['Estadía y huésped', 'Habitaciones y tarifa', 'Revisa la reserva'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} data-complete={step > index + 1}>
        <span className={styles.stepNumber}>{step > index + 1 ? '✓' : index + 1}</span><span>{label}</span></li>)}
    </ol>
    <div className={styles.notice} role="note">{booking.connected
      ? 'Recorrido local del frontend. Las reservas se conservan mientras esta aplicación permanece abierta; no generan cuentas, cobros ni asignan una habitación física.'
      : 'La creación Staff está pendiente de conexión. Puedes revisar y completar el formulario; todavía no se registran reservas reales.'}</div>
    <div className={styles.layout}>
      <div>
        {step === 1 ? <form ref={form} className={styles.card} onSubmit={consult} noValidate>
          <h2>Datos de la estadía</h2><p className={styles.helper}>Fechas según la hora local del hotel: {timezone}.</p>
          <div className={styles.fields}>
            <div><label htmlFor="new-checkIn">Check-in *</label><input id="new-checkIn" type="date" required min={today} value={search.checkIn}
              onChange={event => setSearch(current => ({ ...current, checkIn: event.target.value, checkOut: current.checkOut <= event.target.value ? nextDay(event.target.value) : current.checkOut }))} {...fieldProps('checkIn')} />{errorText('checkIn')}</div>
            <div><label htmlFor="new-checkOut">Check-out *</label><input id="new-checkOut" type="date" required min={search.checkIn ? nextDay(search.checkIn) : today} value={search.checkOut}
              onChange={event => setSearch(current => ({ ...current, checkOut: event.target.value }))} {...fieldProps('checkOut')} />{errorText('checkOut')}</div>
            {(['rooms', 'adults', 'children'] as const).map(field => <div key={field}><label htmlFor={`new-${field}`}>{field === 'rooms' ? 'Habitaciones *' : field === 'adults' ? 'Adultos *' : 'Menores'}</label>
              <input id={`new-${field}`} type="number" min={field === 'children' ? 0 : 1} step={1} value={search[field]} required
                onChange={event => setSearch(current => ({ ...current, [field]: Number(event.target.value) }))} {...fieldProps(field)} />{errorText(field)}</div>)}
          </div>
          <div className={styles.divider} /><h2>Huésped principal</h2><p className={styles.helper}>La persona responsable de la reserva. No necesita una cuenta para reservar.</p>
          <div className={styles.fields}>
            <div className={styles.fullWidth}><label htmlFor="new-fullName">Nombre completo *</label><input id="new-fullName" autoComplete="name" required maxLength={150} placeholder="Nombre y apellido"
              value={guest.fullName} onChange={event => setGuest(current => ({ ...current, fullName: event.target.value }))} {...fieldProps('fullName')} />{errorText('fullName')}</div>
            <div><label htmlFor="new-email">Correo electrónico *</label><input id="new-email" type="email" autoComplete="email" required maxLength={254} placeholder="ejemplo@correo.com"
              value={guest.email} onChange={event => setGuest(current => ({ ...current, email: event.target.value }))} {...fieldProps('email')} />{errorText('email')}</div>
            <div><label htmlFor="new-phone">Teléfono *</label><input id="new-phone" type="tel" autoComplete="tel" required maxLength={24} placeholder="+502 5555 5555"
              value={guest.phone} onChange={event => setGuest(current => ({ ...current, phone: event.target.value }))} {...fieldProps('phone')} />{errorText('phone')}</div>
            <div className={styles.fullWidth}><label htmlFor="new-notes">Notas y solicitudes especiales</label><textarea id="new-notes" rows={3} maxLength={300} placeholder="Llegada tardía, accesibilidad o preferencias de la estadía"
              value={guest.notes} onChange={event => setGuest(current => ({ ...current, notes: event.target.value }))} {...fieldProps('notes')} />
              <small className={styles.counter}>{guest.notes.length}/300</small>{errorText('notes')}</div>
          </div>
          {notice && <p className={styles.error} role="alert">{notice}</p>}
          <div className={styles.actions}><button className={styles.primary} type="submit">Consultar disponibilidad <span aria-hidden="true">→</span></button></div>
        </form> : step === 2 ? <section className={styles.card} aria-labelledby="room-options-title">
          <div className={styles.sectionHeader}><h2 id="room-options-title">Elige el tipo de habitación</h2><button className={styles.textButton} onClick={edit}>Modificar búsqueda</button></div>
          <p className={styles.helper}>Reservas un tipo de habitación. La habitación física se asignará por separado.</p>
          {booking.query.isFetching ? <p role="status" className={styles.loading}>Consultando disponibilidad y tarifas…</p>
            : booking.query.isError ? <div className={styles.error} role="alert"><p>No pudimos consultar la disponibilidad. Conservamos tus datos.</p><button className={styles.secondary} onClick={() => void booking.query.refetch()}>Reintentar consulta</button></div>
              : !quote?.options.length ? <div className={styles.empty}><h3>No hay tipos con tarifa disponibles</h3><p>Revisa el inventario y las tarifas de esta propiedad o modifica la búsqueda.</p><button className={styles.secondary} onClick={edit}>Modificar búsqueda</button></div>
                : <fieldset className={styles.options}><legend className={styles.helper}>Selecciona una opción para {search.rooms} {search.rooms === 1 ? 'habitación' : 'habitaciones'}.</legend>
                  {quote.options.map(item => {
                    const value = `${item.roomTypeId}:${item.ratePlanId}`, available = canChooseStaffOption(item, search);
                    return <label key={value} className={styles.option} data-selected={selected === value} data-unavailable={!available}>
                      <input type="radio" name="room-option" value={value} checked={selected === value} disabled={!available} onChange={() => setSelected(value)} />
                      <span><strong>{item.roomTypeName}</strong><span className={styles.optionMeta}>{item.ratePlanName} · Hasta {item.capacity} huéspedes por habitación</span>
                        <span className={styles.optionMeta}>{item.availableRooms} disponibles · {money(item.nightlyMinor, item.currency)} por habitación / noche</span>
                        {!available && <span className={styles.unavailable}>No cubre la cantidad de habitaciones o huéspedes solicitados.</span>}</span>
                      <span className={styles.optionPrice}>{money(item.totalMinor, item.currency)}<small>Alojamiento · {nights} {nights === 1 ? 'noche' : 'noches'}</small></span>
                    </label>;
                  })}
                </fieldset>}
          <div className={styles.actions}><button className={styles.secondary} onClick={edit}>Volver a datos</button>
            <button className={styles.primary} disabled={!option || !canChooseStaffOption(option, search) || booking.query.isFetching || booking.query.isError} onClick={() => setStep(3)}>Revisar reserva →</button></div>
        </section> : <section className={styles.card} aria-labelledby="review-title">
          <h2 id="review-title">Revisa la reserva</h2>
          <div className={styles.reviewBlock}><div className={styles.sectionHeader}><h3>Estadía</h3><button className={styles.textButton} disabled={booking.busy} onClick={edit}>Editar</button></div>
            <p><strong>{option?.roomTypeName}</strong> · {search.rooms} {search.rooms === 1 ? 'habitación' : 'habitaciones'}</p><p>{search.checkIn} → {search.checkOut} · {nights} noches</p>
            <p>{search.adults} adultos{search.children > 0 ? ` · ${search.children} menores` : ''} · Habitación física sin asignar</p></div>
          <div className={styles.reviewBlock}><div className={styles.sectionHeader}><h3>Huésped principal</h3><button className={styles.textButton} disabled={booking.busy} onClick={edit}>Editar</button></div>
            <p><strong>{guest.fullName}</strong></p><p>{guest.email} · {guest.phone}</p></div>
          <div className={styles.reviewBlock}><h3>Notas</h3><p>{guest.notes.trim() || 'Sin solicitudes adicionales.'}</p></div>
          <p className={styles.helper}>Se vuelve a verificar la disponibilidad antes de registrar la selección. El resultado queda pendiente y no registra garantía, pago ni una cuenta de huésped.</p>
          {booking.error && <div className={styles.error} role="alert"><p>{booking.error}</p><button className={styles.secondary} disabled={booking.busy} onClick={() => { booking.clearError(); setSelected(''); setStep(2); void booking.query.refetch(); }}>Volver a disponibilidad</button></div>}
          <div className={styles.actions}><button className={styles.secondary} disabled={booking.busy} onClick={() => setStep(2)}>Cambiar tipo de habitación</button>
            <button className={styles.primary} disabled={booking.busy || !option || !quote || !canChooseStaffOption(option, search) || booking.query.isFetching} onClick={() => { if (quote && option) void booking.create(quote, option, guest); }}>
              {booking.busy ? <><span className={styles.spinner} aria-hidden="true" />Registrando reserva…</> : 'Crear reserva local'}</button></div>
        </section>}
      </div>
      <aside className={`${styles.card} ${styles.summary}`} aria-labelledby="new-summary-title">
        <p className={styles.overline}>TU RESERVA</p><h2 id="new-summary-title">Resumen de la estadía</h2><p className={styles.property}>{propertyName}</p>
        <dl><div><dt>Check-in</dt><dd>{search.checkIn || 'Por definir'}</dd></div><div><dt>Check-out</dt><dd>{search.checkOut || 'Por definir'}</dd></div>
          <div><dt>Duración</dt><dd>{nights} {nights === 1 ? 'noche' : 'noches'}</dd></div><div><dt>Habitaciones</dt><dd>{search.rooms}</dd></div>
          <div><dt>Huéspedes</dt><dd>{search.adults} adultos{search.children > 0 ? ` · ${search.children} menores` : ''}</dd></div></dl>
        <div className={styles.divider} />
        {option ? <><strong>{option.roomTypeName}</strong><p className={styles.helper}>{option.ratePlanName} · {money(option.nightlyMinor, option.currency)} × {nights} noches × {search.rooms}</p>
          <div className={styles.total}><span>Alojamiento estimado</span><strong>{money(option.totalMinor, option.currency)}</strong></div>
          <p className={styles.helper}>Impuestos, extras y condiciones finales pendientes de la configuración del hotel. No se ha cobrado ningún importe.</p></>
          : <p className={styles.helper}>El importe se mostrará después de elegir un tipo de habitación y su tarifa.</p>}
        <p className={styles.summaryNote}>Una reserva puede incluir varias estadías. Cada habitación tendrá su propia estadía y su asignación física posterior.</p>
      </aside>
    </div>
  </section>;
}
