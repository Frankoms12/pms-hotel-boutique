# Local Demo Dataset

El Compose raíz es un entorno **local de desarrollo/demo**, no un deployment de
producción. Con la configuración habitual del proyecto:

```bash
docker compose --env-file .env up -d --build
```

levanta PostgreSQL, Backend y Web real con el catálogo poblado automáticamente.
No es necesario crear Property, tipos o habitaciones mediante CRUD. Incluye credenciales locales Staff/Guest y conserva Google, BFF y cookies. No cambiar ni
publicar `.env`; usar los requisitos de configuración Auth ya documentados.

## Datos de esta versión

Property `Hotel Boutique Demo`, code `HB-GT-DEMO`, UUID
`3032709f-a48b-300b-b860-1110bc6f1f13`, ACTIVE, GTQ y America/Guatemala.
Pertenece a la organización existente identificada por code `HOTEL_BOUTIQUE`.
El UUID se deriva con `UUID.nameUUIDFromBytes("pms:local-demo:property:HB-GT-DEMO")`
UTF-8. Es infraestructura demo exclusivamente, no una constante de negocio.
Compose lo entrega automáticamente a `NEXT_PUBLIC_PROPERTY_ID` al compilar Web.

| RoomType code | Nombre | Rooms físicas | Tarifa GTQ/noche | Minor units |
|---|---|---|---|---|
| STD | Habitación Estándar | 101–104 | Q650 | 65000 |
| CLASSIC | Habitación Classic | 201–204 | Q650 | 65000 |
| TWIN | Habitación Twin | 301–304 | Q650 | 65000 |
| KING | Habitación King | 401–404 | Q650 | 65000 |
| DLX | Habitación Deluxe | 501–504 | Q850 | 85000 |
| SUITE | Suite | 601–604 | Q1200 | 120000 |

Son 6 RoomTypes y 24 Rooms. No se crean aliases redundantes, RatePlans,
Reservations, ReservationStays, GuestProfiles ni pagos. `DemoRatePolicy` mantiene
la única autoridad temporal del precio; el bootstrap valida sus códigos, no
persiste otra tabla de tarifas. Sin consumo/OOO, una búsqueda vende 4 unidades
por tipo. Para dos noches: 130000/170000/240000 según la tarifa.

## Activación y frontera de producción

La aplicación deshabilita `pms.demo.data.enabled` por defecto. El bean requiere
**ambas** condiciones: perfil Spring `demo` o `dev`, y
`PMS_DEMO_DATA_ENABLED=true`. Incluso con ambas presentes, un perfil `prod` o
`production` bloquea su registro. JUnit no activa automáticamente este dataset.

Compose raíz establece explícitamente el perfil local `demo` y el flag true.
Para deshabilitarlo sin editar archivos:

```bash
PMS_DEMO_DATA_ENABLED=false docker compose --env-file .env up -d --build
```

Para una configuración que bloquee el bootstrap aun con el flag presente:

```bash
PMS_SPRING_PROFILES_ACTIVE=production PMS_DEMO_DATA_ENABLED=false \
  docker compose --env-file .env up -d --build
```

Esto no convierte Compose en un deployment de producción: la seguridad y
configuración productiva tienen sus requisitos propios. Deshabilitar el flag
**no borra datos existentes**. Para otra Property, configurar
`NEXT_PUBLIC_PROPERTY_ID` explícitamente; no hay fallback a precios mock.
`NEXT_PUBLIC_USE_MOCK_API=true` conserva el journey demo/MSW del Web.

## Idempotencia y estado existente

`DemoDataBootstrap` reutiliza el patrón `ApplicationRunner`, en infraestructura
Inventory. Ejecuta una transacción con advisory lock PostgreSQL para serializar
este dataset. Inserta solo lo que falta y resuelve RoomTypes por Property/code.
Los IDs nuevos se derivan del namespace demo y las Rooms del código físico.
Conserva IDs ya existentes por código, habitaciones adicionales y datos manuales.
No borra, renombra ni reinicia inventario, OOO o reservas en cada arranque.

