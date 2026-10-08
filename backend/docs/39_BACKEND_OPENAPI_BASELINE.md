# 39 — Baseline OpenAPI/Swagger Backend

**Incremento:** BE-005-OPENAPI-01. **Fecha:** 2026-10-05.
**Rama/base:** `chore/backend-openapi-contract-baseline`, HEAD `8cb2811`;
árbol limpio al iniciar. Mantenimiento autorizado por el usuario; estado EN_QA
hasta su QA manual PASS. Sin commit/push/merge.

## Evolución AUTH-UNIFIED-01 (2026-10-06)

[Contrato vigente](44_UNIFIED_LOGIN_CONTRACT_QA.md): StaffLoginRequest pasa a
email/password en sessions y login; password writeOnly, email normalizado/max 50.
GuestLoginRequest nuevo para POST /api/v1/guest-auth/sessions y
UnifiedLoginRequest para POST /api/v1/auth/sessions; x-audience=internal-bff,
security=[] sin credencial previa. Guest 201/400/401; unificado 200 selector
sin tokens/sesión, 201 contexto autenticado/tokens solo BFF, 400/401 genéricos.
operationIds guestPasswordLogin y unifiedPasswordLogin. No entidades/hash en API.
Inventario generado real: 38 operaciones / 28 paths / 37 schemas / 11 tags.
Paridad sin exclusiones y metadata de todas las contraseñas validadas por tests.
Postman BD1 incluye Guest password, resolución y selección; colecciones Staff
consumen email/password y variables staffEmail sin secretos. Historial previo abajo.

## Evolución A3 — Disponibilidad pública (2026-10-06)

Rama `feature/backend-public-availability`, base `b653804`; A3 EN_QA, A2 EN_QA,
A1 COMPLETADA. Baseline anterior leída de `/v3/api-docs` del runtime: **35 operaciones /
25 paths / 32 schemas / 10 tags**. Documento generado tras A3 y comparado con mappings
reales: **36 operaciones / 26 paths / 34 schemas / 11 tags**, sin exclusiones.
Los conteos se extraen del documento/mappings, no se presupone el incremento.

| Método | Path adicional | Autenticación | Scope / elegibilidad | Request → response | Respuestas |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/public/availability` | Pública; sin JWT/cookie requerido, security=[] | propertyId explícito, Property ACTIVE; inactiva/inexistente 404 | propertyId UUID, arrival/departure date, rooms int > 0 → PublicAvailabilityResponse | 200, 400, 404, 500 |

Dos schemas HTTP nuevos: PublicAvailabilityResponse/PublicAvailabilityOfferResponse,
campos exactos aprobados, UUID real de RoomType, GTQ y minor units int64. Catálogo/ATS
vacío devuelve 200 offers=[]; configuración demo inválida devuelve ProblemDetail 500
con code DEMO_RATE_NOT_CONFIGURED/DEMO_CURRENCY_MISMATCH, sin respuesta parcial.
Única nueva audiencia x-audience=public para esta operación; las operaciones Staff y
BFF conservan sus cuatro esquemas y anotaciones. Única apertura Security GET exacto
de la ruta nueva. operationId publicAvailability explícito, sin colisión con
availability Staff; todos los paths previos y security schemes se comparan intactos
con la baseline anterior. Tests validan paridad, esquema/params/status/security y Swagger.
[Contrato y QA 43](43_PUBLIC_AVAILABILITY_CONTRACT_QA.md); evidencia final en AlanHandoff.
Focalizados 48 PASS (11 OpenAPI) y verify 449 PASS sin exclusiones. Documento vivo
del JAR validado en runtime efímero coincide con generado en paths/components;
/v3/api-docs, /swagger-ui/index.html y swagger-config 200. GET público anónimo
200 [] con catálogo vacío, inválido 400, inexistente 404 y Staff vecino 401.
No se atribuye QA manual vendible ni visual; A2/A3 permanecen EN_QA.
Las secciones Auth/Account y baseline anteriores siguen como historial.

## Evolución BE-005-AUTH-API-01 (2026-10-05)

Inventario vigente de esta compilación: **34 operaciones / 24 paths / 29 schemas**,
nueve controllers/tags. La evidencia de BE-005-OPENAPI-01 y su tabla de 29
operaciones que siguen abajo son el baseline histórico; estas cinco filas son
aditivas. [Contrato/evidencia 40](40_EXPLICIT_AUTH_ENDPOINTS_INCREMENT.md),
[guía QA 41](41_EXPLICIT_AUTH_ENDPOINTS_QA.md). Estado del incremento: EN_QA.

| Método | Path adicional | Autenticación | Permiso / scope | Request → response | Respuestas |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/staff-auth/login` | Sin credencial previa; BFF-only | Sin permiso funcional adicional; sin property scope de entrada | StaffLoginRequest → StaffAuthResponse | 201, 400, 401 |
| POST | `/api/v1/staff-auth/logout` | Bearer Staff | Sin permiso funcional adicional; sin property scope de entrada | — → — | 204, 401 |
| GET | `/api/v1/staff-auth/me` | Bearer Staff | Sin permiso funcional adicional; autorización C2 vigente | — → StaffSessionResponse | 200, 401 |
| POST | `/api/v1/guest-auth/logout` | Bearer Guest | Sin permiso funcional adicional; sin property scope de entrada | — → — | 204, 401 |
| GET | `/api/v1/guest-auth/me` | Bearer Guest | Sin permiso funcional adicional; sin property scope de entrada | — → GuestSessionResponse | 200, 401 |

