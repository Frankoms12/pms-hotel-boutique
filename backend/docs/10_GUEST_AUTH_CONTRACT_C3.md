# C3 — Guest Auth con Google OIDC y BFF

## Ajuste QA posterior — existentes sin email, EN_QA

Decisión aprobada por Alan: GuestAccount existente (password, Google o DISABLED, email trim/lowercase) conserva202 `{requestId}` sin OTP, delivery, Resend, credential, identity, sesión ni auto-link. Se conserva únicamente una continuación opaca INVALID, ligada al binding/expiry, sin password_hash ni otp_hash: no es challenge utilizable. Verify devuelve error422 seguro; resend puede aceptar202 genérico sin generar OTP ni enviar. No hay correo informativo de acceso.

El coste BCrypt y la semántica HTTP/UI se mantienen genéricos. Cooldown60s, cuotas3 solicitudes/email/hora y10/día e intentos5 se aplican indistintamente a ambos caminos; solo las solicitudes reales crean email delivery. Nuevo changeset `003-guest-registration-request-quota-011`: `guest_registration_request_events` separa rate-budget de envíos, migra presupuestos previos desde deliveries y evita que diferencias en429 revelen existencia. No modifica changesets aplicados. Cuenta nueva conserva su flujo OTP real y verify atómico previo.

La pantalla202 es neutral: “Revisa tu correo”; si puede continuarse recibirá código; si ya tiene cuenta debe iniciar sesión con método habitual. Acciones Verificar código / Ir a iniciar sesión / Reenviar código y Volver. Ir a iniciar sesión cambia de tab en memoria, sin Backend/password/OTP ni storage. BFF no recibe flag de existencia; requestId/binding/cookies permanecen separados de Staff.

## AUTH-GUEST-REG-HISTORY-01 — decisión vigente (2026-10-07), EN_QA

**Regla anterior (superseded para coincidencias verificadas):** confirmationCode + OTP obligatorio para todo historical link.
**Regla nueva aprobada por Alan:** verified Guest email auto-links compatible reservations; reservation-specific OTP remains manual fallback. La coincidencia utiliza únicamente Reservation.bookingGuest → GuestProfile.email con trim/lowercase; sin filtro de fecha, estado o property ACTIVE. Nunca acompañantes ni IDs elegidos por cliente. Links propios se conservan; conflictos ajenos se omiten/auditan, sin transferencia/UPDATE/DELETE. Las consultas Guest siguen autorizadas exclusivamente por links persistidos.

Registro real exclusivamente Guest: email requerido/formato/max50 normalizado, password8..50 sin trim/normalización/composición, confirmación exacta solo Web. Sin nombre, marketing ni aceptación persistida de términos. Login conserva sus límites previos y no recibe mínimo8. Cuenta password/Google/DISABLED existente no se sobrescribe ni fusiona. `/acceso` único; Google nuevo usa el mismo auto-link tras OIDC verificado, sin OTP extra.

Pending registration separado, hash BCrypt(12), binding HttpOnly BFF y OTP8 con HMAC por propósito/generación. TTL OTP10min, contexto30min, cinco intentos compartidos contra reinicios, resend60s, 3 envíos/email/hora y 10/email/día. 202 genérico no acredita existencia ni envío. Verify atómico crea cuenta/credential/proof/links/sesión y consume pending; sin OTP/password/tokens en claro persistidos. Prueba de email separada respalda N links; evidencia OTP manual histórica y append-only preservados.

Backend: POST `/api/v1/guest-auth/registrations`, `/verify`, `/resend`; verify201 tokens exclusivamente al BFF, errores400/403/422/429/503 genéricos. Header secreto `X-Guest-Registration-Binding` server-to-server. Browser: `/api/auth/guest/registrations` y mismas acciones; tokens únicamente cookies Guest. F5 recupera contexto HttpOnly; Backend siempre revalida. Account Summary refleja count y próxima estadía tras commit; no implementa historial completo.

Guest auth real con ambos flags de datos mock. Logout Guest confirmado → `/acceso`; fallo conserva sesión. Bootstrap401 → un refresh Guest deduplicado → un retry; segundo401 signed-out; red/5xx/mapping error recuperable. Staff implementación/destino `/` preservados, caches separados.