Un conflicto en identidad/configuración de la Property o asignación de un código
de Room provoca fallo explícito y rollback, sin sobrescribir datos. Revisar el
conflicto o deshabilitar el bootstrap; no editar migraciones aplicadas. El esquema
sigue siendo autoridad de Liquibase; estas inserciones están separadas de sus
migraciones de negocio.

## Web y QA

Web usa `PMS_BACKEND_INTERNAL_URL=http://backend:8080` y el UUID suministrado por
Compose; el navegador consulta únicamente el BFF Next. La homepage y el catálogo
muestran nombres, IDs, disponibilidad y minor units reales. Fotografías locales,
fuentes, licencias y atribución están en
[LOCAL_DEMO_IMAGES](../frontend/pms-hotel-web/docs/LOCAL_DEMO_IMAGES.md).
Las galerías son ilustrativas; no otorgan capacidad, camas ni precios.

El carrito del Header conserva búsqueda, Property, IDs/planes/cantidades y
snapshots de presentación en `sessionStorage` por modo. Reconsulta Backend para
ATS y precio: storage no es autoridad. No guarda Guest, documentos, tokens ni
cookies; si storage está bloqueado mantiene navegación en memoria. Recarga y
redirect/regreso en la misma pestaña conservan el carrito cuando el navegador
conserva esa sesión. El formulario Guest sigue solo en memoria.

El journey real llega a Pago y garantía; la confirmación final sigue bloqueada
hasta el contrato de booking/pago de Juan. No se simula Reservation persistida.
Para Google usar este stack completo: una comprobación de la primera redirección
no demuestra exchange, callback, cookies HttpOnly ni retorno completos. Alan debe
hacer ese recorrido manual sin publicar state/codes/tokens/cookies.

## Ampliación futura y pruebas

El dataset se ampliará conforme se integren módulos con contratos aprobados:
GuestProfiles, Reservations/ReservationStays, vínculos, estados operativos y
housekeeping. No agregarlos por anticipado ni copiar contratos de mocks.
Extender este mismo bootstrap con IDs/códigos demo claros, relaciones reales,
idempotencia y pruebas de reparación parcial. No crear seeds paralelos,
migraciones productivas demo ni borrados en startup.

JUnit/Vitest mantienen fixtures propios. El PostgreSQL efímero de pruebas se
levanta mediante `backend/compose.bd2-test.yaml`, separado del volumen del stack.
Las pruebas del bootstrap crean su propio dataset transaccional y hacen rollback;
ningún otro test depende del catálogo integrado. No usar el volumen demo como
fixture de CI.

Estado al registrar la entrega técnica: **EN_QA**. Cierre manual posterior: ver el registro final al pie.

### Correcciones de QA público (2026-10-06)

Las galerías activas usan diez fotos Pexels locales sin obligación de atribución
visible, con tres vistas por código. Las referencias Commons anteriores y sus
atribuciones se conservan como historial sin uso en la UI; ver la guía de imágenes.
El Header es el único control de carrito, con contador SUM(quantity). Conserva
la búsqueda aceptada y navega al catálogo con ella. Los cambios de criterios se
consultan y validan antes de confirmar: ninguna línea se muta si falta inventario
o falla Backend, y un éxito reemplaza todos los precios/ATS por los nuevos valores.
Checkout real hidrata desde el mismo resumen propio de Account; no requiere que
exista un GuestProfile único para reconocer una sesión válida. Este ajuste no
implementa booking/pago real ni sustituye el QA manual final.

## Evidencia técnica de esta entrega (2026-10-06)

- Backend: 10 pruebas focalizadas y `mvn -B --no-transfer-progress verify`,
  459 pruebas PASS, sin errores ni omisiones, con Java 21 y DB efímera separada.
- Web: focalizados 278 PASS / 34 archivos; límites HTML Guest 5 PASS;
  suite completa 1212 PASS / 233 archivos. Typecheck, lint y build real PASS.
- Compose config y build integrado PASS; PostgreSQL, Backend y Web healthy.
  Consulta al BFF real: seis ofertas GTQ, ATS=4, tarifas y totales de dos noches
  correspondientes a la tabla anterior.
