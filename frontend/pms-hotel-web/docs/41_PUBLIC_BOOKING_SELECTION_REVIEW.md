# Public 01 — Revisa tu selección

Actualización: el formulario inicial descrito aquí se amplía en [Datos del huésped](42_PUBLIC_BOOKING_GUEST_DATA.md), con validación y persistencia en memoria entre pasos.

## Alcance autorizado

José solicita el Paso 1 de 3: selección → revisión → datos del huésped, conservando crema/serif/oliva, búsqueda, moneda y habitación. Implementación frontend en `feature/web1-public-booking`; desarrollo y QA en puerto 3000.

Referencias: `IMP-WEB-0105`, ruta `/reserva`, owner WEB-1 / reviewer WEB-4; y destino inicial `IMP-WEB-0107`, `/reserva/checkout`, reviewer WEB-2. Son slices de presentación según la especificación explícita del usuario. No se modifican estados del XLSX ni se declaran completas la asignación de ocupantes por stay, creación de reservas, garantía, pago o confirmación. El diseño se verifica contra la especificación del usuario; queda pendiente el cotejo formal de Figma/reviewers.

## Flujo

- Seleccionar o actualizar una habitación desde el detalle agrega/actualiza la entrada del carrito y navega a `/reserva`. Una opción ya seleccionada permite volver a revisar sin duplicarla.
- El drawer del catálogo y del detalle habilita «Continuar con el Checkout» cuando todas sus entradas son válidas y la consulta está disponible. Su destino es la revisión, no una confirmación.
- Las rutas conservan `checkIn`, `checkOut`, `adults`, `children`, `roomsCount` y `promoCode`. El estado de moneda y carrito continúa en el provider público.
- Revisar no constituye un commit de inventario. Se consulta el servicio público provisional existente con las fechas y el propertyId de la selección; se valida cada RoomType/RatePlan/cantidad contra la última respuesta. Una opción inexistente no se sustituye automáticamente.
- «Cambiar habitación» vuelve al catálogo con la búsqueda intacta; «Quitar» elimina solo la entrada correspondiente. Si el carrito queda vacío, desaparece el avance. Otra propiedad o búsqueda no reutiliza el carrito anterior.
- La pantalla muestra cada entrada seleccionada y su cantidad. Los cargos y totales vienen de las cotizaciones, multiplicados por cantidad y sumados en unidades menores por moneda; no se inventa una tasa fiscal. Si los cargos opcionales faltan, se muestra «Pendiente»/«Por confirmar». No se suman monedas diferentes en un único total.
- «Continuar con mis datos» abre el destino inicial del Paso 2. No se exige iniciar sesión. El formulario recoge nombre, correo y teléfono opcional, con validación HTML, y permite revisar localmente los datos; no realiza requests de escritura ni crea GuestAccount/GuestProfile/Reservation/Payment.

## Límites

El contrato de availability y los ejemplos de cargos/imágenes/políticas conservan su carácter provisional de la entrega anterior. Fuera de la configuración mock no se reemplaza una consulta fallida por datos de ejemplo. La revalidación al entrar no asegura un hold ni reemplaza la admisión transaccional antes de confirmar. No se introduce ningún endpoint backend.

El carrito y moneda viven en memoria del layout público; un reload conserva los criterios de la URL pero deja el carrito vacío. Los datos de contacto viven solo en el formulario inicial y se descartan al salir: no se incluyen en URL, storage ni logs. La asignación de ocupantes por stay y validación completa de capacidad pertenecen a la siguiente entrega multi-room. El conteo solicitado en la búsqueda y las unidades elegidas se muestran como información distinta.

Traslado al aeropuerto y early check-in son opcionales en la solicitud. No se incluyen en esta entrega: requieren oferta/cotización y reglas del hotel. No se añade un cargo basado en un precio UI sin contrato. Pago y confirmación continúan pendientes; el formulario inicial lo comunica sin simular una reserva exitosa.

## Archivos y arquitectura

- `app/(public)/reserva`: composición de rutas delgadas.
- `booking/domain`: navegación y resumen puro de cotizaciones.
- `booking/hooks/use-public-booking-review`: consulta mediante el hook público de Availability, estado de selección y resolución contra resultados vigentes.
- `booking/ui`: stepper accesible, revisión responsiva, integración de CTA del detalle y drawer.
- `checkout/components`: destino inicial de datos del huésped. Consume solo la API pública de Booking; no hay imports de DTO/mocks en UI ni ciclo Booking → Checkout → Booking.

## Validación y prueba manual

Pruebas de dominio: importes y cantidades, moneda separada, cargos ausentes, selección inválida. Pruebas RTL/MSW: detalle → revisión → destino de datos, búsqueda/moneda/property conservados, múltiples selecciones, tasa o cantidad obsoleta, precio vigente, eliminación/vacío, búsqueda inválida, offline/error/reintento. Formulario: selección previa requerida, validación y ausencia de requests de escritura o persistencia de contacto. Se mantienen las regresiones del catálogo y detalle.

Chrome: fotografías cargadas, CTA y stepper de cada paso, recorrido de ida/vuelta, acceso desde drawer y vacío tras reload; sin desbordamientos a 320, 390, 768, 1024 y 1440 px. Lint, TypeScript estricto, pruebas afectadas y build se ejecutan antes de cerrar.

Para probar: `npm run dev -- --port 3000` en `frontend/pms-hotel-web` con la configuración mock local. Abrir `http://localhost:3001`, buscar fechas futuras, entrar al detalle y seleccionar. Cambiar USD/GTQ, revisar desglose, volver al catálogo o continuar a datos. No abrir `/reserva` como primera entrada esperando una habitación preseleccionada.

Resultado local final: 17 archivos de prueba, 153 tests PASS; lint, TypeScript
estricto, build y Chrome PASS; `git diff --check` sin errores. Un primer recorrido
agotó el límite de tiempo al ejecutar pruebas y compilación simultáneamente;
pasó aislado y en la regresión secuencial completa, sin cambiar timeouts ni
deshabilitar pruebas. Los checks de GitHub y revisiones humanas no se dan por
aprobados con esta validación local.
