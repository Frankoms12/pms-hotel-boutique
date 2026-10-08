# Public — Reserva como invitado y Mis reservas

Actualización vigente (2026-10-06): [vista dedicada de vinculación](51_PUBLIC_02_EXISTING_RESERVATION_LINK.md) desde Cuenta vinculada. El recorrido frontend local admite la sesión Guest creada por Google o correo y mantiene referencia + código + coincidencia con el correo registrado. La política Backend real sigue siendo Google + OTP según DEC-B-004; no se conecta ni modifica en esta entrega. Las secciones históricas siguientes describen el recorrido Google inicial.

Actualización de presentación: [textos finales para clientes](48_PUBLIC_BOOKING_CUSTOMER_COPY.md). Referencias/OTP de ejemplo e instrucciones de simulación quedan solo en documentación y fixtures, sin mostrarse en la interfaz. El botón de acceso Google ahora se llama «Acceder con Google».

Actualización posterior: pago/confirmación de demostración se implementan en [la entrega 44](44_PUBLIC_BOOKING_PAYMENT_GUARANTEE.md). Los límites de persistencia, correo real e historial aquí descritos se conservan.

## Alcance autorizado

José aprueba conservar checkout sin cuenta y desarrollar únicamente el frontend de acceso → vinculación por referencia/código → historial. Se amplían los slices existentes de acceso `IMP-WEB-0202` y cuenta/historial `IMP-WEB-0205–0206` (WEB-2; revisión WEB-1/WEB-3 según backlog). El XLSX mantiene sus estados. No se declara terminada la integración real, la revisión Figma ni los checks de GitHub.

Fuentes: DEC-B-004 y DEC-B-006, Public Web, Auth/Sessions y separación GuestAccount/GuestProfile y Reservation/ReservationStay. La decisión aprobada requiere Google y verificación al correo registrado para vincular; no se agrega acceso anónimo a datos privados ni se vincula automáticamente por coincidencia de correo.

## Flujo frontend

- Buscar, seleccionar y completar datos siguen permitidos sin cuenta. Pago/garantía y confirmación real continúan pendientes de su siguiente entrega: este slice no crea reservas ni envía confirmaciones.
- «Mis reservas» permanece visible. Sin sesión abre `/acceso?returnTo=%2Fmis-reservas` con la explicación «¿Reservaste como invitado?» y salida a reservar como invitado. Una visita directa a `/mis-reservas` aplica el mismo guard.
- Para este recorrido, el acceso es Google simulado; no hay OAuth, correos ni conexión backend. Se reutiliza el único GuestSessionProvider. El retorno está limitado a `/mis-reservas` o al checkout previamente permitido; no admite destinos externos.
- El Google demo usa `guest-demo-google` / `guest.google@example.com`, una cuenta de ejemplo inicialmente sin reservas vinculadas. Las cuentas de los ejemplos anteriores mantienen sus escenarios separados. Volver a acceder al mismo actor en la misma ejecución del mock conserva los vínculos.
- En «Mis reservas», ingresar `HB-2026-10420` o `HB-2026-10421`, solicitar código y verificar `12345678`. Las instrucciones se muestran en el panel de demostración. La primera referencia tiene dos ReservationStay; la segunda corresponde a otra Reservation pasada.
- Solicitar un desafío no expone ni agrega ninguna reserva. Una referencia desconocida o un correo distinto obtiene la misma respuesta inicial y un rechazo genérico al verificar. El código de prueba solo sirve para los ejemplos asociados al correo demo.
- Tras la respuesta de verificación, se agrega una única entrada al historial del actor. Se actualizan solamente las queries Guest de reservas y resumen de cuenta. No se incrementan rewards, facturas, pagos ni inventario. Repetir una vinculación no duplica la reserva.
- Listado y detalle reutilizan Account y sus DTO/Mapper/Service/hooks; desaparecen las tarjetas fijas antiguas de Booking. `/mis-reservas`, `/cuenta/reservas` y el detalle consultan el mismo historial vinculado. Cambiar sesión oculta datos y cancelar una operación evita repoblar la caché Guest.

