# Cómo probar BD2 y usar Postman

## Pruebas automáticas

Con Java 21 y PostgreSQL 17 accesible, desde `backend`, configurar
`PMS_DATABASE_URL`, `PMS_DATABASE_USERNAME` y `PMS_DATABASE_PASSWORD` para una
base exclusiva de pruebas; ejecutar `./mvnw -B verify` (PowerShell:
`.\mvnw.cmd -B verify`). No apuntar esta suite a la base operativa: incluye
fixtures y pruebas de migración/rollback.

La alternativa aislada desde la raíz, sin Java instalado ni puertos publicados:

```powershell
docker compose -p pms-bd2-qa -f backend/compose.bd2-test.yaml run --rm verify ./mvnw -B verify
docker compose -p pms-bd2-qa -f backend/compose.bd2-test.yaml stop postgres
```

Ejecuta todas las pruebas y empaqueta el backend con Java 21/PostgreSQL 17.
No usa el contenedor ni el volumen de la base de la aplicación.

## Qué se puede probar por HTTP

Sí, Postman permite login Staff, sesión/scope, consulta ATS y respuestas
400/401/403/404. Importar `../postman/BD2-Inventory.postman_collection.json`.

Esta rama incluye APIs C/R/U de Properties, RoomTypes, Rooms y RatePlans,
descritas más abajo. No existe aquí un controlador REST de booking; la creación
de reservas y admisión concurrente se prueban mediante servicios Java.
No usar un supuesto `POST /reservations`.

## Requisitos del runtime

La cadena RoomTypes → Rooms → RatePlans parte de main e incluye las migraciones
BD3 y las tablas reservations/reservation_stays necesarias para ATS. Levantar
la rama que contenga la entrega deseada; Liquibase aplica el esquema. No crear
esas tablas manualmente ni incorporar fixtures de BD3 para ocultar errores.

Debe existir un Staff provisionado con `RESERVATION_MANAGE` o
`COMMERCIAL_MANAGE` y acceso a la propiedad. Se puede usar un SUPER_ADMIN local
provisionado por las variables `PMS_BOOTSTRAP_ADMIN_USERNAME`,
`PMS_BOOTSTRAP_ADMIN_EMAIL`, `PMS_BOOTSTRAP_ADMIN_PASSWORD` antes de levantar
el backend. Son valores propios de desarrollo, fuera de Git; no hay registro
público Staff. El bootstrap no cambia la contraseña de un usuario existente.

## Acceso local desde Postman Desktop

El Compose raíz publica Web en 3000 y mantiene Backend interno; el puerto 3000
no es la URL directa de esta API. Para la prueba local, crear este override
temporal fuera del repositorio desde PowerShell:

```powershell
$postmanOverride = Join-Path $env:TEMP 'pms-bd2-postman.override.yaml'
@'
services:
  backend:
    ports:
      - "127.0.0.1:18080:8080"
'@ | Set-Content -LiteralPath $postmanOverride
docker compose -f compose.yaml -f $postmanOverride up -d --build postgres backend
```

La publicación temporal queda limitada a loopback. No modifica `compose.yaml`,
no publica PostgreSQL y no se incorpora a despliegue. Para volver al Compose
habitual al terminar:

```powershell
docker compose -f compose.yaml up -d --no-deps --force-recreate backend
Remove-Item -LiteralPath $postmanOverride
```

Swagger: `http://127.0.0.1:18080/swagger-ui/index.html`.
Health: `http://127.0.0.1:18080/actuator/health`.

## Datos mínimos de desarrollo

Crear datos mediante Properties → RoomTypes → Rooms usando las colecciones
incluidas. Properties guarda createdPropertyId: copiarlo a propertyId del
environment; RoomTypes guarda roomTypeId. También puede usarse la propiedad demo
autorizada `3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d`. Ya no es necesario insertar
tipos/habitaciones manualmente. Un tipo nuevo sin Rooms tiene ATS=0; con una
Room y sin stays consumidores/OOO en esas noches, ATS=1. OOS no resta inventario.

## Secuencia Postman

Crear un environment privado y completar `baseUrl` (`http://127.0.0.1:18080`),
`staffEmail` y `staffPassword` con el usuario local. Mantener credenciales y
tokens como valores privados; no exportar ni compartir un environment poblado.
La colección no contiene contraseñas ni JWT reales.

