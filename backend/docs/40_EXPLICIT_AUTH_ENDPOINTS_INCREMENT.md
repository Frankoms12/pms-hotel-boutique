# 40 — Incremento de rutas explícitas Auth

**ID:** BE-005-AUTH-API-01. **Fecha:** 2026-10-05. **Estado:** COMPLETADA (2026-10-06); QA manual final real PASS confirmado por el usuario.
**Owner:** Alan / BD1. **Reviewers:** responsable Web/BFF y responsable Android,
colaborativos; revisión local Codex. **Base:** `feature/backend-explicit-auth-endpoints`,
HEAD `9ade01d`; definición inicial en esa rama con árbol limpio. Implementación
en rama nueva `feature/backend-explicit-auth-api-01`, misma base, preservando el
registro documental READY. Sin commit/push/merge.

## Cierre QA manual final (2026-10-06)

Confirmación manual final real del usuario, recibida el 2026-10-06.
Las entradas anteriores se conservan como historial; sus estados EN_QA y
pendientes quedan superados por este cierre. No se atribuye esta confirmación
a pruebas automatizadas ni se ejecutan nuevas implementaciones.

- Google real → callback → `/cuenta` reconocida sin reload: **PASS**.
- Guest session 200, refresh, logout UI y sesión revocada 401: **PASS**.
- Staff login/session/refresh/logout: **PASS**.
- BFF consume los endpoints explícitos login/me/logout/refresh; rutas públicas
  BFF y endpoints Backend legacy compatibles conservados.

## Comparación y decisión de alcance

| Fuente actual | Propuesta | Evaluación |
| --- | --- | --- |
| [C1](08_AUTH_SESSION_CONTRACT_PROPOSAL.md): POST Staff sessions, refresh y DELETE session; identidad local provisionada | login/logout explícitos, refresh igual | Extensión aditiva; conserva todas las rutas y reglas C1. Login sigue devolviendo 201, no 200. |
| [C2](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md): GET Staff session con autorización vigente | GET Staff me | Misma sesión C2: permisos/memberships recalculados; no introduce perfil ni consulta de otro usuario. Fachada BFF actual intacta. |
| [C3](10_GUEST_AUTH_CONTRACT_C3.md): Google start/exchange, GET/DELETE session y refresh separados | Guest me/logout y refresh existente | Google sigue siendo el único login Guest; no crear Guest login local ni credenciales correo/contraseña. |
| StaffAuthController / GuestAuthController actuales | Cinco operaciones adicionales | Reutilizar servicios, DTOs, mappers de respuesta, filtros y auditoría; no crear lógica de negocio paralela. |
| [Baseline OpenAPI](39_BACKEND_OPENAPI_BASELINE.md) / [política](02_API_CONTRACT_POLICY.md) | Documentar aliases y deprecación | Swagger actualizado y validado en este mismo incremento, sin ocultar rutas compatibles. |

La alineación con el patrón del docente se limita a los nombres solicitados por
el usuario; no se atribuyen requisitos adicionales al docente sin fuente.
No existe contradicción real: C1/C2/C3 siguen disponibles y no prohíben aliases
aditivos. Este documento registra el contrato aditivo dentro del alcance solicitado;
la implementación fue autorizada por el usuario el 2026-10-05, sin reemplazar
las aprobaciones históricas. Addenda incorporados en C1/C2/C3; QA manual pendiente.

Decisión técnica del incremento: rutas explícitas preferidas, rutas históricas
compatibles, sin redirecciones. Marcar **solo** las cinco operaciones históricas
session/sessions como `deprecated: true` en OpenAPI, con descripción de su
reemplazo. La deprecación es informativa: no implica fecha de retirada, headers
Sunset/Deprecation, cambios de status, errores ni obligación de migrar consumidores.
Refresh y Google no se deprecian. Una eliminación o migración BFF requerirá otro
incremento autorizado. No modificar Web/Android ahora.

## Contrato mínimo implementado

Todas las rutas siguientes son Backend BFF-only (`x-audience=internal-bff`).
No requieren permiso funcional adicional ni property scope de entrada; Staff
mantiene membership/identidad activas y autorización C2. Sin parámetros de
usuario o propiedad nuevos. Bearer siempre del contexto indicado.

