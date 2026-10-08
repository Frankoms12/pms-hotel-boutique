# 41 — QA manual de login/logout/me y Swagger

**Incremento:** BE-005-AUTH-API-01. **Owner:** Alan / BD1.
**Estado de entrega:** COMPLETADA (2026-10-06); usuario confirma QA manual final real PASS.
Contrato: [documento 40](40_EXPLICIT_AUTH_ENDPOINTS_INCREMENT.md).
Ninguna prueba automatizada reemplaza esta confirmación.

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

## QA final: hidratación Guest real (2026-10-06)

Bug confirmado y corregido: las cookies y GET session 200 no cargaban account
en el provider. Ahora el provider consulta GET /api/auth/guest/session al montar
en modo real y conserva únicamente la identidad de sesión confirmada.
El contrato usa context=GUEST; no devuelve ExternalIdentity ni tokens.
El PASS manual anterior sigue siendo evidencia del transporte/auth, pero no
valida esta corrección UI. **BE-005-AUTH-API-01 permanece EN_QA.**

La compilación debe actualizarse con el comando corto ya utilizado:

```sh
docker compose --env-file .env up -d --build --no-deps web
```

Probar en el Web canónico, con NEXT_PUBLIC_USE_MOCK_API=false existente:

1. Sin sesión Guest, abrir /cuenta: durante GET session debe aparecer
   «Comprobando tu sesión…», sin flash de «Accede a tu cuenta»; 401 termina
   en acceso normal. No es necesario borrar la sesión Staff para esta prueba.
2. En /acceso, «Continuar con Google» navega al BFF /api/auth/guest/google.
   Completar Google; el callback regresa a /cuenta. Sin reload ni segunda
   acción, GET /api/auth/guest/session 200 muestra el correo en «Sesión de
   huésped», el botón Cerrar sesión y el contenido dentro del gate.
3. El JSON público debe contener guestAccountId/sessionId/email/context=GUEST.
   Verificar cookies HttpOnly/SameSite y la ausencia de tokens en JSON, estado
   de React y storage. No copiar valores de cookies ni credenciales a evidencia.
4. Visitar /acceso con sesión activa: muestra «Tu cuenta está lista» y
   «Tu sesión está iniciada», sin anunciar un acceso de demostración ni
   inventar identidades Google. Volver a /cuenta conserva la sesión compartida.
5. Para 503/red, interceptar únicamente GET /api/auth/guest/session con el
   proxy/herramienta de prueba local, o abrir sin red en una nueva carga sin
   caché. Debe mostrar error y Reintentar sesión, nunca sesión cerrada como
   conclusión. Restaurar servicio/red y reintentar: 200 recupera el acceso.
6. Desde la UI Cerrar sesión: Network muestra DELETE /api/auth/guest/session.
   Durante la petición el botón queda ocupado; tras 204 el estado/query Guest
   se limpia y aparece acceso normal. BFF conserva clearing HttpOnly y Backend
   recibe POST logout. GET session posterior 401; la sesión Staff permanece.
   Si DELETE falla por transporte, se conserva estado y se ofrece reintento.
7. El mock true mantiene correo/Google simulados, sin GET/DELETE al BFF real.
   Esa regresión ya tiene tests; no cambiar el .env integrado para esta tarea.

Actualización posterior: el límite de /account/summary se resuelve en el
incremento independiente BE-004-ACCOUNT-SUMMARY-01, según [QA 42](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md).
El nuevo BFF debe responder 200 y renderizar Mi cuenta sin error de carga,
incluso sin perfil o reservas vinculadas. Otros datos secundarios continúan
fuera de alcance. Esta ampliación no cambia el estado EN_QA de AUTH-API-01.

Automatizados: 95 relevantes y suite Web completa 1026 PASS (211 archivos).
Incluyen espera inicial/SSR, error recuperable, adaptación sin tokens o
identidades inventadas, logout y aislamiento, mocks y enlace Google real.
Typecheck/lint/build Docker PASS; stack healthy. HTTP /cuenta y /acceso 200
con checking desde el HTML inicial, BFF Guest sin cookie 401 y Swagger/doc/config
200 con explícitos/legacy/security correctos. Backend/helpers/.env preservados
por hashes y git diff --check PASS. Web ya reconstruida con --no-deps.
Confirmación manual final del retorno/UI/logout pendiente del usuario.

## QA confirmado y corrección BFF final (2026-10-05)