Todo Auth conserva x-audience=internal-bff. Cuatro operaciones sin credencial
previa (login/sessions Staff y Google start/exchange), 30 protegidas; mismos
cuatro esquemas de seguridad. Solo POST Staff sessions y GET/DELETE session
Staff/Guest deprecated=true, con reemplazo explícito y sin cambio runtime.
Refresh/Google no deprecated; summaries en español. Schemas/status/headers de
aliases son equivalentes a legacy; OperationIds únicos, sin exclusiones nuevas.
Los nueve tests OpenAPI validan paridad real y metadata de compatibilidad.
La suite HTTP verifica los nuevos mappings contra PostgreSQL y Google de prueba.
No se agrega error code/envelope/Set-Cookie ni DTO de perfil.
Validación Staff login/sessions: MVC genera 400; en Servlet real, /error protegido
produce 401 sin cuerpo. Metadata de ambos handlers explicita ese comportamiento
heredado, cubierto por ExplicitAuthServletErrorIntegrationTests. No se amplía
el acceso a /error ni se cambia la respuesta legacy para acomodar Swagger.

Validación final de AUTH-API-01: focalizados **56 PASS**, incluidos nueve tests
OpenAPI; verify completo **374 PASS**, cero failures/errors/skipped. JAR HTTP
real doc/UI/config **200**, paths/components iguales a tests. Artefacto
regenerable target/openapi-explicit-auth-qa.json; logs locales en /tmp con
prefijo explicit-auth. QA manual del usuario pendiente según guía 41.

## Fuentes y perímetro

Se inspeccionaron los nueve `@RestController` de aplicación y sus mappings;
la prueba compara esos mappings reales con el JSON servido por `/v3/api-docs`.
Resultado: **29 operaciones, 19 paths, 29 schemas; 29/29 documentadas**.
No hay exclusiones de mappings de aplicación (`DOCUMENTED_EXCLUSIONS` vacío).

| Controller | Operaciones | Fuente de contrato vigente |
| --- | ---: | --- |
| StaffAuthController | 4 | [C1](08_AUTH_SESSION_CONTRACT_PROPOSAL.md), [C2](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md) |
| GuestAuthController | 5 | [C3](10_GUEST_AUTH_CONTRACT_C3.md) |
| ReservationLinkController | 2 | [L-01–L-07](30_BD1_HISTORICAL_RESERVATION_OTP_CONTRACT_PROPOSAL.md), C3 |
| PropertyController | 4 | [Properties](15_BD2_PROPERTIES_CRUD_CONTRACT_PROPOSAL.md), C2 |
| RoomTypeController | 4 | [RoomTypes](16_BD2_ROOM_TYPES_CRUD_CONTRACT_PROPOSAL.md), C2 |
| RoomController | 4 | [Rooms](17_BD2_ROOMS_CRUD_CONTRACT.md), C2 |
| RatePlanController | 4 | [RatePlans](18_BD2_RATE_PLANS_CRUD_CONTRACT.md), C2 |
| InventoryController | 1 | [Availability](12_BD2_AVAILABILITY_API_CONTRACT.md), C2 |
| DailyOnBooksController | 1 | [On-books HTTP aprobado](34_BD1_ON_BOOKS_HTTP_CONTRACT_PROPOSAL.md), C2 |