| Método y ruta | Auth / request | Respuesta y errores | Summary |
| --- | --- | --- | --- |
| POST `/api/v1/staff-auth/login` | Sin credencial previa; StaffLoginRequest | 201 StaffAuthResponse; 400 validación/JSON; 401 credenciales/identidad/autorización inválidas | Iniciar sesión |
| POST `/api/v1/staff-auth/logout` | Bearer Staff; sin JSON | 204 sin cuerpo; 401 | Cerrar sesión |
| POST `/api/v1/staff-auth/refresh` (existente) | Cookie pms_staff_refresh; sin JSON | 200 StaffAuthResponse; 401 | Renovar sesión |
| GET `/api/v1/staff-auth/me` | Bearer Staff; sin JSON | 200 StaffSessionResponse; 401 | Usuario actual |
| POST `/api/v1/guest-auth/google/start` (existente) | Sin credencial previa; sin JSON | 200 GoogleStartResponse | Iniciar sesión con Google: iniciar autorización |
| POST `/api/v1/guest-auth/google/exchange` (existente) | Sin credencial previa; GoogleExchangeRequest | 201 GuestAuthResponse; 400; 401 | Iniciar sesión con Google: completar intercambio |
| POST `/api/v1/guest-auth/logout` | Bearer Guest; sin JSON | 204 sin cuerpo; 401 | Cerrar sesión |
| POST `/api/v1/guest-auth/refresh` (existente) | Cookie pms_guest_refresh; sin JSON | 200 GuestAuthResponse; 401 | Renovar sesión |
| GET `/api/v1/guest-auth/me` | Bearer Guest; sin JSON | 200 GuestSessionResponse; 401 | Usuario actual |

Aliases históricos retenidos: POST Staff `/sessions` → `/login`; GET Staff/Guest
`/session` → `/me`; DELETE Staff/Guest `/session` → POST `/logout`.
Conservar sus schemas/status/auth y usar el mismo summary funcional; explicar
compatibilidad y reemplazo en description. No crear POST `/session` ni DELETE
`/logout`. Mantener métodos no aprobados protegidos/sin mapping como hoy.

StaffAuthResponse/GuestAuthResponse conservan accessToken, refreshToken y
accessTokenExpiresInSeconds solo para el BFF. StaffSessionResponse mantiene
staffUserId/sessionId/username/roleCode/permissions/memberships; GuestSessionResponse
mantiene guestAccountId/sessionId/email/context=GUEST. Ningún `/me` devuelve tokens
o un GuestProfile. Preservar validadores, límites, campos camelCase y schemas
actuales; no agregar envelopes, roles, permisos ni códigos de error nuevos.

401 del servicio conserva ProblemDetail genérico vigente; filtros pueden
responder sin cuerpo de aplicación, también en login/refresh si llega Bearer
inválido. No prometer un campo `code` o cuerpo uniforme inexistentes. 400 de validación MVC conserva el comportamiento actual. En el servidor
Servlet, JSON inválido redispatcha a /error protegido y termina en 401 sin cuerpo
en login y sessions; OpenAPI describe ambas capas y la prueba HTTP real verifica
esa equivalencia heredada. No se cambia la política de /error. Backend no emite Set-Cookie; cookies access/refresh
HttpOnly y su sustitución/borrado son responsabilidad BFF. Refresh no acepta
token JSON ni necesita access token previo.

Sesión/JWT/TTL/audiencias/rotación/familia/reutilización/revocación no cambian.
Logout revoca solo la sesión y sus refresh; una repetición con access revocado
sigue devolviendo 401, no se introduce garantía idempotente 204. Login crea una
sesión por petición válida como hoy; refresh rota por uso. No agregar claves
de idempotencia ni eventos de auditoría. Staff conserva los emisores y atribución
AUTH-03; Guest conserva exactamente su comportamiento actual, sin afirmar que
exista auditoría adicional de login/logout que su servicio no emite.

## Alcance y archivos de implementación

1. StaffAuthController y GuestAuthController: handlers finos para nuevas rutas,
   delegando a los mismos servicios y a una única construcción de respuesta por
   operación. Compartir la proyección C2 de `/session` y `/me`; no copiarla.
   Preferir handlers separados para metadata deprecated exclusiva del alias
   antiguo; un mapping múltiple con una sola @Operation no distingue ambas rutas.