1. **Login Staff:** `POST {{baseUrl}}/api/v1/staff-auth/sessions`, body JSON
   `{"email":"{{staffEmail}}","password":"{{staffPassword}}"}`.
   Esperar 201; el script guarda `accessToken` en `staffAccessToken` del environment.
2. **Sesión Staff:** esperar 200 y revisar `permissions` y `memberships`.
   Usar una propiedad autorizada como `propertyId`.
3. **Disponibilidad:** el Bearer Token es `{{staffAccessToken}}`:

   ```text
   GET {{baseUrl}}/api/v1/properties/{{propertyId}}/availability
       ?roomTypeId={{roomTypeId}}&arrival={{arrival}}&departure={{departure}}
   ```

   Usar roomTypeId generado por RoomTypes; fechas de ejemplo:
   `arrival=2026-11-01`, `departure=2026-11-03`.
   Esperar 200 con IDs, fechas locales y `availableUnits` entero no negativo.
4. Ejecutar las solicitudes negativas: sin token o token inválido → 401;
   propiedad ajena → 403; arrival=departure → 400;
   tipo inexistente dentro de una propiedad autorizada → 404.

Para 403 por propiedad, `unauthorizedPropertyId` debe ser un UUID no autorizado
al Staff; no usar SUPER_ADMIN con otra propiedad activa de su organización.
Un JWT Guest tampoco autoriza este endpoint Staff. Un token revocado debe dar
401 en la siguiente consulta.

## Límites de Fase 5

Consultar ATS=0 es 200, no `InventoryExhaustedException`. Esa excepción pertenece
a la admisión de escritura, no al GET. Postman no verifica por sí solo bloqueos,
atomicidad o rollback; usar la suite PostgreSQL para esos casos.

BD3 conectó el booking al puerto de admisión en `faa7876`, integrado en main
`345481b`, y corrigió sus fixtures. La suite `InventoryBookingIntegrationTests`
ejecuta ese servicio real con todas las migraciones: consumo, demanda conjunta,
rollback y concurrencia. Ver `13_BD2_INVENTORY_ADMISSION_CONTRACT.md` para el
protocolo y sus límites: otros escritores que aumenten demanda o reduzcan
capacidad deben participar en el mismo bloqueo; no se garantiza sobreventa cero
para rutas que lo evadan.

## Properties: contrato aprobado BD2-006B

Importar también `backend/postman/BD2-Properties.postman_collection.json` y usar
el mismo environment privado (`baseUrl`, `staffEmail`, `staffPassword`).
Ejecutar en una base de pruebas con SUPER_ADMIN y los permisos `STAFF_MANAGE`,
`MULTI_PROPERTY_READ` y `COMMERCIAL_MANAGE`. La colección genera un código único,
crea una propiedad y guarda su ID; no requiere insertar Properties manualmente.

La secuencia comprueba alta 201/Location, scope actualizado, consulta, edición
de nombre, PATCH repetido sin cambios, código duplicado 409, campos rechazados
400, acceso sin token 401 y logout/revocación reales. El logout final exige
nuevo login para seguir usando la sesión. La propiedad creada se conserva; esta entrega no
define DELETE, baja/reactivación ni edición de timezone/moneda. Cada ejecución
genera una propiedad nueva. Los negativos de rol, scope, Guest, revocación,
auditoría, bloqueo y rollback se verifican también en las pruebas Java.

Rutas disponibles: `POST/GET /api/v1/properties` y
`GET/PATCH /api/v1/properties/{propertyId}`. PATCH admite exclusivamente `code`
y/o `name`. Swagger muestra los DTOs, permisos, Bearer y respuestas; acceder a
`{{baseUrl}}/swagger-ui.html`. La organización del POST viene de la sesión,
nunca del body. Los timestamps se devuelven en UTC.

Para repetir solo las pruebas de este incremento, desde `backend`, con Java 21
y PostgreSQL 17 configurado mediante `PMS_DATABASE_*`:

```sh
./mvnw -B -Dtest=PropertyApiIntegrationTests,PropertyAuditRollbackIntegrationTests,PropertyHttpSecurityIntegrationTests test
```

Esta comprobación enfocada no sustituye `./mvnw -B verify` ni cambia la selección
del workflow. Ejecutar el verify completo antes de publicar.

## RoomTypes