- Firefox contra ese stack: homepage, habitaciones, detalle, selección, datos,
  review y payment a 1440/1024/768/375/320 px, sin overflow horizontal.
  Range con teclado PASS; IDs/selección y total Backend llegan a Payment,
  cuyo submit final permanece deshabilitado.
- Google start integrado: redirección 307 al proveedor. Callback, exchange,
  cookies HttpOnly y regreso completo requieren QA manual; no se ejecutó OAuth.
- `git diff --check` PASS. Sin commit, push ni merge.

El stack integrado queda disponible en `http://localhost:3001` para el QA manual;
estas comprobaciones automáticas no sustituyen su aprobación.

### QA de búsqueda y nombres (2026-10-06) — EN_QA

El Header «Habitaciones» regresa al catálogo Home `/#habitaciones`, preservando
los criterios válidos aceptados en query. Resultados y detalle comparten editor
con foco en fechas y revalidación atómica de todas las selecciones. Si falla una
línea o Backend, no cambia scope, criterios ni precios anteriores. Home también
sincroniza queries antiguas con un carrito activo.

El resumen real Guest no incluye nombre Google ni picture: nombres/apellidos
solo proceden de un GuestProfile único activo asociado. Sin ese perfil se completa
el email y se solicitan nombres manuales, sin inventarlos ni modificar OAuth.
El stack mantiene los mismos datos demo y Payment real final bloqueado.


## Cierre final — Demo Bootstrap Docker y Web pre-submit (2026-10-06)

**Demo Bootstrap Docker: COMPLETADA — QA manual PASS.** **Web Public Availability
real: COMPLETADA — QA manual PASS.** **Public booking journey pre-submit:
COMPLETADA — QA manual PASS.** Alan confirmó el stack Docker integrado, catálogo
real de seis RoomTypes, galerías, carrito global/persistencia, filtros, edición de
fechas y huéspedes, revalidación atómica, navegación Header → catálogo Home, Guest
Google session/account según contrato, Guest checkout, Review y llegada a Payment.
La confirmación final queda bloqueada correctamente.

El resumen Guest Account solo permite prellenar firstName/lastName si existe un
GuestProfile asociado; no se afirma que Google entregue nombres sin ese perfil.

**Pendiente / fuera de scope, a cargo de Juan:** `POST /api/v1/public/bookings`,
PaymentGateway simulado Backend, persistencia Reservation/ReservationStay,
confirmationCode e idempotencia booking. No se crea ni simula una reserva final.
Este registro sustituye EN_QA previo y conserva su evidencia histórica.

## Credenciales DEMO — AUTH-UNIFIED-01

Exclusivamente desarrollo/demo, sin secretos productivos:

| Contexto | Correo electrónico | Contraseña sintética local | Destino |
| --- | --- | --- | --- |
| Staff RECEPCION | staff.demo@example.test | PmsDemoLocal2026! | /dashboard |
| Guest | guest.demo@example.test | PmsDemoLocal2026! | /cuenta |

`DemoDataBootstrap` inserta una StaffUser con membership RECEPCION y scope de la
Property demo; mantiene username interno `pms_demo_reception` solo para display/audit.
GuestAccount separado, con guest_password_credentials (solo hash BCrypt(12)).
No GuestProfile ni identidad Google ficticia. Ambas cuentas usan IDs demo estables;
reiniciar conserva ID/hash/estado/memberships existentes y no resetea contraseñas.
Conflictos de email/ID/rol fallan sin sobrescribir cuentas. Bootstrap SUPER_ADMIN
opt-in previo es independiente y conserva sus datos; su login ahora usa work_email.

Se aplican las mismas condiciones perfil dev/demo + flag y exclusión prod/production.
Deshabilitar demo no crea nuevas cuentas/credenciales ni borra las anteriores.
Google real autentica una identidad externa independiente; no asignar contraseñas
por coincidencia de correo ni convertir Guest a Staff.
Registro público y recuperación/cambio de contraseña/MFA siguen fuera de alcance;
solo cuentas Guest previamente provisionadas con credential admiten password login.