2. SecurityConfiguration: agregar **solo POST Staff login** a los matchers sin
   credencial previa, igual que POST sessions. Me/logout permanecen autenticados;
   filtros JWT ya cubren ambos prefijos y no necesitan nuevas excepciones.
3. Actualizar anotaciones OpenAPI de todos los handlers Auth afectados; conservar
   bearerAuth/guestBearerAuth/staffRefreshCookie/guestRefreshCookie y audiencia.
   OperationIds distintos/únicos para aliases, referencias locales resolubles;
   sin ejemplos de secretos o PII ni nuevos schemas de usuario.
4. Tests previstos: nuevo `infrastructure/security/ExplicitAuthEndpointsIntegrationTests.java`,
   `infrastructure/security/ExplicitAuthServletErrorIntegrationTests.java`,
   y actualizar `infrastructure/openapi/OpenApiContractIntegrationTests.java` y
   `infrastructure/security/SecurityConfigurationIntegrationTests.java` bajo
   `src/test/java/com/pms/hotelboutique/backend/`. Usar Spring/MockMvc/PostgreSQL y
   GoogleOidcClient de prueba, sin dependencia de Google vivo para regresión.
5. Docs C1/C2/C3, inventario 39 con sección de evolución que preserve la evidencia
   histórica, este documento con guía QA/evidencia, AlanPlan/AlanHandoff y
   `postman/BD1-Backend-APIs.postman_collection.json`: agregar requests de las cinco
   rutas con variables sin secretos; conservar requests antiguos para regresión.

No cambiar servicios de negocio, persistencia/migraciones, dependencias, config
de Google, infraestructura, políticas CSRF/cookies, rutas BFF ni Frontend.
OpenApiConfiguration/OpenApiSchemaConfiguration se reutilizan; solo ajustar si
la generación real demuestra un gap de metadata dentro del alcance.

## DoR y aceptación

DoR completo: BE-001/002/003/004/005 y BE-005-OPENAPI-01 cerrados en AlanPlan;
AUTH-03 COMPLETADA; C1/C2/C3 aprobados disponibles; controllers, DTOs, filtros,
servicios y tests inspeccionados. Owner/reviewers, contrato aditivo, archivos,
aceptación y entorno Java 21/PostgreSQL 17 definidos. No falta decisión de
negocio ni revisión externa bloqueante. El registro READY inicial no autorizaba código; la instrucción posterior del
usuario autorizó exclusivamente este incremento, hoy entregado EN_QA.

- Las cinco rutas nuevas funcionan y las cinco históricas siguen funcionando
  sin redirects ni cambios de payload/status; refresh y Google permanecen.
- Un login crea una sola sesión y una emisión de tokens/eventos equivalente al
  handler histórico; logout no duplica revocación/eventos. Me conserva sesión C2
  y Guest actual sin información extra. Identidad, permisos y scope no cambian.
- Tokens ausentes, inválidos, expirados, revocados o de otro contexto se rechazan;
  refresh cookie cruzada o JSON-only no autentican. Sin acceso anónimo a me/logout.
  Nueva sesión no permite eludir membership/estado Staff ni Google Guest.
- Documento real `/v3/api-docs`: paridad de mappings **34 operaciones / 24 paths**
  esperados desde 29/19; nueve controllers/tags existentes. Cinco aliases antiguos
  deprecated y cinco nuevos no deprecated; cuatro operaciones sin credencial
  previa (dos login Staff y dos Google), 30 con Bearer o refresh cookie. Sin
  exclusiones nuevas; comprobar conteos contra mappings, no solo editar constantes.
- Summaries, DTOs, auth, errores, content, límites, audiencia y ausencia de
  tokens en me coinciden con runtime. Swagger actualizado obligatorio para DoD.

## Matriz de tests y requisitos de cierre

Matriz HTTP: login viejo/nuevo → leer session/me con la misma sesión → refresh
→ logout viejo/nuevo. Probar ambos sentidos de compatibilidad, con sesiones
independientes para efectos destructivos; comparar estructura/status, no igualdad
literal de tokens aleatorios o IDs de sesiones creadas separadamente.