## Contrato provisional del mock

Estos nombres son exclusivos de MSW, no endpoints backend confirmados:

- `http://pms.test/__mock/reservation-links/challenges`: POST con `account_id`, `reference`; devuelve `account_id`, `request_id`, `expires_at` UTC. No devuelve OTP, correo ni detalles de reserva.
- `http://pms.test/__mock/reservation-links/verify`: POST con `account_id`, `request_id`, `otp`; devuelve `account_id`, `request_id`, `reservation_id` solo tras éxito simulado.

Los Services rechazan antes de hacer HTTP si `NEXT_PUBLIC_USE_MOCK_API` no está habilitado. La entrada pública de este recorrido tampoco dispara consultas reales con mocks desactivados. No se modifican BFF, backend, secretos, contratos productivos ni endpoints existentes.

Política ilustrativa del mock: 8 dígitos, cinco minutos, cinco intentos y desafío de un uso. Reenviar invalida el anterior. Son datos de demostración; no se establecen como configuración de producción. El código fijo es visible y NO proporciona autenticación real.

## Estados y límites

Validación local, submitting y doble envío bloqueado; errores de servicio/formato, offline recuperable, expiración, reenvío, cambio de referencia, vacío e historial con múltiples entradas. Las mutaciones no se encolan ni reintentan automáticamente. Se cancelan al salir/cerrar sesión; respuestas de otra cuenta o desafío se rechazan en el Mapper.

El mock vive en memoria: cerrar o recargar la aplicación reinicia la demostración. La persistencia de reservas confirmadas, entrega real de correo/OTP, autenticación y autorización definitivas son responsabilidades futuras del backend. La consulta real no puede basarse en IDs enviados por el cliente. Este slice no simula el éxito de un pago o la creación de una nueva reserva.

## Prueba manual

En `frontend/pms-hotel-web`, configuración mock habilitada, ejecutar `npm run dev -- --port 3000`. Abrir `http://localhost:3001` → Mis reservas → Continuar con Google → Continuar retorno al PMS → Ir a Mis reservas.

1. Comprobar que el historial está vacío y la búsqueda pública sigue accesible.
2. Vincular la referencia `HB-2026-10420` usando `12345678`; revisar dos estadías y su detalle.
3. Elegir «Vincular otra reserva» y usar `HB-2026-10421`; comprobar una segunda reserva y su detalle.
4. Repetir la primera referencia: el listado conserva dos entradas. Probar código incorrecto o referencia desconocida: no se agrega ninguna entrada.
5. Cerrar sesión: se oculta el historial. Acceder otra vez con el Google demo conserva vínculos mientras el mock siga activo; recargar reinicia el ejemplo.

QA: tests de transporte y ausencia de HTTP con mocks desactivados; mappers de scope y expiración; RTL de guard/acceso, vacío, referencia y OTP, error/reintento, expiración/reenvío, doble envío, múltiples reservas, idempotencia, logout/caché y separación Staff. Regresiones de cuenta, auth, checkout y navegación pública; lint, TypeScript, build y Chrome móvil/escritorio.

## Resultado de validación local

- Regresiones de Account, Auth, Checkout y navegación pública: **16 archivos / 87 pruebas aprobadas**.
- ESLint y TypeScript estricto: aprobados; la comprobación de tipos se ejecutó separadamente del build.
- Compilación de producción con mocks habilitados: aprobada.
- Chrome: flujo completo, código incorrecto, vinculación de múltiples reservas, detalle, repetición sin duplicados, cierre de sesión y recarga; sin errores de ejecución ni solicitudes al backend.
- Sin desbordamiento horizontal a 320, 390, 768, 1024 y 1440 px. Capturas y scripts de inspección permanecen en TEMP, fuera del repositorio.

Esta evidencia es local. La revisión del equipo y GitHub CI siguen siendo verificaciones independientes.