### Contrato HTTP de registro

| Método / ruta | Request | Éxito | Boundary |
|---|---|---|---|
| POST `/api/v1/guest-auth/registrations` | `{email,password}` | 202 `{requestId}` | BFF genera binding aleatorio; cuenta existente/pending/new indistinguibles |
| POST `/api/v1/guest-auth/registrations/verify` | `{requestId,otp}` | 201 `GuestAuthResponse` | binding requerido, OTP8, cuenta/sesión solo después del commit |
| POST `/api/v1/guest-auth/registrations/resend` | `{requestId}` | 202 sin payload | binding requerido; generación nueva, intentos conservados |

Campos adicionales rechazados (400), incluyendo IDs de cuenta/property/reservation/profile. Password y OTP writeOnly; password8..50 solo registro, email format/email max50, OTP exactamente8 dígitos. Errores seguros: 400 formato/límites, 403 contexto/binding inválido, 422 OTP/contexto inválido/expirado/consumido/bloqueado, 429 cuotas/cooldown, 503 infraestructura. Los 5xx nunca se convierten en credenciales inválidas. La entrega es asíncrona después de persistir: 202 no garantiza envío; un fallo de entrega deja challenge UNKNOWN, sin cuenta utilizable y con opción de resend sujeto a cuotas.

Cookie de continuación `pms_guest_registration`, HttpOnly, SameSite=Lax, Secure en producción, Path=/ para SSR `/acceso`, TTL30min; contiene UUID/binding/expiry exclusivamente dentro de cookie. La vista recibe solo requestId. Origin debe coincidir con PMS_WEB_PUBLIC_URL. F5 restaura la vista sin storage ni password/OTP; verify/resend revalidan persistencia, binding, estado, vencimiento y presupuesto. Browser verify devuelve únicamente `{authenticated:true,context:"GUEST"}` y aplica cookies Guest, borra continuación y refetchea sesión/summary antes de `/cuenta`.

Migraciones append-only: `003-guest-registration-010` y `004-verified-email-history-009`; tablas pending/deliveries/proof separadas, índice normalizado GuestProfile y provenance exclusiva por fuente. Filas previas quedan RESERVATION_OTP; una proof VERIFIED_EMAIL puede respaldar N Reservation. No hay nueva autoridad del Account Summary ni transferencia de ownership. No se editan changesets históricos.

**QA pendiente:** confirmación manual de Alan, entrega real Resend y configuración HMAC del entorno. Decisión posterior aprobada por Alan: registration8..50 caracteres y máximo72 bytes UTF-8 reales; login conserva máximo50 sin mínimo8 y rechaza >72 bytes con credenciales genéricas antes de BCrypt. Sin trim/lowercase/Unicode normalization/truncamiento. BCrypt(12) intacto; límite resuelto, sin cambios a sesiones Staff. OpenAPI/Postman, tests y resultados finales se registran en AlanHandoff. Ninguna entrada histórica inferior declara vigente una regla sustituida aquí.


**Actualización aprobada AUTH-UNIFIED-01 (2026-10-06):**
[Contrato vigente](44_UNIFIED_LOGIN_CONTRACT_QA.md): login tradicional universal correo electrónico + contraseña;
Guest/Staff separados, Google solo Guest e invitado público. Guest password solo
para cuentas con credential existente; sin registro/recuperación/cambio/MFA.
`/acceso` tiene un formulario único en http://localhost:3001. Las decisiones y
pruebas de simulación/registro anteriores se conservan como contexto histórico;
no representan el login vigente. UI/BFF nunca exponen JWT al JavaScript.


**Estado:** APPROVED
**Fecha:** 2026-09-29

## Flujo y responsabilidades

```text
Browser -> Next.js BFF -> Spring Boot -> Google / PostgreSQL
```

1. `GET /api/auth/guest/google` en Next.js llama al Backend para crear una
   transacción OIDC y redirige al navegador a Google.
2. Google redirige a
   `/api/auth/guest/google/callback` de Next.js con `code` y `state`.
3. El BFF entrega ambos valores al Backend. El Backend valida la transacción,
   canjea el código, valida firma, `iss`, `aud`, `nonce`, expiración y
   `email_verified=true` del ID token de Google.