La autoridad/precedencia sigue las fuentes aprobadas; los tipos y nombres de
campos HTTP se contrastaron con los DTOs, handlers y pruebas vigentes, no con
mocks. C1 contiene un ejemplo conceptual de tokens/sesión; este baseline usa los
DTOs actuales camelCase de integración BFF y la sesión Staff explícita de C2.
La etiqueta de error C1 `INVALID_CREDENTIALS` no se convierte en un campo `code`
inexistente: el handler Staff vigente devuelve `ProblemDetail` genérico con
status/title. No se crean aliases, envelopes, códigos de máquina ni garantías
de cuerpo para errores de filtros donde no existen.

Actuator, `/error`, Swagger UI y las rutas de generación del propio documento
son infraestructura; no son API pública de negocio. No se encontraron endpoints
internos de aplicación intencionalmente ocultos. Los once mappings Staff/Guest
Auth/OTP son contratos aprobados **BFF-only** de integración y ya estaban presentes
en `/v3/api-docs`; conservan su audiencia interna mediante `x-audience=internal-bff`.
Las otras dieciocho operaciones tienen `x-audience=staff`. La configuración de
acceso/red no se modifica: una etiqueta OpenAPI no implementa autorización.

## Inventario completo documentado

Todos los IDs de path son UUID requeridos. `—` significa sin request JSON o sin
cuerpo de respuesta, según columna. Los nombres son schemas del documento real;
`[]` es una lista no paginada. Cada fila siguiente está presente y documentada.
Las respuestas listadas son contractuales, no un catálogo de fallos inesperados
500 ni de toda respuesta genérica de negociación HTTP de Spring.

