# 08 — Contrato de identidad y sesión Staff (BE-002)

**Actualización aprobada AUTH-UNIFIED-01 (2026-10-06):**
[Contrato vigente](44_UNIFIED_LOGIN_CONTRACT_QA.md): login tradicional universal correo electrónico + contraseña;
Guest/Staff separados, Google solo Guest e invitado público. Guest password solo
para cuentas con credential existente; sin registro/recuperación/cambio/MFA.
`/acceso` tiene un formulario único en http://localhost:3001. Las decisiones y
pruebas de simulación/registro anteriores se conservan como contexto histórico;
no representan el login vigente. UI/BFF nunca exponen JWT al JavaScript.


**Estado:** APROBADO — C1 autoriza BE-002 Staff. Guest Google se implementa en BE-004.

**Fecha:** 2026-09-29
**Responsable:** Alan / BD1
**Ámbito:** base de sesiones Staff y separación de contextos. La cuenta Guest
se autentica exclusivamente con Google en BE-004; property scope operativo queda
en BE-003.

## Evidencia Frontend usada

| Fuente Web | Hecho que aporta | Límite para Backend |
| --- | --- | --- |
| `docs/32_GUEST_ACCESS_FRONTEND.md` | Guest ofrece correo y Google opcional; la sesión actual es solo memoria. | Declara expresamente que no es API, OAuth ni autenticación real. |
| `modules/auth/dtos/guest-account.dto.ts` | Guest necesita `account_id`, `email` y referencias de identidad externa. | `GuestAccount` no es `GuestProfile`. |
| `modules/auth/dtos/staff-session.dto.ts` | Staff presenta identificador de sesión, nombre, rol y memberships. | Es fixture Private-09 y no define credenciales ni autorización Backend. |
| `modules/auth/components/*session-provider*` | Guest y Staff mantienen stores y logout separados. | Ningún token, contraseña o sesión se guarda en `localStorage` o `sessionStorage`. |
| `app/api/**/route.ts` | Los Route Handlers actuales sirven datos mock. | No existe un BFF de autenticación ni un proxy autenticado hacia Spring Boot. |

## Límites confirmados

1. Guest Auth y Staff Auth son contextos separados: no comparten sesión,
   audiencia JWT, refresh token, cookie ni logout.
2. Una reserva pública puntual puede usar solo correo y un `GuestProfile`; no
   crea ni inicia sesión de `GuestAccount`.
3. Una sesión Guest solo identifica a `GuestAccount`, creado o recuperado tras
   una identidad Google verificada; contacto, preferencias y datos personales
   permanecen en `GuestProfile`.
4. Los usuarios Staff solo son creados y administrados por el hotel; no existe
   autorregistro Staff ni conversión de una cuenta Guest a Staff.
5. El navegador no recibe ni persiste access token, refresh token, contraseña,
   código MFA, secreto OAuth ni credenciales de proveedor.
6. El Backend vuelve a validar cada autorización. El estado visual de rol,
   membership o selector de propiedades de Web nunca concede privilegios.
7. `ALL_PROPERTIES` no pertenece a BE-002. BE-003 resolverá memberships y
   permisos vigentes antes de cualquier consulta property-scoped.

## Arquitectura de transporte

```text
Browser -> Next.js BFF -> Spring Boot -> PostgreSQL
```

- El navegador se comunica con Route Handlers o Server Actions de Next.js en el
  mismo origen.
- Next.js conserva y reenvía las credenciales de sesión al Backend por la red
  interna de Compose (`PMS_BACKEND_INTERNAL_URL`).
- Spring Boot emite JWT internos de acceso corto y refresh tokens opacos. El
  BFF conserva ambos en cookies distintas `HttpOnly`, `Secure` en HTTPS y
  `SameSite=Lax`; JavaScript no puede leerlas. Los Route Handlers leen las
  cookies en servidor, adjuntan el access JWT al Backend y renuevan la sesión
  con el refresh token cuando corresponde.
