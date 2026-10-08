# Public 01 — Resultado de reserva: confirmación y error

Integración real vigente: [submit J6](52_PUBLIC_BOOKING_J6_SUBMIT.md). En modo
real se muestra confirmationCode y se conservan los UUIDs de Backend; las
referencias simuladas descritas abajo corresponden al modo mock.

Actualización de presentación: [textos finales para clientes](48_PUBLIC_BOOKING_CUSTOMER_COPY.md). Ticket, panel financiero y calendario usan redacción final; esta actualización no añade persistencia, correo ni integración Backend.

## Alcance

Rediseño frontend solicitado por José para IMP-WEB-0112 (WEB-1 / revisión WEB-3). Se revisaron la fila y la dependencia IMP-WEB-0111. Reutiliza la respuesta Domain del simulador ya existente: Reservation con N stays, IDs business y garantía validada. La dependencia formal y el contrato productivo siguen pendientes; no se modifica el backlog ni se afirma creación Backend real.

## Pantallas

- `/reserva/confirmacion`: solo después de una respuesta exitosa y validada del simulador. Check oliva, ticket con código, fechas, huéspedes, importe y badge; panel financiero con total, garantía y restante reales de esa respuesta, en USD/GTQ. No se sustituyen por importes de una captura ni se convierten tres noches en una garantía del 100%.
- `/reserva/error`: después de un fallo de garantía o revalidación. Mensaje por rechazo, pasarela, disponibilidad, tarifa o conexión; conserva intención y huésped en memoria. No genera código ni presenta éxito.
- `PublicBookingResultPage` expone `status: 'success' | 'error'` para componer ambas variantes. El prop no puede fabricar una confirmación o fallo: exige el resultado guardado, con búsqueda/property explícitos. Acceso directo, búsqueda distinta o recarga muestran vacío.

## Acciones

Copiar código usa clipboard con feedback y alternativa manual si no hay permisos. «Imprimir / Guardar PDF» abre impresión del navegador: elegir guardar como PDF. CSS print genera un comprobante de demostración, no una factura; oculta navegación, footer y controles. «Agregar al calendario (.ics)» descarga un archivo local importable en Google Calendar/iCal, sin transmitir contacto, documento ni solicitudes a terceros. Exportación all-day, llegada inclusiva y salida exclusiva; escape/folding UTF-8 según [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545). No se inventa hora ni timezone de check-in.

«Ver mis reservas» abre el módulo existente; esta referencia simulada no se añade automáticamente a su historial independiente. Se conserva la explicación de reserva como invitado y futura vinculación verificada. El texto de correo aclara que el envío real sigue pendiente.

«Volver al inicio» limpia carrito, datos del huésped, aprobación, revisión, resultado y clave del intento. Conserva preferencia de moneda y Guest Auth; no cierra la cuenta. Volver atrás después no recrea la confirmación.

## Recuperación

Rechazo o error conocido → volver al Paso 4 con los datos y la tarjeta de prueba conservados, permitiendo cambiarla. Disponibilidad agotada → catálogo; cambio de tarifa → revisión. Las consultas no consumen ni retienen inventario. La búsqueda mantiene query params sin PII.

Respuesta perdida después de enviar → resultado incierto, sin asegurar que no hubo operación. Se conserva el payload/key en el provider y se restaura la tarjeta tokenizada al regresar al pago. Se bloquea modificar tarjeta/datos de la solicitud hasta resolver el mismo intento. Reintento idéntico obtiene la misma confirmación del simulador. Un cambio de cotización previo no libera automáticamente la incertidumbre. El lookup de estado y la idempotencia duradera del PSP/Backend continúan pendientes; este mecanismo es solo de demostración en memoria.

Recepción usa una constante con número de ejemplo, identificada como contacto de demostración; el botón explica que el canal real está pendiente, sin iniciar llamadas a un contacto ficticio.

## Prueba manual

Con mocks, puerto 3000: selección → datos → revisión → pago. Probar Visa aprobada y confirmar ticket/panel; copiar, imprimir PDF, descargar calendario, cambiar moneda y volver al inicio. Repetir con «Tarjeta rechazada» y «Error de pasarela»: aparece error sin referencia, reintentar conserva los datos; elegir Visa aprobada completa el recorrido. No se cobra, envía correo ni guarda reserva real.

## Validación

Validación local: 34 tests en 8 archivos del módulo checkout, ESLint, TypeScript y build de producción con mocks. Las pruebas cubren resultado, recuperación, idempotencia al perder respuesta, limpieza del borrador, calendario y acciones del ticket.

Recorrido automatizado en Chrome: rechazo y error de pasarela sin falsa confirmación, reintento conservando datos, aprobación, copiar código, descarga `.ics`, generación de PDF mediante impresión y regreso al inicio con carrito/borrador vacíos. Revisadas las pantallas de éxito/error en escritorio y móvil; sin desbordamiento horizontal a 320, 390, 768, 1024 y 1440 px. No se observaron errores de consola, solicitudes al Backend ni PAN/CVV en solicitudes o almacenamiento del navegador. Los artefactos de prueba permanecen fuera del repositorio. Esta evidencia no sustituye CI ni revisión de owners.
