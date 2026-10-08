# Checkout público — submit real J6

## Estado vigente — cierre QA manual final (2026-10-08)

**Estado del incremento: COMPLETADA. Aceptación y DoD: PASS**, conforme a
[Definition of Done Web](30_DEFINITION_OF_DONE.md), con evidencia técnica local
previa y confirmación explícita de Alan: «QA manual final del submit real
Web → J6: PASS».

QA manual final confirmado por el usuario:

- Submit real Web → BFF público → J6 y confirmación final: PASS.
- Corrección del carrito/draft después de 201: PASS.
- F5 en confirmación sin duplicación: PASS.
- Resultado desconocido conserva la intención: PASS.
- Replay con la misma Idempotency-Key/payload y sin duplicación: PASS.
- Modal de replay: PASS.
- Texto técnico eliminado del modal y verificado visualmente: PASS.

Evidencia técnica previa: 360 tests del submit y regresiones; 102 de limpieza;
112 del modal; typecheck, lint y build PASS en sus respectivas entregas.
Después de eliminar el párrafo técnico y ajustar únicamente las expectativas
afectadas, los dos archivos focalizados pasan con **26 tests PASS**. Los
conteos corresponden a rondas distintas y no se suman. En este cierre se
ejecuta únicamente `git diff --check`: PASS; no se repiten suites ni se cambia
código/tests.

Este cierre corresponde al incremento Web y sus correcciones autorizadas.
Se conservan el contrato J6, el estado propio de Backend y las filas del XLSX;
no se declara cierre de otras tareas, CI remoto ni publicación. Sin
commit/push/merge en este cierre. Las notas técnicas siguientes describen el
incremento entregado; la QA manual pendiente queda resuelta por este registro.

## Alcance autorizado

Incremento autorizado explícitamente el 2026-10-08. Reutiliza búsqueda,
availability, carrito, datos del huésped, revisión y componentes de resultado.
Las filas relacionadas IMP-WEB-0110/0111/0112 del XLSX conservan su estado;
este incremento no actualiza el backlog; su QA manual final está cerrada PASS.
Dependencia Backend: J6 y A4 integrados y cerrados según AlanPlan/AlanHandoff.

## Transporte y contrato

`NEXT_PUBLIC_USE_MOCK_API=false` selecciona el adapter real. El cliente utiliza
el origen de la página, independientemente de `NEXT_PUBLIC_API_BASE_URL`:
Web → POST `/api/v1/public/bookings` BFF → mismo path J6.
`PMS_BACKEND_INTERNAL_URL` configura el destino interno. No se requiere sesión
Guest/Staff ni se reenvían cookies, Authorization o tokens al Backend.

El body contiene exclusivamente `propertyId`, `arrival`, `departure`, `currency`
GTQ, `clientTotalMinor`, `stays[{roomTypeId,ratePlanId,quantity}]`,
`bookingGuest{firstName,lastName,email}` y `paymentMode: SIMULATED_CARD`.
El total se obtiene de los `totalMinor` de availability por cantidad, sin
conversión USD ni garantía parcial. No se envía tarjeta, token, last4, teléfono,
documento, adultos/niños, notas ni campos adicionales.

La respuesta validada conserva `reservationId` y `reservationStayId` UUIDs,
`confirmationCode`, pago `SIMULATED/APPROVED` y total GTQ. Se muestra y copia
`confirmationCode`; el pago simulado corresponde al total, con saldo cero.
Fechas, propiedad y nombres de habitación se conservan del intento para la
presentación; no se fabrican campos Backend ausentes, datos de tarjeta, cargos
ni un timestamp de confirmación. `receivedAt` es la recepción local y se usa
únicamente para la exportación de calendario.

La especificación del endpoint **propio del BFF** está en
[public-booking-bff.openapi.json](public-booking-bff.openapi.json). No se cambia
Backend ni su OpenAPI. Los DTOs Java `PublicBookingRequest/PublicBookingView`,
controller/advice J6 y pruebas HTTP Backend son la referencia del contrato.

## Intentos y errores

El primer submit revalida ATS y cotización; un cambio impide el POST hasta
revisión. El hook bloquea doble clic desde el inicio y el provider bloquea
envíos simultáneos durante navegación. La misma operación conserva su key.
J6 responde 201 tanto para creación como replay del snapshot original.

Una respuesta perdida, cancelación después de enviar, respuesta inválida o
fallo de transporte del BFF conserva el request/key, scope y contexto en
memoria. El replay permite reintentar esa operación **antes de revalidar**
availability o datos. La query permanece suspendida mientras está pendiente,
incluso si el inventario cambió o el usuario está offline. No se permite
editar datos ni limpiar el intento pendiente. Un error conocido permite volver
a revisar; el reintento de payload idéntico conserva su key.

