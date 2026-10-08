# 42 — Account Summary Guest real: contrato y QA

## AUTH-GUEST-REG-HISTORY-01 — decisión vigente (2026-10-07), EN_QA

**Regla anterior (superseded para coincidencias verificadas):** confirmationCode + OTP obligatorio para todo historical link.
**Regla nueva aprobada por Alan:** verified Guest email auto-links compatible reservations; reservation-specific OTP remains manual fallback. La coincidencia utiliza únicamente Reservation.bookingGuest → GuestProfile.email con trim/lowercase; sin filtro de fecha, estado o property ACTIVE. Nunca acompañantes ni IDs elegidos por cliente. Links propios se conservan; conflictos ajenos se omiten/auditan, sin transferencia/UPDATE/DELETE. Las consultas Guest siguen autorizadas exclusivamente por links persistidos.

Registro real exclusivamente Guest: email requerido/formato/max50 normalizado, password8..50 sin trim/normalización/composición, confirmación exacta solo Web. Sin nombre, marketing ni aceptación persistida de términos. Login conserva sus límites previos y no recibe mínimo8. Cuenta password/Google/DISABLED existente no se sobrescribe ni fusiona. `/acceso` único; Google nuevo usa el mismo auto-link tras OIDC verificado, sin OTP extra.

Pending registration separado, hash BCrypt(12), binding HttpOnly BFF y OTP8 con HMAC por propósito/generación. TTL OTP10min, contexto30min, cinco intentos compartidos contra reinicios, resend60s, 3 envíos/email/hora y 10/email/día. 202 genérico no acredita existencia ni envío. Verify atómico crea cuenta/credential/proof/links/sesión y consume pending; sin OTP/password/tokens en claro persistidos. Prueba de email separada respalda N links; evidencia OTP manual histórica y append-only preservados.

Backend: POST `/api/v1/guest-auth/registrations`, `/verify`, `/resend`; verify201 tokens exclusivamente al BFF, errores400/403/422/429/503 genéricos. Header secreto `X-Guest-Registration-Binding` server-to-server. Browser: `/api/auth/guest/registrations` y mismas acciones; tokens únicamente cookies Guest. F5 recupera contexto HttpOnly; Backend siempre revalida. Account Summary refleja count y próxima estadía tras commit; no implementa historial completo.

Guest auth real con ambos flags de datos mock. Logout Guest confirmado → `/acceso`; fallo conserva sesión. Bootstrap401 → un refresh Guest deduplicado → un retry; segundo401 signed-out; red/5xx/mapping error recuperable. Staff implementación/destino `/` preservados, caches separados.

**QA pendiente:** confirmación manual de Alan, entrega real Resend y configuración HMAC del entorno. Decisión posterior aprobada por Alan: registration8..50 caracteres y máximo72 bytes UTF-8 reales; login conserva máximo50 sin mínimo8 y rechaza >72 bytes con credenciales genéricas antes de BCrypt. Sin trim/lowercase/Unicode normalization/truncamiento. BCrypt(12) intacto; límite resuelto, sin cambios a sesiones Staff. OpenAPI/Postman, tests y resultados finales se registran en AlanHandoff. Ninguna entrada histórica inferior declara vigente una regla sustituida aquí.


**Incremento:** BE-004-ACCOUNT-SUMMARY-01. **Owner:** Alan/BD1 con Web; adaptador
Reservations BD3, revisiones colaborativas. **Autorización:** usuario, 2026-10-06.
Sin coincidencia de ID previa en AlanPlan/Handoff. DoR completo → READY →
EN_PROGRESO → EN_QA → COMPLETADA. **Estado vigente:** COMPLETADA (2026-10-06),
QA manual final real y visual PASS confirmado por el usuario.
BE-005-AUTH-API-01 también queda COMPLETADA.

## Cierre QA manual final (2026-10-06)

Confirmación manual final real del usuario, recibida el 2026-10-06.
Las entradas anteriores se conservan como historial; sus estados EN_QA y
pendientes quedan superados por este cierre. No se atribuye esta confirmación
a pruebas automatizadas ni se ejecutan nuevas implementaciones.

- `GET /api/auth/guest/account/summary` 200: **PASS**.
- Dashboard `/cuenta` renderiza datos reales: **PASS**.
- Ausencia de perfil/reservas presentada correctamente: **PASS**.
- Logout deja summary/session en 401: **PASS**.
- QA visual del rediseño: **PASS**.

