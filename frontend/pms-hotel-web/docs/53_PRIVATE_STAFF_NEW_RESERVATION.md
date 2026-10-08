# Staff — Nueva reserva

## Alcance autorizado

José solicita retomar el botón pendiente del Centro de Reservas. Slice frontend
relacionado con IMP-WEB-0301/0302, WEB-3/reviewer WEB-4; sus filas y dependencias
se revisaron en el XLSX. No hay una fila específica de alta Staff en esa sección:
no se inventa un ID, se cambia el backlog ni se declara cumplida su integración.
Fuente visual: paleta y componentes Staff existentes, sin Node ID inventado.
Rama `feature/staff-new-reservation`, desde origin/main con Public 02 integrado.

`/reservas/nueva` es un segmento estático junto al detalle dinámico. El botón
aparece para RESERVATION_MANAGE o SUPER_ADMIN, también si el centro está vacío
o su read model real aún no tiene adapter. La ruta conserva el guard Staff y
resuelve propiedad, nombre y timezone exclusivamente desde sesión/membership y
PropertyProvider. ALL_PROPERTIES exige elegir una propiedad concreta. Cambiar
propiedad/sesión remonta y descarta el formulario anterior; se aborta el submit
pendiente y no se publica su resultado en otra sesión.

## Recorrido

1. Estadía y huésped principal: fechas locales de la propiedad, cantidad de
   habitaciones, adultos/menores, nombre, correo, teléfono y notas (300 caracteres).
   Validación, mensajes por campo y foco al primer error. Consulta de fechas desde
   hoy para este recorrido; no es un formulario de importación histórica.
2. Tipos y tarifa: disponibilidad por tipo para las noches solicitadas, capacidad,
   precio por habitación/noche y estimado de alojamiento. Selección única de tipo
   y tarifa; la cantidad puede generar N stays del mismo tipo. Cambiar fechas
   elimina la selección y exige volver a consultar. Loading/error/retry/empty.
3. Revisión: datos editables conservados, desglose de alojamiento, sin suponer
   impuestos, cargos adicionales, política de cancelación o garantía. Revalidación
   al admitir; respuesta local PENDING, RESERVED por stay y NO_CAPTURE.
4. Resultado local: referencia y enlaces al detalle y listado existentes. No hay
   éxito ante error/conflicto; retry mantiene datos y clave idempotente si el
   comando no cambió. Doble click bloqueado y replay devuelve los mismos IDs.

Una Reservation contiene N ReservationStay con IDs distintos, room=null y tipo
preservado. No se crea GuestAccount, sesión Guest, pago, Folio ni una habitación
física. El huésped responsable no se interpreta como ocupante de todas las stays.
Asignación de ocupantes por stay, combinaciones de tipos distintos, asignación
física, política/garantía y persistencia Backend quedan fuera de este slice.

Un incremento posterior permite la [asignación física inicial local](55_STAFF_INITIAL_ROOM_ASSIGNMENT.md)
desde el detalle. No modifica las garantías ni el alcance de integración de esta alta.

## Transporte y límites

UI → Hook → Service → DTO → Mapper → Domain. MSW usa exclusivamente las rutas
**provisionales** `/__mock/staff-reservations/{propertyId}/quotes` (GET) y
`/__mock/staff-reservations/{propertyId}` (POST). No son API Backend confirmada.
El service bloquea ambas si NEXT_PUBLIC_USE_MOCK_API=false; el modo real permite
revisar el formulario e informa el transporte pendiente sin emitir una reserva.
Auth Staff continúa mediante el BFF de BD1, también con datos mock habilitados.
Para trabajar sin Backend existe además una [vista previa explícita de desarrollo](54_STAFF_FRONTEND_PREVIEW.md),
independiente del login real y desactivada por defecto.

Las cotizaciones locales reutilizan el catálogo operativo de la propiedad y
tarifas GTQ de escenario por RoomType; tipos sin tarifa de escenario no se ofrecen.
Solo la propiedad ficticia GT-HB-01 tiene inventario inicial en este catálogo.
Un UUID real de la demo no se convierte ni se copia a esa propiedad ficticia.
La disponibilidad local toma el mínimo por noche en [arrival, departure), resta
stays de escenario activas y OOO sin duplicar el Room; OOS conserva ATS. RatePlan
no recibe inventario. Admisión e inserción son síncronas después de leer el cuerpo;
no se permite sobreventa local por dos comandos con cotizaciones antiguas.
Este escenario no sustituye AvailabilityPort, la transacción Backend ni conecta
el inventario del checkout público con el Staff. Sus registros solo viven en
memoria y se pierden al recargar/cerrar la aplicación.

El GET provisional del listado agrega registros locales; el detalle los encuentra
solo por propiedad correcta. No altera reservas existentes, historial financiero,
perfiles ni datos de otros módulos. Los importes son centavos enteros en la
cotización; el mock produce strings para el read model financiero existente.
No se pide PAN/CVV, guarda PII del formulario en browser storage ni usa fetch en UI.

## Handoff Backend

Antes de integrar, confirmar alta Staff, datos de GuestProfile/booking guest,
ocupantes por stay, estados/política de confirmación, idempotencia y respuesta.
Reutilizar la autorización RESERVATION_MANAGE y property scope de BD1. Adaptar
read models, cotizaciones y comando mediante service/DTO/mapper; no basta con
cambiar las URLs mock por una ruta presumida. Admisión transaccional sin
overbooking, timezone y auditoría corresponden a Backend. No se modificaron
Java, migraciones, secretos, workflows, login ni el checkout público.

## Validación

- Vitest: 54 archivos, 337 pruebas aprobadas de Reservas, Habitaciones, Auth y
  regresión de layout/dashboard Staff. Incluye validación del formulario, N stays,
  scope, replay idempotente, rechazo de cotización antigua, OOO/OOS, noches
  parcialmente superpuestas y checkout sin solapamiento.
- `npm run lint`, `npx tsc --noEmit` y `npm run build`: aprobados. TypeScript se
  verifica por separado porque la configuración existente omite ese check en build.
- Chrome: recorrido Centro → Nueva reserva → revisión → resultado → detalle →
  Centro, con dos stays sin asignación física; sin excepciones de ejecución.
  Revisado a 320, 390, 540, 768, 1024 y 1440 px, sin desbordamiento horizontal.
- La prueba de navegador inyecta una respuesta de sesión QA únicamente dentro de
  su perfil temporal; no modifica Auth del proyecto ni valida el login Backend.
  Usa la propiedad ficticia GT-HB-01, no inventario de una propiedad real.
- `git diff --check`: aprobado. No se realizó commit ni push de este slice.

Pendiente: probar la sesión Staff real y el alta persistente después de confirmar
e implementar el contrato Backend. Este resultado acredita el frontend local.