- Los endpoints de Spring Boot no se publican al navegador ni requieren CORS
  para el flujo Web.

## Contrato C1 — sesiones BE-002

Las rutas siguientes son el contrato implementado del Backend. Los Route Handlers BFF deberán
traducirlas a la experiencia Web sin exponer tokens a JavaScript.

### Reserva puntual Guest sin cuenta

La reserva pública pertenece al futuro contrato de Reservations, no a Auth:

- El checkout puede recibir un correo de contacto y crear o reutilizar un
  `GuestProfile` conforme a sus reglas de dominio.
- No crea `GuestAccount`, JWT, refresh token ni acceso a `/cuenta`.
- El correo por sí solo no autoriza consultar reservas pasadas ni futuras.

### Cuenta Guest exclusivamente con Google — BE-004

El botón Google actual es una simulación. En producción, Next.js BFF iniciará
OAuth2/OIDC y entregará el código de autorización al Backend. Solo después de
validar emisor, audiencia, firma, nonce y `sub` de Google, el Backend podrá:

1. encontrar o crear un `GuestAccount` PMS asociado a esa identidad externa;
2. emitir una sesión Guest con audiencia separada; y
3. devolver al BFF una vista de cuenta sin tokens para JavaScript.

El email verificado por Google puede ser un atributo de contacto, pero nunca
vincula automáticamente perfiles o reservas existentes. Las reservas futuras
pueden vincularse explícitamente al `GuestAccount` autenticado. Para reclamar
una reserva pasada, el usuario autenticado con Google debe aportar la referencia
de reserva y completar un desafío de un solo uso enviado al correo de contacto
registrado en esa reserva. Solo tras ambas verificaciones se crea el vínculo;
coincidencia de correo por sí sola nunca es prueba de propiedad.

### MFA para cuentas Google

La autenticación multifactor de una cuenta Guest vinculada a Google se delega a
Google. Si la cuenta Google exige un segundo factor, Google lo solicita antes de
emitir la identidad OIDC. PMS solo valida la respuesta OIDC recibida; no almacena
códigos, semillas TOTP, factores, recovery codes ni contraseñas Google.

La primera versión no añade MFA local a Staff ni `SUPER_ADMIN`. Sus correos
laborales son datos de contacto y notificación administrativa, no un factor MFA
ni un mecanismo de recuperación autónoma. Si en el futuro se exige MFA local,
se definirá un contrato independiente para enrolamiento, recuperación, revocación
y auditoría.

### Staff — inicio local

`POST /api/v1/staff-auth/sessions`

```json
{ "email": "staff@example.test", "password": "provided-only-to-bff" }
```

- Solo acepta una identidad Staff previamente provisionada por el hotel. No
  existe endpoint público de registro Staff.
- `email` es el correo laboral de login, normalizado trim/lowercase, máximo 50.
  `username` se conserva como identificador interno creado por el hotel. Cada StaffUser,
  incluido `SUPER_ADMIN`, registra también un correo laboral único de contacto,
  separado del username. La contraseña se recibe solo por el BFF y se almacena
  exclusivamente como hash adaptativo. Password required/NotBlank, máximo 50 caracteres,
  sin trim/lowercase/normalización ni reglas de complejidad nuevas de login.
- El Backend valida el hash de contraseña y que la identidad esté activa; en
  cualquier otro caso devuelve `401` con ProblemDetail genérico (`title=Invalid credentials`) sin revelar si el
  identificador existe. Si una política MFA futura lo exige, responde un desafío
  explícito; no acepta una semilla ni código MFA en esta primera versión sin
  contrato adicional.

### Provisionamiento y acceso Staff

- Un administrador autorizado del hotel crea, activa, suspende o desactiva
  usuarios Staff y asigna exactamente un `role_code`. La interfaz y endpoints de
  esa administración corresponden al módulo Staff/Permissions, no a BE-002.
- Staff no puede cambiar ni recuperar su propia contraseña. Un administrador
  autorizado la restablece y entrega la nueva credencial por un canal definido
  por el hotel; el correo laboral puede recibir una notificación, pero no existe
  endpoint público de reset ni enlace autónomo de recuperación.