Staff: credenciales válidas/incorrectas, JSON inválido, membership inactiva/usuario
suspendido; C2 vigente e invalidación por cambios de acceso. Verificar en BD que
un login/refresh/logout emite exactamente los efectos actuales, incluida atribución
de auditoría, sin duplicación. Guest: preparar sesión por Google exchange de prueba,
mantener validación OIDC, me sin datos Staff/GuestProfile y logout aislado. Probar
refresh rotativo, reutilización, access/refresh revocados tras logout y aislamiento
entre otra sesión del mismo usuario y el otro contexto en ambos sentidos.

OpenAPI: actualizar paridad y clasificación anónima para Staff login; aserciones
estructurales por cada nuevo método/path, statuses/schemas/security/audience,
summaries, deprecated exacto y reemplazos; OperationIds únicos, referencias
resueltas, request/cookies reales, sin Set-Cookie/ejemplos sensibles ni principal
serializado. Smoke HTTP de auth debe recorrer aliases además del documento.

Comandos previstos desde `backend/`, en QA aislado (Java 21/PostgreSQL 17):

```sh
docker compose -p pms_explicit_auth -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_explicit_auth -f compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress '-Dtest=ExplicitAuthEndpointsIntegrationTests,ExplicitAuthServletErrorIntegrationTests,OpenApiContractIntegrationTests,SecurityConfigurationIntegrationTests,StaffAuthAuditEmitterIntegrationTests,StaffAuthAuditAttributionIntegrationTests,StaffAuthAuditAppendOnlyIntegrationTests,GuestJwtServiceTests,ReservationLinkOtpIntegrationTests' test
docker compose -p pms_explicit_auth -f compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress verify
git diff --check
```

QA manual del usuario: Swagger UI/doc/config HTTP 200; revisar 34 operaciones,
aliases deprecated y summaries; ejecutar colección contra QA con Staff y Guest
válidos verificando login/Google, me/session, refresh y logout por ambas rutas,
status y rechazo posterior; sin tokens/secretos en evidencia compartida.
No exigir configurar un nuevo proveedor para aliases: reutilizar Google aprobado.
Actualizar evidencia del inventario 39 y colección en el mismo incremento.
Pruebas/verify PASS y QA visual/funcional pendiente => EN_QA; únicamente con
confirmación manual PASS del usuario => COMPLETADA. OpenAPI desactualizado nunca
es DoD PASS. No reutilizar los 363 PASS históricos como evidencia de estas rutas.

## Evidencia de implementación (2026-10-05)

Handlers nuevos delegan en los existentes: loginExplicit → login,
logoutExplicit → logout y me → session. Los cuerpos existentes y los servicios
permanecen intactos. SecurityConfiguration solo permite adicionalmente POST
Staff login sin credencial previa. No cambios JWT, cookies, permisos, scope,
persistencia, dependencias o Frontend/BFF.

Validación inicial: focalizados **55 PASS** y verify **373 PASS**, cero
failures/errors/skipped. El smoke posterior detectó una diferencia heredada de
validación Servlet/MockMvc; se agregó una prueba HTTP real y metadata explícita
para login/sessions. Las cifras finales se registran tras revalidar.
Documento real generado en MockMvc: OpenAPI 3.1.0, **34 operaciones/24 paths/29
schemas**, cinco legacy deprecated exclusivamente en metadata, cuatro sin
credencial previa y 30 protegidas. Artefactos ignorados de paridad en target.
Primera corrida detectó únicamente un flush faltante en el fixture transaccional
C2; corregido en test, sin cambio de aplicación, y focalizados completos PASS.

Guía manual: [41_EXPLICIT_AUTH_ENDPOINTS_QA.md](41_EXPLICIT_AUTH_ENDPOINTS_QA.md).
Colección BD1 ampliada con 14 requests Staff y 12 Guest; carpetas previas intactas,
variables sin valores de credenciales/tokens. Verify final y smoke HTTP del JAR se registran al finalizar esta entrega. QA manual del usuario pendiente;
EN_QA hasta confirmación PASS. No iniciar otro incremento ni publicar.


### Validación final

- Focalizados: **56 PASS**, incluidos nueve HTTP y nueve OpenAPI; cero
  failures/errors/skipped. Suite completa: `mvn -B --no-transfer-progress verify`
  **374 PASS**, BUILD SUCCESS, cero failures/errors/skipped, JAR generado.