Las features secundarias fuera de scope siguen sin integrarse; el cierre no
amplía Rewards, Promotions, Invoices ni Messages.

## Contrato

Backend GET /api/v1/guest-auth/account/summary, audiencia internal-bff y
guestBearerAuth. Sin request body/path/query de identidad. El prefijo respeta
el filtro Guest existente. GuestPrincipal revalidado → GuestAccount vigente →
lecturas propias en transacción read-only REPEATABLE_READ (count y estancia
comparten snapshot ante vínculos concurrentes). Cuenta deshabilitada/sesión revocada/JWT ausente/Staff: 401.
200 application/json; Cache-Control: private, no-store. Sin 404: la ausencia
de perfil/estancia es un resultado válido, la cuenta inválida es 401. Sin
mutación, auditoría nueva, migraciones ni reglas de autenticación nuevas.

BFF GET /api/auth/guest/account/summary, same-origin, lee pms_guest_access
HttpOnly y reenvía Bearer solo en servidor. 401 → 401; upstream no disponible
o fallo de transporte/contrato → 503. Sin tokens en respuesta. El request
del browser no lleva accountId; parámetros extra nunca seleccionan otra cuenta.

Response Backend/BFF:
- guestAccountId, email y active: guest_accounts, solo identidad de sesión.
- profiles: array (vacío permitido) de profileId/firstName/lastName/
  preferredLanguage nullable/status, de guest_profiles.guest_account_id.
  Hay N perfiles posibles: no elegir arbitrariamente uno ni enlazar por correo.
- linkedReservationsCount: count real de guest_reservation_links propios,
  unidos a reservations con el mismo property_id. Cero = ninguna vinculada.
- upcomingStay: null o reservationId/stayId/confirmationCode/arrival/departure.
  Próxima estancia RESERVED de reserva CONFIRMED con vínculo OTP propio;
  arrival desde el día actual de la zona de la propiedad. Orden arrival,
  confirmationCode, stayId. Fecha/sala de otras reservas no se infiere por perfil
  o correo. No informa cantidad de habitaciones físicas asignadas.

No profile derivado de OTP: L-02/L-07 autorizan solo la reserva específica.
Sin estancia elegible devuelve null, incluso si hay vínculos históricos.
Rewards/promotions/invoices/messages no forman parte del response real: no hay
contrato Guest autorizado para esas lecturas. No defaults Member/Gold/cantidades.
El dashboard presenta esas capacidades como pendientes sin bloquear la cuenta.
Edición de perfil, listado/detalle reservas, finanzas, programas y OTP Web siguen
fuera del alcance; las fixtures frontend-first se conservan solo en modo mock.

## DoR y aceptación

C3/BE-004 y L-01 a L-07/BE-013B aprobados; PostgreSQL y relaciones persistentes
confirmados en working tree. No decisión producto/seguridad faltante para esta
lectura mínima. Cuenta propia sin profile renderiza; N perfiles se representan
sin adjudicar uno principal; summary independiente de features secundarias.
Lecturas scopiadas en BD y port Guest hacia adaptador Reservations, sin
Browser → Backend directo ni nueva exposición de tokens.

Backend: PostgreSQL integration, perfil presente/ausente/N, identidad propia,
Staff/ausente/revocado/deshabilitado, UUID ajeno no seleccionable; vínculo OTP
real, no filtración por email/perfil, fechas/estado/timezone de próxima estancia.
OpenAPI mappings ↔ paths exactos, schema/nullability/security/responses/headers.
Web: summary 200, cuenta sola, perfiles, vacío de estancia, 401 coherente con
sesión, 503/red retry, no accountId ni tokens, mocks preservados. Verify completo,
suite Web, typecheck/lint/build, stack healthy y diff --check.

## QA manual final

Usar stack raíz y .env existentes sin modificarlos.

```sh
docker compose --env-file .env up -d --build
```

