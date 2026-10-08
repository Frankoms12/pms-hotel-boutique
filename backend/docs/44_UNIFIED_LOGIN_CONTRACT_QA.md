# Login universal y entorno local canónico — AUTH-UNIFIED-01

## AUTH-GUEST-REG-HISTORY-01 — decisión vigente (2026-10-07), EN_QA

**Regla anterior (superseded para coincidencias verificadas):** confirmationCode + OTP obligatorio para todo historical link.
**Regla nueva aprobada por Alan:** verified Guest email auto-links compatible reservations; reservation-specific OTP remains manual fallback. La coincidencia utiliza únicamente Reservation.bookingGuest → GuestProfile.email con trim/lowercase; sin filtro de fecha, estado o property ACTIVE. Nunca acompañantes ni IDs elegidos por cliente. Links propios se conservan; conflictos ajenos se omiten/auditan, sin transferencia/UPDATE/DELETE. Las consultas Guest siguen autorizadas exclusivamente por links persistidos.

Registro real exclusivamente Guest: email requerido/formato/max50 normalizado, password8..50 sin trim/normalización/composición, confirmación exacta solo Web. Sin nombre, marketing ni aceptación persistida de términos. Login conserva sus límites previos y no recibe mínimo8. Cuenta password/Google/DISABLED existente no se sobrescribe ni fusiona. `/acceso` único; Google nuevo usa el mismo auto-link tras OIDC verificado, sin OTP extra.

Pending registration separado, hash BCrypt(12), binding HttpOnly BFF y OTP8 con HMAC por propósito/generación. TTL OTP10min, contexto30min, cinco intentos compartidos contra reinicios, resend60s, 3 envíos/email/hora y 10/email/día. 202 genérico no acredita existencia ni envío. Verify atómico crea cuenta/credential/proof/links/sesión y consume pending; sin OTP/password/tokens en claro persistidos. Prueba de email separada respalda N links; evidencia OTP manual histórica y append-only preservados.

Backend: POST `/api/v1/guest-auth/registrations`, `/verify`, `/resend`; verify201 tokens exclusivamente al BFF, errores400/403/422/429/503 genéricos. Header secreto `X-Guest-Registration-Binding` server-to-server. Browser: `/api/auth/guest/registrations` y mismas acciones; tokens únicamente cookies Guest. F5 recupera contexto HttpOnly; Backend siempre revalida. Account Summary refleja count y próxima estadía tras commit; no implementa historial completo.

Guest auth real con ambos flags de datos mock. Logout Guest confirmado → `/acceso`; fallo conserva sesión. Bootstrap401 → un refresh Guest deduplicado → un retry; segundo401 signed-out; red/5xx/mapping error recuperable. Staff implementación/destino `/` preservados, caches separados.

**QA pendiente:** confirmación manual de Alan, entrega real Resend y configuración HMAC del entorno. Decisión posterior aprobada por Alan: registration8..50 caracteres y máximo72 bytes UTF-8 reales; login conserva máximo50 sin mínimo8 y rechaza >72 bytes con credenciales genéricas antes de BCrypt. Sin trim/lowercase/Unicode normalization/truncamiento. BCrypt(12) intacto; límite resuelto, sin cambios a sesiones Staff. OpenAPI/Postman, tests y resultados finales se registran en AlanHandoff. Ninguna entrada histórica inferior declara vigente una regla sustituida aquí.