- El rol `SUPER_ADMIN` tiene todos los permisos funcionales definidos por el
  sistema, sin excepciones. Para conservar property scope explícito,
  `ALL_PROPERTIES` se resuelve para ese rol como todas las propiedades activas;
  el Backend sigue auditando cada operación sensible.
- Un rol concede permisos; los módulos visibles de Web se derivan de esos
  permisos. Un rol no evita que el Backend verifique el permiso requerido por
  cada endpoint.
- El único `role_code` puede estar en el JWT Staff de corta duración. Los permisos
  efectivos y memberships no van en el token porque pueden cambiar; BE-003 los
  resuelve desde el Backend antes de consultas u operaciones property-scoped.
- Al suspender/desactivar un usuario, cambiarle rol o restablecer contraseña, el
  Backend revoca sus sesiones y refresh tokens activos para que el cambio no
  espere a la expiración del JWT.

### Bootstrap del primer administrador

El despliegue provisiona una sola identidad `SUPER_ADMIN` mediante secretos de
entorno o un comando administrativo de una sola ejecución. Requiere al menos
`PMS_BOOTSTRAP_ADMIN_USERNAME`, `PMS_BOOTSTRAP_ADMIN_EMAIL` y
`PMS_BOOTSTRAP_ADMIN_PASSWORD`, sin valores predeterminados ni credenciales
versionadas. El proceso rechaza sobrescribir un
administrador existente y registra el evento de auditoría. La contraseña no se
imprime en logs, documentación, imágenes Docker ni código fuente.

### Operaciones comunes, separadas por contexto

| Operación | Guest (BE-004) | Staff (C1 / BE-002) | Regla |
| --- | --- | --- | --- |
| Sesión actual | `GET /api/v1/guest-auth/session` | `GET /api/v1/staff-auth/session` | Requiere access token del mismo contexto. |
| Renovación | `POST /api/v1/guest-auth/refresh` | `POST /api/v1/staff-auth/refresh` | Usa refresh opaco del mismo contexto y lo rota. |
| Logout | `DELETE /api/v1/guest-auth/session` | `DELETE /api/v1/staff-auth/session` | Revoca solo esa sesión y su refresh token. |

La renovación y logout no aceptan un refresh token en JSON ni exponen su valor
al navegador. El BFF reenvía la cookie protegida o una credencial interna de
sesión equivalente. Las rutas Guest se implementan únicamente al completar el
intercambio Google de BE-004.

## Respuestas de sesión para BFF

El Backend puede entregar `access_token` únicamente a Next.js. El BFF nunca lo
serializa hacia componentes cliente ni lo escribe en storage del navegador.

```json
{
  "access_token": "bff-only-jwt",
  "expires_in": 900,
  "session": {
    "context": "GUEST",
    "session_id": "session-id",
    "account": {
      "account_id": "guest-account-id",
      "email": "guest@example.com",
      "external_identities": []
    }
  }
}
```

La respuesta Guest existe únicamente después del flujo Google de BE-004. Para
`STAFF`, la respuesta C1 contiene solo `context`, `session_id`, `user_id` y
`role_ids`. El nombre visible, permisos y memberships de la fixture Web se
incorporan en C2 junto con BE-003, porque dependen de autorización y property
scope vigentes.

## JWT y refresh token

| Elemento | Regla propuesta |
| --- | --- |
| Access JWT | Duración de 15 minutos; `iss`, `aud`, `sub`, `sid`, `ctx`, `iat`, `exp`, `jti`; Staff incluye un `role_code`. |
| Audiencia | Distinta para Guest y Staff; un token de un contexto se rechaza en el otro. |
| Datos prohibidos | Contraseña, refresh token, PAN, CVV, saldos, profile completo, memberships o permisos mutables. |
| Refresh token | Opaco, 7 días como máximo, hash almacenado, rotación por uso, familia y revocación ante reutilización. |
| Logout | Revocación persistente de la sesión y refresh token del contexto correspondiente. |