Abrir Web (puerto configurado, local 3001) → /acceso → Google → callback →
/cuenta. GET session 200 y GET /api/auth/guest/account/summary 200 deben mostrar
Mi cuenta/correo sin error de carga y sin reload. Si la cuenta no tiene profile,
mostrar ausencia real; reservas sin vínculo count 0 y upcomingStay null.
Inspeccionar JSON seguro sin copiar credenciales; logout UI → session/summary
401. Staff no se altera. 503/red muestra reintento; nunca sustituir por mock.
Swagger local 8081: GET summary visible, Bearer Guest, 200/401, perfiles array y
upcomingStay nullable; ninguna entrada accountId o credencial en body/query.
No acceder por email a reservas no vinculadas. Vínculos/perfiles presentes se
prueban solo con datos autorizados existentes, sin poblar el entorno con fake.

El consentimiento Google real y QA visual final requieren confirmación del
usuario. No simularlos como PASS con una cookie sintética o test OIDC stub.
Sin commit/push/merge; estado final EN_QA hasta PASS manual.

## Evidencia de entrega (2026-10-06) — EN_QA

- Backend focalizados: 31 PASS (summary PostgreSQL, OTP real y OpenAPI).
  Verify de la versión final: **385 PASS**, cero failures/errors/skipped,
  BUILD SUCCESS; `mvn -B --no-transfer-progress verify` en Compose de tests
  aislado, Java 21/PostgreSQL 17. Cubre lectura propia, perfiles N/ausentes,
  JWT ausente/Staff/revocado/cuenta deshabilitada, UUID extra ignorado, vínculos
  específicos, fechas/estado/timezone y falta de autorización por email/perfil.
  La prueba OTP existente comprueba que el vínculo real verificado aparece en
  summary sin asociar un perfil entero. No migraciones/dependencias nuevas.
