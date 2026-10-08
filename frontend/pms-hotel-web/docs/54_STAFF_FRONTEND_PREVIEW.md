# Vista previa local Staff sin Backend

José solicita revisar y terminar el frontend privado mientras BD1/BD3 integran
Backend. Esta herramienta de desarrollo es un incremento del escenario Staff
existente; no implementa autenticación ni modifica AUTH-UNIFIED-01.

## Iniciar

En `frontend/pms-hotel-web`, detener otro servidor del puerto 3001 y ejecutar:

```sh
npm run dev:staff
```

Abrir `http://localhost:3001/dashboard`, sin correo ni contraseña. Desde el menú:
Reservas (`/reservas`), Calendario (`/calendario`) y Habitaciones
(`/staff/habitaciones`). «Nueva reserva» abre `/reservas/nueva`.

El comando inicia Next dev en 127.0.0.1:3001 y pasa al proceso hijo los flags
`NEXT_PUBLIC_STAFF_PREVIEW=true` y `NEXT_PUBLIC_USE_MOCK_API=true`.
No escribe `.env`, cambia credenciales ni configura Docker.
Para volver a la integración real: detenerlo y ejecutar `npm run dev`.
No añadir el flag de preview a Compose, `.env` compartidos ni deployments.

## Separación y límites

- Solo development, flag explícito, mocks activos y hostname local permiten la
  vista previa. Production/test y hosts externos la rechazan incluso con flag.
- Sesión ficticia de presentación SUPER_ADMIN, propiedad GT-HB-01; reutiliza su
  inventario y reservas de escenario. No representa ni copia una cuenta real,
  sus UUIDs, permisos efectivos o memberships de Backend.
- UI → consulta propia → service mock → DTO → mapper existente → modelo Staff.
  Contrato provisional `/__mock/staff-preview/session`; no es una API Backend.
- Cache propia `staff-preview/session`; no publica identidad en `auth/staff/session`.
  No pide password, genera cookies/JWT ni persiste credenciales/identidad.
- Login `/acceso`, Google y BFF no se reemplazan. Un último handler del worker
  bloquea solicitudes `/api/*` sin fixture en preview; no usa Backend como fallback.
  Solo los handlers de datos locales existentes contestan sus rutas conocidas.
- Cerrar sesión cierra el escenario, limpia caches de pantallas Staff y vuelve a
  `/`, sin revocar una cuenta Staff/Guest real ni borrar sus caches de identidad.
  Volver a una ruta privada permite reabrir explícitamente la vista previa.
  Recargar inicia un nuevo escenario; esta herramienta no es un guard de seguridad.
- Reservas creadas localmente se pierden al recargar. Catálogo/otros módulos pueden
  conservar preferencias o datos de escenario según sus mocks existentes; nada se
  inserta en Backend. No acredita disponibilidad transaccional, pagos o Auth reales.

Fuentes: [Auth real](13_AUTH_AND_SESSIONS.md), [mocks](23_MOCK_API.md),
[Staff core](52_PRIVATE_STAFF_CORE.md), [Nueva reserva](53_PRIVATE_STAFF_NEW_RESERVATION.md).

## Comprobación

- Vitest: 17 archivos y 140 pruebas aprobadas de Auth, gates de preview,
  layout privado y regresión del dashboard.
- Lint, TypeScript, build de producción y `git diff --check` aprobados; tipos se verifican
  por separado de build según la configuración existente.
- Chrome sin Backend y sin interceptar/inventar una respuesta BFF: panel,
  administración de inventario, alta de dos stays, detalle y listado aprobados.
  Sin consultas a `/api/auth/staff/*`, cookies Staff ni excepciones de ejecución.
- Formulario y revisión a 320, 390, 540, 768, 1024 y 1440 px sin desbordamientos.
- Logout vuelve al inicio y el GET de la sesión de escenario responde 401.
  La suite de Auth verifica reapertura, caches Guest/Staff reales conservadas,
  modo normal con BFF y production bloqueado aun con flags activos.

No se modificó Backend ni se realizaron commit/push.
