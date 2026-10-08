# Public 01 — Detalle de RoomType y moneda de presentación

## Alcance

Implementación autorizada por José: detalle desde Inicio o catálogo, galería, resumen de estancia, selección compartida, amenidades, políticas con niveles de penalización y presentación USD/GTQ. Se conserva `feature/web1-public-booking` y el servidor de desarrollo en el puerto 3000.

Referencia operativa: `IMP-WEB-0104`, owner WEB-1, reviewer WEB-4. La implementación reutiliza el consumidor público de `booking` y el Domain Model de `availability`; no modifica el módulo operativo de Rooms físicos. La ruta usa exclusivamente RoomTypeId: `/habitaciones/[roomTypeId]`. El XLSX no se modifica ni se declara revisión de Figma o contrato backend aprobada.

## Navegación y selección

- Inicio y catálogo enlazan al detalle con `checkIn`, `checkOut`, `adults`, `children`, `roomsCount` y `promoCode`. El catálogo también conserva el RatePlan elegido.
- Volver a resultados conserva la búsqueda. Cambiar las fechas consulta nuevamente sin recargar la página y descarta la selección anterior.
- Un provider en el layout público comparte moneda y selección entre las rutas. El alcance incluye propertyId y la búsqueda completa; no se reutiliza un carrito para otra propiedad o estancia.
- Se selecciona un RoomType con un RatePlan. Cambiar de tarifa actualiza esa entrada; no duplica habitaciones. Al volver, el catálogo conserva el plan seleccionado.
- La cantidad se limita al ATS recibido y se valida contra la última respuesta. Seleccionar no retiene inventario ni confirma una reserva.
- El estado del carrito y la moneda vive en memoria durante la navegación SPA. Recargar completamente restaura los criterios de la URL, pero reinicia carrito y moneda.

## Contrato y límites

Se reutiliza la consulta pública provisional existente; no se crea ningún endpoint backend. Los campos opcionales `view_description`, `stay_price_breakdown` y `cancellation_terms` son una extensión de demostración pendiente de confirmación API. El mapper valida montos, suma en unidades menores y penalizaciones entre 0 y 100. Si faltan cargos o impuestos, la UI indica que están pendientes; no fabrica un total final ni convierte una política textual en condiciones estructuradas.

Las fixtures de demostración incluyen el ejemplo solicitado (Deluxe, tres noches: habitación USD 435, servicio 22, impuestos 48, total 505). El mock escala sus importes ilustrativos según las noches. Esto no constituye una fórmula fiscal ni una cotización comercial confirmada. Las condiciones flexibles de 72/48 horas son ejemplos; el plan no reembolsable conserva penalización total en cualquier momento.

Las imágenes locales son ilustraciones generadas, no fotografías de un hotel real. Su procedencia y prompts están en [README de imágenes](../public/images/rooms/demo/README.md).

Por decisión explícita de José, GTQ es la moneda inicial de presentación del flujo público (Inicio, catálogo/carrito, detalle y checkout/resultado). El selector permite USD y conserva la elección durante la navegación; recargar vuelve a GTQ. El footer refleja la elección y los filtros de precio muestran sus equivalentes en esa moneda. Se utiliza una referencia fechada, no una tasa en vivo: USD 1 = GTQ 7.64136, Banco de Guatemala, 2026-10-04, [fuente](https://www.banguat.gob.gt/tipo_cambio/TipoCambio/). La conversión USD/GTQ funciona en ambas direcciones; cada importe se redondea por separado. Otras monedas conservan su moneda original. No se cambia la moneda de la cotización, pago o liquidación. La garantía personalizada admite entrada Q/USD y normaliza a la moneda cotizada; ver documento 47.

Checkout, admisión transaccional y confirmación siguen pendientes de su entrega correspondiente. El botón del carrito explica ese estado. No se expone RoomId físico ni se implementan pagos.

Actualización 2026-10-05: [la entrega de revisión](41_PUBLIC_BOOKING_SELECTION_REVIEW.md) habilita el acceso al Paso 1 desde selección/drawer y un destino inicial de datos del huésped. Sustituye el CTA de selección que permanecía en el detalle por navegación a `/reserva`; admisión, garantía/pago y confirmación siguen pendientes.

## Validación

Pruebas de componentes y dominio cubren galería/teclado/imagen fallida, retorno con criterios, cuota y desglose, selección y cambio de tarifa, moneda compartida, búsqueda incompleta, RoomType o tarifa no disponible, metadata opcional ausente y recuperación de error/offline. Se mantienen las validaciones previas del mapper y del catálogo.

QA en Chrome sobre `http://localhost:3001`: Inicio → detalle → catálogo; fotografías cargadas, miniaturas y flechas; toast y retorno del foco; tarjeta sticky; carrito compartido; política no reembolsable; footer accesible; sin desbordamiento horizontal a 320, 390, 768, 1024 y 1440 px. Se comprueban lint, TypeScript estricto, pruebas afectadas y build antes de publicar.

## Prueba manual

Ejecutar `npm run dev -- --port 3000` desde `frontend/pms-hotel-web`, usando la configuración mock local del proyecto. Abrir Inicio y elegir fechas futuras, o visitar `/habitaciones/rt_deluxe_king?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1`. Comprobar GTQ inicial, cambiar a USD y volver a Q; recorrer fotos, seleccionar, volver al catálogo y abrir Mi Selección. Cambiar al plan no reembolsable y verificar que la política y la tarifa permanezcan al regresar.