- JAR por HTTP real en 127.0.0.1:18085: `/v3/api-docs`, Swagger UI y config
  **200**; paths/components idénticos al documento de tests. Cuatro combinaciones
  Staff login/logout nuevo/legacy con me/session iguales, refresh/revocación y
  negativos Auth PASS. Guest autenticado cubierto en tests con Google de prueba;
  sin afirmar Google externo vivo ni QA manual ejecutado.
- Artefactos regenerables ignorados: target/openapi-generated.json,
  target/openapi-application-mappings.txt, target/openapi-explicit-auth-qa.json.
  Logs locales: /tmp/explicit-auth-focused.log, explicit-auth-verify.log y
  explicit-auth-http-smoke.log. Colección JSON y 26 scripts válidos; carpetas
  preexistentes intactas, credenciales/tokens vacíos. Enlaces y diff --check PASS.
- Los once cuerpos de métodos Auth existentes son idénticos a HEAD. Único
  cambio de perímetro: permitAll para POST Staff login, equivalente a sessions.
  Diferencia heredada MVC 400/Servlet 401 de JSON inválido cubierta y descrita.
- JAR y PostgreSQL temporales detenidos; recreación de QA en guía 41.
- EN_QA hasta QA manual PASS del usuario según guía 41; sin commit/push/merge.


### Addendum de entorno manual QA autorizado (2026-10-05)

Por instrucción del usuario, compose.bd2-test.yaml incorpora el profile manual-qa:
manual-backend construido con Dockerfile existente, solo localhost:18086, y
manual-postgres en tmpfs con BD propia. Las tres variables PMS_BOOTSTRAP_ADMIN_*
provisionan qa_staff / qa_staff@example.test / SUPER_ADMIN mediante el bootstrap
existente. Password público sintético y exclusivo de QA en guía 41; no ejemplos
ni defaults OpenAPI, no secrets/env_file ni defaults de aplicación modificados.
No hay lógica alternativa de usuarios, migrations, cambios API/JWT/cookies o
BFF. postgres/verify permanecen idénticos a HEAD y no activan el bootstrap fijo.

Validación real: BD manual vacía (cero tablas públicas), un usuario/membership/
evento bootstrap; restart Backend conserva ID/hash/fecha, sin duplicación.
Login/me/logout 201/200/204 y me/refresh revocados 401; tras reinicio y legacy
PASS. Verify completo nuevamente **374 PASS**, cero failures/errors/skipped,
BD automatizada con cero qa_staff. Tmpfs real confirmado; OpenAPI/UI/config 200,
34 operaciones/24 paths iguales a tests, sin credenciales QA en documento.
Artefacto target/openapi-manual-qa.json y logs /tmp/explicit-auth-manual-*.log.
Guía 41 actualizada, enlaces/Compose/diff --check PASS. Entorno manual saludable
disponible para QA del usuario en localhost:18086; EN_QA hasta su nuevo PASS.


### Addendum de stack integrado canónico autorizado (2026-10-05) — histórico

**Sustituido por AUTH-UNIFIED-01 (2026-10-06):** Web fijo 3001 y único puerto
publicado por Compose normal; Backend/Swagger únicamente con override debug
explícito. [Contrato vigente](44_UNIFIED_LOGIN_CONTRACT_QA.md). Texto anterior:


El usuario solicita volver al compose.yaml raíz como entorno PostgreSQL +
Backend + Web reproducible: docker compose --env-file .env up -d --build.
Backend se publica solo en localhost mediante PMS_BACKEND_PORT (default 8081),
Web usa PMS_WEB_PORT y PMS_WEB_PUBLIC_URL (3001 en .env local), conservando BFF
backend:8080 y Backend postgres:5432. Google recibe sus tres variables .env
server-side; callback Web y exchange contra ese mismo Backend. .env preservado,
bootstrap Staff real opt-in para cuenta sintética local sin defaults activos.
No cambio de lógica auth/BFF/cookies/JWT ni endpoint HTTP. DEC-B-003 actualizado.

Tests mantienen postgres/verify originales en compose.bd2-test.yaml; QA manual
histórico se conserva en compose.auth-manual-qa.yaml. Sus puertos no se recomiendan
para flujos integrados. Demo opcional conserva su puerto 18080 sin heredar 8081.
[Guía local](../../docs/13_LOCAL_INTEGRATED_STACK.md), README y QA 41 actualizados.

