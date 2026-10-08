# Public 02 — Cuenta vinculada

## Alcance

Incremento frontend de `IMP-WEB-0202` autorizado por José: confirmación exclusivamente de Crear cuenta por Google/correo en `/acceso`, rama `feature/web2-linked-account-confirmation`. Iniciar sesión no muestra esta pantalla. Owner WEB-2; reviewer WEB-1. Fuente visual: especificación explícita del usuario, sin Node ID inventado.

Fila consultada del XLSX: `IMP-WEB-0202`, PENDIENTE; depende de `IMP-WEB-0201` COMPLETADA, acceso Guest final, Google opcional, continuar invitado, errores recuperables y retorno a booking/account. El código de sesión/modelos existe y se reutiliza. Esta autorización cubre el incremento de UI y pruebas; no actualiza el backlog ni declara completos la autenticación real por correo o todo Public 02. DoR/DoD y cierre formal conservan la revisión de owner y paridad Figma cuando se aporte una referencia verificable.

## Flujo y composición

- Crear cuenta permanece en Cuenta vinculada; se elimina el salto automático de 900 ms. Un componente `GuestLinkedAccount` recibe `authProvider: 'google' | 'email'` y datos opcionales de presentación. Cambian descripción, badge, método y nota de privacidad.
- Iniciar sesión con correo/Google pasa directamente a `/cuenta`, o a `/mis-reservas`/checkout si se recibió un retorno permitido. Una sesión existente que visita `/acceso` sigue ese mismo flujo directo. No se consulta el resumen de cuenta para una confirmación que no va a mostrarse.
- La pestaña activa del formulario local distingue el recorrido de creación del de login; no se deduce por el proveedor, el correo o el número de reservas. Tras salir de la página y volver con sesión, no se vuelve a presentar el alta como si fuera nueva.
- Header exclusivo de acceso con sesión: solo logotipo. Volver a opciones cierra la sesión Guest; se indica esa consecuencia. Se conservan carga de logout, error/retry, aislamiento Staff y limpieza de caché.
- Ir a mi cuenta → `/cuenta`; Continuar reservando → checkout permitido o `/habitaciones`; Vincular reserva existente → [vista dedicada](51_PUBLIC_02_EXISTING_RESERVATION_LINK.md) en `/cuenta/reservas/vincular`, reutilizando el flujo local de referencia/OTP y su guard Guest. No se implementan nuevos endpoints ni OTP real.
- La composición cliente en `app/(public)/acceso` consume `useAccountSummary` por la API pública de account y pasa información de presentación a auth. Auth no importa account ni añade ciclos; UI no consume DTO ni hace fetch.
- Nombre deriva del perfil vinculado. En modo real se usa exclusivamente el perfil único indicado por el modelo; con cero o varios perfiles se muestra Cuenta de huésped. No se atribuye un perfil principal arbitrario. Estado activo y cantidad de reservas proceden del resumen; ante carga/error no se inventan valores.
- El avatar utiliza iniciales del nombre disponible o un icono genérico. El componente admite foto HTTPS opcional y fallback ante fallo; el contrato actual no proporciona una foto y no se fabrican URLs.
- La autoridad de sesión sigue siendo GuestSessionProvider (`status === 'signed-in'`); no se crea otro authStore ni se mete GuestProfile dentro de GuestAccount.

## Google, correo y checkout

El backend real sigue usando Google OIDC según DEC-B-004. El formulario por correo continúa siendo el prototipo MSW existente. El contrato actual no confirma verificación de email: se muestra Correo conectado; Correo verificado solo se representa si el componente recibe explícitamente esa información. No se promete cifrado de contraseña no implementado.

El cambio en el callback Web es únicamente el destino de éxito: `/cuenta` → `/acceso`, donde una sesión existente se redirige inmediatamente a cuenta o al checkout guardado, sin mostrar Cuenta vinculada. El contrato real no informa si se creó una cuenta nueva; no se inventa ese dato. Intercambio `code/state`, validación Backend y cookies Guest HttpOnly/Secure/SameSite conservan sus reglas. Fallos siguen regresando a `/acceso?error=google`.

