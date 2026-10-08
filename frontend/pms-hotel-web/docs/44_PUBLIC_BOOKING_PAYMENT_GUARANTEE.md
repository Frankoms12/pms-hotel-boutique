# Public 01 — Pago, garantía y confirmación de demostración

Integración real vigente: [submit J6](52_PUBLIC_BOOKING_J6_SUBMIT.md). Las reglas
de demostración siguientes aplican al modo mock; el modo real utiliza el total
GTQ y SIMULATED_CARD del contrato Backend.

## Alcance y fuentes

José autoriza únicamente frontend: «Pago y garantía» y navegación hacia una confirmación simulada, conservando checkout como invitado. La revisión intermedia autorizada posteriormente (documento 45) convierte el pago en el Paso 4. Se reutilizan los contratos provisionales de Payments y el draft en memoria de Checkout. Backlog relacionado: IMP-WEB-0109/0110/0111/0112, owners WEB-4/WEB-1/WEB-3 y reviewers correspondientes. Dependencias formales, contrato productivo, revisión de equipo y Figma siguen pendientes; no se cambia el XLSX ni se declara integración Backend completa.

La vista anterior de handoff se sustituye por esta demostración. No se toca Backend, BFF, credenciales, proveedores ni dependencias. GuestAccount no se crea ni vincula automáticamente; una confirmación contiene una Reservation de ejemplo con N identificadores de ReservationStay.

## Comportamiento

- `/reserva/checkout/pago` exige selección vigente, datos aprobados del Paso 2 y revisión de la cotización del Paso 3. «Volver a revisión» conserva el borrador y la búsqueda; «Editar mis datos» regresa al formulario. La tarjeta toma el nombre de su responsable.
- Resumen dinámico para una o varias habitaciones, fechas, adultos/niños y noches. El total incluye el desglose estimado recibido, sin inventar impuestos cuando faltan.
- Regla **ilustrativa autorizada**: una noche de garantía = total estimado / noches, redondeada a centavos. Es el valor predeterminado; el refactor del documento 47 añade pago total, 50% y monto personalizado entre esa noche y el total. El restante es la diferencia exacta. US$505 / 3 → US$168.33 y US$336.67. No es una política de hotel productiva. Cotizaciones incompletas o con monedas mezcladas bloquean la confirmación.
- USD/GTQ reutiliza la conversión referencial existente, solo para visualización; no cambia la moneda ni el importe base enviados al simulador.
- Antes de enviar, se consulta nuevamente disponibilidad y se compara tarifa, total, condiciones, fechas, propiedad y selección. Cambios impiden confirmar hasta revisión. La consulta no retiene inventario ni reemplaza admisión transaccional real.
- El envío tiene bloqueo inmediato de clics repetidos, loading, cancelación al salir y reintento explícito. Una misma solicitud conserva su clave en el provider de Checkout incluso al navegar a error y volver; MSW devuelve el mismo resultado para clave/payload idénticos y 409 para otra carga. Ver documento 46 para manejo de respuesta perdida.
- El simulador comprueba cotización y ATS de los fixtures; construye garantía CAPTURED y Reservation en una respuesta atómica de demostración. No consume inventario real, no llama PSP y no crea persistencia ni correo.
- `/reserva/confirmacion` solo muestra el resultado recibido y validado de esta sesión. Visitar directamente, cambiar búsqueda o recargar muestra vacío; volver al pago tras éxito no repite la garantía. Las reservas vinculables de «Mis reservas» siguen siendo ejemplos independientes, explicados en la confirmación.
- Los fallos navegan a `/reserva/error`, nunca a confirmación. Conservan intención, huésped y tarjeta de prueba; permiten resolver el mismo intento o revisar la selección, según su causa. «Volver al inicio» limpia el borrador de reserva y carrito.

## Tarjeta aislada