| Método | Path | Autenticación | Permiso / scope | Request → response | Respuestas |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/guest-auth/google/exchange` | Sin credencial previa; BFF-only | Sin permiso funcional adicional; sin property scope de entrada | `GoogleExchangeRequest` → `GuestAuthResponse` | 201, 400, 401 |
| POST | `/api/v1/guest-auth/google/start` | Sin credencial previa; BFF-only | Sin permiso funcional adicional; sin property scope de entrada | `—` → `GoogleStartResponse` | 200 |
| POST | `/api/v1/guest-auth/refresh` | Cookie Guest refresh | Sin permiso funcional adicional; sin property scope de entrada | `—` → `GuestAuthResponse` | 200, 401 |
| POST | `/api/v1/guest-auth/reservation-links/challenges` | Bearer Guest | Sin permiso funcional adicional; sin property scope de entrada | `ChallengeRequest` → `ChallengeResponse` | 202, 400, 401 |
| POST | `/api/v1/guest-auth/reservation-links/verify` | Bearer Guest | Sin permiso funcional adicional; sin property scope de entrada | `VerifyRequest` → `—` | 204, 400, 401, 422 |
| DELETE | `/api/v1/guest-auth/session` | Bearer Guest | Sin permiso funcional adicional; sin property scope de entrada | `—` → `—` | 204, 401 |
| GET | `/api/v1/guest-auth/session` | Bearer Guest | Sin permiso funcional adicional; sin property scope de entrada | `—` → `GuestSessionResponse` | 200, 401 |
| GET | `/api/v1/properties` | Bearer Staff | MULTI_PROPERTY_READ; ALL_PROPERTIES autorizadas | `—` → `PropertyView[]` | 200, 400, 401, 403 |
| POST | `/api/v1/properties` | Bearer Staff | SUPER_ADMIN + STAFF_MANAGE; organización vigente | `CreatePropertyRequest` → `PropertyView` | 201, 400, 401, 403, 409 |
| GET | `/api/v1/properties/{propertyId}` | Bearer Staff | Staff activo; PROPERTY | `—` → `PropertyView` | 200, 400, 401, 403, 404 |
| PATCH | `/api/v1/properties/{propertyId}` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY | `PatchPropertyRequest` → `PropertyView` | 200, 400, 401, 403, 404, 409 |
| GET | `/api/v1/properties/{propertyId}/availability` | Bearer Staff | RESERVATION_MANAGE o COMMERCIAL_MANAGE; PROPERTY | `—` → `AvailabilityResponse` | 200, 400, 401, 403, 404 |
| GET | `/api/v1/properties/{propertyId}/rate-plans` | Bearer Staff | Staff activo; PROPERTY | `—` → `RatePlanView[]` | 200, 400, 401, 403, 404 |
| POST | `/api/v1/properties/{propertyId}/rate-plans` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY | `CreateRatePlanRequest` → `RatePlanView` | 201, 400, 401, 403, 404, 409 |
| GET | `/api/v1/properties/{propertyId}/rate-plans/{ratePlanId}` | Bearer Staff | Staff activo; PROPERTY | `—` → `RatePlanView` | 200, 400, 401, 403, 404 |
| PATCH | `/api/v1/properties/{propertyId}/rate-plans/{ratePlanId}` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY | `PatchRatePlanRequest` → `RatePlanView` | 200, 400, 401, 403, 404, 409 |
| GET | `/api/v1/properties/{propertyId}/room-types` | Bearer Staff | Staff activo; PROPERTY | `—` → `RoomTypeView[]` | 200, 400, 401, 403, 404 |
| POST | `/api/v1/properties/{propertyId}/room-types` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY | `CreateRoomTypeRequest` → `RoomTypeView` | 201, 400, 401, 403, 404, 409 |
| GET | `/api/v1/properties/{propertyId}/room-types/{roomTypeId}` | Bearer Staff | Staff activo; PROPERTY | `—` → `RoomTypeView` | 200, 400, 401, 403, 404 |
| PATCH | `/api/v1/properties/{propertyId}/room-types/{roomTypeId}` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY | `PatchRoomTypeRequest` → `RoomTypeView` | 200, 400, 401, 403, 404, 409 |
| GET | `/api/v1/properties/{propertyId}/rooms` | Bearer Staff | Staff activo; PROPERTY | `—` → `RoomView[]` | 200, 400, 401, 403, 404 |
| POST | `/api/v1/properties/{propertyId}/rooms` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY | `CreateRoomRequest` → `RoomView` | 201, 400, 401, 403, 404, 409 |
| GET | `/api/v1/properties/{propertyId}/rooms/{roomId}` | Bearer Staff | Staff activo; PROPERTY | `—` → `RoomView` | 200, 400, 401, 403, 404 |
| PATCH | `/api/v1/properties/{propertyId}/rooms/{roomId}` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY | `PatchRoomRequest` → `RoomView` | 200, 400, 401, 403, 404, 409 |
| GET | `/api/v1/reports/on-books/daily` | Bearer Staff | COMMERCIAL_MANAGE; PROPERTY o ALL_PROPERTIES + MULTI_PROPERTY_READ | `—` → `DailyOnBooksResponse` | 200, 400, 401, 403 |
| POST | `/api/v1/staff-auth/refresh` | Cookie Staff refresh | Sin permiso funcional adicional; sin property scope de entrada | `—` → `StaffAuthResponse` | 200, 401 |
| DELETE | `/api/v1/staff-auth/session` | Bearer Staff | Sin permiso funcional adicional; sin property scope de entrada | `—` → `—` | 204, 401 |
| GET | `/api/v1/staff-auth/session` | Bearer Staff | Sin permiso funcional adicional; sin property scope de entrada | `—` → `StaffSessionResponse` | 200, 401 |
| POST | `/api/v1/staff-auth/sessions` | Sin credencial previa; BFF-only | Sin permiso funcional adicional; sin property scope de entrada | `StaffLoginRequest` → `StaffAuthResponse` | 201, 400, 401 |

## Parámetros, límites, nulabilidad y transporte

- **Staff Auth vigente:** email validado y normalizado, máximo 50; password no vacío, máximo 50,
  writeOnly/password y sin ejemplos. Login/refresh devuelven solo al BFF
  accessToken, refreshToken y accessTokenExpiresInSeconds. GET session devuelve
  identidad, permissions y memberships C2 recalculados; sin tokens. Logout 204
  no contiene cuerpo. No hay endpoint público de alta/reset/MFA Staff.
- **Google Guest:** start no requiere sesión y devuelve authorizationUrl para la
  transacción OIDC; exige configuración de despliegue. Exchange recibe code/state
  no vacíos, writeOnly, sin ejemplos; no declara máximos inexistentes. Backend valida Google,
  PKCE/nonce/state/expiración; nunca confía en identidad enviada por UI. Sesión
  Guest devuelve guestAccountId/sessionId/email/context=GUEST, sin permisos Staff.
- **Refresh:** securitySchemes apiKey/cookie `pms_staff_refresh` y
  `pms_guest_refresh`; sin refresh JSON ni Bearer previo. Esquemas Bearer JWT
  separados Staff/Guest para access. Cookies access de navegador pertenecen al
  BFF y no se anuncian como credenciales cookie aceptadas por estas APIs Backend.
  Backend devuelve tokens al BFF y no emite Set-Cookie. Sin ejemplos/defaults de
  tokens, contraseñas, OTP, code/state ni PII de cuenta.
- **OTP histórico:** challenges recibe confirmationCode no vacío, máximo 16 y
  devuelve requestId opaco 202 aun sin candidato; no revela reserva/correo/
  propiedad ni asegura entrega externa. OTP un uso, TTL 10 minutos, máximo cinco
  intentos, separación 60 segundos, tres envíos por cuenta/código/hora y diez por
  cuenta/día (L-05). Verify recibe requestId UUID y otp de ocho dígitos según el
  servicio; ambos pueden faltar/null, lo que produce 422 genérico. Cuerpo JSON
  requerido; JSON/UUID malformado 400. OTP writeOnly, sin ejemplo. Sin propertyId
  arbitrario ni permisos Staff. Resend/BFF Web externo no se validan aquí.
- **Catálogos:** POST request requerido y validado; campos desconocidos rechazados.
  code máximo 64, name máximo 160, no vacíos. Room requiere roomTypeId; RatePlan
  requiere roomTypeId y basePrice completo; ambos tipos deben pertenecer a la
  property del path. Property exige timezone IANA y currency ISO (máximo 64/3).
  Todos los campos de los DTOs de respuesta se emiten y son no null. POST 201
  documenta Location; GET/PATCH 200; unicidad contractual 409 scoped. Listas
  completas ordenadas por ID, sin filtros adicionales, límites de página ni cursor.
- **PATCH:** Property/RoomType permiten code y/o name, RatePlan code/name/basePrice;
  al menos uno. Omisión conserva valor, null explícito/objeto vacío/unknown fields
  se rechazan. Room solo code obligatorio. OpenAPI expresa additionalProperties
  false, opcionalidad y minProperties; patrones Java se expresan con regex
  equivalente ECMA-262 solo en el documento. IDs/organización/roomType y capacidad
  física no se editan. No-op preserva fechas/audit. No se añaden DELETE/baja.
- **Dinero:** amount string decimal exacto (máximo 64), sin exponentes/float,
  no negativo y cero permitido; currency ISO de tres caracteres con unidades
  menores. Rechaza exceso de precisión/overflow sin redondear. No hay conversión
  ni obligación nueva de igualar moneda Property. basePrice de respuesta contiene
  amount/currency strings; no se documenta como double ni entidad persistida.
- **Disponibilidad:** query roomTypeId UUID, arrival/departure ISO date requeridos;
  llegada inclusiva/salida exclusiva en timezone de la propiedad, arrival <
  departure. availableUnits mínimo ATS del intervalo, entero >=0, cero permitido;
  lectura sin reserva de stock ni precio/paginación.
- **On-books:** from/to ISO date requeridos e inclusivos en timezone Property;
  exactamente propertyId UUID o scope=ALL_PROPERTIES. Rechaza query desconocida/
  repetida y valores inválidos; from <= to, máximo 366 noches y 50000 filas
  (propiedades autorizadas × noches). Sin snapshot histórico, export, ingresos,
  paginación ni cursor. calculatedAt UTC; rows por propertyId/stayDate.
  onBooksPercent y unavailableReason son campos presentes pero nullable: tipo
  OpenAPI 3.1 incluye null y el enum del motivo también. Denominador cero =>
  null/NO_AVAILABLE_ROOMS; porcentaje puede superar 100. Header Cache-Control
  `private, no-store` documentado. Scope/permiso resueltos antes de SQL.

## Diferencias respecto del baseline anterior

Antes y después: 29 operaciones/19 paths; ninguna ruta añadida o eliminada.
El documento inicial se obtuvo por GET `/v3/api-docs` contra Spring real en
MockMvc/PostgreSQL, antes de cambiar las anotaciones.

- Ocho operaciones Auth/OTP protegidas carecían de securityRequirement; tres
  operaciones de inicio/intercambio eran correctamente sin credencial previa.
  Se documentan los cuatro esquemas reales y la audiencia de las 29 operaciones.
- Seis éxitos Auth/OTP figuraban como 200: login Staff/exchange Guest son 201,
  logout de ambos contextos 204, challenge 202 y verify 204. Se documenta también
  422 de verify y las respuestas 400/401/403 que faltaban en On-books.
- Se completan schemas de salida obligatorios, nulabilidad real On-books,
  request JSON, parámetros UUID/date, PATCH, cabeceras Location/Cache-Control,
  maxLength/minLength, maxItems y protección de ejemplos de datos sensibles.
- `OpenApiSchemaConfiguration` corrige solo metadata del documento donde springdoc
  combina @Size(min=0) con @NotBlank, regex Java y enum nullable 3.1; no agrega
  validadores runtime ni modifica serialización, mappings, servicios o permisos.

## Validación automatizada y reproducción

Reutiliza springdoc 3.1.1 existente y patrones @SpringBootTest/MockMvc/Jackson de
las pruebas de API BD2. `OpenApiContractIntegrationTests` contiene ocho tests:
paridad contra RequestMappingHandlerMapping; seguridad/audiencia; respuestas/
schemas/headers; parámetros/request; límites/nullability/privacidad; CRUD/scope;
referencias locales resueltas; smoke de validación/autenticación existente.
Aserciones por estructura/conjuntos, sin depender del orden del JSON.

Los tests guardan artefactos regenerables ignorados por Git:
`backend/target/openapi-generated.json` y
`backend/target/openapi-application-mappings.txt`. No hay snapshot JSON congelado
ni nueva dependencia o librería de documentación.

Desde `backend/`, en el proyecto Compose aislado de QA (no BD habitual):

```sh
docker compose -p pms_openapi -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_openapi -f compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress '-Dtest=OpenApiContractIntegrationTests,PropertyApiIntegrationTests,RoomTypeApiIntegrationTests,RoomApiIntegrationTests,RatePlanApiIntegrationTests,InventoryControllerIntegrationTests,DailyOnBooksServiceIntegrationTests,ReservationLinkOtpIntegrationTests,SecurityConfigurationIntegrationTests' test
docker compose -p pms_openapi -f compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress verify
```

**Evidencia final (2026-10-05):**

- Focalizados: **68 PASS**, incluidos **8 tests OpenAPI**; 0 failures/errors/skipped.
- `mvn -B --no-transfer-progress verify`: **363 PASS**, BUILD SUCCESS;
  0 failures/errors/skipped, JAR generado; Java 21/PostgreSQL 17 aislados.
- JAR QA por HTTP real en `127.0.0.1:18084`: `/v3/api-docs`,
  `/swagger-ui/index.html` y `/v3/api-docs/swagger-config` **200**. Paths y
  components idénticos a los obtenidos en tests; 29 operaciones, 19 paths,
  29 schemas, 26 operaciones protegidas y tres sin credencial previa.
  Artefacto adicional regenerable: `backend/target/openapi-qa.json`.
- Comparación lexical de los 31 archivos Java de aplicación modificados contra
  HEAD, retirando imports/comentarios/whitespace/anotaciones Swagger: **PASS**;
  bindings/validadores/firmas/cuerpos/constantes funcionales preservados.
  Persistencia/migraciones, configuración de seguridad, rutas y dependencias
  intactas. Regresión de todos los módulos incluida en verify.
- `git diff --check`: **PASS**. Historial anterior de AlanHandoff preservado.
- Logs locales de esta ejecución: `/tmp/openapi-focused.log`,
  `/tmp/openapi-verify.log`, `/tmp/openapi-http-smoke.log`. Regenerables;
  no forman parte del contrato versionado. QA temporal detenido al terminar.

Para inspección visual después de generar el JAR, desde `backend/`:

```sh
docker compose -p pms_openapi -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_openapi -f compose.bd2-test.yaml run --rm -p 127.0.0.1:18084:8080 verify java -jar target/pms-hotel-backend-0.0.1-SNAPSHOT.jar
```

Abrir `http://127.0.0.1:18084/swagger-ui/index.html`. Al terminar, interrumpir
ese proceso y detener solamente el proyecto de QA con
`docker compose -p pms_openapi -f compose.bd2-test.yaml down`.


