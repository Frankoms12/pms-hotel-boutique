# Public 01 — Datos del huésped

## Alcance

Slice frontend autorizado por José para `IMP-WEB-0107`, WEB-1 / revisión WEB-2, `/reserva/checkout`. Continúa la revisión de selección (documento 41). No se modifica el XLSX ni se declara finalizada la creación transaccional, asignación de ocupantes por stay, garantía o confirmación. El cotejo formal con Figma y la revisión humana siguen pendientes.

## Implementación

- Stepper accesible: selección completada, datos activos y pago pendiente. Crema, blanco, oliva y resumen salvia sticky; columnas apiladas en móvil.
- Nombre/apellidos obligatorios de 2–50 (nombre) y 2–60 (apellidos) caracteres: letras Unicode, espacios, apóstrofes y guiones. Se recortan espacios exteriores; correo obligatorio de hasta 120 caracteres con formato válido, recortado y normalizado a minúsculas. Teléfono local solo numérico: +502 exige 8 dígitos; otros prefijos, 7–15. País/región obligatorio (Guatemala por defecto), documento obligatorio de 4–25 letras/números/guiones y solicitudes opcionales de hasta 250 caracteres.
- Validación de formato al salir del campo y al enviar, errores vinculados mediante `aria-describedby`, `aria-invalid`, foco en el primer error y bloqueo de doble envío. No se presume validez legal de un documento ni que el teléfono sea alcanzable. La aceptación definitiva corresponde al backend.
- Contexto Checkout separado de Booking y Guest Auth. Guarda datos únicamente en memoria del layout público, asociados a propiedad y búsqueda. No escribe contacto/documentos/solicitudes en URL, storage o logs. Volver a la selección, acceder con el login demo o avanzar mantiene los datos. Recargar o cerrar la aplicación descarta el borrador y el carrito.
- Acceso Guest opcional: la ruta de acceso acepta un retorno limitado a `/reserva/checkout` y conserva los criterios. En modo real, checkout reutiliza `useAccountSummary`, el mismo DTO/mapper/cache y BFF propio `/api/auth/guest/account/summary` que Account. Hidrata campos vacíos una vez por fuente: email de la propia cuenta y nombres del único perfil ACTIVE explícitamente vinculado, cuando existen. Una cuenta sin perfil o con varios perfiles no es un fallo de autenticación: email se puede completar, nombres restantes se introducen manualmente. No infiere IDs, teléfono, documento, país ni picture; no modifica perfiles ni sobrescribe campos manuales. Mock conserva «Usar datos de mi cuenta» y su transporte provisional separado.
- Resumen revalida selección/cotizaciones existentes. En modo real conserva GTQ y suma `totalMinor × quantity` del Backend, sin cargos ni impuestos inventados. El modo mock conserva USD/GTQ indicativo y el desglose demo; monedas distintas no se suman.
- El journey omite copy sobre almacenamiento interno, mocks y retención de inventario; conserva los mensajes útiles de privacidad y errores.
- Tras la transición visual, el destino `/reserva/checkout/revision` presenta estadía, huésped y solicitudes en el Paso 3 de 4. Exige una selección válida y la aprobación del formulario para esa selección; editar los datos invalida la aprobación. La revisión final no recolecta tarjeta ni crea cuentas, perfiles, reservas o pagos. La garantía queda en el Paso 4; ver documentos 44 y 45.

## Arquitectura y límites

Dominio puro de validación/prefill → contexto de borrador → formulario y páginas. Las rutas son composiciones delgadas. Availability, Guest Auth y GuestProfile conservan sus Services/DTO/Mappers/hooks; Checkout consume solo APIs públicas de módulos, sin fetch directo ni imports de mocks/DTOs en UI. No hay Booking → Checkout ni un segundo provider de sesión Guest.

### Corrección de hidratación real — EN_QA (2026-10-06)

El prefill anterior exigía `profileId`, emitía `PROFILE_LINK_REQUIRED` para una
cuenta válida sin perfil único y, con vínculo, llamaba `/profile/{id}?accountId=...`,
un transporte provisional que no es el BFF real de Account. Se separó el prefill
mock del real; el real no usa ese endpoint. Conserva los controles de scope de
Account y cookies same-origin sin Authorization Staff. Error real del resumen
mantiene fallback manual y retry accesible. La prueba de regresión visita Account
y después hidrata checkout con la misma fuente, incluyendo perfiles ausentes o
múltiples, campos manuales y error 503/retry. OAuth completo en sesión real sigue
siendo QA manual de Alan; no se modifican sus rutas ni contratos.