La tarjeta resumida usa únicamente token ficticio, titular, marca y últimos cuatro dígitos. «Usar otra tarjeta de prueba» abre un iframe `srcDoc` controlado, `sandbox="allow-scripts allow-forms"` sin `allow-same-origin`, CSP sin red/form-action y sin almacenamiento. `allow-forms` permite el evento local de validación; el handler cancela la navegación y CSP bloquea cualquier envío. El formateo de número y expiración, detección visual de marca y validación de datos ficticios ocurren dentro del iframe. PAN completo/CVV no entran en React, DTOs, URL, transporte ni almacenamiento del PMS. Se borran los campos ficticios al generar token y se desmonta el iframe.

Mensajes se restringen al `contentWindow`, origen opaco y canal de esa instancia; se admite exclusivamente metadata de tokens conocidos. No es tokenización ni aislamiento certificado de un PSP real. No se afirma PCI-DSS Compliance ni «SSL de 256 bits»; el badge comunica certificación del proveedor pendiente. La política de cancelación se toma de cada RatePlan, evitando prometer 72 h gratis para tarifas no reembolsables.

Datos **sintéticos de prueba**:

| Marca | Número ficticio | CVC ficticio |
| --- | --- | --- |
| Visa | 4242 4242 4242 4242 | 123 |
| Mastercard | 5555 5555 5555 4444 | 123 |
| Amex | 3782 822463 10005 | 1234 |

Expiración futura (ejemplo 12 / 35). Nunca ingresar una tarjeta real. Selector de demostración: aprobación, rechazo de tarjeta o error de pasarela; no requiere editar números para provocar fallos.

## Contrato MSW provisional

POST `http://pms.test/__mock/checkout/confirmations`; no es un endpoint Backend aprobado. Service usa el transporte existente y rechaza antes de hacer HTTP si los mocks están desactivados. Request: scope/fechas, ocupación, selección de RoomTypes/RatePlans/cantidades, totales en centavos, metadata tokenizada sintética y contacto mínimo del responsable. Header `Idempotency-Key`. Sin PAN/CVV/secretos.

Response: referencia, propiedad, fechas, timestamp UTC, estado CONFIRMED de ejemplo, stays con IDs distintos, desglose en centavos y DTO de garantía existente. Mapper valida correlación de propiedad/fechas/stays, saldo exacto, moneda y garantía CAPTURED por el importe esperado antes de permitir navegar al éxito. Se conservan Service → DTO → Mapper → Domain → Hook → UI y APIs públicas entre módulos.

## Prueba manual

Con mocks habilitados: `npm run dev -- --port 3000`. Inicio → búsqueda → selección → datos del huésped → revisión final → pago. Comprobar montos, ida/vuelta y cambio de moneda; probar rechazo/error y después aprobación. Abrir tarjeta de prueba, verificar formato/error y confirmar. Revisar una sola referencia con todas las estadías; recargar y comprobar que no se inventa una confirmación.

## Límites de entrega

Persistencia, correo/OTP real, integración Google/PSP, idempotencia duradera, autorización, políticas definitivas, admisión atómica y ocupantes explícitos por Stay continúan siendo trabajo de integración posterior. Los IDs y cobros son ficticios. Esta entrega no integra automáticamente la referencia simulada con los mocks de historial previos.

## Evidencia local

- 24 pruebas de Checkout, gateway aislado y contrato/mapper de confirmación: PASS. La prueba del iframe se repite tras ajustar `allow-forms`: PASS.
- 150 regresiones de Booking, Availability y mapper de Payments: PASS. Total: 21 archivos / 174 pruebas distintas.
- ESLint, TypeScript estricto y build de producción con mocks: PASS. El chequeo de tipos se ejecuta aparte del build.
- Chrome: guest sin cuenta, regreso a datos, garantía/saldo, rechazo y error recuperables, formato/validación de tarjeta dentro del iframe, confirmación, doble clic sin duplicar, ausencia de PAN/CVV en transporte, storage vacío y guard al recargar: PASS.
- Pago y confirmación sin overflow horizontal a 320, 390, 768, 1024 y 1440 px. Capturas revisadas; helpers/logs fuera del repo, en TEMP. Sin errores de consola o ejecución en el recorrido final.

Esta evidencia es local, no confirma GitHub CI, revisión de owners ni una certificación de seguridad productiva.