## Modelo persistente mínimo propuesto

El changeset `003-staff-auth-001` de Liquibase materializa estos conceptos en
`staff_users`, `auth_sessions`, `refresh_tokens` y `auth_audit_events`, sin unir
Guest con Staff:

- `GuestAccount` y sus identidades externas; sin `GuestProfile` embebido.
- Identidad Staff local y sus credenciales hasheadas.
- Sesión autenticada por contexto, con estado, expiración y revocación.
- Refresh token opaco hasheado, familia, expiración, rotación y revocación.

Los roles, permissions y memberships Staff se modelan en BE-003. No se debe
copiar el catálogo mock de Private-07 como política de seguridad real.

## Decisiones requeridas para aprobar C1

1. **Resuelto:** una reserva puntual usa correo sin cuenta. La cuenta Guest y
   acceso al historial se realizan exclusivamente mediante Google en BE-004.
2. **Resuelto:** Staff no se autorregistra; el hotel provisiona `username` y
   contraseña, asigna exactamente un rol y gestiona sus restablecimientos.
3. **Resuelto:** `SUPER_ADMIN` tiene todas las funciones y todas las propiedades
   activas mediante scope explícito; se provisiona una vez con secretos de
   despliegue, sin credenciales fijas en el repositorio.
4. **Resuelto:** Staff y `SUPER_ADMIN` registran correo laboral como contacto,
   sin recuperación autónoma de contraseña.
5. **Resuelto:** el BFF conserva access y refresh en cookies separadas
   `HttpOnly`; los Route Handlers las usan en servidor, nunca JavaScript.
6. **Resuelto:** MFA Guest se delega a Google; no hay MFA local Staff en esta
   primera versión.
7. **Resuelto:** una reserva pasada requiere cuenta Google, referencia de reserva
   y desafío de un solo uso al correo registrado antes de vincularse.
8. **Resuelto:** C1 queda aprobado para BE-002 Staff. La sesión Guest solo se
   implementará al completar Google/OIDC en BE-004.

## Fuera de alcance

- Google/OIDC, vinculación de cuenta Guest y callback: BE-004.
- `ALL_PROPERTIES`, permisos efectivos y memberships Staff: BE-003.
- Endpoints de Account, Profile, Reservations, Rewards y Security Center.
- Migraciones, controladores o DTOs Java hasta que C1 sea aprobado.

## Aprobación de C1

**Fecha:** 2026-09-29
**Aprobó:** Product Owner / conversación de proyecto

C1 autoriza implementar el modelo Staff, credenciales hasheadas, sesión Staff,
JWT interno, refresh token opaco rotativo, logout y bootstrap de `SUPER_ADMIN`.
No autoriza OAuth Google, sesión Guest, vinculación de reservas ni property
scope operativo; esos alcances permanecen en BE-004 y BE-003.

## Addendum BE-005-AUTH-API-01 — rutas explícitas compatibles

Implementación autorizada por el usuario el 2026-10-05; entrega EN_QA hasta QA
manual PASS. [Incremento y evidencia](40_EXPLICIT_AUTH_ENDPOINTS_INCREMENT.md),
[QA específica](41_EXPLICIT_AUTH_ENDPOINTS_QA.md).

Staff agrega POST `/api/v1/staff-auth/login` (201, mismo StaffLoginRequest y
StaffAuthResponse), POST `/api/v1/staff-auth/logout` (Bearer Staff, 204 sin cuerpo)
y GET `/api/v1/staff-auth/me` (Bearer Staff, sesión C2 actual). Reutilizan los
handlers existentes; POST sessions y GET/DELETE session permanecen compatibles,
con `deprecated` exclusivamente en OpenAPI y sin fecha de retirada. Refresh
permanece en POST refresh con cookie pms_staff_refresh. No cambia identidad,
JWT, refresh, auditoría, permisos ni semántica de sesión; no modifica el BFF.