El usuario confirmó QA manual PASS previo a esta corrección:
Staff BFF login → sesión → refresh → logout; Guest Google real login → session
200 → refresh 200 → session 200 → logout 204 → session 401.
Ese PASS se conserva como evidencia real; la corrección migra únicamente el
transporte interno BFF → Backend y requiere confirmación final sobre la nueva
compilación. BE-005-AUTH-API-01 permanece EN_QA, no COMPLETADA.

| Browser → BFF (sin cambio) | Backend anterior | Backend actual |
| --- | --- | --- |
| POST /api/auth/staff/session | POST /api/v1/staff-auth/sessions | POST /api/v1/staff-auth/login |
| GET /api/auth/staff/session | GET /api/v1/staff-auth/session | GET /api/v1/staff-auth/me |
| DELETE /api/auth/staff/session | DELETE /api/v1/staff-auth/session | POST /api/v1/staff-auth/logout |
| GET /api/auth/guest/session | GET /api/v1/guest-auth/session | GET /api/v1/guest-auth/me |
| DELETE /api/auth/guest/session | DELETE /api/v1/guest-auth/session | POST /api/v1/guest-auth/logout |
| POST /api/auth/staff/refresh | POST /api/v1/staff-auth/refresh | Sin cambio |
| POST /api/auth/guest/refresh | POST /api/v1/guest-auth/refresh | Sin cambio |

Google start/exchange, cuerpos/status públicos, errores 401/503 y cookies
HttpOnly/SameSite/Secure/clearing permanecen. Helpers lib/bff y Backend/src sin
modificaciones. En logout, el BFF sigue respondiendo 204 y borrando solo las
cookies del contexto, también si Backend rechaza o falla. Legacy Backend sigue
implementado y deprecated exclusivamente en OpenAPI.

Para la nueva compilación, desde raíz:

```sh
docker compose --env-file .env up -d --build --no-deps web
```

La compilación migrada ya fue reconstruida y quedó healthy: smoke HTTP Staff
BFF/Backend y Swagger PASS; 62 tests relevantes y suite Web completa 1006 PASS,
typecheck/lint/diff --check PASS. Sigue pendiente tu confirmación manual final.

Repetir Staff BFF y Guest real por Web/BFF, incluido refresh, lectura posterior,
logout y rechazo de sesión revocada. Confirmar que las llamadas browser siguen
usando session/refresh; los targets explícitos son transporte interno servidor.
Los tests de Route Handlers verifican esos métodos/paths exactos con helpers y
cookies reales de NextResponse. Confirmar PASS final antes de cerrar la tarea.

## Stack canónico para QA integrado

Usar el compose.yaml de la raíz para Staff, Guest Google y Web/BFF juntos.
[Guía de preparación y arranque local](../../docs/13_LOCAL_INTEGRATED_STACK.md).
Preparar el .env desde .env.example solo si no existe uno; conservar la configuración
propia. Desde la raíz:

```sh
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

Esperar postgres/backend/web healthy. Web es **http://localhost:3001**, puerto
fijo versionado; Compose raíz publica únicamente Web, Backend/PostgreSQL internos.
BFF usa backend:8080 y Google callback
http://localhost:3001/api/auth/guest/google/callback. Swagger requiere el override
explícito `-f compose.yaml -f compose.debug.yaml`, en localhost:8081.
[Decisión vigente AUTH-UNIFIED-01](44_UNIFIED_LOGIN_CONTRACT_QA.md).
Los puertos 18085/18086 son evidencia aislada, no QA integrado habitual.

## Staff local reproducible y Swagger

El bootstrap real recibe los tres PMS_BOOTSTRAP_ADMIN_* del .env. El bootstrap SUPER_ADMIN sigue opt-in. DemoDataBootstrap agrega Staff RECEPCION y
Guest password únicamente dev/demo + flag; ver [dataset local](../../docs/LOCAL_DEMO_DATASET.md). Para un entorno local nuevo puede activarse
el bloque sintético opcional de .env.example: local_staff,
local_staff@example.test y contraseña PMS-Local-Disposable-Only!2026. Esa
contraseña es exclusiva de este stack local; no reutilizarla fuera de desarrollo.
Si el .env ya define Staff, usar esa cuenta y no sobrescribirla. Bootstrap
SUPER_ADMIN no duplica ni cambia un username existente.

1. Quitar un Bearer Staff previo en Authorize. POST `/api/v1/staff-auth/login`
   → Try it out → enviar email/password locales del .env. Esperado 201 con
   accessToken/refreshToken/accessTokenExpiresInSeconds. No se añaden las
   credenciales locales a examples/defaults OpenAPI.
2. Copiar solo accessToken → Authorize → bearerAuth; pegar sin prefijo Bearer.
3. GET `/api/v1/staff-auth/me` → 200: identidad Staff, roleCode, permissions y
   memberships C2. GET `/api/v1/staff-auth/session` con el mismo token es igual.
4. POST `/api/v1/staff-auth/logout` → 204 vacío. Mantener el token en Authorize
   y GET me → 401; session y otro logout también rechazan el token revocado.
5. Quitar el Bearer revocado antes de repetir login. Registrar status y resultado
   sin tokens/credenciales/PII; confirmar el flujo manual y la revisión Swagger.

## Guest Google y Web/BFF en el mismo entorno

GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI se pasan solo al Backend desde el .env.
PMS_WEB_PUBLIC_URL debe coincidir con el origen Web del callback. Con Web en
3001, autorizar en Google http://localhost:3001/api/auth/guest/google/callback
exactamente y la cuenta de prueba si el proyecto está en Testing.

Abrir `/acceso` → Google en el Web integrado (NEXT_PUBLIC_USE_MOCK_API=false).
El BFF `/api/auth/guest/google` pide start al Backend interno; el callback Web
canjea code/state contra ese mismo Backend, coloca cookies HttpOnly y redirige a
`/cuenta`. Confirmar GET `/api/auth/guest/session` 200 sin tokens, refresh 200,
logout DELETE session 204 y sesión posterior 401; la sesión Staff queda aislada.
No volver a canjear un code consumido por el BFF ni copiar tokens de otra instancia.
[Preflight y límites](32_BD1_PRESENTATION_GOOGLE_RESEND_PREFLIGHT.md).
La suite usa Google de prueba; la cuenta/consentimiento/retorno real requiere tu
QA manual y no se da por PASS por un start exitoso.

## Revisar OpenAPI y Swagger

1. Abrir `http://localhost:8081/swagger-ui/index.html` y
   `http://localhost:8081/v3/api-docs`. Verificar 200, carga sin errores;
   `/v3/api-docs/swagger-config` también responde 200.
2. Inventario actual tras el incremento separado Account Summary:
   **35 operaciones en 25 paths, diez tags**; ver [QA 42](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md).
   Las cinco nuevas de AUTH-API-01 son
   Staff POST login/logout y GET me; Guest POST logout y GET me. Las rutas
   históricas y Google/refresh siguen visibles. Sin Guest login local.
3. Verificar summaries Iniciar sesión, Cerrar sesión, Usuario actual y Renovar
   sesión; Google indica iniciar autorización/completar intercambio. Solo POST
   Staff sessions, GET/DELETE Staff session y GET/DELETE Guest session aparecen
   deprecated, cada una con reemplazo y descripción de compatibilidad.
4. Authorize distingue bearerAuth Staff, guestBearerAuth Guest y las dos cookies
   refresh. Staff login/sessions y Google no exigen Bearer previo. Me/logout
   requieren el Bearer de su contexto. Refresh usa cookie, no token JSON.
5. Revisar 201 login/exchange, 200 me/refresh, 204 logout vacío y errores 400/401
   aplicables (400 de MVC puede terminar en 401 tras /error protegido, ver abajo);
   schemas existentes, audiencia internal-bff, sin Set-Cookie ni
   tokens en me. Los errores del filtro no prometen ProblemDetail uniforme.
   Try it out puede limitar cookies HttpOnly; verificar refresh en Postman.

## Staff: aliases, legacy y revocación

Importar [colección BD1](../postman/BD1-Backend-APIs.postman_collection.json), poner
baseUrl=`http://localhost:8081` y completar staffEmail/staffPassword solo
localmente con las credenciales Staff del .env integrado. Ejecutar la carpeta
**Staff — Auth explícita y compatibilidad**.
Login/refresh guardan tokens para la secuencia; el archivo versionado está vacío.