Validación real: config sin secretos en salida, comando raíz exacto PASS;
postgres/backend/web healthy. Web/Swagger/doc/config HTTP 200; DNS interno Web a
backend:8080 200. Staff directo login/me/logout y BFF login/session/refresh/logout
PASS, cookies HttpOnly/Lax y JSON sin tokens. Google start 307, callback correcto
3001 y state/PKCE persistidos en BD del mismo Backend; callback inválido rechazado.
Google consentimiento/retorno válido y QA manual del usuario siguen pendientes.
Verify completo **374 PASS**, cero failures/errors/skipped, BUILD SUCCESS;
OpenAPI integrado 34/24 con paths/components idénticos a tests. Artefacto
ignorado target/openapi-integrated-stack.json; logs /tmp/pms-integrated-*.log.
Enlaces/Compose/diff --check PASS. Mantener EN_QA hasta QA manual final PASS.

Comprobación final de aislamiento: la BD automatizada no contiene local_staff ni
qa_staff (count=0); proyecto pms_integrated_verify retirado sin tocar volumen o
servicios integrados. Stack raíz queda healthy para QA del usuario.


### Corrección final BFF autorizada (2026-10-05)

Se revisó el WORKING TREE actual (no solo HEAD): Staff POST/GET/DELETE session y
Guest GET/DELETE session todavía consumían legacy. El usuario solicita migrar
solo sus targets internos; Browser → BFF mantiene exactamente sus rutas/DTOs/
status/cookies y errores. QA manual Staff BFF y Google Guest real confirmado
PASS por el usuario antes de esta corrección; evidencia conservada. La nueva
versión permanece EN_QA hasta su QA manual final.

| Browser → BFF (sin cambio) | Backend anterior | Backend actual |
| --- | --- | --- |
| POST /api/auth/staff/session | POST /api/v1/staff-auth/sessions | POST /api/v1/staff-auth/login |
| GET /api/auth/staff/session | GET /api/v1/staff-auth/session | GET /api/v1/staff-auth/me |
| DELETE /api/auth/staff/session | DELETE /api/v1/staff-auth/session | POST /api/v1/staff-auth/logout |
| GET /api/auth/guest/session | GET /api/v1/guest-auth/session | GET /api/v1/guest-auth/me |
| DELETE /api/auth/guest/session | DELETE /api/v1/guest-auth/session | POST /api/v1/guest-auth/logout |
| POST /api/auth/staff/refresh | POST /api/v1/staff-auth/refresh | Sin cambio |
| POST /api/auth/guest/refresh | POST /api/v1/guest-auth/refresh | Sin cambio |

Aplicación modificada: únicamente los dos session/route.ts Web, cinco llamadas
internas. Refresh/Google y helpers de cookies/transporte intactos; Backend/src
sin cambios según hashes previos de este working tree. Test nuevo de BFF con
37 casos (métodos/targets exactos, tokens fuera del JSON, cookies productivas,
aislamiento, clearing y errores), y alias test-only del marcador server-only de
Next en Vitest; runtime no cambia ese marcador ni la política de cookies.

Pruebas Web: 62 relevantes PASS (siete archivos), suite completa 1006 PASS
(209 archivos), typecheck y lint PASS. Typecheck inicial detectó tipos .next
obsoletos para (private)/habitaciones; next typegen regeneró los artefactos y se
preservó next-env.d.ts original. No se cambió ruta/tsconfig para ocultar el error.
OpenAPI vivo HTTP 200: explícitos presentes, securityRequirements correctos,
34 operaciones/24 paths y cinco legacy deprecated. Backend verify no se repite
porque no hay cambios Backend/src; los 374 PASS anteriores siguen siendo
históricos, no una nueva ejecución. Logs /tmp/bff-explicit-*.log.
Mantener EN_QA hasta confirmación final de la compilación BFF migrada.

Web reconstruida únicamente con --no-deps (Backend/PostgreSQL no reiniciados),
healthy. Smoke HTTP integrado Staff directo/BFF, refresh/logout/revocación y
Web/Swagger/doc/config 200 PASS. Google start/callback inválido conservados;
consentimiento real previo PASS del usuario, confirmación final postmigración
pendiente. Logs /tmp/bff-explicit-web-build.log y bff-explicit-http-smoke.log.