Importar `backend/postman/BD2-RoomTypes.postman_collection.json`. Reutilizar el
environment privado y configurar `propertyId` con una propiedad autorizada.
La colección hace login Staff y prueba POST, lista, consulta, PATCH, repetición
sin cambios, campo inmutable 400 y código duplicado 409. Requiere
`COMMERCIAL_MANAGE` para escribir; no contiene credenciales ni JWT reales.
Ejecutar solo en QA: conserva el tipo creado y no añade habitaciones.

Las pruebas Java `RoomTypeApiIntegrationTests`,
`RoomTypeAuditRollbackIntegrationTests` y `RoomTypeHttpIntegrationTests`
comprueban además scope/permisos/Guest/revocación, ATS sin inventario, referencias
físicas y tarifas, auditoría y rollback real, así como timestamps entre requests.
La colección fue ejecutada con Newman: 8 solicitudes y 11 assertions PASS.
El verify completo sigue siendo obligatorio.

## Rooms

Importar `BD2-Rooms.postman_collection.json` con el mismo environment privado.
Configurar `propertyId` y `roomTypeId` existente en esa propiedad (por ejemplo,
el tipo generado por la colección RoomTypes). Requiere `COMMERCIAL_MANAGE`.
Alta: roomTypeId/código; PATCH: solo código. La colección crea una habitación
física y la conserva, por lo que aumenta capacidad en QA. No ejecutar en producción.
Prueba alta, lista, lectura, edición, no-op, campos inmutables y duplicado 409.
No valida por sí sola concurrencia ni rollback: las pruebas Java cubren esos casos.
No hay DELETE, cambio de tipo/propiedad ni status de Room.

## RatePlans

Importar `BD2-RatePlans.postman_collection.json`. Usar el mismo environment con
`propertyId` y `roomTypeId` autorizados; Staff con `COMMERCIAL_MANAGE`.
El precio es un objeto con `amount` como texto decimal y `currency` ISO:
`{"amount":"125.50","currency":"GTQ"}`. No usar números JSON ni floats.
La colección crea una tarifa, comprueba lectura/lista, edición de precio/nombre,
no-op, campos inmutables y duplicado 409. Conserva la tarifa en QA; no añade Rooms.
La precisión monetaria, rechazo de redondeo/overflow/negativos, scope y rollback
se verifican en Java con PostgreSQL. Las tres clases RatePlan*IntegrationTests
incluyen HTTP real y auditoría. No se modifican precios históricos de reservas.

Secuencia de pruebas manuales: Properties → RoomTypes → Rooms → RatePlans.
Después de Properties, copiar `createdPropertyId` a `propertyId`; RoomTypes
guarda `roomTypeId`. Las colecciones de catálogos hacen su propio login.
Ver contratos 16/17/18 y Swagger para los cuerpos/respuestas completos.

## Validación de cierre BD2-010 (2026-10-02)

Main `345481b` con las correcciones BD3: `./mvnw -B verify`, BUILD SUCCESS,
248 tests sin fallos, errores ni omisiones. La rama de cierre añade seis
regresiones de booking real: verify completo BUILD SUCCESS, 254 tests,
0 failures, 0 errors, 0 skipped, con Java 21/PostgreSQL 17 y JAR empaquetado.
No se modificaron producción, migraciones, workflow ni tests de BD3.

Para repetir solo la integración real, desde backend con la misma base de QA:
`./mvnw -B -Dtest=InventoryBookingIntegrationTests verify`.
Esta ejecución enfocada no sustituye el verify completo requerido por CI.

## Evidencia histórica de la entrega de catálogos

Java 21/PostgreSQL 17: las 40 pruebas de Properties/RoomTypes/Rooms/RatePlans
pasan (27 nuevas en los últimos tres catálogos). Verify completo final:
217 tests, 0 failures, 8 errors BD3, 0 skipped, BUILD FAILURE. Los fixtures de
booking estaban pendientes en esa entrega; no se cambió workflow ni se excluyó ninguna prueba.

Newman con login/scope reales: Properties 14 solicitudes/20 assertions;
RoomTypes 8/11; Rooms 8/11; RatePlans 10/16. Total 40 solicitudes y 58 assertions,
sin fallos. SQL confirmó una fila por catálogo pese a duplicados 409 y exactamente
un evento de alta y uno de edición por entidad, todos con el actor Staff real.
El precio final fue 9999 unidades menores GTQ; ATS antes/después de tarifas=1.
Swagger real confirmó amount como string y la respuesta RatePlanView.
Runtime, credenciales/environments y reportes privados fueron temporales, fuera
del repositorio. La API usada en QA se retiró; levantar el runtime local para
repetir las colecciones.