4. El Backend crea o resuelve `GuestAccount`/`GuestIdentity`, crea la sesión
   Guest y devuelve tokens solo al BFF.
5. Next.js coloca las cookies y redirige al destino local seguro. El navegador
   nunca lee tokens ni secretos de Google.

El Backend genera y conserva `state`, `nonce` y PKCE; los tres son de un solo
uso y expiran en 10 minutos. El BFF no interpreta ni acepta datos de Google
como identidad confiable.

## Configuración de despliegue

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
PMS_WEB_PUBLIC_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
PMS_RESERVATION_LINK_OTP_HMAC_KEY
```

Desarrollo configura `GOOGLE_REDIRECT_URI` y `PMS_WEB_PUBLIC_URL` con el
mismo host y puerto local; por defecto usan
`http://localhost:3001/api/auth/guest/google/callback` y
`http://localhost:3001`. Producción usa
`https://{GUEST_WEB_HOST}/api/auth/guest/google/callback`; el host real queda
pendiente de despliegue. Secretos nunca se versionan ni se devuelven en API.

## Cuenta y sesión Guest

`GuestAccount` guarda UUID, correo verificado, estado y timestamps.
`GuestIdentity` es agnóstica al proveedor y guarda `provider=GOOGLE` y el
`providerSubject` (`sub`), único por proveedor. No persiste nombre, apellidos
ni fotografía de Google. `GuestAccount` no es `GuestProfile` ni membership
administrativa.

Las cookies BFF son host-only, `HttpOnly`, `SameSite=Lax` y `Secure` en HTTPS:

| Cookie | TTL | Path |
| --- | --- | --- |
| `pms_guest_access` | 15 minutos | `/` |
| `pms_guest_refresh` | 7 días | `/api/auth/guest/refresh` |

El refresh es opaco, hasheado, de una familia y rota en cada uso. Guest y Staff
no comparten tokens, sesiones, refresh tokens, audiencias, cookies ni logout.

## Vínculo de reservas históricas

La regla aprobada es `confirmationCode` + correo Google verificado + OTP
hasheado enviado al correo de la reserva. El OTP dura 10 minutos, es de un solo
uso, tiene 5 intentos y reenvío mínimo de 60 segundos. Las respuestas externas
son genéricas y no revelan si existe la reserva ni su correo.

El Backend ya implementa el desafío, el vínculo autorizado y las rutas Guest
BFF-only de [BE-013B](31_BD1_HISTORICAL_RESERVATION_OTP_BACKEND_QA.md).
`ReservationLinkVerificationPort` usa el lookup interno seguro de Reservations;
el BFF Web del flujo OTP y la entrega real por Resend siguen pendientes de
integración/verificación. La clave HMAC de OTP debe configurarse en el entorno
de ejecución; el [preflight BE-016A](32_BD1_PRESENTATION_GOOGLE_RESEND_PREFLIGHT.md)
explica cómo comprobarlo sin revelar secretos.

## Endpoints Backend BFF-only

- `POST /api/v1/guest-auth/google/start`
- `POST /api/v1/guest-auth/google/exchange`
- `GET /api/v1/guest-auth/session`
- `POST /api/v1/guest-auth/refresh`
- `DELETE /api/v1/guest-auth/session`

Los endpoints están pensados para la red privada BFF→Backend. El contrato no
expone tokens en una respuesta consumida directamente por JavaScript.

## Addendum BE-005-AUTH-API-01 — me/logout compatibles

Implementación autorizada por el usuario el 2026-10-05; EN_QA hasta QA manual
PASS. GET `/api/v1/guest-auth/me` reutiliza GET session y devuelve la misma
GuestSessionResponse (guestAccountId/sessionId/email/context=GUEST), sin tokens,
GuestProfile ni permisos Staff. POST `/api/v1/guest-auth/logout` reutiliza DELETE
session y responde 204 sin cuerpo; ambos requieren Bearer Guest vigente.
GET/DELETE session permanecen compatibles, deprecated exclusivamente en OpenAPI.
Google start/exchange siguen siendo el único login Guest. Refresh conserva su
ruta/cookie pms_guest_refresh; ningún cambio en OIDC, JWT, sesiones, cookies BFF
o auditoría. Sin endpoint Guest login local.
[Contrato/evidencia](40_EXPLICIT_AUTH_ENDPOINTS_INCREMENT.md) y
[QA específica](41_EXPLICIT_AUTH_ENDPOINTS_QA.md).