| Paso | Petición | Esperado |
| --- | --- | --- |
| 1 | POST Staff login con credenciales válidas, sin Bearer | 201; accessToken/refreshToken/accessTokenExpiresInSeconds, sin Set-Cookie/Location |
| 2 | GET Staff session y GET Staff me con el mismo access | 200, objetos C2 iguales; permisos/memberships vigentes; sin tokens |
| 3 | POST Staff refresh con Cookie pms_staff_refresh | 200; sustituir tokens; sessionId permanece y refresh cambia |
| 4 | POST Staff logout con access renovado | 204 vacío; solo esa sesión revocada |
| 5 | GET me/session, POST logout o DELETE session con access revocado | 401; repetir logout no cambia a 204 |
| 6 | POST refresh con refresh revocado | 401 |
| 7 | POST Staff sessions con credenciales válidas | 201, mismo contrato; GET me 200 |
| 8 | DELETE Staff session, luego GET session/me | 204 vacío, luego 401 |

Repetir POST login → DELETE session y POST sessions → POST logout para confirmar
ambos sentidos. Para cada sesión nueva, guardar localmente su sessionId para
revisión SQL; no comparar literalmente tokens aleatorios entre dos logins.
Mantener otra sesión del mismo Staff activa durante logout y comprobar que
todavía responde 200. Mantener también una sesión Guest y comprobar su 200.

Auditoría en PostgreSQL QA (sustituir UUID solo localmente; consulta de lectura):

```sql
SELECT event_type, detail, staff_user_id, session_id, actor_context, actor_id,
       organization_id, property_id, scope_kind, correlation_id
FROM auth_audit_events
WHERE session_id = '<UUID de sesión QA>'::uuid
ORDER BY occurred_at, id;
```

Esperado por login → refresh una vez → logout: exactamente un
STAFF_LOGIN_SUCCEEDED, un STAFF_REFRESH_ROTATED y un STAFF_SESSION_REVOKED con
detail=logout. actor_context=STAFF y actor_id=staff_user_id; campos de scope y
correlation NULL. Leer me/session no añade eventos; el alias no los duplica.
No editar ni borrar audit. El caso sin refresh tiene solo login/revocación.

## Guest: conservar Google y la sesión actual

Carpeta **Guest — Google y Auth explícita**: ejecutar manualmente por etapas.
Google start/exchange necesitan OIDC configurado y code/state de un intercambio
no consumido; si se usa una sesión ya creada por BFF, completar guestAccessToken
y guestRefreshToken localmente y comenzar en el paso 03. No ejecutar exchange
con códigos que el BFF ya usó. Nunca sustituir Google por email/password.

1. GET Guest session y me con el mismo Bearer: 200, igualdad de
   guestAccountId/sessionId/email/context=GUEST, sin tokens, GuestProfile o C2.
2. POST Guest refresh con pms_guest_refresh: 200, tokens rotados y misma sesión.
3. POST Guest logout con access renovado: 204 vacío; GET me/session, repetición
   de logout y refresh revocados responden 401. Otra sesión del mismo Guest y
   la sesión Staff permanecen activas (200).
4. Crear otra sesión por Google; repetir usando DELETE Guest session: 204 y
   luego 401. No ejecutar el paso 09 de colección con la sesión ya revocada.
5. Servicio Guest no añade eventos de auditoría login/refresh/logout en su
   comportamiento vigente; el alias debe conservarlo. No exigir eventos nuevos.

## Negativos y evidencia

- Login/sessions Staff con JSON incompleto/malformado o email/password vacíos:
  400 en MockMvc/validación MVC. En el servidor HTTP actual, el redispatch
  a /error protegido los convierte en 401 sin cuerpo, tanto en login como en
  sessions; la colección comprueba esa respuesta heredada. Credenciales
  incorrectas: 401 con ProblemDetail genérico. Staff sin membership activa o
  suspendido: 401 en ambos logins y en session/me/logout. Usar fixtures QA propios.
- Me/logout de ambos contextos sin access, con JWT inválido/expirado o con JWT
  del otro contexto: 401 igual que legacy. Login con Bearer inválido también
  mantiene el rechazo del filtro. No probar cambios con identidades reales.
- Refresh sin cookie, con cookie cruzada, refresh usado o JSON-only: 401.
  Usar cookie jar vacío para que el caso ausente no reenvíe una credencial válida.
- Registrar fecha, compilación/rama, casos/status, comparación de DTOs y conteo
  audit sanitizados. No guardar tokens/credenciales/PII en capturas o export.
  Al finalizar limpiar variables de credenciales/tokens/code/state y snapshots
  locales en Postman; el archivo del repo permanece sin valores sensibles.