- Web relevantes: **120 PASS/20 archivos**; suite completa **1055 PASS/214**.
  `npm run test -- src/modules/account src/modules/auth src/modules/profile
  src/app/api/auth/guest/account/summary src/app/providers.test.tsx`;
  `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
  Mock conserva fixtures/acciones anteriores. Revalidación Guest en summary
  401; 503/red retry, lista de perfiles, null stay, scope defensivo, no tokens,
  petición same-origin sin accountId/Bearer y whitelist BFF anidada probados.
- OpenAPI final: **35 operaciones/25 paths/32 schemas/10 tags**. Mappings exactos,
  ninguna exclusión; GET summary Guest/internal-bff, 200/401/cache y sin
  parámetros de identidad. Cinco legacy auth deprecated intactos. Nullabilidad
  corregida y cubierta: upcomingStay anyOf [objeto referenciado, null], según
  [Schema Object OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0.html#schema-object).
  No combinar un $ref de objeto con un type:null restrictivo. Validación vivo
  paths/components iguales a target/openapi-generated.json; doc/UI/config 200.
- Stack canónico actualizado con `docker compose --env-file .env up -d --build`:
  postgres/backend/web healthy; volumen integrado conservado, .env sin cambios.
  Web / y /cuenta 200; summary Backend y BFF sin credencial 401. Web resuelve
  backend:8080 y llega al summary interno (401 esperado sin JWT). Proyecto
  aislado pms_account_summary_verify retirado al terminar; Compose tests intacto.
- Preservación por hashes: .env, auth previo Web/Backend, JWT/filtros/cookies,
  helpers BFF, migraciones y Compose. next-env.d.ts generado por build se
  restituyó solo tras comprobar que su original coincidía con el snapshot.
  `git diff --check` PASS; sin commit/push/merge.
- Límites de evidencia: 200 autenticado Backend se prueba con PostgreSQL/MockMvc;
  dashboard/BFF 200 con tests HTTP/React/MSW. En el stack vivo se hicieron
  checks anónimos/infraestructura/contrato; **no se ejecutó consentimiento Google
  nuevo ni se fabricó una sesión en la BD integrada**. Google → summary 200 →
  dashboard renderizado → logout queda pendiente como QA manual del usuario.
  BE-004-ACCOUNT-SUMMARY-01 y BE-005-AUTH-API-01 permanecen EN_QA, no COMPLETADA.
- Logs locales sanitizados: /tmp/account-summary-backend-focused.log,
  account-summary-backend-verify.log, account-summary-web-focused.log,
  account-summary-web-suite.log, account-summary-typecheck.log,
  account-summary-lint.log, account-summary-web-build.log,
  account-summary-integrated-build.log y account-summary-runtime.log.
  Artefacto ignorado: backend/target/openapi-account-summary-integrated.json.

## Archivos de este incremento

Solo cambios respecto al snapshot del working tree inicial; cambios previos
de AUTH/Compose preservados.

- [backend/docs/10_GUEST_AUTH_CONTRACT_C3.md](../../backend/docs/10_GUEST_AUTH_CONTRACT_C3.md)
- [backend/docs/39_BACKEND_OPENAPI_BASELINE.md](../../backend/docs/39_BACKEND_OPENAPI_BASELINE.md)
- [backend/docs/41_EXPLICIT_AUTH_ENDPOINTS_QA.md](../../backend/docs/41_EXPLICIT_AUTH_ENDPOINTS_QA.md)
- [backend/docs/42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md](../../backend/docs/42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md)
- [backend/docs/AlanHandoff.md](../../backend/docs/AlanHandoff.md)
- [backend/docs/AlanPlan.md](../../backend/docs/AlanPlan.md)
- [backend/src/main/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiConfiguration.java](../../backend/src/main/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiConfiguration.java)
- [backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/api/GuestAccountController.java](../../backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/api/GuestAccountController.java)
- [backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/api/GuestAccountSummaryResponse.java](../../backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/api/GuestAccountSummaryResponse.java)
- [backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAccountSummaryPort.java](../../backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAccountSummaryPort.java)
- [backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAccountSummaryService.java](../../backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAccountSummaryService.java)
- [backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAccountSummaryView.java](../../backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAccountSummaryView.java)
- [backend/src/main/java/com/pms/hotelboutique/backend/modules/reservations/application/GuestAccountSummaryAdapter.java](../../backend/src/main/java/com/pms/hotelboutique/backend/modules/reservations/application/GuestAccountSummaryAdapter.java)
- [backend/src/test/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiContractIntegrationTests.java](../../backend/src/test/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiContractIntegrationTests.java)
- [backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/GuestAccountSummaryIntegrationTests.java](../../backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/GuestAccountSummaryIntegrationTests.java)
- [backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/ReservationLinkOtpIntegrationTests.java](../../backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/ReservationLinkOtpIntegrationTests.java)
- [frontend/pms-hotel-web/docs/33_PUBLIC_ACCOUNT_FRONTEND.md](../../frontend/pms-hotel-web/docs/33_PUBLIC_ACCOUNT_FRONTEND.md)
- [frontend/pms-hotel-web/src/app/api/auth/guest/account/summary/route.test.ts](../../frontend/pms-hotel-web/src/app/api/auth/guest/account/summary/route.test.ts)
- [frontend/pms-hotel-web/src/app/api/auth/guest/account/summary/route.ts](../../frontend/pms-hotel-web/src/app/api/auth/guest/account/summary/route.ts)
- [frontend/pms-hotel-web/src/data/mocks/account-fixtures.ts](../../frontend/pms-hotel-web/src/data/mocks/account-fixtures.ts)
- [frontend/pms-hotel-web/src/modules/account/components/account-dashboard-page.tsx](../../frontend/pms-hotel-web/src/modules/account/components/account-dashboard-page.tsx)
- [frontend/pms-hotel-web/src/modules/account/components/real-account-dashboard.test.tsx](../../frontend/pms-hotel-web/src/modules/account/components/real-account-dashboard.test.tsx)
- [frontend/pms-hotel-web/src/modules/account/dtos/account.dto.ts](../../frontend/pms-hotel-web/src/modules/account/dtos/account.dto.ts)
- [frontend/pms-hotel-web/src/modules/account/hooks/use-account-summary.ts](../../frontend/pms-hotel-web/src/modules/account/hooks/use-account-summary.ts)
- [frontend/pms-hotel-web/src/modules/account/mappers/account.mapper.test.ts](../../frontend/pms-hotel-web/src/modules/account/mappers/account.mapper.test.ts)
- [frontend/pms-hotel-web/src/modules/account/mappers/account.mapper.ts](../../frontend/pms-hotel-web/src/modules/account/mappers/account.mapper.ts)
- [frontend/pms-hotel-web/src/modules/account/mappers/real-account.mapper.test.ts](../../frontend/pms-hotel-web/src/modules/account/mappers/real-account.mapper.test.ts)
- [frontend/pms-hotel-web/src/modules/account/model/account.ts](../../frontend/pms-hotel-web/src/modules/account/model/account.ts)
- [frontend/pms-hotel-web/src/modules/account/service/account.service.ts](../../frontend/pms-hotel-web/src/modules/account/service/account.service.ts)