Decisiones aprobadas por Alan el 2026-10-06 en la solicitud de implementación.
Owner: Alan / BD1; consumidores/reviewers: Web y Android (seguimiento).
Rama: `feature/auth-unified-login-port-standardization`; base main `2e387a3` (PR #133).

## Cierre — COMPLETADA (2026-10-06)

Alan confirmó **QA manual PASS** en **http://localhost:3001** y aprobó este
incremento. Estado final: **EN_QA → COMPLETADA**.

- Staff demo y `qa_staff` SUPER_ADMIN: PASS; Guest demo: PASS.
- Dashboard Staff, aislamiento Guest/Staff y F5/restauración: PASS.
- Logout desde dashboard/calendario hacia `/` y botón Atrás sin recuperar
  sesión Staff: PASS.
- Email maxLength=50 con formato válido y password maxLength=50: PASS.
- Google Guest completo, continuar como invitado y puerto canónico 3001: PASS.

Evidencia técnica previa al cierre: Backend verify 478 PASS; Web 1323 PASS/242
archivos; typecheck, lint, build sin mocks, Compose y smoke Firefox PASS.
OpenAPI: 38 operaciones / 28 paths / 37 schemas / 11 tags, paridad PASS.
Los resultados de entregas anteriores se conservan debajo como historial técnico.
Este cierre solo actualiza documentación; no modifica funcionalidad ni autoriza
commit, push, merge o una nueva tarea. Registro/recuperación/cambio password/MFA
permanecen fuera del incremento.

## DoR y alcance aprobado

Staff Auth, Guest Google/session/refresh/logout, Account Summary y demo integrado están
COMPLETADOS en AlanPlan. No existe identidad central: StaffUser y GuestAccount son
independientes. Staff tiene work_email varchar(320), username interno, password_hash;
GuestAccount tiene email varchar(320) y GuestIdentity OIDC, sin contraseña.
Reutilizar BCryptPasswordEncoder(12), JWT/refresh/sesiones y cookies existentes.
No nuevas dependencias. Cambios previstos: auth api/application/persistence,
changeset nuevo 003/009, bootstrap demo, OpenAPI/Postman, BFF/UI/tests y docs/Compose.

## Contratos aprobados

- POST `/api/v1/staff-auth/sessions` y alias `/login`: `{email,password}`;
  201 StaffAuthResponse, 400 entrada inválida, 401 credenciales genéricas.
- POST `/api/v1/guest-auth/sessions`: `{email,password}`; 201 GuestAuthResponse,
  400 entrada inválida, 401 genérico (incluye Google-only/inactivo).
- POST `/api/v1/auth/sessions`: `{email,password,context?}`. Sin contexto valida
  ambos passwords antes de resolver; un contexto válido: 201 con context y tokens
  solo BFF; dos: 200 con contexts [STAFF,GUEST], sin sesión ni tokens. Selección
  explícita reenvía las credenciales en cuerpo y revalida ambos contextos; nunca
  conservar password en almacenamiento del navegador, URL o logs. Selección que no
  corresponde a una contraseña válida: 401 genérico. Nunca vincular cuentas por email.
- Todo login: email trim/lowercase Locale.ROOT antes de validación/lookup, max 50,
  password NotBlank/max 50/writeOnly; sin trim/lowercase/normalización ni complejidad
  nueva en login; BCrypt dummy para desconocidos/sin credential.
- Browser POST `/api/auth/login`: devuelve solo context/contexts/authenticated;
  establece exclusivamente las cookies existentes del contexto seleccionado.
  Errores 400 entrada inválida, 401 genérico, 403 origen ajeno, 503 backend indisponible. Sin JWT raw en JS.
- Google mantiene exclusivamente Guest. Invitado navega sin crear sesión ni limpiar
  carrito/search. `/acceso` tiene un solo formulario, sin registro/recuperación/MFA.

## Persistencia y entorno

Nuevo guest_password_credentials 1:1 GuestAccount: UUID FK/PK, hash y timestamps.
Staff ya posee índice normalizado único (003/005); se reutiliza. Nuevo índice
normalizado único Guest email; si hay colisiones,
la migración falla sin borrar/reescribir datos. No editar changesets aplicados.
Demo solo dev/demo + flag, excluye prod/production, preserva cuentas/hash existentes;
fixtures de credenciales sintéticas documentadas para uso local.
Web público fijo http://localhost:3001; Compose normal publica únicamente
127.0.0.1:3001:3000. Backend/PostgreSQL internos; debug mediante override explícito.
Next standalone dev/start usa -p 3001 y falla ante puerto ocupado.

## Aceptación / DoD y QA

Tests Staff/Guest/contextos/normalización/negativos/inactivos y regresión OIDC,
refresh/logout/me/RBAC/membership. Demo idempotente y bloqueado en producción.
Paridad OpenAPI real, schemas password writeOnly/security=[]/x-audience internal-bff,
Postman actualizado. Web formulario/estados/redirección/returnTo/carrito/Google.
Verify Backend Java21/Postgres17; tests Web, typecheck, lint, build sin mocks;
Compose config/up/ps y smoke HTTP/puertos; git diff --check.
QA manual PASS de Alan registrado en el cierre, incluido Google Guest completo.
El smoke técnico y la confirmación manual se registran como evidencias distintas.
Gaps aprobados: registro, forgot/reset/change password y MFA fuera del incremento.

## Contrato final de límites — COMPLETADA

Decisión final de Alan: email maxLength=50, password maxLength=50, idénticos en
Staff/Guest/fachada. Email trim antes de validación + lowercase para lookup;
password intacta, sin nuevas reglas de complejidad. Required/NotBlank en ambos.
No recortar entrada a 50 para aceptarla: 51 se rechaza; HTML evita normalmente
introducir el carácter 51. Validación Browser/BFF compartida, DTOs con @Email (patrón equivalente al Web type=email) y
@Size(max=50), servicio valida llamadas directas con Jakarta Validator sin
retener/serializar rejected credentials. OpenAPI formats email/password, máximo50,
password writeOnly. Columnas email320/hash255 y BCrypt(12) se conservan; no migration.
Las credenciales demo/qa_staff existentes caben en el límite nuevo.

Validación final de este contrato: Backend verify478 PASS, Web1317/241 archivos
PASS, focalizados Backend25 y Web207 PASS; typecheck/lint/build sin mocks PASS.
Una pasada bajo builds concurrentes tuvo timeout de carrito; rerun aislado15 PASS
y suite final completa PASS, sin cambiar timeout/config. OpenAPI vivo/generado
paths/components idénticos, 38/28/37/11; todos los inputs50/formats/writeOnly.
Compose final3 healthy, solo Web3001. Firefox real confirma HTML50, pulsación51
bloqueada, email válido50/malformado, BFF51→400, los tres usuarios/destinos/F5/
restore/logout, aislamiento e invitado con carrito real. Backend directo51 y
formato inválido400, credenciales desconocidas válidas50→401 (pasan validación).
Google Guest start307/OIDC y regresiones automatizadas PASS; flujo Google Guest
completo confirmado PASS por Alan. COMPLETADA, sin commit/push/merge.

Archivos específicos del ajuste final:

- Web: src/lib/login-input.ts (validación compartida Browser/BFF),
  src/lib/bff/login-credentials.ts, modules/auth/service/unified-login.service.ts,
  components/guest-access-page.tsx y auth-password-field.tsx.
- Backend: infrastructure/security/PasswordLoginValidator.java (boundary directo
  y excepción sin credenciales), DTOs StaffLoginRequest/GuestLoginRequest/
  UnifiedLoginRequest, servicios StaffAuthServiceImpl/GuestAuthServiceImpl y
  AuthInputExceptionHandler. Hashing/columnas/migraciones sin cambios.
- Pruebas: límites Browser/service/BFF/UI, UnifiedLoginIntegrationTests,
  OpenApiContractIntegrationTests y correos de fixtures auth/auditoría que superaban50.
  MockMvc no imprime credenciales al fallar estas regresiones.
- Docs: contratos Staff/Guest, OpenAPI baseline, Web Auth, guía44, AlanPlan/Handoff;
  descripciones de login en las siete colecciones Postman vigentes.

QA: probar correo válido50 y password1/50, rechazar51/vacío/email malformado,
trim/lowercase correo y espacios/especiales de password intactos. Repetir login
Staff/Guest/qa_staff, Google Guest, invitado/carrito, dashboard/cuenta, F5 y logout.

## Corrección UX de logout Staff — COMPLETADA

El onSuccess publicaba sesión null sin navegar, dejando la ruta privada bloqueada.
StaffBffSession ahora espera DELETE BFF, limpia sesión/cache Staff y usa replace("/").
Transición de salida solo tras éxito; error conserva sesión y ruta. Guest independiente
se conserva. No refresh ni cambio de guard: acceso directo sin auth sigue bloqueado.
Firefox confirma URL exacta / desde calendario/dashboard, history.length sin crecer,
Atrás bloqueado/Staff401 y sesión Guest coexistente200 tras logout Staff.

Regresiones: seis casos nuevos de navegación, caches, Guest, confirmación pendiente,
fallo, acceso directo y retorno privado; 23 focalizados PASS. Suite Web1323/242
archivos PASS, typecheck/lint PASS, Compose build/ps PASS y git diff --check PASS.
Alan confirmó manualmente: Stafflogin → calendario → logout → / → Atrás bloqueado,
y el mismo resultado desde dashboard. No permanece en guard tras logout explícito.
Rama/Backend/contratos/BFF/separación preservados, sin commit/push/merge; COMPLETADA.

## Guía QA y aceptación manual de Alan — PASS

El PASS confirmado y su alcance se registran en el cierre de este documento.
La guía siguiente se conserva para futuras regresiones; no implica QA pendiente.

Cuenta adicional de QA integrada provisionada por autorización expresa de Alan
(2026-10-06): `qa_staff`, correo `qa_staff@example.test`, rol `SUPER_ADMIN`, estado
`ACTIVE`, contraseña sintética `QA-Disposable-Staff-Only!2026`. Login por correo en
http://localhost:3001/acceso; membership activa en organización demo y asignación
activa a HB-GT-DEMO, permisos efectivos del rol existente. Alta transaccional con
hash del BCryptPasswordEncoder(12) del proyecto y auditoría STAFF_BOOTSTRAP_CREATED
SYSTEM/ORGANIZATION, detalle local_qa_provisioning. BFF login201/session200 y logout
de la sesión de prueba204 verificados. Provisionamiento puntual en el volumen local:
persiste con reinicios/rebuild, no es seed automático ni configuración productiva.

Usar el árbol actual de la rama feature, sin cambiar a main ni publicar cambios.
El procedimiento de README para main describe el QA integrado de la base publicada.

```bash
git status --short --branch
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

Abrir **http://localhost:3001/acceso** con una ventana limpia:

1. Guest `guest.demo@example.test` / `PmsDemoLocal2026!` → /cuenta; validar
   datos reales o estado vacío, refresh y logout. No simular perfil/reservas.
2. Staff `staff.demo@example.test` / `PmsDemoLocal2026!` → /dashboard; role
   RECEPCION, Property demo y permisos reales; refresh/logout.
3. Correo desconocido/password incorrecto/inactivo/sin credential → genérico,
   sin revelar contextos. Ambos passwords válidos → selector explícito;
   caso cubierto por fixtures aislados de tests, sin sembrar identidades extra en BD local.
4. Google real → callback → sesión Guest → retorno permitido; nunca sesión Staff.
   Cuenta Google-only sigue sin password si no tiene credential provisionada.
5. Invitado con carrito y criterios de búsqueda → journey público sin autenticación;
   confirmar campos manuales de checkout y conservación de selección.
6. Revisar teclado/loading/errores y un único formulario con Header/Footer públicos;
   sin Usuario/Username, registro ni recuperación simulados.
7. Inspeccionar puertos: solo Web 127.0.0.1:3001 en Compose raíz; puerto ocupado
   falla tanto Docker como npm dev, sin fallback.

Para Swagger/Postman: activar explícitamente compose.debug.yaml, usar
baseUrl=http://localhost:8081 y completar staffEmail/staffPassword,
guestEmail/guestPassword y authEmail/authPassword/authContext solo localmente.
Probar requests del folder AUTH-UNIFIED-01; borrar valores sensibles antes de exportar.
Volver al Compose raíz al terminar el tooling. QA manual de Alan PASS; COMPLETADA.

## Corrección QA Web Staff — 2026-10-06

Staff200 no montaba el dashboard porque el mapper Web rechazaba
SERVICE_REQUEST_INTAKE, permiso contractual agregado por changeset 003/006.
El guard presentaba ese DomainMappingError como «Sesión Staff requerida».
Guest401 simultáneo es esperado sin sesión Guest; providers y claves eran separados.
Backend y su DTO username/roleCode/permissions/memberships eran válidos.

Se corrige solo Web/BFF y documentación: mapper, guard, query Staff reutilizada,
restauración existente acotada a un refresh y retry con deduplicación concurrente,
cache/logout aislado, no-store y Backend5xx→503. Revalidación200 recupera UI;
background refetch conserva el dashboard. DTO inválido falla cerrado con mensaje
de carga, y solo401 definitivo representa ausencia de sesión.

24 regresiones nuevas; auth170 PASS; npm test1280/239 archivos, typecheck/lint/build
sin mocks PASS. Firefox real reproduce el defecto antes de reconstruir y verifica
después: login dashboard, Guest401 aislado, F5/focus, access ausente con refresh
válido (session401→refresh200 una vez→retry200), logout y F5 bloqueado. Sin refresh
o retry401 no hay loop (casos automatizados). Compose3 healthy, solo host3001.
El primer401 del F5 manual original no pudo atribuirse a una causa concreta; F5
con access válido en la reproducción inicial respondió200. No se asume Backend roto.

Alan confirmó manualmente dashboard, aislamiento y F5/restauración PASS. Las métricas
Private09 siguen siendo fixture y en modo real presentan error de datos, aunque
dashboard/identidad/scope Staff sí montan; integración de métricas fuera de auth.
Credenciales y límites UI/Backend/OpenAPI permanecen correo50/password50;
password no se recorta, no se aplican reglas de complejidad al login.

### Archivos de esta corrección (cambios previos preservados)

Todos los paths Web se resuelven bajo `frontend/pms-hotel-web/`:

- `src/modules/auth/mappers/staff-session.mapper.ts` y `.test.ts`.
- `src/modules/auth/service/staff-session.service.ts` y `.test.ts` (nuevo).
- `src/modules/auth/components/staff-session-provider.tsx`.
- `src/modules/auth/hooks/staff-session-query.ts` (nuevo),
  `use-staff-access-redirect.ts`, `use-unified-login.ts`.
- `src/app/api/auth/staff/session/route.ts`, `staff/refresh/route.ts`,
  `src/app/api/auth/auth-routes.test.ts`.
- `src/lib/http/client.ts` y `.test.ts`.
- `src/app/(private)/dashboard/auth-regression.test.tsx` (nuevo).
- `src/modules/auth/components/guest-access-page.test.tsx`,
  `guest-real-session.test.tsx` (límites/password y fixture de refresh).
- `docs/13_AUTH_AND_SESSIONS.md` y Backend docs `AlanPlan.md`, `AlanHandoff.md`,
  `44_UNIFIED_LOGIN_CONTRACT_QA.md`.

## Historial: evidencia técnica de la entrega inicial

Esta pasada precede a los ajustes finales de límites y logout. Sus conteos se
conservan como historial; los resultados finales y la aceptación están en el cierre.

Backend verify 475 PASS, Java21/PostgreSQL17 efímero, sin failures/errors/skipped.
Web 1256 PASS/237 archivos; focalizados finales 47 PASS. Typecheck/lint/build
NEXT_PUBLIC_USE_MOCK_API=false PASS. OpenAPI 12 pruebas PASS: vivo/generado
paths/components iguales, 38 operaciones / 28 paths / 37 schemas / 11 tags;
Swagger/config interno HTTP200, Credential/hash no API, todas passwords writeOnly.
Postman JSON y payloads email PASS; valor demo.profesor actualizado al correo real
sintético de su Compose de presentación, sin tocar username interno.
Compose config/up --build/ps PASS y tres servicios healthy; único host port Web
127.0.0.1:3001→3000, Backend/PostgreSQL internos. Dev ocupado EADDRINUSE3001 sin
fallback; probe Docker falla por port already allocated en 3001 (sin alternativa). Smoke BFF login/me/refresh/logout/aislamiento/negativos/Google start PASS;
Host 3000 sin listener PMS. Google callback completo y presentación manual estaban
pendientes en esta entrega inicial; Alan confirmó después el QA manual PASS
registrado en el cierre. Estado vigente COMPLETADA; sin commit/push/merge.