### Corrección Guest UI/BFF autorizada (2026-10-06)

El working tree confirmó el bug: GuestAccountGate dependía de account, pero
useGuestSessionController solo tenía estado en memoria y simulateGuestAccess.
El callback correcto y las cookies HttpOnly no hidrataban ese estado. Providers
ya monta GuestSessionProvider en modo real; no existe AuthSocialButtons en el
árbol Web actual y no hay login Apple implementado.

Corrección limitada a Web, autorizada dentro de BE-005-AUTH-API-01:
Service → GuestSessionDTO → mapper → GuestSession → query compartida → UI.
Al montar en modo real, GET /api/auth/guest/session usa el origen Web y cookies
del browser, sin Authorization de cliente ni acceso a valores de cookies.
La respuesta real contiene guestAccountId/sessionId/email/context=GUEST (no
role ni ExternalIdentity); el mapper selecciona únicamente esos datos y
construye una identidad de sesión distinta del GuestAccount completo del mock.
No se inventan provider/subject/connectedAt ni se almacenan tokens.

200 hidrata signed-in; 401 produce signed-out; checking aparece desde SSR y
durante la lectura inicial, sin pantalla signed-out prematura. 503/red/datos
inválidos producen error recuperable con Reintentar sesión. Sin reintentos
automáticos, refresh adicional o persistencia de credenciales en JS.
Logout real llama DELETE /api/auth/guest/session y solo después del éxito
cancela lecturas, limpia queries Guest y deja null la query guest-session.
No se limpian queries Staff. Fallo de transporte conserva estado y permite
reintentar; el BFF mantiene su contrato 204/clearing y target POST logout.

Modo mock mantiene simulateGuestAccess por correo/Google y su mapper original.
En real el botón Google enlaza directamente /api/auth/guest/google; correo mock
y Apple no se presentan como autenticación real. GuestAccessPage deja de
anunciar una sesión de demostración cuando la sesión procede del BFF. Dos
consumidores account toleran identidades externas desconocidas, sin falsearlas.

Validación: 95 tests auth/BFF/provider PASS, suite Web completa 1026 PASS
(211 archivos), incluyendo 13 casos de sesión real y siete del mapper.
Cobertura de 200/401/checking/SSR/503/red/retry, logout pendiente/fallido/éxito,
aislamiento Staff, mock, Google real y ausencia de credenciales en state/cache.
Logs locales /tmp/guest-hydration-auth-tests.log y guest-hydration-web-suite.log.
Backend/src, helpers BFF y .env se preservan; no cambios HTTP/OpenAPI Backend
ni nueva ejecución de verify. Evidencia 374 PASS anterior es histórica.

Límite previo confirmado: /account/summary es provisional y no tiene mapping
real Backend/BFF. La hidratación permite atravesar el gate y muestra la sesión
Guest, pero no integra los resúmenes/perfil/reservas de cuenta. Una carga de
resumen fallida debe distinguirse de una sesión cerrada; no fabricar datos para
llenarla. QA final Google/callback → cuenta → logout pendiente, según guía 41.
Mantener EN_QA; sin secretos/.env/commit/push/merge ni otro incremento.

Verificación final de esta corrección: typecheck/lint PASS, compilación Docker
Web PASS y tres servicios healthy. HTTP Web /, /cuenta y /acceso 200; HTML inicial
de las dos rutas auth muestra checking sin signed-out. BFF Guest sin cookie 401
sin tokens. Swagger UI/doc/config 200; cinco explícitos, cinco legacy deprecated
y security correctos, 34 operaciones/24 paths. Script smoke local ajustado al
securityScheme Staff confirmado bearerAuth; no cambio de aplicación. Hashes
Backend/src, lib/bff y .env PASS. Logs /tmp/guest-hydration-typecheck.log,
guest-hydration-lint.log, guest-hydration-web-build.log y guest-hydration-runtime.log.
`git diff --check` PASS. Web reconstruida únicamente con --no-deps; Backend/BD
no reiniciados. QA manual humano Google/callback/UI pendiente; EN_QA.
