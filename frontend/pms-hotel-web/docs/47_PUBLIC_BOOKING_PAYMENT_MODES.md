# Public 01 — Paso 4: modalidades y validación de tarjeta

Integración real vigente: [submit J6](52_PUBLIC_BOOKING_J6_SUBMIT.md). Las
modalidades parciales y tarjeta de prueba siguen disponibles solo en modo
mock; el submit real usa SIMULATED_CARD por el total GTQ.

Actualización de presentación: [textos finales para clientes](48_PUBLIC_BOOKING_CUSTOMER_COPY.md). Los controles de simulación ya no se muestran en rutas públicas; los límites técnicos descritos aquí se conservan.

## Alcance autorizado

Refactor frontend pedido por José: tarjetas radio, monto de garantía configurable y errores por campo. Relacionado con IMP-WEB-0110/0111, WEB-1/WEB-3 y revisión WEB-4 por pagos. Dependencias formales del backlog, revisión de owners y política productiva siguen pendientes; no se cambia el XLSX. No hay nuevas dependencias, contratos Backend, BFF ni procesamiento financiero real.

## Modalidades y montos

- Pago total; garantía de una noche (predeterminada); 50%; personalizado entre una noche y el total. Para US$505 y tres noches: US$168.33, US$252.50 o el monto personalizado. El saldo siempre es total menos abono, en centavos enteros.
- `PaymentChoice` y `chosenPayment` concentran selección y validación. El provider conserva la elección para la misma propiedad/búsqueda/cotización, incluso al navegar a error y regresar. Un cambio de cotización invalida esa elección y exige revisión. Un resultado incierto bloquea cambiar tarjeta/modalidad y conserva la misma clave/payload para reintentar.
- Personalizado acepta coma o punto decimal, hasta dos decimales; rechaza vacíos, exponentes, valores no seguros o fuera del rango. Es un input decimal de texto para evitar la semántica de exponentes del input number. Por decisión posterior de José, el flujo público inicia en GTQ; el monto personalizado incluye selector Q/USD, convierte el importe y sus límites, y normaliza el abono a los centavos/moneda originales de la cotización antes de enviarlo. El selector general conserva su función de presentación y no reinterpreta lo escrito en el input.
- La conversión reutiliza la referencia fechada del documento 40; es una simulación, no una tasa de liquidación real. Al alternar la moneda del input se conserva un ancla de los centavos cotizados, validada contra el valor mostrado, para evitar deriva de redondeo. Editar el número elimina ese ancla y recalcula. Para una estadía de una noche, la UI explica que mínimo y máximo equivalen al total.
- El 50% queda deshabilitado cuando está por debajo de una noche, por ejemplo una estadía de una sola noche.
- «Pagar en el hotel» se muestra deshabilitado: no existe una política pública confirmada ni una respuesta sin garantía en el contrato vigente. Habilitarlo requiere política de propiedad y contrato de confirmación sin cobro; no se fabrica una captura de cero ni se asume permiso de recepción.
- El simulador MSW valida el total cotizado y el abono entero dentro del rango permitido. El mapper existente exige la captura simulada por ese importe y el saldo exacto antes de mostrar éxito. No se flexibilizan sus assertions ni se omite la revalidación ATS/tarifa.

## Tarjeta y mensajes

«Usar otra tarjeta de prueba» es un botón contorneado con icono, foco y hover oliva. El selector de aprobación/rechazo/pasarela tiene badge «Simulador de pruebas». Datos resumidos: titular, marca y máscara/last4, nunca PAN completo/CVV.

El formulario sigue dentro de un iframe de origen opaco con CSP sin red, almacenamiento ni form-action. Tiene `errors`/`touched` internos, validación en blur y mientras se corrige un campo visitado; en submit valida todos y enfoca el primer error. Mensaje específico por campo, `aria-invalid`, `aria-describedby`, borde rojo de 2 px, foco rojo suave y borde oliva válido. Número y expiración se formatean; los badges indican la marca detectada.

Solo se aceptan los números sintéticos documentados en el documento 44, con fecha vigente, nombre de tres caracteres o más y código de prueba correspondiente. Amex tiene 15 dígitos y CVC de cuatro; Visa/Mastercard, 16 y tres. El alto del iframe se comunica mediante un mensaje de tamaño validado para evitar cortar errores en móvil. Únicamente metadata tokenizada y dimensiones salen del iframe: no hay datos sensibles en React, DTO, URL o almacenamiento. No es un PSP certificado.

El resumen es sticky a 96 px en escritorio y fluye en móvil. Los controles se bloquean durante el envío. Las condiciones de cancelación siguen procediendo de cada RatePlan; no se promete «72 horas gratis» para tarifas no reembolsables ni «encriptación de 256 bits» sin proveedor real confirmado.

## Prueba manual y validación

Puerto 3000, mocks habilitados. Completar selección → datos → revisión → pago; alternar total, noche, 50% y personalizado. Probar monto inferior/superior al límite, corregirlo y comprobar saldo. Rechazar tarjeta y regresar: la elección se conserva. Abrir formulario; enviar vacío, corregir campos y usar Visa/Mastercard/Amex ficticias. Confirmar y comparar importe/saldo con la pantalla final.

Validación local: 47 pruebas distintas en 11 archivos de checkout, gateway y contrato de confirmación: PASS. Incluyen los tres montos nuevos con captura/saldo exactos, límites del monto personalizado, rechazo de abonos inválidos en MSW, tarifa/ATS, mocks desactivados, multi-room, idempotencia y conservación del 50% al perder respuesta y regresar desde error.

ESLint, TypeScript estricto y build de producción con mocks: PASS. Chrome en el puerto 3000: modalidades y montos dinámicos, inválido/corregido personalizado, rechazo/error recuperables, formato de Visa/Mastercard/Amex, errores por campo, foco automático, tokenización sintética, doble clic, confirmación, PDF/calendario y limpieza del borrador: PASS. Sin errores de consola, solicitudes Backend ni PAN/CVV en requests/almacenamiento. Sin overflow horizontal a 320, 390, 768, 1024 y 1440 px; revisadas capturas del pago y formulario en escritorio/móvil. Helpers y capturas permanecen en TEMP, fuera del repositorio.

Esta evidencia no equivale a CI remoto, certificación PSP ni revisión del equipo.

Actualización GTQ inicial y entrada convertible: regresión de Booking/Checkout, 141 pruebas distintas. Tras adaptar las expectativas que comprobaban USD inicial, las reejecuciones focalizadas de catálogo/revisión/pago pasan; se conservan comprobaciones USD explícitas, límites, importes enviados en moneda cotizada y ancla de redondeo. TypeScript, ESLint y build final: PASS. Chrome confirma GTQ inicial, cambio a USD y retorno, personalizado Q2294.32 ↔ US$300.25, límites y saldo, conservación de datos/reintentos, confirmación en Q y ausencia de errores/Backend/PAN/CVV. Revisadas capturas desktop/móvil; sin overflow a 320, 390, 768, 1024 y 1440 px. No se actualiza la tasa fechada ni se afirma una cotización de cambio en vivo.