El retorno local usa `checkoutReturn` y los parámetros de búsqueda existentes. Antes de salir a Google, se guarda únicamente contexto no sensible en sessionStorage: checkIn, checkOut, adults, children, roomsCount y promoCode, o el path fijo de vinculación añadido en entrega 51. Este path no activa el banner de checkout. Se eliminan parámetros desconocidos y se revalida al leer; no se guardan correo, nombre, documentos, contraseña, tokens ni perfil. El regreso al callback restaura ese destino y redirige automáticamente. En el registro local el retorno sigue siendo una acción explícita de la confirmación. La redirección de login, elegir cuenta/checkout o cerrar sesión desde la confirmación limpian el contexto. Bloqueo de storage no impide autenticación.

En el recorrido local, el carrito y borrador permanecen en los providers existentes. Guardar el retorno de OAuth no persiste el carrito ni datos personales al salir del sitio: recuperar una selección después de un retorno externo depende de la persistencia del módulo booking y no se afirma que esta tarea la implemente. Autocompletar datos reutiliza la acción existente Usar datos de mi cuenta; no sobrescribe el borrador automáticamente.

La vinculación real de reservas desde Web sigue pendiente en el módulo account; esta pantalla dirige al módulo existente y no afirma completar esa integración. No cambia Backend, proveedores, permisos ni contratos de sesión/resumen.

## QA

Probar en `http://localhost:3001/acceso` con `NEXT_PUBLIC_USE_MOCK_API=true`: login Google/correo directo a cuenta/checkout; Crear cuenta por Google/correo con confirmación; regreso a opciones; errores de resumen de registro; menú principal oculto en confirmación; teclado/foco; 320–1440 px. No se necesita crear datos en la BD.

Aceptación: confirmación exclusiva del registro, login directo sin pasos extra, componente dinámico reutilizable, acciones explícitas con rutas seguras, estados loading/error, datos separados de identidad, cero Apple, layout responsive sin clipping.

### Evidencia local inicial — 2026-10-06 (anterior a la corrección del flujo)

- Vitest: 92 pruebas de autenticación/composición/header/callback y 106 de regresión de account, checkout y rutas BFF. Todas pasan; una expectativa antigua de checkout se actualizó a Volver al Checkout conservando la comprobación del destino y las validaciones de autocompletado sin sobrescribir datos manuales.
- `npm run lint`, `npm run build` y `npm run typecheck`: PASS. TypeScript se ejecuta por separado porque el build del proyecto omite ese chequeo.
- Chrome en el servidor local, puerto 3000: Google, correo, registro, navegación explícita, logout, retorno al checkout, restauración del retorno tras navegación externa, resumen con error y bloqueo de destinos externos: PASS. Este recorrido usa MSW; no certifica una autenticación externa real con Google ni email Backend.
- Anchos 320, 390, 540, 768, 1024 y 1440 px: sin desbordamiento horizontal; capturas de escritorio/móvil revisadas. Badge en fila propia en móvil para preservar nombre/correo legibles.
- `git diff --check`: PASS. Scripts y capturas de QA permanecen fuera del repositorio; sin dependencias nuevas, commit ni push.

### Corrección del recorrido — 2026-10-06

José aclaró que la confirmación corresponde únicamente a Crear cuenta. Se separaron login y registro sin cambiar servicios, contratos o credenciales. Las 58 pruebas seleccionadas de composición, acceso, sesión real, retorno, callback y checkout pasan: registro por ambos métodos, login directo, reingreso tras registro, recuperación de un error, cambio de pestaña, limpieza del retorno y bloqueo de redirecciones externas. Se conservan las pruebas de aislamiento Staff, caché Guest y autocompletado que respeta datos manuales.

Chrome local en puerto 3000: login Google/correo directo; registro Google/correo con confirmación estable; reingreso sin repetir confirmación; checkout directo tras login y retorno manual tras registro; contexto guardado validado y eliminado; destino externo rechazado. PASS, sin errores de consola y sin desbordamiento en los seis anchos anteriores. Estos recorridos usan MSW, no credenciales externas reales.

`npm run lint`, `npm run build`, `npm run typecheck` y `git diff --check` vuelven a pasar con el flujo corregido. Sin cambios Backend, dependencias nuevas, commit ni push.