| HTTP/code | Recuperación |
| --- | --- |
| 400 INVALID_REQUEST / INVALID_DATE_RANGE | Revisar datos/fechas |
| 404 PROPERTY_NOT_FOUND | Revisar búsqueda/propiedad |
| 409 NO_AVAILABILITY | Buscar otra habitación/fechas |
| 409 PRICE_CHANGED | Revisar tarifa vigente |
| 409 IDEMPOTENCY_KEY_REUSED | Mantener intento y verificar el original; no crear otra key |
| 422 PAYMENT_DECLINED | Reintentar pago simulado, sin selector de tarjeta |
| 500 BOOKING_FAILED | Error técnico conocido J6, sin escrituras locales parciales |
| 502 UPSTREAM_RESULT_UNKNOWN / red / respuesta inválida | Repetir exactamente request y key |

El BFF conserva códigos HTTP de negocio y publica solo `code` de los errores,
sin detalles internos. 502 pertenece al transporte del BFF, no al contrato J6.
El modo mock conserva su service, mapper, modalidades y simulador existentes.

## Confirmación modal del replay J6

Desde `/reserva/error`, «Reintentar la misma solicitud» abre el `Modal`
compartido en la propia página, sin navegar al panel de verificación de pago.
El resumen toma habitaciones/cantidades, fechas y total GTQ del intento
original. El párrafo técnico sobre datos, payload e Idempotency-Key fue
eliminado por solicitud del usuario y su ausencia fue verificada visualmente
en la QA manual final. La reutilización exacta del intento permanece en la
lógica de replay. No muestra ni permite editar el payload, contacto ni valor
de la key; conserva las acciones «Cancelar» / «Reintentar solicitud».

«Cancelar», Escape y backdrop cierran el diálogo, devuelven el foco al botón y
conservan la intención en error, sin POST ni navegación. «Reintentar solicitud»
invoca el mismo hook y adapter del replay existente, sin availability previa.
Durante el envío se bloquean doble submit y todas las acciones de cierre.
201 validado cierra el diálogo, limpia una sola vez y navega a confirmación.
Red/resultado desconocido permanece en el modal con error y permite volver a
reintentar o cancelar. Un error HTTP conocido cierra el diálogo y muestra su
recuperación en la misma página de error, conservando carrito y datos.

Se conserva la recuperación del simulador de tarjeta mock: este cambio UX
consume el snapshot del intento real J6 y no cambia la lógica de idempotencia,
el contrato Backend ni el flujo de selección de tarjeta del simulador.

Validación de este cambio: 17 archivos / 112 tests focalizados PASS; typecheck,
lint, build y `git diff --check` PASS. Cobertura de resumen multi-room, cancelar/foco, offline,
red/proxy/error HTTP, bloqueo durante envío, limpieza única y confirmación.

## Limpieza después de confirmar

Corrección autorizada tras QA manual: una confirmación validada limpia la
selección del carrito y su entrada en sessionStorage, tanto en real como en
mock. El cierre libera aprobación, cotización revisada, modalidad, contacto del
formulario, documento/notas, fallo y key/payload del intento. Conserva solo la
respuesta Domain, su scope y nombre/apellidos/correo para el ticket actual.
La confirmación se puede consultar al volver al pago aunque el carrito esté
vacío; no depende de availability ni de volver a aprobar el draft.

Errores HTTP, fallos de red, respuesta inválida y resultado desconocido no
limpian el carrito ni el draft necesario para recuperar el intento. Al resolver
el replay con éxito se aplica el mismo cierre una sola vez. F5 pierde la
confirmación en memoria y muestra el estado vacío, conserva el carrito vacío
y no genera un nuevo POST. Backend y contrato J6 permanecen sin cambios.

Regresión de esta corrección: 15 archivos / 102 tests focalizados PASS;
typecheck, lint, build y `git diff --check` PASS. Incluye ambos modos, limpieza
única tras replay, conservación ante error/incertidumbre, descarte del draft
transitorio y remount completo de confirmación sin otra escritura.

## Verificación

Pruebas focalizadas: contrato BFF y adapter, mapper estricto, single/multi-room,
cantidades, total GTQ, ausencia de extras, doble clic, códigos de negocio,
confirmación/copia, replay tras pérdida/cancelación/DTO inválido/proxy error,
offline durante recuperación y availability modificada. Se ejecutan también
las regresiones Booking/Availability/Checkout, typecheck, lint, build y
`git diff --check`.

Los tests Web usan respuestas J6 controladas; no equivalen a QA manual contra
PostgreSQL. La reserva se conserva en Backend cuando J6 confirma; el draft y
la key del navegador siguen siendo volátiles. No se añade lookup de operación,
persistencia de PII, vinculación automática GuestAccount, PSP ni correo.

Evidencia técnica local: 360 tests PASS; `npm run typecheck`,
`npm run lint`, `npm run build` y `git diff --check` PASS. El build tiene
`ignoreBuildErrors` preexistente; TypeScript se verificó por separado.

QA manual final del submit real y sus correcciones: **PASS**, confirmado
explícitamente por el usuario y registrado en el estado vigente al inicio de
este documento. El incremento queda **COMPLETADA**; no hay QA manual pendiente
dentro de este alcance.