## QA manual pendiente del usuario

1. Con Backend QA ejecutando la compilación de este incremento, abrir su
   `/swagger-ui/index.html` y `/v3/api-docs`; comprobar carga sin errores de schema.
2. Revisar nueve tags y 29 operaciones contra la tabla, sin Actuator/error como
   API de negocio. Auth/OTP indican BFF-only; no hay alta Staff, API admin de
   auditoría, reservas CRUD ni otros endpoints propuestos.
3. Revisar Authorize: Bearer Staff/Guest y cookies refresh separadas; inicio Staff
   y Google no exigen access previo. La UI puede restringir envío de cookies
   HttpOnly en Try it out: su contrato BFF se revisa en la definición JSON, sin
   introducir valores de tokens/contraseñas en capturas o artefactos compartidos.
4. Revisar éxitos 201/202/204, schemas request/response, Location, Cache-Control,
   UUID/date, límites On-books, nullability y PATCH. No hace falta ejecutar
   escrituras de negocio para esta inspección documental.
5. Confirmar PASS para cerrar BE-005-OPENAPI-01; hasta entonces EN_QA.

## Gaps y exclusiones

No hay endpoints implementados sin fuente para su método/auth/permiso/scope ni
mappings de aplicación excluidos del documento. No se elevan a contratos nuevos
los ejemplos conceptuales antiguos de C1 ni se agrega un error `code` inexistente.
Las APIs futuras C4/C6/admin/otros módulos no tienen mappings HTTP actuales y
quedan fuera del inventario. La entrega Google/Resend real y el QA visual humano
no forman parte de la evidencia automatizada; QA Swagger del usuario pendiente.