## Addendum BE-004-ACCOUNT-SUMMARY-01 — resumen propio real

Implementación end-to-end autorizada por el usuario el 2026-10-06; entrega
separada de BE-005-AUTH-API-01 y EN_QA hasta QA manual final. GET
/api/v1/guest-auth/account/summary obtiene identidad exclusivamente de
GuestPrincipal vigente. GuestAccount, perfiles asociados explícitamente y
vínculos OTP persistidos de la reserva son las fuentes autorizadas.
BFF GET /api/auth/guest/account/summary usa cookie Guest HttpOnly, sin
accountId del browser ni tokens JS. No muta cuenta/perfil/vínculo ni introduce
permisos Staff. Ausencia de perfiles/estancia próxima es válida; no infiere
titularidad por correo/perfil compartido. Rewards/finanzas/promociones/mensajes
quedan fuera del contrato real. [Contrato y QA 42](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md).

## Límite final del login password — AUTH-UNIFIED-01

Staff, Guest y fachada usan email required/NotBlank, formato email, máximo 50
tras trim/lowercase; password required/NotBlank, máximo 50, intacta (sin trim,
lowercase ni complejidad nueva). HTML/validación Web, BFF, DTOs, servicios y
OpenAPI alineados; format email/password y password writeOnly. El máximo de login
no reduce GuestAccount.email varchar(320) ni credential.password_hash varchar(255).
BCrypt(12) sin cambios. Google Guest/OIDC permanece independiente de este límite
para las credenciales del login tradicional. AUTH-UNIFIED-01 COMPLETADA tras QA
manual PASS de Alan (2026-10-06) en http://localhost:3001, incluido Guest demo,
límites50, aislamiento, Google Guest completo y continuar como invitado.
Cierre y alcance: [guía44](44_UNIFIED_LOGIN_CONTRACT_QA.md).


## Boundary email — selección SMTP/Resend (AUTH-GUEST-REG-HISTORY-01, EN_QA)

`EmailSender` mantiene el contrato para registro y OTP manual. `PMS_EMAIL_PROVIDER`
selecciona `resend` (default compatible) o `smtp`; no fallback automático entre
providers ni modificación del202 anti-enumeration/OTP/cuotas.

SMTP requiere `PMS_SMTP_HOST`, `PMS_SMTP_PORT`, `PMS_SMTP_USERNAME`,
`PMS_SMTP_APP_PASSWORD`, `PMS_SMTP_FROM`. Seleccionar smtp con cualquier variable
vacía/ausente provoca fallo de arranque identificando solo su nombre; puerto
válido1..65535. Gmail QA: host `smtp.gmail.com`, puerto587, app password de la
cuenta y sender autorizado por ella, configurados localmente. No usar password
normal ni guardar credenciales en archivos versionados. STARTTLS enable/required,
SMTP AUTH y comprobación de identidad TLS son obligatorios; UTF8 y timeouts de
conexión5s/lectura10s/escritura10s. Debug SMTP desactivado. Errores de transporte
se reducen a error interno genérico sin causa con datos sensibles; el servicio
OTP conserva sus estados de delivery/fallo actuales.

Resend sigue usando `RESEND_API_KEY`/`RESEND_FROM_EMAIL` y su transporte anterior.
Para regresar a él: cambiar `PMS_EMAIL_PROVIDER=resend` y recrear Backend.
Compose integrado pasa las variables; Compose demo fuerza resend y SMTP vacío.
Readiness del hotel no prueba SMTP ni inicia conexiones periódicas al proveedor;
la configuración SMTP se valida al arrancar y el transporte al solicitar envío.
Los tests usan transporte mock/configuración sintética, sin correos externos.
QA real de OTP sigue manual y EN_QA; la limitación resend.dev aplica solo a Resend,
no confirma por sí misma disponibilidad/autorización Gmail.