Detener el stack integrado preservando sus datos locales, desde la raíz:

```sh
docker compose --env-file .env down
```

Confirmar PASS de Swagger y matriz Staff/Guest para cerrar. Cualquier caso
pendiente mantiene BE-005-AUTH-API-01 EN_QA; no marca completa otra tarea.


## QA aislado histórico opcional

Se conserva para reproducir la evidencia de este incremento, sin Web ni Google
integrados. Desde backend/, usar compose.auth-manual-qa.yaml (separado de tests):

```sh
docker compose -p pms_auth_manual_qa -f compose.auth-manual-qa.yaml --profile manual-qa up --build -d --wait manual-backend
# Al terminar, descartar solo esa BD tmpfs aislada:
docker compose -p pms_auth_manual_qa -f compose.auth-manual-qa.yaml --profile manual-qa down
```

Ese entorno conserva qa_staff / qa_staff@example.test y su contraseña sintética
QA-Disposable-Staff-Only!2026. En la entrega original era exclusiva del QA aislado;
el 2026-10-06 Alan autorizó crear la misma cuenta SUPER_ADMIN también en la BD
local del Compose integrado para QA de /acceso (ver [guía 44](44_UNIFIED_LOGIN_CONTRACT_QA.md)).
No es un seed de producción. Su Swagger aislado es localhost:18086. Para flujos normales usar compose.yaml
raíz. compose.bd2-test.yaml conserva exclusivamente postgres/verify originales.
La evidencia siguiente corresponde al entorno aislado previo a esta separación.

## Evidencia del entorno manual determinista (2026-10-05)

- Compose validado; configuración efectiva de postgres/verify idéntica a HEAD,
  servicios manuales ausentes del profile por defecto y sin bootstrap en verify.
- BD manual inspeccionada vacía (cero tablas públicas); primer arranque: un
  qa_staff SUPER_ADMIN, una membership activa y un evento STAFF_BOOTSTRAP_CREATED.
  Tmpfs real comprobado en Docker, sin puerto PostgreSQL publicado.
- Reinicio solo de manual-backend: ID/hash/fecha de creación conservados, un
  qa_staff y un evento bootstrap; login vuelve a funcionar. Sin duplicación.
- HTTP: login 201, me/session 200 iguales, logout 204, me y refresh revocados 401;
  repetido tras reinicio y con endpoints legacy. Doc/Swagger/config 200 en 18086.
  Paths/components idénticos a tests (34 operaciones/24 paths); sin usuario,
  correo o password QA en OpenAPI/examples/defaults.
- `mvn -B --no-transfer-progress verify`: **374 PASS**, BUILD SUCCESS, cero
  failures/errors/skipped, Java 21/PostgreSQL 17. Se ejecutó con servicios
  postgres/verify separados de manual-postgres/manual-backend; cero qa_staff
  en la BD automatizada tras la suite, con la BD manual conservando su cuenta.
- Artefacto regenerable: target/openapi-manual-qa.json. Logs locales:
  /tmp/explicit-auth-manual-start.log, explicit-auth-manual-smoke.log y
  explicit-auth-manual-verify.log. Enlaces/Compose/diff --check PASS.
- QA manual humano de Swagger pendiente: BE-005-AUTH-API-01 sigue EN_QA.
  El servicio previo en 18085 se preservó; este profile publica 18086.


## Evidencia del stack integrado canónico (2026-10-05)

Comando raíz con .env existente PASS; postgres/backend/web healthy. Web 3001,
Backend/Swagger 8081; Web/Swagger/doc/config HTTP 200 y DNS interno backend:8080
200. Staff del entorno: login/me/logout directo y login/session/refresh/logout
por BFF PASS, cookies HttpOnly/Lax y JSON sin tokens. .env/volumen existentes
preservados. Google start 307 con callback 3001 y state/PKCE en este mismo
Backend/PostgreSQL; callback inválido rechaza sin cookies. Consentimiento y
retorno Google válido aún requieren QA manual final. Verify **374 PASS**,
OpenAPI 34/24 con paths/components iguales a tests, sin nuevas credenciales en
contrato público. Logs /tmp/pms-integrated-*.log y artefacto ignorado
backend/target/openapi-integrated-stack.json. Compose/diff --check/enlaces PASS.
No se confirma cierre por estas validaciones: BE-005-AUTH-API-01 sigue EN_QA.