## Extensión BE-004-ACCOUNT-SUMMARY-01 (2026-10-06)

GET /api/v1/guest-auth/account/summary: audiencia internal-bff, Guest Bearer,
sin parámetros de identidad del cliente. 200/401, Cache-Control no-store/private,
GuestAccountSummaryResponse con perfiles array y estancia nullable. No 404/503
Backend ni datos comerciales/fiscales/credenciales. Inventario actual: 35
operaciones/25 paths/32 schemas/10 tags; ninguna exclusión nueva. Los cinco
aliases auth legacy permanecen deprecated exclusivamente en metadata.
La propiedad upcomingStay usa anyOf [$ref UpcomingStay, type null] para que
OpenAPI 3.1 acepte realmente objeto o null; customizer acotado a esta propiedad,
cubierto por prueba estructural. PreferredLanguage admite string/null sin default.
[Contrato, aceptación y evidencia QA](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md).

## Evolución STAFF-RESERVATIONS-READ-01 (2026-10-08)

Dos GET Staff adicionales: `/api/v1/reservations` y
`/api/v1/reservations/{reservationId}`, ambos con propertyId explícito,
RESERVATION_MANAGE y Bearer Staff. Perfil responsable mínimo, N stays y Room
nullable, sin datos financieros/ocupación inventados.
[Contrato/QA49](49_STAFF_RESERVATIONS_READ_CONTRACT.md).

Documento generado en este incremento: **44 operaciones / 34 paths / 52 schemas /
13 tags**, sin exclusiones. OpenApiContractIntegrationTests valida paridad exacta
con RequestMappingHandlerMapping, auth/audience, parámetros, headers, respuestas,
campos requeridos y nullability real de responsibleGuest/room. Baselines anteriores
se mantienen como historia; evidencia final en AlanHandoff.
