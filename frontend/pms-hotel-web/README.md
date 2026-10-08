# PMS Hotel Boutique — Web

Una aplicación Next.js con App Router para Web Pública y Web Privada.

## Sprint 0

- npm y `package-lock.json`
- TypeScript strict y alias `@/* -> src/*`
- Route Groups `(public)` y `(private)`
- CSS Custom Properties desde el handoff de tokens Figma
- `fetch` técnico, TanStack Query, MSW, Vitest, Testing Library y ESLint boundaries
- Playwright diferido hasta `IMP-WEB-1001`

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```

## Rutas técnicas

- `/` usa el shell público.
- `/dashboard` usa el shell privado.

No son pantallas funcionales ni sustituyen el handoff Figma.

## Arquitectura

Las features deberán respetar `Service -> DTO -> Mapper -> Domain -> Hook/State -> UI`. Solo Services realizan requests; UI no recibe DTOs ni importa mocks directamente.

Los module shells son ownership y API pública futura. No contienen feature code ni autorizan imports internos cross-module.

## Entorno

```dotenv
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_API_BASE_URL=
```

No agregar secretos ni tokens de sesión al frontend.

## Checkout público

Inicio → catálogo → detalle → selección → datos del huésped → revisión final → pago → confirmación.
Usar `npm run dev` y abrir `http://localhost:3001`.
Seleccionar primero una habitación con fechas futuras. El borrador se conserva
durante la navegación; recargar descarta carrito y datos personales. La vista
de pago permite ahora una garantía y confirmación simuladas, sin cobros ni reservas reales.
Detalles y validación en [Datos del huésped](docs/42_PUBLIC_BOOKING_GUEST_DATA.md).

«Mis reservas» permite probar acceso Google simulado, vinculación mediante
referencia/código y listado/detalle únicamente de reservas vinculadas.
Instrucciones y límites en [Reserva como invitado y Mis reservas](docs/43_PUBLIC_GUEST_RESERVATION_LINK.md).

El Paso 3 permite revisar estadía, contacto, solicitudes y desglose antes del pago.
Los enlaces de edición conservan la búsqueda y los datos del borrador.
Detalles en [Revisión final](docs/45_PUBLIC_BOOKING_FINAL_REVIEW.md).

El Paso 4 incluye tarjeta de prueba aislada, garantía de una noche, revalidación
y confirmación ficticia. Casos de aprobación/rechazo/error y límites en
[Pago y garantía](docs/44_PUBLIC_BOOKING_PAYMENT_GUARANTEE.md).

La confirmación permite copiar referencia, imprimir/guardar PDF y descargar
calendario (.ics). El error conserva los datos para reintentar; volver al inicio
limpia el carrito y borrador. Detalles en [Resultado de reserva](docs/46_PUBLIC_BOOKING_OUTCOME.md).

El Paso 4 permite abono de una noche, 50%, monto personalizado o pago total,
con validaciones de tarjeta por campo en el simulador aislado. Detalles en
[Modalidades de pago](docs/47_PUBLIC_BOOKING_PAYMENT_MODES.md).

Los precios públicos inician en quetzales y permiten cambiar a dólares. La
garantía personalizada incluye su propio selector Q/USD, que convierte el
importe ingresado y sus límites usando la referencia de demostración existente.

Public 01 utiliza [textos finales para clientes](docs/48_PUBLIC_BOOKING_CUSTOMER_COPY.md).
Los avisos y controles de simulación ya no aparecen en las rutas públicas;
los servicios siguen en modo mock hasta integrar Backend/PSP.

## Backlog y reglas

El backlog canónico es `../../docs/Backlog_Implementacion_PMS_V1.xlsx`. Antes de una tarea, leer `AGENTS.md`, la fila del backlog y los documentos indicados.