El contrato público de disponibilidad y las consultas de perfil existentes continúan siendo provisionales. El acceso de demostración se prueba con MSW. El retorno OAuth real mediante una redirección externa recarga la aplicación y no conserva este borrador en memoria: necesita una solución de continuidad y contratos aprobados antes de afirmar soporte completo. No se agregan endpoints backend ni reglas fiscales/financieras.

## Prueba manual

En `frontend/pms-hotel-web`, usar la configuración mock local y `npm run dev -- --port 3000`. Abrir `http://localhost:3001`, buscar fechas futuras, seleccionar habitación, revisar y «Continuar con mis datos».

1. Enviar vacío: aparecen errores y el foco vuelve al nombre. Corregir correo/teléfono y observar la validación.
2. Completar datos, documento obligatorio y solicitudes; comprobar contador y resumen. En mock se conserva el selector USD/GTQ; en real se muestran los importes GTQ del Backend.
3. Opcional: iniciar sesión demo, volver con «Continuar mi reserva» y usar datos de la cuenta; lo escrito antes se conserva.
4. Continuar al Paso 3, revisar contacto y regresar con «Editar mis datos»: los campos permanecen.
5. Cambiar búsqueda o recargar: no se reutiliza información de otra selección ni se permite saltar la validación. No se crea ni cobra una reserva.

Pruebas: validación/formato, obligatoriedad, accesibilidad, doble envío, navegación y persistencia, aislamiento de búsqueda, ausencia de escritura financiera/storage, vínculo explícito de perfil y retorno seguro del login. Se ejecutan también regresiones afectadas de Booking, Availability, Guest Auth y Profile, lint, TypeScript estricto, build y revisión Chrome móvil/escritorio.

Resultado local: 21 archivos / 179 pruebas PASS; lint, TypeScript estricto y build PASS. Chrome PASS en 320, 390, 768, 1024 y 1440 px: validación, ida/vuelta, login demo, moneda y búsqueda conservados, vacío seguro al recargar y sin errores de consola. Esta validación local no sustituye los checks de GitHub ni la revisión de los responsables.

Corrección autorizada de QA (2026-10-06): estas reglas de validación y la vista real
hasta Payment permanecen EN_QA. La evidencia manual anterior corresponde al slice
demo original; la repetición de QA manual de las correcciones sigue pendiente.

Actualización del dataset integrado (2026-10-06): el carrito persiste únicamente selección/búsqueda en sessionStorage por modo. Guest/contacto/documento continúan solo en memoria. Se incorporan límites HTML coherentes y se mantiene EN_QA hasta QA manual final.

### Contrato real de nombres tras Google — EN_QA (2026-10-06)

`/api/auth/guest/account/summary` conserva el contrato confirmado del Backend:
`guestAccountId`, `email`, `active`, `profiles[]`, `linkedReservationsCount` y
`upcomingStay`. Solo `profiles[]` contiene `profileId`, `firstName`, `lastName`,
`preferredLanguage` y `status`. No existen `name`, `firstName`, `lastName` ni
`picture` en la cuenta/sesión. El adaptador Google verificado produce únicamente
subject/email; no conserva nombre completo ni fotografía. Account presenta los
perfiles vinculados; una cuenta válida sin perfiles no aporta un nombre.

Se aplica la opción C autorizada: email-only cuando falta perfil único activo;
no se inventa ni se divide un nombre que el contrato no entrega. Si hay un perfil
único activo se usan sus firstName/lastName explícitos mediante el mismo
`useAccountSummary`. El mensaje aclara que faltan los nombres sin mostrar un falso
error. Campos escritos manualmente, incluso vaciados antes de llegar la respuesta,
se protegen en memoria; no se persisten en sessionStorage ni se envían a Google.

Un prefill de nombres para una cuenta Google sin GuestProfile requiere una futura
decisión/contrato Backend para suministrarlos; no se cambia esa autoridad aquí.
No se accedió a cookies ni al resumen personal de Alan. OAuth completo/prefill de
su sesión concreta continúa como QA manual; las regresiones usan fixtures propias.


### Cierre del journey Guest pre-submit — COMPLETADA / QA manual PASS (2026-10-06)

Alan confirmó PASS manual del stack integrado desde disponibilidad pública hasta
Guest checkout, Review y llegada a Payment; la confirmación final bloqueada es el
resultado esperado. También confirmó Guest Google session/account conforme al
contrato vigente. Account Summary solo entrega firstName/lastName dentro de perfiles
asociados; sin GuestProfile no se atribuyen nombres a Google.

Quedan fuera de scope y pendientes de Juan: `POST /api/v1/public/bookings`,
PaymentGateway simulado Backend, persistencia Reservation/ReservationStay,
confirmationCode e idempotencia booking. No se simula reserva confirmada. Este
cierre reemplaza el estado EN_QA de las notas previas y conserva su historial.
