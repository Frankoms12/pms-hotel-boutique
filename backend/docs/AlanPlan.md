# AlanPlan — Seguimiento Backend

## AUTH-GUEST-REG-HISTORY-01 — Registro Guest verificado e historial

- **Estado:** COMPLETADA; implementación y QA automatizado PASS. Alan confirmó QA manual final PASS y autorizó el cierre del incremento.
- **QA manual final:** PASS confirmado por Alan: 1 reserva histórica con el mismo email verificado se vincula; N reservas compatibles con ese email se vinculan todas; email distinto → 0 links; un link de otra GuestAccount no se transfiere; Account Summary lee exclusivamente los `guest_reservation_links` persistidos.
- **Owner/rama/base:** Alan / BD1; `feature/guest-registration-verified-history`, base `6223196`; árbol inicial limpio. Sin commit/push/merge.
- **DoR/decisiones:** registro exclusivamente Guest email/password8..50 y máximo72 bytes UTF-8 reales, confirmación solo Web; sin nombre/marketing/consentimientos. Cuenta solo tras OTP8/10min/5 intentos; resend60s, 3/email/hora y 10/email/día. Login sin mínimo nuevo. Cookies/contextos separados.
- **Nueva regla aprobada:** email verificado auto-vincula todas las Reservation compatibles por bookingGuest.email trim/lowercase; sin filtro de fechas/estado/property ACTIVE. Sin transferencias; OTP manual complementario. Google nuevo reutiliza el puerto.
- **Alcance:** pending registration, evidencia verificada, provenance append-only, tres endpoints/BFF, UI OTP y F5, restore/logout Guest y mocks de datos sin autoridad auth; OpenAPI/Postman/docs/tests/migración.
- **Validación/DoD:** Backend731 PASS; Web1401 PASS/250 archivos; typecheck/lint/build sin mocks PASS; clean/upgrade/checksums, OpenAPI live/generated, Compose y diff-check PASS. Smoke auth/restore/summary/aislamiento HTTP PASS; QA manual final PASS confirmado por Alan. Evidencia técnica previa y límites históricos conservados en AlanHandoff.
- **Ajuste QA posterior aprobado:** existentes sin OTP/email delivery/Resend y sin cambios de cuenta;202 neutral con continuación no utilizable y cuotas indistinguibles. Web CTA PMS compartidos y vuelta a login en memoria. Nuevo011 de request-budget, checksums previos conservados.
- **Ajuste QA Web posterior:** copy neutral sin promesa de envío; guard Staff401 definitivo→`/`, revalidación al recuperar foco entre ventanas compartiendo cookies. Backend/OTP/Resend intactos; resend.dev conserva su limitación externa para el provider Resend alternativo; no bloquea este cierre manual.
- **Ajuste SMTP aprobado:** EmailSender admite smtp/resend por PMS_EMAIL_PROVIDER; SMTP requiere configuración completa al arrancar, AUTH+STARTTLS obligatorio, timeouts y errores sanitizados. Resend/default intacto. Backend verify743 PASS; Docker SMTP seleccionado/healthy; sin envíos reales automatizados.
- **Siguiente:** incremento cerrado tras QA manual PASS; cualquier publicación o trabajo adicional requiere autorización independiente. Sin commit/push/merge; Staff intacto.

## Propósito

Este archivo conserva el trabajo de Alan (BD1) y el seguimiento de BD2. Sustituye el uso
del XLSX para tareas Backend. Los mocks y DTOs de Web o Android no son contratos
Backend confirmados.

## Reserva pública — Juan / J6: endpoint HTTP de booking

- **Estado vigente:** COMPLETADA; QA técnico posterior a A4 PASS y QA manual
  PASS confirmado expresamente por Juan el 2026-10-08. Rama
  `feature/backend-public-booking-core`, commit `4c18940` publicado e integración
  `860d3bd` de main `308174d`; PR140 abierto como borrador.
- **Autorización vigente:** usuario solicitó integrar main y continuar J6;
  aprobó preservar ambos historiales de AlanHandoff y adaptar exclusivamente
  SecurityConfigurationIntegrationTests, PublicBookingPreJ6SecurityHttpIntegrationTests
  y OpenApiContractIntegrationTests al contrato J6. A4 permanece a cargo de Alan;
  SecurityConfiguration y configuración OpenAPI global se conservan como en main.
- **Alcance del cierre técnico:** los probes anteriores a J6 comprueban ahora
  INVALID_REQUEST400 sin JWT; la prueba global reconoce únicamente POST booking
  y GET availability como operaciones públicas de negocio. Pruebas propias J6
  con filtros reales, servidor HTTP aleatorio, PostgreSQL, snapshot/replay y
  Swagger; conservar regresiones de otros métodos, rutas vecinas y Staff.
  Contrato HTTP201 creación/replay y BOOKING_FAILED500 sin cambios.
- **Corrección propia J6:** al habilitar filtros reales, un header con control
  produce RequestRejectedException durante binding MVC. Advice exclusivo lo
  traduce a INVALID_REQUEST400, sin datos del header; ya no BOOKING_FAILED500.
  No reconfigurar firewall ni modificar reglas/globales de Alan.
- **Validación antes de PR143:** focalizados148 PASS (62 propios J6 y 86 regresión de
  core/seguridad/OpenAPI). `mvn -B --no-transfer-progress verify`: 794 PASS,
  cero failures/errors/skipped, BUILD SUCCESS y JAR generado. Maven3.9.11,
  Java21.0.9/PostgreSQL17.11; entorno pms-public-j6-qa aislado sin puertos del host.
  Primer focalizado detectó solo el header controlado500; corregido en advice y
  reejecutado sin debilitar assertions. Sin fallos pendientes ni warnings críticos;
  avisos preexistentes SpringDoc/agente JVM conservados sin modificar dependencias.
- **Evidencia HTTP/PG:** MockMvc con filtros y servidor HTTP real sin JWT201,
  snapshot PostgreSQL idéntica en replay201 sin nuevos pagos/reservas/stays,
  Swagger real/public, qty/fechas/UUIDs reales y roomId NULL. Errores aprobados,
  precio/pago/stock, rollback tardío/commit/exterior y concurrencia del core PASS.
  Paridad global PASS: 39 operaciones/29 paths/43 schemas/12 tags; vecinos Staff,
  otros métodos/paths y /error directo siguen protegidos. Configuración global
  preservada exactamente respecto de main.
- **Artefactos:** target/public-booking-j6-a4-focused-final.log,
  public-booking-j6-a4-verify.log, surefire-reports/OpenAPI/JAR J6-A4 ignorados.
  Diff-check/alcance y conservación de documentos ajenos PASS.
- **CI / entrega técnica:** implementación `4c18940` publicada con autorización;
  `verify-backend` y `verify-stack` PASS (2/2) sobre ese commit.
- **Integración posterior de main:** usuario autorizó integrar `2bfacba` (PR143)
  en la rama de Juan desde `f13df76`, conservando ambos historiales del handoff
  y ambas reglas de anonimato en OpenApiContractIntegrationTests: booking y
  Guest registration. Configuración global, migraciones, dependencias y Web
  importados intactos; código HTTP J6 idéntico al commit aceptado.
  `mvn -B --no-transfer-progress verify`: 832 PASS, cero failures/errors/skipped,
  BUILD SUCCESS y JAR generado, Java21.0.9/Maven3.9.11/PostgreSQL17.11 aislados.
  Paridad OpenAPI42ops/32paths/47schemas/13tags PASS, sin nuevas rutas de negocio
  público de Juan. Evidencia target/public-booking-j6-main143-verify.log y reportes.
- **QA manual / cierre:** Juan confirma expresamente «QA manual PASS» el
  2026-10-08 para J6, tras la lista de availability→booking, persistencia de
  Reservation/N stays/receipt, replay/conflicto/precio/stock/protección Staff/Swagger.
  DECLINED/ERROR permanecen cubiertos por fixtures del gateway simulado.
  Aceptación, DoD y revisión del alcance J6 registrados en AlanHandoff;
  el cierre de A4 y los estados de otras tareas no forman parte de esta confirmación.
- **Entrega / siguiente:** cierre documental `f13df76` publicado con autorización;
  merge local de main autorizado el 2026-10-08. Push de esta integración a
  feature/backend-public-booking-core, cambio de borrador y merge del PR140
  pendientes de autorización explícita. J6 conserva su QA manual PASS registrado.

### Primera entrega J6 — historial (2026-10-07)

- **Estado:** READY → EN_PROGRESO → EN_QA; integración A4 y QA manual pendientes.
  Juan / BD3, rama
  `feature/backend-public-booking-core`, base `738d428`. Usuario autorizó iniciar
  J6 y aprobó HTTP 201 tanto en creación como replay, y BOOKING_FAILED → 500
  (sin 503 en esta fase), el 2026-10-07. J3/J1/J2/J5/J4 siguen EN_QA sin QA manual PASS.
- **Contrato / alcance:** DOCX, secciones DTO/error/J6; POST exclusivo
  `/api/v1/public/bookings`, Idempotency-Key obligatorio, SIMULATED_CARD y DTOs
  existentes. Delegar en PublicBookingService; INVALID_REQUEST/INVALID_DATE_RANGE
  400, PROPERTY_NOT_FOUND 404, NO_AVAILABILITY/PRICE_CHANGED/IDEMPOTENCY_KEY_REUSED
  409, PAYMENT_DECLINED 422 y BOOKING_FAILED 500. Errores sin datos del request.
- **Archivos / límites:** controller/advice propios, metadata local de schemas y
  pruebas HTTP/PostgreSQL/OpenAPI J6; estas entradas propias, historial preservado.
  Sin migración, dependencia, cambio J1/J4/legacy o configuración global ajena.
  Cuatro documentos untracked ajenos intactos. PR #138 ya MERGED; main remoto
  `6223196`, origin/main local `d71c5a9`; no fetch/merge ni PR adicional.
- **Dependencia A4:** DOCX asigna a Alan abrir el matcher anónimo de booking y
  cerrar paridad global. Security actual mantiene POST autenticado; prueba global
  OpenAPI solo clasifica availability como pública. No editar esos archivos.
  Tests del controlador sin filtros se identificarán como tales; no equivalen a
  HTTP público operativo. Registrar cualquier fallo de verify sin ocultarlo.
- **DoD / siguiente:** requests/keys inválidos, IDs y snapshot persistidos,
  precio/pago/stock/replay/conflicto, no duplicados, rollback/concurrencia PG,
  Swagger local y rutas protegidas; verify Java21/PostgreSQL17, diff/alcance.
  Cierre integral depende de A4; EN_QA hasta confirmación manual PASS. Entrega
  parcial en commit exclusivo J6 con el fallo global declarado; push solo con
  autorización posterior. No presentar el commit como cierre del DoD integral.
- **Entrega / evidencia:** controller POST y advice exclusivo, DTOs existentes
  con cambios únicamente de metadata Swagger. Focalizados J6: 61 PASS (56 HTTP/PG
  con filtros desactivados solo en ese contexto y 5 OpenAPI/seguridad real).
  Incluyen campos desconocidos/tarjeta, fechas/keys/tipos numéricos inválidos,
  404/409/422/500, replay original aun con Property/catálogo alterados, snapshot
  PostgreSQL, no duplicados, rollback tardío y dos requests HTTP concurrentes.
- **Suite integral:** `mvn -B --no-transfer-progress verify`: 766 ejecutadas,
  765 PASS, 1 failure, 0 errors/skipped; BUILD FAILURE. Único fallo en
  OpenApiContractIntegrationTests.java:118, audiencia esperada staff frente a
  public de booking. No excluir/alterar la prueba ajena. Regresiones J1/J2/J3/J4/J5,
  pricing/inventario/rollback/concurrencia y restantes pruebas PASS.
- **Compilación / entorno:** `mvn -B --no-transfer-progress -DskipTests package`
  PASS y JAR generado; comprobación separada, no sustituye verify fallido.
  Maven3.9.11/Java21.0.9/PostgreSQL17.11, Compose aislado pms-public-j6-qa sin puertos.
  Logs `target/public-booking-j6-focused-final.log`, `public-booking-j6-verify.log`
  y `public-booking-j6-package.log`; reportes y OpenAPI generado J6 en target.
  Diff --check/alcance PASS; contenido previo de Alan intacto. Primera ejecución
  corrigió solo una aserción nueva: quantity > 0 usa exclusiveMinimum=0 en OAS3.1.
- **Bloqueo / siguiente:** matcher de POST sigue autenticado (401 anónimo) y
  paridad global pendiente de A4. Usuario confirmó explícitamente mantener A4
  con Alan (2026-10-07); no hay autorización para editar Security/configuración
  OpenAPI global/prueba global. Preparar commit independiente
  `feat(public-booking): expose public booking endpoint` con entrega parcial EN_QA
  y verificar su alcance; detenerse para autorización de push. Alan debe completar
  A4 y revalidar HTTP anónimo/paridad/verify; después QA manual PASS por el usuario.
  No declarar DoD integral PASS ni COMPLETADA.

## AUTH-UNIFIED-01 — Login universal y puerto canónico

- **Estado:** COMPLETADA; implementación y QA técnico PASS. Alan confirmó QA
  manual PASS y aprobó el incremento el 2026-10-06 en http://localhost:3001.
- **Autorización/DoR:** decisiones explícitas aprobadas por Alan (2026-10-06);
  Staff/Guest Auth, Account Summary y demo integrado COMPLETADOS.
- **Owner:** Alan / BD1; consumidores Web/Android como seguimiento.
- **Contrato/aceptación/archivos/guía QA:** [44](44_UNIFIED_LOGIN_CONTRACT_QA.md).
- **Base/rama:** main `2e387a3` PR #133, limpio antes de iniciar; rama
  `feature/auth-unified-login-port-standardization`. Sin commit/push/merge.
- **Entrega:** Staff email/password, Guest credential BCrypt(12) separado,
  fachada con selección posterior a password válido en ambos contextos;
  BFF/cookies separadas, /acceso único, demo idempotente dev/demo y puerto 3001 fijo.
  Reutiliza índice Staff 003/005 y sesiones JWT/refresh existentes. Nuevo changeset
  003/009 Guest; originales aplicados inmutables, OpenAPI/Postman actualizados.
- **Contrato final:** email required/formato/max50 tras trim/lowercase y password
  required/NotBlank/max50, intacta y sin complejidad nueva. HTML, Browser/BFF, DTOs,
  boundary de servicios, OpenAPI y Postman alineados; columnas/hash/BCrypt12 intactos.
- **Evidencia:** Backend verify Java21/PostgreSQL17: 478 PASS (12 OpenAPI y upgrade
  con checksums/colisiones); Web 1323 PASS/242 archivos, auth focalizados 207 PASS,
  typecheck/lint/build sin mocks PASS. Compose config/up/ps PASS, tres healthy,
  solo Web 127.0.0.1:3001→3000; dev conflicto EADDRINUSE 3001 y Docker port already allocated, sin fallback.
  Smoke BFF Guest/Staff/me/refresh/logout/aislamiento/errores/Google start PASS.
  OpenAPI vivo idéntico en paths/components: 38 ops/28 paths/37 schemas/11 tags.
  Límites finales: focalizados Backend25 PASS; Firefox real max50/caracter51,
  Staff/Guest/qa_staff, destinos/F5/restore/logout y guest cart/invitado PASS;
  Backend51/formato inválido400 y metadata50/50 confirmados. Una pasada con timeout
  de carrito bajo carga tuvo rerun aislado y suite final PASS sin ampliar timeouts.
- **Corrección QA Web:** mapper rechazaba SERVICE_REQUEST_INTAKE de Recepción con
  Staff HTTP200; guard confundía mapping/transporte con sesión ausente. Guest401
  esperado, sin cache/estado compartido. Consulta Staff única y restore acotado;
  24 regresiones nuevas. Firefox real/Docker: login/dashboard, Guest401 aislado,
  F5/focus, access ausente + refresh válido (401→refresh200→retry200), logout PASS.
  Sin cambios adicionales en código/contratos/migraciones Backend por esta corrección.
- **Aceptación manual:** Staff demo, qa_staff SUPER_ADMIN, Guest demo, dashboard,
  aislamiento, F5/restauración, logout dashboard/calendario→Home y Atrás protegido
  PASS; email formato/max50, password max50, Google Guest completo, invitado y
  puerto canónico 3001 PASS. Cierre registrado en guía 44 y AlanHandoff.
- **Siguiente:** esperar autorización para una nueva tarea o publicación.
  Registro/recuperación/cambio password/MFA fuera de este incremento;
  ninguna sesión Guest/Staff fusionada. Sin commit/push/merge.

- **Último ajuste UX:** logout Staff confirmado limpia sesión/caches y replace("/")
  desde cualquier ruta privada; fallo no limpia/navega. Seis regresiones nuevas,
  focalizados23 PASS; Firefox calendario/dashboard→Home exacto, Atrás bloqueado,
  Guest coexistente preservado y acceso directo sin auth protegido.
  Logout y Atrás confirmados PASS por Alan; COMPLETADA.

## Estado de tareas

```text
PENDIENTE -> READY -> EN_PROGRESO -> EN_QA -> COMPLETADA
```

Una tarea solo pasa a `COMPLETADA` con aceptación, DoD y revisión registrados
en `AlanHandoff.md`.

Desde BE-013B-BACKEND-01, cada ruta HTTP nueva de BD1 se agrega a
`postman/BD1-Backend-APIs.postman_collection.json` con variables sin secretos y
se documenta su ejecución manual en la guía QA de la tarea.

## Decisiones vigentes

| Área | Decisión |
| --- | --- |
| Arquitectura | Monolito modular Spring Boot, por capas dentro de cada módulo. |
| Persistencia | PostgreSQL y Liquibase; Hibernate valida, no crea tablas. |
| Seguridad | Spring Security, JWT interno, OAuth2/OIDC y refresh tokens. |
| Web | Next.js funciona como BFF; tokens no se exponen al navegador. |
| Runtime local | `docker compose up --build` desde raíz levanta Web, Backend y PostgreSQL. |
| Sesiones | Guest y Staff son contextos separados. |
| Scope | `ALL_PROPERTIES` es el conjunto autorizado de la sesión. |

## Reserva pública — A4 post-J6: cierre (2026-10-08)

- **Estado vigente:** COMPLETADA; cierre técnico PASS y QA manual post-J6 PASS
  confirmado explícitamente por Alan el 2026-10-08. Aceptación y DoD A4 PASS;
  la confirmación corresponde a A4, independiente del cierre propio de J6.
- **QA manual final / evidencia:** stack local actual, fixture HB-GT-DEMO:
  availability real → creación201; replay201 con respuesta idéntica y conteos
  sin cambios; PostgreSQL confirma1 Reservation CONFIRMED +2 stays RESERVED
  sin habitación +1 recibo. Reserva `495bbced-44b2-4de5-8873-2da31e79f5a9`,
  código `TCUBZR9SBM`, total260000 minor GTQ. Staff anónimo401 y Swagger live
  PASS: audiencia pública availability/bookings y respuestas201/400/404/409/
  422/500 comprobadas. Alan aportó resultados de terminal y confirmó
  «QA manual A4 post-J6: PASS». Sin tokens/cookies/secretos registrados.
- **Owner/rama/base:** Alan / BD1; `qa/a4-public-booking-post-j6`, árbol inicial
  limpio, HEAD/main/origin/main `aafdb7b` (PR140 integrado). A1-A3 y núcleo
  J1-J5 disponibles; J6 COMPLETADA según su aceptación propia.
- **Alcance autorizado:** validar únicamente availability pública real → booking,
  anonimato exacto por método/path, vecinos/Staff protegidos, errores aprobados,
  OpenAPI/Swagger live/generated y persistencia/replay. Sin defecto encontrado;
  sin cambios de código, tests, producto, migraciones, dependencias ni Web.
- **Pruebas ejecutadas:** nueve clases focalizadas de availability, J6/core,
  recibos, Security y OpenAPI: `mvn -o -B --no-transfer-progress -Dtest=... test`
  184 PASS. `mvn -o -B --no-transfer-progress verify` completo:832 PASS,
  cero failures/errors/skipped, BUILD SUCCESS y JAR generado. Maven3.9.11,
  Java21.0.9/PostgreSQL17.11 en Compose desechable sin puertos del host.
  Avisos SpringDoc y agente JVM preexistentes; sin fallos pendientes.
- **HTTP/SQL real:** JAR recién validado, catálogo demo existente aislado:
  GET availability anónimo200 con6 ofertas → POST booking201 (STD×2/DLX×1,
  dos noches,430000 minor GTQ). PostgreSQL confirma1 Reservation CONFIRMED,
  3 stays RESERVED con UUIDs/fechas/tipos reales y roomId NULL,1 GuestProfile,
  1 receipt y4 eventos de auditoría. Replay201 devuelve snapshot/referencia
  simulada idénticos; todos los conteos permanecen iguales. ATS posterior
  STD2/DLX3, sin consumo adicional en replay; no crea GuestAccount/Folio.
- **Seguridad/errores:** smoke automatizado45 checks PASS sin JWT/cookies;
  GET bookings y POST availability, PUT/PATCH/DELETE/HEAD/OPTIONS de ambos,
  vecinos/trailing slash/Staff y /error directo probados401. Respuestas
  públicas sin Set-Cookie. HTTP real400 INVALID_REQUEST/INVALID_DATE_RANGE,
  404 PROPERTY_NOT_FOUND,409 PRICE_CHANGED/NO_AVAILABILITY/IDEMPOTENCY_KEY_REUSED
  y500 BOOKING_FAILED, sin escrituras parciales.422 PAYMENT_DECLINED y ERROR
  de gateway500 cubiertos por fixtures de integración existentes; sin selector
  de fallos en runtime. No se altera la superficie Auth/BFF aprobada.
- **OpenAPI:** live y generado coinciden en paths, schemas, security schemes
  y tags; mappings reales sin exclusiones coinciden:42 operaciones/32 paths/
  47 schemas/13 tags. Solo GET availability y POST bookings tienen audiencia
  de negocio public, sin requisito de auth; booking documenta201/400/404/409/
  422/500 y clave obligatoria. Swagger HTML/config200.
- **Evidencia:** `target/a4-postj6-focused.log`, `a4-postj6-focused-reports/`,
  `a4-postj6-verify.log`, `surefire-reports/`, `openapi-generated.json`,
  `openapi-application-mappings.txt`, `a4-postj6-openapi-live.json` y
  `a4-postj6-runtime-smoke.json/log` ignorados. Smoke sobre BD tmpfs aislada;
  entornos QA retirados, stack/base del hotel conservados. No equivale a QA
  manual ni visual de Alan. `git diff --check` PASS; solo estos dos docs modificados.
- **Siguiente:** A4 cerrada; actualización exclusivamente documental, sin
  repetir suites ni smoke. Sin cambios de código ni commit/push/merge;
  no avanzar a otra tarea sin autorización.

## Reserva pública — A4: Security pre-J6 (historial de entrega parcial)

- **Estado:** parcial; tramo pre-J6 QA manual PASS, cierre post-J6 PENDIENTE.
- **Owner/rama/base:** Alan / BD1; `feature/a4-public-booking-security-pre-j6`,
  desde `6223196`. Cambios previos Guest/Auth/SMTP/Web conservados sin incorporarlos
  al alcance A4. Pendiente integración a main.
- **Autorización/DoR:** Alan autoriza exclusivamente permitir POST
  `/api/v1/public/bookings` sin JWT Staff/Guest y regresiones Security. Contrato
  original: A4 y J6 de `Plan_Tareas_Backend_Reserva_Publica_Alan_Juan.docx`,
  recuperado de Downloads; A1-A3 entregadas y J1-J5 integradas por PR138.
- **Alcance:** matcher exacto por método+path en SecurityConfiguration y tests de
  autorización reales. Otros métodos, rutas vecinas y rutas Staff siguen protegidos.
  POST anónimo alcanza MVC404 mientras no exista controller; no declara booking real.
  ERROR dispatch admite solo URI original de booking y método original POST usando
  atributos del servlet; /error directo, errores Staff y otros métodos siguen401.
  El servidor cambia el método de redispatch a GET; no se confía en headers/params.
- **Exclusiones aprobadas:** no controller J6, DTO/errores HTTP de booking, Web,
  migraciones, Postman ni cierre/paridad OpenAPI global. No endpoint nuevo real
  que documentar; cierre OpenAPI queda explícitamente pendiente de J6.
- **Aceptación/validación:** POST único pasa Security sin Authorization; GET/PUT/
  PATCH/DELETE/HEAD/OPTIONS y paths vecinos401; rutas Staff401. Focalizados Security,
  A3 e inventario y verify completo Java21/PostgreSQL17 aislado, diff-check.
- **Evidencia final:** focalizados54 PASS (incluye MockMvc y servidor HTTP real);
  `./mvnw -B --no-transfer-progress verify` Java21/PostgreSQL17 aislado:770 PASS,
  cero failures/errors/skipped. Diff-check PASS. Solo Backend reconstruido,
  stack healthy, Web y volumen del hotel conservados. Smoke sin JWT: POST
  booking404 (MVC, sin J6), GET booking/Staff/otros paths y POST /error directo401.
  Ningún endpoint ni paridad booking agregados a OpenAPI; suite existente pasa.
- **Nota para J6/post-cierre:** tests pre-J6 verifican404 porque falta controller;
  adaptar esas expectativas al contrato real cuando Juan incorpore J6. Este404
  no es una respuesta contractual de booking. No marcar A4 COMPLETADA.
- **Siguiente:** Juan implementa J6; Alan completa A4 post-J6 (OpenAPI global,
  seguridad HTTP del controller real y QA availability→booking). No marcar COMPLETADA.

## Reserva pública — Juan / J4: servicio de booking público

- **Estado:** READY → EN_PROGRESO → EN_QA. Owner Juan / BD3; rama
  `feature/backend-public-booking-core`, base `10c0d82` publicada y sincronizada.
  Usuario autorizó J4 y aprobó explícitamente ACTIVE para reservas nuevas; Property
  inexistente/INACTIVE devuelve PROPERTY_NOT_FOUND (2026-10-07). Replay mantiene
  la respuesta J1 original, sin revalidar elegibilidad/pricing/inventario actuales.
  J3/J1/J2/J5 disponibles con QA técnico PASS; conservan EN_QA sin QA manual atribuido.
- **DoR / contrato:** DOCX aprobado, sección J4 y response; precisiones J1/J2/J3/J5
  aprobadas, A1/A2/A3 COMPLETADAS y presentes. Reutilizar DemoRatePolicy y catálogo
  público read-only de Alan, InventoryAdmissionPort obligatorio y servicios legacy
  de mapping/booking/confirmación. Árbol inicial sin cambios rastreados; cuatro
  documentos untracked ajenos preservados. Misma rama Juan por usuario/DOCX.
- **Orden / transacción:** fachada valida/hash J3, execute J1 serializa key en su
  transacción writable READ_COMMITTED y solo ejecuta callback nuevo. Dentro: Property
  ACTIVE/GTQ y RoomTypes scoped, total oficial por habitación × quantity sumado con
  long exacto; comparar clientTotalMinor y validar ratePlanId demo exacto. PRICE_CHANGED
  antes de admisión/pago. Admitir demanda completa, refrescar tipos bajo sus locks y
  repetir comparación oficial antes del pago local; luego mapping J5, createBooking
  legacy y confirm. La admisión legacy interna reutiliza los mismos locks/transacción.
  Recibo COMPLETED después del callback/flush J1, sin REQUIRES_NEW/async/conexión propia.
- **Pago / errores:** solo PaymentGatewayPort simulado J2, sin efectos externos;
  APPROVED único éxito. DECLINED → PAYMENT_DECLINED; ERROR, configuración de tarifa/
  moneda o fallo técnico → BOOKING_FAILED. Inventario agotado → NO_AVAILABILITY.
  Clave con otro hash mantiene IDEMPOTENCY_KEY_REUSED; payload/RoomType/ratePlan inválido
  usa INVALID_REQUEST existente. Traducción HTTP en J6; sin códigos nuevos fuera del DOCX.
  No límites monetarios nuevos, float/double, duplicación de tarifas ni fake runtime.
- **Respuesta / atomicidad:** PublicBookingView solo campos aprobados y stays reales,
  CONFIRMED/GTQ/SIMULATED/APPROVED, roomId NULL; sin Guest/scope/tarjeta. JSON estable
  con fechas ISO/null explícito y roundtrip dentro del callback antes de completar.
  Replay lee snapshot J1, sin catálogo, admission, gateway, mapping ni escrituras.
  Verificar cantidad/tipos/fechas/un único padre del resultado legacy antes de confirmar.
  Fallo incluso al commit revierte recibo/perfil/reserva/stays/audit y deja key libre.
- **Archivos previstos:** Service interface/impl, View y Exception nuevos; tests
  unit/PG de J4 y solo entradas propias en estos dos docs. Sin migraciones, endpoint,
  Security/OpenAPI, fakes productivos ni cambios de Alan/legacy/otras fases.
- **Aceptación / DoD:** happy path confirmado, total igual a ofertas Availability ×
  quantity, PRICE_CHANGED antes de pago, invalidación bajo locks, no disponibilidad/
  DECLINED/ERROR sin filas parciales, replay/conflicto sin nuevo pago/reserva/stays;
  PostgreSQL real, rollback exterior/tardío/commit y concurrencia de key/stock. Focalizados
  y verify completo Java 21/PostgreSQL 17, diff --check y scope PASS; commit exclusivo J4,
  push posterior solo autorizado. EN_QA hasta QA manual PASS; no iniciar J6.
- **Evidencia técnica final:** focalizados 136 PASS, 45 nuevos J4 (19 unit y 26 PG)
  y 91 regresión pricing/availability/receipt/mapping/gateway. mvn -B
  --no-transfer-progress verify 686 PASS, cero failures/errors/skipped,
  BUILD SUCCESS y JAR generado. Maven 3.9.11/Java 21.0.9/PostgreSQL 17.11;
  Compose aislado pms-public-j4-qa, snapshot exacto de Backend con cache existente;
  reportes/artefactos en target ignorado. Logs public-booking-j4-focused-final.log
  y public-booking-j4-verify-final.log. Avisos SpringDoc/agente JVM preexistentes,
  no críticos. Cuatro errores iniciales al reemplazar stubs con callback en tests
  unitarios corregidos usando doReturn/doThrow; ninguna corrección de producción.
- **Evidencia PG:** resultado CONFIRMED y snapshot exacta sin Guest/scope/tarjeta,
  total Availability por categoría × quantity = Booking; tres categorías con dos
  unidades/dos noches total 1080000 minor, un padre/seis stays y pago una vez.
  PRICE_CHANGED/stock/invalid/config/DECLINED/ERROR sin filas parciales; cantidades
  grandes rechazadas por stock antes de expandir/pagar. Replay reordenado o tras
  cancelación/Property INACTIVE/moneda/catálogo cambiado mantiene original. Cinco
  carreras con dos conexiones: key misma/diferente hash, rollback/key liberada y
  claves distintas compitiendo por stock; locks observados, un booking comprometido.
  Fallo después de confirm/flush, serialización, commit diferido y rollback exterior
  revierten perfil/reserva/stays/audit/receipt. Pago local en misma conexión/tx PASS.
- **QA manual pendiente:** Juan/usuario debe revisar con fixtures J4 la snapshot
  y filas PostgreSQL de success/replay/conflicto/PRICE_CHANGED/NO_AVAILABILITY/
  DECLINED/ERROR, una reserva y cantidad exacta de stays, rollback y concurrencia;
  comparar con offers Availability y verificar no segundo pago/reserva en replay.
  Servicio interno aún sin endpoint J6; no atribuir QA manual PASS a la suite.
- **Siguiente:** commit exclusivo `feat(public-booking): orchestrate public booking service`
  y reporte de fase; detenerse para autorización de push y QA manual PASS.
  J3/J1/J2/J5/J4 conservan EN_QA; J6 no iniciada.

## Reserva pública — Juan / J5: mapeo a GuestProfile y ReservationStay

- **Estado:** READY → EN_PROGRESO → EN_QA. Owner Juan / BD3; rama
  `feature/backend-public-booking-core`, base `ab411f4` publicada y sincronizada.
  Usuario autorizó J5 y aprobó las tres precisiones contractuales (2026-10-07).
  J3/J1/J2 tienen validación técnica PASS y siguen EN_QA sin atribuir QA manual.
- **DoR / dependencias:** contrato DOCX aprobado, sección J5 y DTO público;
  GuestProfile/ReservationBookingService/InventoryAdmissionPort existentes.
  Continuación en la rama de Juan requerida por usuario/DOCX. Árbol inicial sin
  cambios rastreados; cuatro documentos untracked ajenos preservados.
- **Decisiones aprobadas:** reutilizar solo exactamente un GuestProfile ACTIVE,
  de la misma Property, guest_account_id NULL y firstName/lastName/email idénticos.
  Buscar sin trim, case-fold ni normalización Unicode. Cero o varias coincidencias
  crean un perfil nuevo; no modificar, reactivar ni vincular perfiles existentes.
  Perfiles sin Property, de otra Property, INACTIVE o vinculados a GuestAccount
  quedan excluidos. sourceChannel WEB_DIRECTA; sourceReference NULL y notes NULL.
- **Normalización existente resuelta:** mapper/request/hash conservan campos
  originales. Usuario aprobó mantener trim legacy únicamente al persistir mediante
  GuestProfileService/GuestProfile actuales. No modificar esos servicios/entidades
  ni J3; valores distintos siguen produciendo hashes distintos.
- **Diseño / alcance:** PublicBookingMappingService read-only prepara un único
  CreateBookingCommand. Lookup JDBC de UUIDs con Property explícita, COLLATE C para
  identidad exacta y LIMIT 2 para distinguir candidato único/ambiguo. Consultar
  RoomTypes reales de la Property sin usar/modificar repositorios Staff de Alan.
  Perfil nuevo inline: solo Property, firstName, lastName y email; account, teléfono,
  documento y preferencias NULL. Expansión de cada quantity a ese número exacto de
  stays, roomId NULL y occupants vacío, sin perfiles adultos/niños inventados.
  Preservar entradas duplicadas/orden; lista de stays inmutable. Overflow del tamaño
  int de List se rechaza antes de expandir; sin límites de negocio nuevos.
- **Persistencia / integración:** mapper no escribe. El servicio booking existente
  crea un responsable y una Reservation con todos los stays en su transacción de
  admisión. J4 debe validar/pricing/admitir demanda antes de expandir y orquestar
  pago/confirmación; J5 no implementa esas fases ni fija RatePlan en el modelo.
  Reutilizar perfil no concede titularidad ni acceso Guest; vínculo OTP sigue igual.
- **Archivos previstos:** interface/impl del mapper y repositorio público read-only,
  dos tests unit/PG; únicamente estas entradas propias en AlanPlan/AlanHandoff.
  Sin migraciones, dependencias, seguridad, OpenAPI ni cambios de Alan.
- **Aceptación / DoD:** quantity 1/>1, perfil nuevo/existente/excluido/ambiguo,
  varias categorías y entradas, IDs reales y una única Reservation, roomId NULL,
  cero ocupantes ficticios, contactos existentes intactos, lookup exacto y trim
  legacy aprobado sin alterar hash. Ausencia de writes del mapper, rollback real y
  falta de inventario sin filas parciales. Focalizados + regresión, verify completo
  Java 21/PostgreSQL 17 y diff --check/alcance PASS; commit exclusivo J5 y push solo
  con autorización posterior. EN_QA hasta QA manual PASS; no iniciar J4.
- **Evidencia técnica final:** focalizados 123 PASS: 35 J5 (14 unit y 21 PG) y
  88 regresión GuestProfile/booking/inventario/hash. mvn -B --no-transfer-progress
  verify 641 PASS, cero failures/errors/skipped, BUILD SUCCESS y JAR generado.
  Maven 3.9.11/Java 21.0.9/PostgreSQL 17.11; Compose aislado pms-public-j5-qa,
  snapshot exacto de Backend con cache existente y reportes/artefactos en target
  ignorado. Logs public-booking-j5-focused-final.log y public-booking-j5-verify-final.log.
  Fallo inicial del test nuevo de rollback corregido con flush JPA únicamente en
  su fixture antes de leer con JDBC; producción y código legacy intactos. Sin
  errores pendientes; avisos SpringDoc/agente JVM preexistentes no críticos.
- **Evidencia PG:** 1/3 unidades, varias categorías/entradas, UUIDs distintos de
  stays y un solo padre, roomId NULL y cero reservation_guests ficticios PASS.
  Responsable nuevo único o candidato reutilizado sin cambios en su fila; perfiles
  excluidos/ambiguos intactos. C/Unicode/espacios conservados para búsqueda/hash,
  trim de escritura legacy aprobado. Preparar comandos no cambia nueve tablas;
  rollback exterior revierte perfil/reserva/stays/audit y ATS, falta de inventario
  no deja escrituras parciales. Sin pago, receipt o confirmación añadidos en J5.
- **QA manual pendiente:** con fixtures J5 y antes de su limpieza, Juan/usuario
  debe inspeccionar resultado y PostgreSQL: quantity 1/3, combinación de RoomTypes,
  un reservation_id compartido, room_id NULL, responsable único/existente y cero
  ocupantes ficticios. Revisar candidato ambiguo/excluido sin mutación y rollback
  sin filas parciales; comprobar canal WEB_DIRECTA/refs NULL y hash raw preservado
  pese al trim legacy aprobado. No hay endpoint público todavía; no atribuir QA
  manual PASS a los tests automatizados.
- **Siguiente:** commit independiente `feat(public-booking): map guests and stays to reservation model`
  y reporte; esperar autorización de push y confirmación QA manual PASS. Mantener
  J3/J1/J2/J5 EN_QA; J4 no iniciada.

## Reserva pública — Juan / J2: pasarela de pago simulada

- **Estado:** READY → EN_PROGRESO → EN_QA. Owner Juan / BD3; rama
  `feature/backend-public-booking-core`, base `5f3c1f6` publicada y sincronizada.
  Usuario autorizó J2 y aprobó expresamente APPROVED como único éxito (2026-10-07).
  J3/J1 tienen validación técnica PASS y siguen EN_QA; no atribuir QA manual PASS.
- **DoR / dependencias:** contrato DOCX aprobado, sección J2 y response público;
  J3/J1 disponibles, arquitectura Reservations e InventoryAdmissionPort existentes.
  Continuación en la rama de Juan indicada por el DOCX y por el usuario. Cuatro
  documentos untracked ajenos preservados; sin cambios rastreados al inicio.
- **Decisión aprobada:** provider SIMULATED; único éxito APPROVED; DECLINED/ERROR
  únicamente en fixtures de pruebas. Runtime demo siempre APPROVED. Selección por
  constructor package-local, sin campos HTTP, toggles de configuración ni perfiles.
- **Diseño / alcance:** PaymentGatewayPort.pay(PaymentRequest), request inmutable
  con solo amountMinor long exacto y currency GTQ sin normalización. El caller
  suministra el total oficial; el puerto no recalcula ni añade políticas monetarias.
  PaymentResult con APPROVED/DECLINED/ERROR, provider SIMULATED fijo y referencia
  SIM-<UUID canónico lowercase> nueva por llamada exitosa; fallos sin referencia.
  Adaptador local sin IO, persistencia, SDK, secretos, datos de tarjeta/Guest,
  transacciones propias, conexiones ni async. J1/J4 gestionan replay; el adaptador
  no introduce otra idempotencia. Una futura pasarela real exige contrato separado.
- **Integración mínima de contrato:** validator de snapshot J1 pasa de las dos
  alternativas pendientes a aceptar únicamente APPROVED, conforme a esta decisión;
  sin cambiar recibos persistidos ni migraciones aplicadas. No alterar pricing,
  InventoryAdmissionPort, Staff, Security, OpenAPI, DTO público ni otras fases.
- **Archivos previstos:** cuatro fuentes de puerto/request/result/adapter, ajuste
  de estado en PublicBookingReceiptSnapshotValidator, tres tests J2 de contrato,
  adaptador e integración PostgreSQL; solo entradas propias en estos seguimientos.
- **Aceptación / DoD:** APPROVED/DECLINED/ERROR, referencia sintética, request sin
  metadata sensible, runtime Spring único y sin selector externo; cero escrituras
  del adaptador, callback real de admisión con fixture local exacta y rollback.
  Focalizados J2 + regresión J1, mvn verify completo Java 21/PostgreSQL 17,
  diff --check y revisión de alcance PASS; commit exclusivo J2, push posterior
  solo autorizado por usuario. EN_QA hasta QA manual PASS; no iniciar J5.
- **Evidencia técnica final:** focalizados 71 PASS: 35 nuevos J2 (17 contrato,
  9 adapter, 9 integración PostgreSQL) y 36 regresión J1/upgrade. mvn -B
  --no-transfer-progress verify 606 PASS, cero failures/errors/skipped,
  BUILD SUCCESS y JAR generado. Maven 3.9.11/Java 21.0.9/PostgreSQL 17.11;
  Compose aislado pms-public-j2-qa, snapshot temporal exacto de Backend con cache
  existente, reportes/artefactos devueltos a backend/target ignorado. Logs:
  public-booking-j2-focused.log y public-booking-j2-verify.log. Sin SDK/dependencias
  nuevas; avisos SpringDoc/agente JVM ya presentes en verify J1, no críticos.
- **Evidencia de integración:** único bean Spring de PaymentGatewayPort produce
  APPROVED. Todos los escenarios dejan siete tablas de negocio intactas; el
  adapter no cambia conexión ni transacción del caller. Callback de inventario
  persistiendo demanda exacta PASS; rollback exterior y aborto por DECLINED/ERROR
  restauran escrituras/ATS, y demanda insuficiente no invoca pago. Estas reservas
  son fixtures de prueba; no implementan J4/J5 ni cambian el puerto de Alan.
- **QA manual pendiente:** Juan/usuario debe inspeccionar en IDE el resultado de
  new SimulatedPaymentGatewayAdapter().pay(new PaymentRequest(65000L, "GTQ")):
  provider SIMULATED, APPROVED y referencia SIM-UUID nueva por llamada; revisar
  fixtures DECLINED/ERROR sin referencia y ausencia de writes tras rollback en
  los escenarios de integración. Confirmar que el request no recibe datos Guest/
  tarjeta ni existe selector de fallos en HTTP/configuración. Sin endpoint en J2.
- **Siguiente:** commit exclusivo `feat(public-booking): add simulated payment gateway`
  y reporte de fase; detenerse para autorización de push y QA manual PASS.
  J3/J1/J2 permanecen EN_QA; J5 no iniciada.

## Reserva pública — Juan / J1: recibo idempotente persistente

- **Estado:** READY → EN_PROGRESO → EN_QA. Owner Juan / BD3; rama
  `feature/backend-public-booking-core`, base `7bb6277` publicada. El usuario
  autorizó continuar a J1 y aprobó expresamente sus precisiones en esta sesión.
  J3 disponible con validación técnica PASS; conserva EN_QA, sin atribuir QA manual.
- **DoR / contrato:** J1/J4 y response del DOCX aprobado; clave global UNIQUE,
  hash de J3 sin payload Guest, mismo hash devuelve original y otro hash produce
  IDEMPOTENCY_KEY_REUSED. Solo persistir COMPLETED tras callback exitoso, en la
  misma transacción writable READ_COMMITTED del booking. Callback exclusivamente
  local; sin efectos externos, REQUIRES_NEW, async ni conexión independiente.
- **Decisiones aprobadas:** recibos completados inmutables, sin TTL/purga automática.
  Fallo/rollback exterior revierte todas las escrituras y el recibo; la clave queda
  disponible incluso para payload distinto. Mientras hay operación en curso, un
  advisory lock transaccional PostgreSQL serializa la misma clave hasta commit/
  rollback; luego replay/conflicto o nuevo intento. Colisiones del hash del lock
  solo añaden espera; lookup y PK usan la clave completa, sin normalización.
- **Persistencia / snapshot:** changeset nuevo 004-reservations-008 en
  004ServiceReservations; PK idempotency_key con collation C, request_hash, status,
  reservation_id FK, confirmation_code, payment_reference, created_at/updated_at
  iguales y snapshot JSONB aprobada. Whitelist de campos de PublicBookingResponse
  sin Guest/tarjetas; referencias de snapshot vinculadas al recibo. Replay devuelve
  esa snapshot sin consultar el estado mutable de Reservation. Trigger append-only;
  sin tocar changesets históricos. Flush JPA antes de JDBC/FK, en la misma transacción.
  Antes del primer recibo, comprobar que el padre persistido esté CONFIRMED/GTQ y
  tenga el código real de la snapshot. Esta comprobación no se repite al hacer replay.
- **Archivos previstos:** ocho fuentes nuevas de Receipt Request/Result/Model,
  SnapshotValidator, Service/Impl, Repository y ConflictException; nueva migración
  y su inclusión; pruebas request/integración/schema-upgrade con fixture pre-J1;
  solo entradas Juan en AlanPlan/AlanHandoff. Sin pricing, gateway ni endpoint.
- **Aceptación / DoD:** replay/conflicto, duplicados y dos conexiones/JVM-compatible
  serializadas hasta commit, recuperación después de rollback, rollback interno/
  exterior/commit, ausencia de escrituras parciales, FK/PK/append-only y snapshots
  sin datos fuera del contrato; migración vacío/upgrade/reapply con checksums
  históricos conservados. Focalizados + verify completo Java 21/PostgreSQL 17 y
  diff --check PASS; EN_QA hasta QA manual del usuario. Commit J1 independiente;
  push exige autorización posterior al reporte. No iniciar J2.
- **Evidencia técnica final:** focalizados J1 + regresión de upgrade 36 PASS
  (15 request, 19 integración PostgreSQL, 1 upgrade pre-J1 y 1 upgrade general).
  mvn -B --no-transfer-progress verify 571 PASS, cero failures/errors/skipped,
  BUILD SUCCESS y JAR generado. Maven 3.9.11/Java 21.0.9/PostgreSQL 17.11 en Compose
  pms-public-j1-qa, snapshot temporal exacto del Backend y cache Maven existente.
  23 changesets previos conservan checksums/datos, upgrade a 24 y reaplicación no-op;
  locks observados en pg_stat_activity con dos conexiones, rollback de callback/
  transacción exterior/commit y recuperación sin duplicados. Diff/alcance revisados.
  Logs locales ignorados: backend/target/public-booking-j1-focused-final.log y
  backend/target/public-booking-j1-verify-final.log.
- **QA manual pendiente:** Juan/usuario debe confirmar recibo persistido, replay
  sin nuevo callback, conflicto por hash, snapshot original tras cambio de reserva,
  bloqueo concurrente hasta commit/rollback y ausencia de filas parciales al fallar.
  El puerto es interno; endpoint y gateway todavía no forman parte de esta fase.
- **Siguiente:** commit independiente J1 y reporte; esperar autorización de push
  y confirmación QA manual PASS. No iniciar J2 en este incremento.

## Reserva pública — Juan / J3: validación y hash

- **Estado:** READY → EN_PROGRESO → EN_QA. Owner Juan / BD3; rama
  `feature/backend-public-booking-core`, base `8a6228d`. Solo J3 autorizada ahora.
- **DoR / aprobación:** el usuario confirmó explícitamente en esta sesión el
  contrato de booking del documento `docs/Plan_Tareas_Backend_Reserva_Publica_Alan_Juan.docx`
  y las precisiones siguientes. A1/A2/A3 COMPLETADAS; Property y Reservations
  existentes. Backend AGENTS autoriza el registro operativo común de Juan.
- **Decisiones J3 aprobadas:** Idempotency-Key opaca de 8–128 caracteres Unicode
  válidos, no vacía, sin controles; no trim ni normalización. Orden canónico de
  stays por UUID canónico roomTypeId, ratePlanId lexical Java y quantity numérica;
  cambiar solo el orden conserva el hash. Conservar entradas duplicadas sin sumar.
  Nombres/correo conservan exactamente su valor: espacios, caso y composición
  Unicode distintos cambian el hash, si el valor supera la validación.
- **Hash:** SHA-256 hexadecimal lowercase con versión PUBLIC_BOOKING_REQUEST_V1;
  campos UTF-8 con prefijos de longitud de bytes int32 big-endian. Orden: versión,
  propertyId, arrival, departure, currency, clientTotalMinor, cantidad de entradas
  stays, roomTypeId/ratePlanId/quantity de cada entrada ordenada, firstName,
  lastName, email. Excluir Idempotency-Key y paymentMode, validado exclusivamente
  SIMULATED_CARD. No persistir payload ni crear reservas/recibos/pagos en J3.
- **Validación / alcance:** campos requeridos del DTO, fechas ISO estrictas y
  arrival < departure, GTQ exacto, stays no vacío, quantity > 0 y Property real.
  Nombres máximo 80/email máximo 320 y Email reutilizan límites del
  CreateGuestProfileCommand existente; sin normalizar. ratePlanId String sigue
  la identidad demo aprobada de A2/A3. clientTotalMinor requerido, reservado para
  comparar precio en J4, sin cálculo ni nuevos límites monetarios en J3.
  Deserialización numérica local al DTO: Integer/Long exactos, sin truncar ni
  redondear; rechazar fracciones, strings numéricos y overflow. Representaciones
  numéricas enteras equivalentes (1 y 1.0) conservan el mismo valor/hash.
  Errores application INVALID_REQUEST/INVALID_DATE_RANGE/PROPERTY_NOT_FOUND;
  traducción HTTP en J6. Validez real de RoomTypes/pricing/admisión en J4.
- **Archivos previstos:** PublicBookingRequest, PublicBookingValidationService/
  Impl/Exception, PublicBookingIntegerDeserializers y PublicBookingPropertyRepository
  en Reservations; pruebas unit
  y PostgreSQL J3; solo esta entrada y su handoff en seguimiento compartido.
- **Aceptación / DoD:** diez escenarios mínimos solicitados, hash determinista y
  campos relevantes, fechas imposibles/iguales/invertidas, cero quantity, moneda,
  clave ausente/inválida, orden de stays y datos Guest; focalizados y verify
  completo Java 21/PostgreSQL 17 PASS, diff --check y revisión de alcance PASS.
  Permanecer EN_QA hasta QA manual PASS de Juan/usuario. Commit independiente J3;
  push requiere nueva autorización explícita después del reporte de fase.
- **Evidencia técnica final:** focalizados J3 77 PASS (62 unit, 15 PostgreSQL/JSON);
  mvn -B --no-transfer-progress verify 536 PASS, cero failures/errors/skipped,
  BUILD SUCCESS y JAR generado. Maven 3.9.11/Java 21.0.9/PostgreSQL 17.11,
  Compose aislado pms-public-j3-qa y snapshot temporal exacto del Backend en
  contenedor para reducir I/O Windows. git diff --check y revisión de alcance PASS.
  Logs locales ignorados: backend/target/public-booking-j3-focused-final.log y
  backend/target/public-booking-j3-verify.log.
- **QA manual pendiente:** Juan/usuario debe revisar/invocar validateAndHash con
  sus payloads: request idéntico/reordenado conserva hash, nombre/correo/cantidad/
  tarifa/total modificados cambian hash, entradas inválidas dan el código esperado.
  Vector sintético del test identicalPayloadHasStableVersionOneHash:
  4eec960c40c78cd430b6454dc015c1f837b0e883ffde5181ec68e11620fe878c.
  No atribuir QA manual PASS al resultado automatizado; aún sin endpoint J6.
- **Siguiente:** commit independiente J3 y reporte; esperar autorización de push
  y QA manual PASS. No iniciar J1 en este incremento.

## Cierre QA manual integrado — 2026-10-06

QA manual final PASS confirmado por Alan en `feature/web-public-availability-real`:

| Incremento | Estado final |
| --- | --- |
| Demo Bootstrap Docker | COMPLETADA — QA manual PASS |
| Web Public Availability real | COMPLETADA — QA manual PASS |
| Public booking journey pre-submit | COMPLETADA — QA manual PASS |

Se validaron el stack Docker integrado, catálogo real de seis RoomTypes, galerías,
carrito/persistencia, filtros, edición y revalidación atómica, navegación Header →
catálogo Home, Guest Google session/account según contrato, checkout Guest, Review
y llegada a Payment. El submit final se bloquea correctamente.

**Pendiente / fuera de scope, a cargo de Juan:** `POST /api/v1/public/bookings`,
PaymentGateway simulado Backend, persistencia Reservation/ReservationStay,
confirmationCode e idempotencia de booking. El PASS pre-submit no declara esos
componentes implementados ni una reserva confirmada.

## Dataset local demo — bootstrap integrado

- **Estado:** COMPLETADA; implementación, QA técnico y QA manual PASS confirmado
  por Alan el 2026-10-06.
- **Autorización:** incremento local/dev/demo aprobado por el usuario el 2026-10-06,
  en la rama existente `feature/web-public-availability-real`; conservar cambios
  pendientes y no crear rama, commit, push ni merge. Esta instrucción específica
  prevalece para el incremento sobre la regla general de rama nueva.
- **Dependencias:** A1/A2/A3 COMPLETADAS; modelos Property/RoomType/Room y esquema
  Liquibase existentes. Reutilizar `ApplicationRunner`; bootstrap separado de las
  migraciones productivas y `DemoRatePolicy` como única autoridad de precios.
- **Aceptación:** Property HB-GT-DEMO ACTIVE/GTQ/America/Guatemala, seis tipos
  STD/CLASSIC/TWIN/KING/DLX/SUITE y cuatro Rooms por tipo (24), UUID demo-only
  suministrado automáticamente a Web. Inserciones idempotentes, reparación parcial,
  conservación de datos existentes, flag deshabilitado por defecto en la aplicación
  y exclusión explícita de perfiles prod/production. Tests con fixtures propios.
- **Alcance:** entorno integrado local y presentación Web pre-submit hasta Payment.
  Booking real, persistencia Reservation/Stay y PaymentGateway siguen fuera de
  alcance y pendientes de Juan. Sin cambios Staff/Android ni Auth/Account.
  A1/A2/A3 y Web Public Availability permanecen COMPLETADAS.
- **Guía:** [Local Demo Dataset](../../docs/LOCAL_DEMO_DATASET.md).

## Reserva pública — A1: tarifas demo autoritativas

- **Estado:** COMPLETADA; QA técnico PASS y QA manual PASS confirmado por Alan;
  cierre formal autorizado por el usuario el 2026-10-06.
  A2/A3 y el journey Web pre-submit están COMPLETADOS; booking real sigue pendiente
  de Juan. No existe un plan
  público previo en este archivo; esta entrada registra solo el alcance aprobado A1.
- **Owner / seguimiento:** Alan / BD1; consumidores futuros Availability y Booking.
  Sin dependencia HTTP, Auth, OpenAPI ni módulo tarifario definitivo para A1.
- **DoR / decisiones:** GTQ; Standard/Classic Q650, Deluxe Q850, Suite Q1200 por
  noche; sin impuestos, descuentos, temporadas, promociones ni servicios externos.
  Backend es autoridad; ningún precio del cliente participa en el cálculo.
- **Inspección:** RoomType.code existe, UNIQUE(property_id, code), editable por
  catálogo; no depende del UUID generado ni del nombre. Property tiene Currency;
  RatePlan ya usa MonetaryAmount/MinorUnits(long), reutilizados sin alterar esos
  modelos. Migraciones no incluyen seeds RoomType; PostgreSQL local consultado
  tiene cero RoomTypes. Los fixtures semánticos usan STD/Std, DLX/Deluxe,
  SUITE/Suite, KING/King y TWIN/Twin; SOLD/Sold out y códigos JPA/RT/ATS/PM son QA.
- **Mapeo exacto aprobado y decisión demo:**

  | RoomType code | Tarifa GTQ/noche | Minor units |
  | --- | ---: | ---: |
  | STANDARD | 650.00 | 65000 |
  | CLASSIC | 650.00 | 65000 |
  | STD | 650.00 | 65000 |
  | KING | 650.00 | 65000 |
  | TWIN | 650.00 | 65000 |
  | DELUXE | 850.00 | 85000 |
  | DLX | 850.00 | 85000 |
  | SUITE | 1200.00 | 120000 |

  STANDARD/CLASSIC/DELUXE son los códigos autorizados por el usuario; no se crean
  entidades para ellos. KING/TWIN reciben explícitamente la base Q650 temporal:
  su nombre de cama no confirma categoría Deluxe/Suite. No se tarifan fixtures
  sintéticos ni se interpreta el nombre. Códigos nuevos o renombrados requieren
  configuración explícita; no hay tarifa por defecto ni normalización implícita.
- **Diseño / archivos:** inventory/application/DemoRatePolicy como bean reusable
  con rateFor(RoomType) y totalFor(RoomType, arrival, departure). Reutiliza
  StayDateRange para arrival < departure; noches calendario departure-arrival y
  Math.multiplyExact(long,long). Error interno DemoRateNotConfiguredException con
  DEMO_RATE_NOT_CONFIGURED; traducción HTTP futura. Tests DemoRatePolicyTests y
  registro AlanPlan/AlanHandoff; sin cambios de persistencia/dependencias externas.
- **Aceptación / DoD:** tarifas y totales de ejemplo exactos; GTQ siempre; fechas
  iguales/invertidas y códigos no configurados rechazados; identidad independiente
  de UUID/nombre, cálculo long sin float/double; focalizados y verify completos PASS,
  diff revisado. QA manual PASS confirmado por Alan; tarifas del mapeo aprobadas
  y cierre formal A1 registrado en AlanHandoff.
- **Evidencia técnica:** DemoRatePolicyTests 20 PASS; mvn -B
  --no-transfer-progress verify 405 PASS, cero failures/errors/skipped, BUILD SUCCESS
  con Maven 3.9.11/Java 21/PostgreSQL 17.11 en Compose aislado pms-public-a1-qa.
  Revisión de bytecode confirma multiplyExact(JJ)J sin float/double; git diff
  --check PASS, incluidos los tres archivos nuevos revisados sin staging.
- **Siguiente:** A1 cerrada; esperar autorización para otra tarea. Sin QA HTTP
  aplicable a A1; trabajo detenido antes de A2.

## Reserva pública — A2: disponibilidad pública real (application)

- **Estado inicial/final:** EN_QA → COMPLETADA; QA técnico PASS y QA manual PASS
  conjunto A2/A3 confirmado por Alan; cierre formal autorizado el 2026-10-06.
  A1 COMPLETADA en 42a785a; A3 COMPLETADA y cierre manual conjunto registrado.
  Owner Alan / BD1. Rama feature/backend-public-availability, base 42a785a,
  árbol inicial limpio.
- **DoR / contrato aprobado:** PublicAvailabilityQuery(propertyId UUID, arrival
  LocalDate, departure LocalDate, roomsRequested int > 0); todos requeridos y
  arrival < departure. PublicAvailabilityView(propertyId, arrival, departure,
  currency String, offers List); PublicAvailabilityOfferView(roomTypeId UUID,
  roomTypeCode/name String, ratePlanId/code String, availableUnits int,
  nightlyRateMinor/totalMinor long). Valores referidos a un RoomType para todo el
  rango; totalMinor es tarifa por noche × noches, sin multiplicar roomsRequested.
- **Autoridad / composición:** PublicAvailabilityService.search(query) reutiliza
  AvailabilityPort → AvailabilityService.calculateATS(propertyId, roomTypeId,
  StayDateRange). SQL existente descuenta OOO no liberado y stays RESERVED/IN_HOUSE
  de reservas no CANCELLED; excluye OOS y aplica overbooking=0, mínimo por noche
  con piso cero. No duplicar estas reglas ni usar InventoryAdmissionService en
  lectura: admisión/locks corresponden al futuro booking.
- **Catálogo / moneda:** nuevo PublicAvailabilityCatalogRepository de solo
  consultas JPA, con predicado propertyId en Property y RoomTypes. Repositorios
  Staff y sus scopes/permisos intactos. Property.getCurrency() es autoridad de
  moneda; se exige igualdad con DemoRatePolicy.currency() GTQ antes de leer tipos,
  incluso en catálogo vacío. Moneda incompatible → IllegalStateException con
  DEMO_CURRENCY_MISMATCH, sin conversión ni respuesta parcial.
- **Pricing / identidad:** extensión mínima de DemoRatePolicy con un único mapa
  code → clasificación → minor units; ratePlanCodeFor(RoomType) devuelve
  DEMO_STANDARD para STANDARD/CLASSIC/STD/KING/TWIN, DEMO_DELUXE para DELUXE/DLX,
  DEMO_SUITE para SUITE. Mismo String como ratePlanId/code, sin UUID ni RatePlans
  persistidos. Fachada delega nightly a rateFor y total a totalFor de A1, sin fórmula
  adicional. DEMO_RATE_NOT_CONFIGURED se propaga en tipos vendibles sin tarifa.
- **Lectura / orden:** transacción readOnly REPEATABLE_READ para snapshot consistente
  entre catálogo y ATS cuando inicia la transacción; no reserva ni garantiza
  capacidad al confirmar una reserva. Solo ofertas ATS >= roomsRequested, orden
  lexicográfico Java por RoomType.code, independiente de orden/collation PostgreSQL.
  List de salida inmutable. Sin catálogo real → offers vacío en GTQ.
- **Errores:** validación IllegalArgumentException (patrón existente), Property
  inexistente → PropertyNotFoundException existente. No HTTP status ni handlers.
- **Archivos / aceptación:** records Query/View/OfferView, Service y repositorio
  público nuevos; DemoRatePolicy y su test extendidos; unit/integration A2 nuevos,
  AlanPlan/AlanHandoff. Tests de composición con ATS real, fixtures deterministas
  transaccionales aislados: identidad, pricing, filtros de capacidad, rango/OOO/stays,
  aislamiento Property, orden, validaciones, catálogo vacío y errores explícitos.
  Ningún seed productivo, migración, Compose, Controller, SecurityConfiguration,
  OpenAPI, Auth/Account ni dependencias nuevas. Sin commit/push.
- **Validación técnica PASS:** mvn -B --no-transfer-progress
  -Dtest=DemoRatePolicyTests,PublicAvailabilityServiceTests,PublicAvailabilityServiceIntegrationTests
  test: 41 PASS (20 policy, 8 unit A2, 13 integration A2). mvn -B
  --no-transfer-progress verify: 426 PASS, cero failures/errors/skipped, BUILD SUCCESS
  (1m02s), Maven 3.9.11/Java 21/PostgreSQL 17.11 efímero, sin exclusiones.
  git diff --check/status/stat/name-only ejecutados; whitespace PASS en archivos
  existentes y siete nuevos sin staging. Historial Handoff y A1 COMPLETADA
  comprobados. Logs /tmp/pms-public-a2-focused.log y /tmp/pms-public-a2-verify.log.
- **QA manual / cierre:** PASS confirmado por Alan junto con A3: Property ACTIVE
  GTQ, STD/DLX/SUITE y dos Rooms físicas por tipo; para dos noches ATS=2 y totales
  130000/170000/240000. rooms=1/2 devuelve tres ofertas; rooms=3 devuelve 200 [].
  Evidencia conjunta en [43](43_PUBLIC_AVAILABILITY_CONTRACT_QA.md) y AlanHandoff.
- **Límites / siguiente:** A2 cerrada. A3 aplica la decisión posterior aprobada:
  solo Property ACTIVE, 404 si inactiva; no crea otro estado/publicación.
  Esperar autorización para otra tarea; sin iniciar booking ni crear seeds.

## Reserva pública — A3: endpoint HTTP de disponibilidad

- **Estado:** COMPLETADA; QA técnico PASS y QA manual PASS conjunto A2/A3
  confirmado por Alan; cierre formal autorizado el 2026-10-06. A1 y A2 COMPLETADAS;
  incremento público superior PENDIENTE. Owner Alan / BD1; rama
  feature/backend-public-availability, base b653804, árbol inicial limpio.
  Sin booking, frontend, commit/push ni cambios de Auth/Account.
- **Contrato aprobado / DoR:** GET /api/v1/public/availability; propertyId UUID,
  arrival/departure ISO LocalDate y rooms int obligatorios; rooms → roomsRequested.
  Reutiliza A2/ATS y DemoRatePolicy A1. DTO HTTP separados PublicAvailabilityResponse
  y PublicAvailabilityOfferResponse con campos exactos aprobados y mapper from(view).
  Documentación/QA: [43](43_PUBLIC_AVAILABILITY_CONTRACT_QA.md).
- **Elegibilidad / errores:** Property.Status ACTIVE/INACTIVE existentes; fachada
  rechaza INACTIVE antes de catálogo/pricing con PropertyNotFoundException.
  400 para parámetros/fechas/rooms inválidos, 404 para inexistente/inactiva,
  200 offers=[] para catálogo/ATS vacío; no 409/422. Sin tarifa → 500
  DEMO_RATE_NOT_CONFIGURED; moneda incompatible → DemoCurrencyMismatchException
  application y 500 DEMO_CURRENCY_MISMATCH. Advice exclusivo del Controller,
  ProblemDetail sin mensaje interno/código RoomType ni respuesta parcial.
- **Seguridad:** única apertura GET exacto /api/v1/public/availability permitAll;
  sin credencial Guest/Staff/cookie requerida. Staff /api/v1/properties/** y otros
  métodos/paths siguen autenticados. Ninguna apertura global /api/v1/**.
- **OpenAPI:** @Operation/@Parameter/schemas/200/400/404/500; security=[] explícita,
  x-audience=public solo para este Controller. Paridad con mappings reales,
  campos exactos/tipos minor units y Swagger cubiertos. Baseline previa generada
  del runtime: 35 operaciones/25 paths/32 schemas/10 tags; posterior generado y vivo:
  36 operaciones/26 paths/34 schemas/11 tags, paridad paths/components PASS,
  sin fijar conteos hipotéticos en tests. Baseline 39 y colección BD1 actualizados.
- **Archivos / pruebas:** Controller/Response/OfferResponse/Advice nuevos,
  DemoCurrencyMismatchException y validación ACTIVE en fachada; cambio mínimo de
  SecurityConfiguration/OpenApiConfiguration; tests HTTP reales sin mocks de
  catálogo/ATS y OpenApiContractIntegrationTests; regresión application A2.
  Fixtures deterministas rollback únicamente en PostgreSQL de tests; sin migración,
  seeds productivos, datos QA manual nuevos ni cambios Compose en repo.
- **Validación técnica PASS:** focalizados 48 PASS (21 HTTP, 14 application, 11
  OpenAPI, 2 seguridad); mvn -B --no-transfer-progress verify 449 PASS, cero
  failures/errors/skipped, BUILD SUCCESS; Maven 3.9.11/Java 21/PostgreSQL 17.11
  efímero, sin exclusiones. git diff --check/status/stat/name-only ejecutados;
  whitespace PASS incluyendo archivos nuevos sin staging. Historial Handoff y
  colección BD1/Auth previos conservados.
- **Runtime PASS:** JAR validado en Compose temporal pms-public-a3-qa, puerto
  127.0.0.1:18087, sin bootstrap/catalog loader y sin tocar stack normal. Property
  seed ACTIVE GTQ con cero RoomTypes; GET público anónimo 200 offers=[], rooms=0
  400, Property inexistente 404, Staff vecino anónimo 401. /v3/api-docs, Swagger UI
  HTML y swagger-config 200; documento vivo coincide con generado en paths/components.
  Entorno efímero retirado; override solo /tmp. Logs /tmp/pms-public-a3-focused.log,
  /tmp/pms-public-a3-verify.log y /tmp/pms-public-a3-runtime-smoke.json.
  Este smoke no probó ofertas vendibles; el QA manual posterior consta abajo.
- **QA manual / cierre:** PASS confirmado por Alan en entorno QA aislado con
  login Staff sintético, Property ACTIVE/GTQ y STD/DLX/SUITE con dos Rooms cada uno.
  Disponibilidad pública sin token 200; tarifas/totales de dos noches y filtros
  rooms=1/2/3 PASS. Fecha inválida, rooms=0 y UUID inválido 400; Property inexistente
  404; Staff vecino sin token 401. OpenAPI path, operationId=publicAvailability,
  security=[] y Swagger UI 200 PASS. Cleanup completado; procedimiento/evidencia
  en [43](43_PUBLIC_AVAILABILITY_CONTRACT_QA.md). QA manual atribuido a Alan.
- **Siguiente:** A2/A3 cerradas; el endpoint POST de booking, persistencia,
  PaymentGateway, confirmationCode e idempotencia siguen pendientes de Juan.

## Registro Liquibase por módulo

| Prefijo | Módulo | Dueño | Estado |
| --- | --- | --- | --- |
| 001 | ServicePagos | Por asignar | Reservado |
| 002 | ServiceManagement | BD1 (base) / BD2 (core) | Organization/Property, inventario, catálogo y disponibilidad implementados. |
| 003 | ServiceSecurityAuth | Alan / BD1 | Auth Staff/Guest, RBAC y sesiones implementados. |
| 004 | ServiceReservations | BD3 | GuestProfile, Reservations, Stays, Folio y AuditTrail de reservas implementados. |
| 005 | ServiceOperations | BD3 | Housekeeping, mantenimiento, solicitudes y Night Audit implementados. |
| 006 | ServiceCommercial | BD3 | B2B, grupos, promociones y rewards implementados. |
| 007 | ServiceIntegrations | Alan | Reservado para BE-007; no hay changesets creados. |
| 008 | ServiceAudit | Alan | Reservado para BE-008; no hay changesets creados. |

Cada módulo agrega versiones internas consecutivas. Una migración aplicada no
se renombra ni modifica. El changelog completo incluye módulos según sus
dependencias; un perfil parcial incluye solo su módulo y sus dependencias.

## Tareas

### BE-HANDOFF-001 — Traspaso de pendientes BD2 a BD1/BD3

- **Estado:** COMPLETADA — preparación del traspaso documental y revisión local PASS.
  Autor José / BD2; receptores Alan / BD1 y Juan / BD3; revisión local Codex.
- **Rama/base:** chore/backend-demo, sobre f5fc545.
- **DoR:** usuario confirma cambio de foco a Frontend y solicita publicar todo
  lo pendiente y una lista clara para los responsables restantes de Backend.
- **Alcance/archivos:** documento 23, actualización de ownership/decisión global
  y AlanPlan/AlanHandoff. Conservar historia, distinguir publicación de integración.
- **Aceptación:** entregas existentes identificadas, ramas/commits y estado remoto
  verificados; pendientes completos, límites y reparto detallado marcado propuesto.
- **DoD:** enlaces/localización, revisión documental, diff --check, commit/push;
  sin cambios Java, SQL, API, frontend, infraestructura o funcionalidades.
- **Evidencia:** cinco documentos, siete enlaces locales válidos y 12 tareas
  cubiertas; estados/ramas/commits verificados tras fetch. Diff --check PASS.
  La integración y los acuerdos de los receptores permanecen pendientes.

### BE-DEMO-001 — Presentación Backend con un comando

- **Estado:** EN_QA — aceptación/DoD local PASS; revisión BD1 y CI de PR pendientes.
  Owner José / BD2; reviewer Alan / BD1 (runtime compartido).
- **Rama/base:** chore/backend-demo, sobre e5421f9 de BD2 financial foundation.
- **DoR:** usuario solicita Docker Compose y cuenta de muestra sin configuración
  manual; BE-001/002/003 y catálogos BD2 integrados. No requiere nuevos contratos.
- **Alcance/archivos:** compose.demo.yaml reutiliza servicios existentes, base/volumen
  propios, puerto localhost y bootstrap Staff existente; colección Postman única,
  guía de presentación, README y seguimiento. Credenciales públicas solo de muestra.
- **Aceptación:** un comando arranca PostgreSQL/backend saludables; login demo,
  catálogos y ATS reales mediante colección sin environment/copiar IDs/tokens;
  reinicio conserva datos y no duplica Staff; base habitual no se toca.
- **DoD:** validar Compose, arranque/reinicio/health/Swagger y colección completa;
  verify Java 21/PostgreSQL 17, diff revisado, evidencia y commit/push.
- **Evidencia:** arranque y reinicio saludables; un Staff demo y propiedad previa
  preservados. Newman dos ejecuciones de 53 requests/81 assertions sin fallos.
  Verify BUILD SUCCESS, 281 tests, 0 failures/errors/skipped. Diff --check PASS.
- **Límites:** contiene todos los módulos Backend de esa versión. No añade REST
  de reservas/folios, frontend, Google externo ni funcionalidades financieras.

### BE-001 — Foundation y control Backend

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1
- **Reviewer:** Codex — revisión local registrada
- **Alcance:** bootstrap Spring Boot, PostgreSQL local, Liquibase modular,
  perímetro de seguridad, OpenAPI técnico, Docker raíz, documentación y CI.
- **DoR:** decisiones de arquitectura y seguridad aprobadas.
- **Aceptación:** estructura Backend sin repositorio anidado; Liquibase es el
  único creador de esquema; health accesible; rutas no declaradas denegadas;
  OpenAPI disponible sin endpoints de negocio; la pila raíz se levanta con un
  único comando y solo Web publica un puerto del host.
- **DoD:** compilación, pruebas y validación de migraciones en PostgreSQL;
  handoff actualizado y revisión local reproducible registrada.

### BE-002 — Identidad, sesiones y JWT internos

- **Estado:** COMPLETADO
- **Owner:** Alan / BD1
- **Dependencias:** BE-001; C1 aprobado en `08_AUTH_SESSION_CONTRACT_PROPOSAL.md`.
- **Alcance:** Staff Auth para usuarios provisionados por el hotel, un rol
  por usuario, `SUPER_ADMIN` global, hash de credenciales, JWT/refresh separado
  por contexto, logout y revocación. Guest Auth se activa exclusivamente con
  Google en BE-004.
- **Aceptación:** Staff no se autorregistra; tokens inválidos, expirados o
  revocados se rechazan; no se exponen tokens ni contraseñas; SUPER_ADMIN se
  provisiona solo con secretos de despliegue. Validado con Liquibase/PostgreSQL,
  login, JWT, refresh rotativo y logout.

### BE-003 — Property scope y autorización Staff

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1
- **Dependencias:** BE-002; modelo de membership y permisos confirmado.
- **Alcance:** permisos, memberships activas y resolución explícita de
  `PROPERTY` / `ALL_PROPERTIES` antes de consultas operativas.
- **Aceptación:** `ALL_PROPERTIES` exige `MULTI_PROPERTY_READ`; no hay query
  global seguida de filtro ni fallback de scope. C2 aprobado en
  `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`; roles fijos y una membership/rol Staff.
- **DoD:** migraciones validadas desde una PostgreSQL vacía, tests y smoke de
  sesión Staff completados; evidencia en `AlanHandoff.md`.

### BE-004 — OAuth2/OIDC Google y BFF

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1 con responsable Web.
- **Dependencias:** BE-002/BE-003; C3 aprobado en `10_GUEST_AUTH_CONTRACT_C3.md`.
- **Alcance:** intercambio OAuth2/OIDC, identidad Guest local y JWT propios;
  refresh transparente desde Next.js; el OTP histórico espera el módulo Reservations.
- **Aceptación:** Google OIDC real, sesión `GUEST`, refresh rotativo y logout
  fueron verificados localmente mediante Docker. El callback/dominio productivo,
  remitente Resend y vínculo OTP dependiente de Reservations quedan como
  seguimiento de despliegue e integración.

### BE-005 — Contratos OpenAPI e integración inicial

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1
- **Dependencias:** BE-002 y BE-003.
- **Alcance:** contratos confirmados de identidad, sesión y propiedades
  autorizadas; integración Staff mediante BFF, DTO/Mapper y navegación privada
  derivada de permisos C2.
- **Aceptación:** el BFF Staff no expone tokens al navegador, mantiene cookies
  aisladas de Guest, devuelve C2 recalculado y soporta refresh/logout; el modo
  no-mock consume DTO/Mapper C2 y el modo mock conserva la fixture Private-09.
- **DoD:** contrato C2 y OpenAPI documentados; pruebas Backend/Web, build Docker
  y smoke completo login/sesión/refresh/logout registrados en `AlanHandoff.md`.


#### BE-004-ACCOUNT-SUMMARY-01 — Resumen Guest real propio (2026-10-06)

- **Estado:** COMPLETADA (2026-10-06); QA manual final real y visual PASS
  confirmado por el usuario. Historial: DoR READY → EN_PROGRESO → EN_QA;
  entrega end-to-end autorizada, incremento separado de AUTH-API-01.
- **Owner:** Alan/BD1 + Web; BD3 adaptador Reservations, revisión colaborativa.
- **Rama/base:** feature/backend-guest-account-summary-01, HEAD 9ade01d;
  cambios previos del working tree preservados, sin commit/push/merge.
- **DoR:** C3/BE-004, L-01 a L-07/BE-013B aprobados; GuestAccount, perfiles
  asociados y vínculo OTP persistente disponibles. Sin decisiones faltantes.
- **Alcance:** GET Guest/BFF account summary desde GuestPrincipal; cuenta,
  perfiles propios, count de vínculos OTP y próxima estancia confirmada real.
  DTO/mapper/model/hook/UI y OpenAPI actualizados en el mismo incremento.
  Sin accountId del Browser, tokens JS, mutaciones o exposición comercial/fiscal.
- **Aceptación/DoD:** contrato/QA [42](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md),
  PostgreSQL/auth/titularidad, paridad OpenAPI, Web/mock/errores, verify completo,
  suite/typecheck/lint/build, stack healthy y QA manual final del usuario.
- **Evidencia:** 31 Backend relevantes y verify final 385 PASS, cero failures/
  errors/skipped; Web 120 relevantes y 1055 PASS/214 archivos, typecheck/lint/
  build PASS. OpenAPI vivo/test 35/25/32/10 y cinco legacy deprecated;
  nullabilidad real objeto/null probada, headers/security/scoping correctos.
  Stack reconstruido healthy, Web/Swagger/doc 200, summary anónimo 401 y
  DNS interno Backend correcto. Auth/migraciones/Compose/.env preservados;
  diff --check PASS. Tests aislados retirados sin tocar BD integrada.
- **Seguimiento anterior (histórico):** QA 42 Google → summary 200 → dashboard
  real → logout y QA visual pendientes; ambos incrementos permanecían EN_QA.
- **QA manual final (2026-10-06):** usuario confirma summary BFF 200, dashboard
  con datos reales, ausencia de perfil/reservas correcta, logout con summary/
  session 401 y QA visual del rediseño PASS.
- **Siguiente:** incremento cerrado; esperar autorización para nueva tarea.
  Sin commit/push/merge.

#### BE-005-AUTH-API-01 — Login/logout/refresh/me explícitos y compatibles

- **Estado:** COMPLETADA (2026-10-06); QA manual final real PASS confirmado
  por el usuario. Historial: entrega EN_QA (2026-10-05), implementación
  autorizada, automatizados y smoke HTTP PASS; confirmación final entonces pendiente.
- **Owner:** Alan / BD1; reviewers Web/BFF y Android colaborativos, revisión local Codex.
- **Rama/base:** `feature/backend-explicit-auth-api-01`, HEAD `9ade01d`;
  rama nueva de implementación; registro documental READY previo preservado.
  Sin commit/push/merge.
- **Dependencias/DoR:** BE-001/002/003/004/005, OPENAPI-01 y AUTH-03 cerrados;
  C1/C2/C3 aprobados, extensión aditiva autorizada por el usuario.
  [Contrato/evidencia 40](40_EXPLICIT_AUTH_ENDPOINTS_INCREMENT.md) y
  [guía QA 41](41_EXPLICIT_AUTH_ENDPOINTS_QA.md).
- **Entregado:** cinco aliases: Staff POST login/logout y GET me; Guest POST
  logout y GET me; delegan en handlers existentes. Refresh/Google conservados;
  cinco rutas antiguas compatibles y deprecated solo en OpenAPI, sin retirada,
  redirect ni cambio semántico. Sin cambios JWT/cookies/permisos/scope/auditoría,
  servicios de negocio, migraciones, dependencias, Frontend o BFF.
- **Aceptación/DoD automatizado:** equivalencia viejo/nuevo, 401/validación,
  revocación/rotación/aislamiento/C2 y auditoría sin duplicación PASS. OpenAPI
  real 34 operaciones/24 paths/29 schemas/nueve tags; auth/DTOs/status/summaries,
  deprecated y paridad exacta PASS, sin exclusiones nuevas.
- **Pruebas reales:** focalizados **56 PASS**, incluidos nueve tests HTTP
  (ocho MockMvc y uno Servlet real), nueve OpenAPI; verify completo **374 PASS**,
  BUILD SUCCESS, cero failures/errors/skipped, Java 21/PostgreSQL 17 aislados.
  JAR HTTP: doc/UI/config 200; paths/components idénticos a tests; cuatro
  combinaciones Staff login/logout nuevo/legacy, refresh y revocación PASS.
  `git diff --check`, enlaces, JSON/scripts Postman y preservación de los once
  cuerpos de métodos Auth originales PASS. Colección ampliada, previos intactos.
- **Hallazgo/límites:** JSON inválido login/sessions produce 400 en MockMvc pero
  401 vacío en Servlet por redispatch a /error protegido. Comportamiento heredado
  preservado, descrito en OpenAPI/QA y cubierto por test HTTP real; no se amplía
  /error. Guest autenticado probado con GoogleOidcClient de test, sin afirmar
  Google externo vivo ni ejecución manual Postman/Swagger por el usuario.
- **Mejora QA manual (2026-10-05):** profile manual-qa en Compose de pruebas,
  manual-backend + manual-postgres tmpfs, bootstrap real para qa_staff sintético
  SUPER_ADMIN. Comando único y credenciales exclusivas QA en guía 41; Swagger
  localhost:18086. postgres/verify sin cambios ni bootstrap; BD automatizada
  contiene cero qa_staff. Cold start/reinicio sin duplicación, flujo HTTP
  login/me/logout/revocación y Swagger PASS; verify completo nuevamente
  **374 PASS**, cero failures/errors/skipped. API y OpenAPI no cambian ni incluyen
  las credenciales QA. Sin defaults normales/producción/migraciones/secretos.
- **Stack integrado canónico (2026-10-05):** root compose.yaml publica Backend
  por PMS_BACKEND_PORT=8081 local; Web del .env en 3001, BFF backend:8080 y
  datasource postgres interno. Bootstrap local opt-in por PMS_BOOTSTRAP_ADMIN_*,
  sin defaults activos/secretos versionados; .env existente intacto. Tests
  postgres/verify originales, QA manual histórico movido a archivo propio.
  README/guía local 13/QA 41/DEC/preflight actualizados. Comando raíz exacto PASS,
  tres servicios healthy, Web/Swagger/doc 200, DNS interno 200, Staff directo y
  BFF PASS; Google start/callback inválido al mismo Backend PASS, consentimiento
  manual pendiente. Verify **374 PASS**, paridad OpenAPI 34/24 y diff --check PASS.
- **QA manual previo confirmado (2026-10-05):** usuario reporta Staff BFF
  login/sesión/refresh/logout PASS y Guest Google real login → session 200 →
  refresh 200 → session 200 → logout 204 → session 401 PASS. Evidencia conservada.
- **Corrección BFF final autorizada:** working tree aún consumía legacy en cinco
  llamadas. Dos session/route.ts Web migran a login/me/POST logout; rutas públicas,
  refresh/Google, cookies y errores intactos. Test nuevo 37 casos; 62 relevantes y
  suite Web completa **1006 PASS**, typecheck/lint PASS. Next typegen resuelve
  tipos generados obsoletos sin alterar rutas ni next-env. Backend/src y helpers
  sin cambios; verify Backend no repetido. OpenAPI HTTP 200, explícitos y cinco
  legacy deprecated correctos, paridad 34/24. Docs 40/41 y handoff actualizados.
- **Corrección Guest UI/BFF (2026-10-06):** bug de account=null sin hidratación
  confirmado en working tree. Query de GET BFF session al montar en real,
  DTO/modelo/mapper de identidad confirmada sin tokens ni ExternalIdentity
  inventada. 200 signed-in, checking sin flash, 401 signed-out y 503/red error
  con retry. Logout real DELETE BFF antes de limpiar Guest; Staff preservado.
  Mock correo/Google intacto; Google real usa enlace BFF desde opción inicial.
  95 relevantes y suite Web 1026 PASS/211 archivos; typecheck/lint/diff --check
  y build Web PASS. Stack healthy, HTTP auth SSR checking sin flash y Swagger
  200/34/24/security/legacy PASS. Backend/helpers/.env preservados por hashes,
  sin verify nuevo. Resumen de cuenta aún provisional y fuera
  del arreglo de sesión; evidencia y QA final actualizados en docs 40/41.
- **Seguimiento anterior (histórico):** callback Google → /cuenta sin reload →
  logout UI y regresión Staff pendientes; incremento mantenido EN_QA.
- **QA manual final (2026-10-06):** usuario confirma Google real → callback →
  /cuenta reconocida sin reload, Guest session 200, refresh, logout UI, sesión
  revocada 401 y Staff login/session/refresh/logout PASS. BFF consume endpoints
  explícitos login/me/logout/refresh.
- **Siguiente:** incremento cerrado; esperar autorización para nueva tarea.
  Sin commit/push/merge.

#### BE-005-OPENAPI-01 — Baseline y puesta al día OpenAPI/Swagger

- **Estado:** COMPLETADA; QA visual/manual ejecutado y confirmado PASS
  por el usuario (2026-10-05); evidencia automatizada previa conservada.
- **Rama/base:** chore/backend-openapi-contract-baseline, HEAD 8cb2811;
  árbol limpio al iniciar, sin commit/push/merge.
- **Owner:** Alan / BD1; reviewers de módulos afectados colaborativos.
- **DoR/alcance:** springdoc existente; C1/C2/C3, contratos BD2 de catálogos/
  disponibilidad y On-books/OTP aprobados disponibles. Inventario de controllers,
  reglas permanentes y documentación de DTOs/auth/respuestas; sin endpoints,
  permisos, lógica de negocio, persistencia ni dependencias nuevos.
- **Baseline real:** /v3/api-docs OpenAPI 3.1.0, 29 operaciones en 9 controllers;
  paths/métodos completos pero auth, respuestas y schemas incompletos.
- **Aceptación/DoD:** paridad de mappings y documento generado; parámetros,
  DTOs, status, Bearer/cookies, límites y audiencia correctos según fuentes.
  Tests estructurales de contrato + focalizados + verify completo y diff --check;
  inventario/gaps en docs/39_BACKEND_OPENAPI_BASELINE.md. Conservar EN_QA hasta
  QA manual del usuario PASS conforme al DoD común; exclusiones explícitas.
- **Evidencia:** 29/29 operaciones, 19 paths, 29 schemas; ocho tests OpenAPI;
  focalizados 68 PASS y verify 363 PASS (0 failures/errors/skipped), JAR generado.
  HTTP QA /v3/api-docs, Swagger UI y swagger-config 200; paths/components
  idénticos a tests. Cuatro securitySchemes, 26 operaciones protegidas, tres
  sin credencial previa; Actuator/error fuera del inventario de negocio.
  Comparación funcional Java contra HEAD PASS; diff --check PASS.
- **Gaps/exclusiones:** sin mappings de aplicación excluidos ni endpoints
  actuales sin fuente de contrato; conservar límites BFF-only y ejemplos C1
  conceptuales según el inventario, sin inventar DTOs/error codes.
- **QA visual confirmado:** Swagger UI carga sin errores; nueve tags y 29
  operaciones visibles; paridad con mappings 29/29. Bearer Staff/Guest y
  refresh cookies separados; Actuator/error fuera de la API de negocio.
  Códigos, DTOs, parámetros, headers y nullability revisados PASS por el usuario.
- **Regla permanente conservada:** todo endpoint HTTP nuevo/modificado debe
  actualizar y validar OpenAPI/Swagger dentro del mismo incremento, conforme
  a backend/AGENTS.md y docs/02_API_CONTRACT_POLICY.md; sin editar esas fuentes.
- **Cierre:** QA manual PASS más focalizados 68 PASS y verify 363 PASS previos;
  cierre documental exclusivo en AlanPlan/AlanHandoff, diff --check PASS.
- **Siguiente:** esperar autorización para otro incremento o publicación;
  no iniciar otra tarea ni hacer commit/push/merge.


## BD2 — Core PMS

Los estados actuales incorporan el cierre BD2-010 sobre main `345481b`.
Las cifras de las entregas anteriores se conservan como evidencia histórica;
los errores de fixtures y la conexión de booking BD3 ya están resueltos.
El alcance de catálogos aprobado es C/R/U: no incluye bajas ni reclasificación.

### BD2-001 — Fase 1: cimientos y contratos

- **Estado:** COMPLETADA
- **Owner:** BD2
- **Reviewer:** Codex — revisión local; PR/revisión del equipo pendiente.
- **Rama:** `feature/bd2-foundation-contracts`
- **Dependencias:** BE-001 y BE-003 COMPLETADAS; reutiliza Organization/Property y scope.
- **DoR:** plan de fases autorizado por el usuario; Fase 1 autorizada explícitamente.
- **Alcance:** esquema mínimo de inventario/tarifas, dinero exacto y puerto interno ATS con fixture de pruebas.
- **Contrato:** `11_BD2_CORE_FOUNDATION_CONTRACT.md`.
- **Aceptación:** migración sobre esquema existente y vacío; relaciones no cruzan propiedades;
  OOO/OOS conserva motivo/período/actor; importe BIGINT con moneda; rango de noches explícito;
  stub ATS=5 solo en pruebas, nunca en el artefacto productivo.
- **DoD:** suite Backend en PostgreSQL, pruebas de restricciones y dinero, build del artefacto;
  evidencia y límites en AlanHandoff.
- **Fuera de alcance:** entidades operativas, CRUD, cálculo real, endpoints y reservas.

### BD2-002 — Fase 2: entidades y repositorios

- **Estado:** COMPLETADA
- **Owner:** BD2
- **Rama:** `feature/bd2-entities-repositories`, desde `origin/main` en `a59a235`.
- **Dependencia:** BD2-001 COMPLETADA e integrada en PR #60.
- **DoR:** Fase 2 autorizada por el usuario; esquema y reglas OOO/OOS definidos en
  `11_BD2_CORE_FOUNDATION_CONTRACT.md`; autorización C2 disponible.
- **Alcance:** entidades Property, RoomType, Room, RatePlan y OutOfOrderRecord;
  repositorios JPA, lecturas con scope y conteo OOO por noche.
- **Aceptación:** Hibernate valida el esquema sin migraciones nuevas; roundtrip JPA
  exacto de dinero/fechas; lecturas restringidas a organización y properties del scope;
  OOS/liberados excluidos, OOO duplicados contados una vez por Room/noche.
- **DoD:** suite completa PostgreSQL + build PASS, pruebas de persistencia y límites
  temporales/scope, revisión local y evidencia en AlanHandoff.
- **Fuera de alcance:** servicios CRUD, endpoints, disponibilidad ATS real, reservas,
  cambios de permisos y flujo de liberación/auditoría OOO/OOS.

### BD2-003 — Fase 3: motor ATS MVP

- **Estado:** COMPLETADA — implementación, acceptance y DoD local PASS.
- **Owner:** BD2.
- **Rama:** `feature/bd2-availability-engine`, desde `origin/main` en `8e67b7d`.
- **Commit/push:** `ec8c68f` publicado en `origin/feature/bd2-availability-engine`.
- **Dependencias:** BD2-002 integrada en PR #61; contrato y ciclo de vida de
  `ReservationStay` revisados en `origin/feature/bd3-foundation` (aún no integrada).
- **DoR:** Fase 3 autorizada por el usuario. El contrato BD2 existente define
  mínimo de ATS por noche, `[arrival, departure)`, OOO descuenta y OOS no;
  el ciclo de vida de ReservationStay fue verificado en la rama BD3.
- **Entregado:** `AvailabilityService` devuelve el mínimo nocturno de físico -
  OOO - ReservationStay consumidor; `[arrival, departure)` local; fechas
  convertibles a límites UTC con `ZoneId`.
- **Estados de consumo:** `RESERVED`/`IN_HOUSE` consumen; `CANCELLED`,
  `NO_SHOW` y `CHECKED_OUT` liberan. El query excluye además el padre
  `Reservation` en estado `CANCELLED`, pues BD3 deliberadamente no propaga la
  cancelación a las estancias.
- **Scope:** el query de ATS siempre filtra por el `propertyId` solicitado y el
  puerto exige que el llamante haya autorizado previamente la propiedad. La
  capa HTTP debe resolver y comprobar `PROPERTY`/`ALL_PROPERTIES` antes de
  invocarlo; no se ejecutan consultas globales ni filtrado posterior.
- **DoD:** suite completa PostgreSQL + build PASS, test del query SQL y
  límites UTC/DST, diff revisado. El runtime necesita las tablas de BD3 al
  invocar el cálculo; éstas están en la rama BD3 aún no integrada. El precheck
  ATS no hace admisión atómica y no garantiza por sí solo cero sobreventa concurrente.

Fases siguientes: exponer ATS por API solo después de confirmar el contrato
externo y autorización; integración y concurrencia tras acordar la admisión atómica.

### BD2-CI-001 — Corrección del test de upgrade de inventario

- **Estado:** COMPLETADA — integrada en main y revalidada en BD2-010.
- **Owner:** BD2.
- **Rama:** `feature/bd2-availability-engine`; corrección publicada en `277390d`.
- **DoR:** investigación y corrección de CI autorizadas por el usuario;
  mantener rama, sin merge/rebase y sin deshabilitar tests.
- **Alcance:** comparar upgrade con instalación limpia vigente, verificar el
  changeset de inventario y conservar validaciones de idempotencia/Property.
- **DoD:** `./mvnw -B verify` con Java 21/PostgreSQL 17, revisión de diff y
  seguimiento de la dependencia de integración en `AlanHandoff.md`.

### BD2-004 — API Staff de disponibilidad (Fase 4)

- **Estado:** COMPLETADA — API integrada en main; regresión global BD2-010. Owner BD2.
- **Rama:** `feature/bd2-availability-api`, dependiente de BD2 Fase 3 en `277390d`.
- **DoR:** Fase 4 y uso de servicios BD1 disponibles autorizados; contrato en
  `12_BD2_AVAILABILITY_API_CONTRACT.md`; permisos existentes C2 y scope explícito.
- **Alcance:** controlador/DTO, cadena Staff limitada a disponibilidad, guard de
  método con sesión/permiso/property scope, errores y OpenAPI. Sin cambios BD3.
- **DoD:** verify completo y pruebas HTTP de JWT Staff/Guest, sesión revocada,
  permisos, aislamiento de propiedad, validación de fechas, ATS y documentación.
- **Validación:** `./mvnw -B verify` PASS en Java 21/PostgreSQL 17;
  36 pruebas, cero fallos/errores/omitidas en la entrega original; integración cerrada en BD2-010.

### BD2-005 — Admisión e integración de disponibilidad (Fase 5)

- **Estado:** COMPLETADA — booking real conectado por BD3; aceptación y QA global en BD2-010.
- **Owner:** BD2; revisión cross-domain requerida de BD3.
- **Rama:** `feature/bd2-inventory-admission`, dependiente de Fase 4 en `0dbaa74`.
- **Entrega:** publicación autorizada; PR hacia `main`, que ya contiene Fase 4
  mediante PR #64 (`a4dc6b0`). Admisión y conexión BD3 integradas en main `345481b`.
- **DoR:** Fase 5 autorizada; motor ATS y API publicados. Tablas BD3 disponibles
  en `origin/main`; no modificar su booking ni sus fixtures sin autorización.
- **Alcance BD2:** puerto de admisión transaccional, demanda conjunta por noche,
  bloqueo por property/room type y excepción de inventario agotado; pruebas
  PostgreSQL de concurrencia/rollback y guía de pruebas API/Postman. QA HTTP
  corrige en la cadena BD2 el 403 que se convertía en 401 por error dispatch.
- **Aceptación:** una unidad consumida reduce ATS exactamente uno; demanda
  superior a ATS no ejecuta la escritura; dos admisiones para la última unidad
  no pueden confirmar ambas; rollback libera capacidad y bloqueos.
- **DoD:** verify completo, evidencia de integración aislada contra `origin/main`,
  límites y conexión con BD3 registrados, diff revisado.
- **Límite:** implementar el puerto no protege escrituras que no lo utilicen;
  BD3 conectó createBooking en `faa7876`; otros escritores deben adoptar el protocolo.
- **Validación BD2:** `./mvnw -B verify` BUILD SUCCESS, 46 pruebas sin
  fallos/errores/omitidas; colección Postman ejecutada con Newman: 8 solicitudes
  y 13 assertions PASS. Booking real validado en copia aislada (4 pruebas PASS).

### BD2-006A — Preparación del contrato de propiedades

- **Estado:** COMPLETADA — propuesta preparada y revisada localmente; no implica aprobación API.
- **Owner:** BD2; reviewer de seguridad/scope previsto: BD1.
- **Rama:** `feature/bd2-properties-crud`, desde `origin/main` `9552325`.
- **DoR:** CRUD pendientes autorizados; base de inventario/Auth integrada.
- **Alcance:** propuesta de rutas, campos y permisos; auditoría, límites de
  baja/reactivación y secuencia pendiente; sin cambios funcionales.
- **Aceptación/DoD:** distinguir reglas confirmadas de propuestas; no añadir
  roles/permisos ni ampliar scope; revisión de referencias y diff; publicación
  de la propuesta y evidencia en AlanHandoff.

### BD2-006B — Properties: altas, consultas y edición descriptiva

- **Estado:** COMPLETADA — alcance C/R/U integrado en main; QA global en BD2-010.
- **Owner:** BD2.
- **Dependencias:** BD2-006A; autorización C2 y AuditService existentes.
- **DoR:** contrato `15_BD2_PROPERTIES_CRUD_CONTRACT_PROPOSAL.md` aprobado;
  rutas/permisos confirmados, sin baja/reactivación ni cambios de timezone/moneda.
- **Alcance:** servicios/DTO/REST/OpenAPI, guard Staff por método,
  repositorios scoped, auditoría transaccional y extensión de Postman.
- **Aceptación/DoD:** definidos en el contrato aprobado; pruebas PostgreSQL/HTTP real,
  verify completo, diff revisado, commit/push y handoff.
- **Evidencia:** QA enfocada BUILD SUCCESS (13 tests); Postman 14 requests/20
  assertions PASS. Verify completo final: 190 tests, 0 failures, 8 errors BD3,
  0 skipped; las pruebas Properties pasan. El workflow permanece íntegro.

### BD2-007A — Contrato de administración de RoomTypes

- **Estado:** COMPLETADA — propuesta RoomTypes aprobada e implementada en BD2-007B.
- **Owner:** BD2; reviewer de seguridad/scope: BD1.
- **Rama:** `feature/bd2-room-types-crud`, desde `origin/main` `c2699ff`.
- **Dependencias/DoR:** BD2-002 completada (entidad/esquema/repositorio), C2 y
  AuditService existentes; CRUD BD2 pendientes autorizados por el usuario.
  La integración pendiente de booking BD3 no interviene en esta preparación.
- **Alcance:** publicar una propuesta de contrato C/R/U descriptivo, permisos,
  aislamiento, auditoría, límites de baja y criterios verificables.
- **Aceptación/DoD:** conservar el modelo, distinguir propuesta de API aprobada,
  confirmar unicidad y referencias, revisar diff y publicar commit/push.
- **Evidencia:** contrato 16 contrastado con dominio, SQL, scope C2 y admisión;
  diff/check revisados. Entrega documental, sin nueva ejecución Maven ni cambios BD3.

### BD2-007B — RoomTypes: altas, consultas y edición descriptiva

- **Estado:** COMPLETADA — C/R/U RoomTypes integrado en main; QA global en BD2-010.
- **Owner:** BD2; reviewer BD1 para permisos/scope.
- **Dependencias/DoR:** BD2-007A completada y contrato operativo aprobado;
  esquema/fundación BD2-002, C2 y auditoría existentes. No depende de que BD3
  conecte su booking al puerto de admisión: no modifica capacidad física.
- **Alcance propuesto:** servicio/DTO/REST/OpenAPI, scope antes de SQL,
  bloqueo de fila, auditoría transaccional y colección Postman.
- **Aceptación/DoD:** definidos en el contrato propuesto 16; PostgreSQL/HTTP,
  verify completo con errores ajenos visibles, diff revisado, commit/push/handoff.

- **Evidencia BD2-007B:** verify enfocado BUILD SUCCESS, 9 tests (API, rollback y HTTP real). Verify completo: 198 tests, 0 failures, 8 errors BD3, 0 skipped; ejecutado antes de añadir la prueba HTTP final. Newman RoomTypes: 8 solicitudes/11 assertions PASS en la validación final de catálogos.

### BD2-008 — Rooms C/R/U

- **Estado:** COMPLETADA — C/R/U integrado en main; QA global en BD2-010. Owner BD2; rama `feature/bd2-rooms-crud`.
- **DoR:** RoomTypes `1c0ed07`, esquema Room, C2 y auditoría existentes;
  continuación de CRUD autorizada por el usuario. Contrato 17 publicado.
- **Alcance:** alta física, consultas y edición exclusiva de código; no baja,
  reclasificación ni cambios BD3. Aceptación/DoD según contrato 17.
- **QA enfocada:** BUILD SUCCESS, 15 tests (9 Rooms y 6 de regresión RoomTypes).
  Incluye capacidad +1, locks reales, scope, validación, auditoría, rollback y HTTP.
- **Verify completo:** BUILD FAILURE, 208 tests, 0 failures, 8 errors solo BD3, 0 skipped.

### BD2-009 — RatePlans C/R/U

- **Estado:** COMPLETADA — C/R/U integrado en main; QA global en BD2-010. Owner BD2; `feature/bd2-rate-plans-crud`.
- **DoR:** Rooms `4cea3db`, esquema/MonetaryAmount/C2/AuditService existentes;
  continuación CRUD autorizada. Contrato 18 publicado antes de crear API.
- **Alcance:** catálogo de tarifas y precios exactos; sin inventario, baja ni
  reescritura de reservas/folios. Aceptación/DoD: contrato 18.
- **QA enfocada:** BUILD SUCCESS, 21 tests; 9 RatePlans y 12 regresiones Rooms/RoomTypes.
- **Verify completo final:** BUILD FAILURE, 217 tests, 0 failures, 8 errors solo BD3, 0 skipped.
  Las 40 pruebas de los cuatro catálogos BD2 pasan. Sin exclusiones ni cambios BD3.
- **Newman:** los cuatro catálogos suman 40 solicitudes/58 assertions PASS.
  SQL confirmó unicidad, audit real/no-op y precio exacto; ATS de tarifas permanece 1.
- **Fuera del alcance aprobado:** políticas de baja/retención/reclasificación aún
  no definidas. Fixtures/admisión BD3 resueltos; evidencia global en BD2-010.

### BD2-010 — Cierre de integración con BD3

- **Estado:** COMPLETADA — integrada mediante PR #72 en main `9eb2380`;
  revisión y checks exitosos confirmados por el usuario.
- **Owner/rama:** BD2; `feature/bd2-integration-closeout`.
- **DoR:** main `345481b` integra catálogos BD2, correcciones de fixtures BD3
  y admisión transaccional (`faa7876`). Usuario autoriza revisar y cerrar tareas.
- **Alcance:** pruebas BD2 contra booking/migraciones reales, consumo exacto,
  demanda conjunta, rollback y concurrencia; verify sin exclusiones y contratos
  actualizados. No modificar implementación ni fixtures de otros módulos.
- **DoD:** suite completa verde, regresiones reales de admisión, diff revisado,
  evidencia/handoff y commit/push de cierre. Bajas fuera del contrato C/R/U.
- **Evidencia:** verify Java 21/PostgreSQL 17 BUILD SUCCESS; main base 248 tests,
  rama final 254 tests, cero failures/errors/skipped. Seis regresiones reales nuevas.
  Detalle, límites y revisión en AlanHandoff BD2-010.

## BD2 — Folio/Payments y lifecycle de reservas

### BD2-FP-000 — Fase 0: revisión y contratos

- **Estado:** COMPLETADA — preparación documental, aceptación y revisión local PASS.
- **Owner:** José / BD2. Los contratos nuevos continúan PROPOSED.
- **Rama/base:** `feature/bd2-finance-lifecycle-contracts`, origin/main `9eb2380`.
- **Dependencias:** BD2-010 integrada mediante PR #72; servicios base Reservations,
  Folio, Audit, dinero, C2 y admisión disponibles.
- **DoR:** usuario autoriza nuevo reparto, plan modular e inicio de fase 0.
- **Alcance:** inventario de capacidades/brechas, contrato propuesto, decisiones
  pendientes y coordinación con BD1/BD3. Registro del reparto; entrega documental.
- **Aceptación:** fuentes y capacidades contrastadas; todos los flujos del nuevo
  alcance mapeados; decisiones aprobadas diferenciadas de propuestas; dependencias
  y criterios de aceptación verificables; siguiente entrega identificada.
- **DoD:** revisión local de documentos, referencias y diff; seguimiento/handoff,
  commit/push por entrega. No aprobar automáticamente contratos de fases siguientes.
- **Evidencia:** documentos 19/20; 11 referencias locales verificadas, 12 entregas
  mapeadas, fuentes/código contrastados y diff --check limpio. Sin cambios de
  runtime; no nueva ejecución Maven en esta entrega documental.
- **Siguiente paso:** revisar SH-D01 (idempotencia, fase 1) y FP-D02 (lectura folio).
  Proveedor, políticas y contratos de otras interfaces siguen pendientes.

### BD2-FP-001A — Preparación Fase 1: detalle de folio scoped

- **Estado:** EN_QA — aceptación y verify local PASS; revisión BD1 pendiente.
- **Owner:** José / BD2; revisión de scope compartido: BD1.
- **Rama/base:** `feature/bd2-financial-foundation`, origin/main `5419606`.
- **Dependencias/DoR:** FP-000 COMPLETADA, C2 APPROVED, folio y repositorios
  existentes. Usuario autoriza retomar BD2 e iniciar Fase 1. Este prerrequisito
  aplica la regla C2 vigente; no necesita decidir proveedor ni idempotencia.
- **Alcance:** detalle de folio con IDs autorizados en SQL; validar scope antes
  de query, no cargar datos de otra property ni revelar existencia por errores.
  No cambia consultas de reservas, escrituras, APIs ni políticas financieras.
- **Aceptación:** lectura autorizada PROPERTY/ALL_PROPERTIES; folio ajeno no se
  materializa en JPA; scope ausente rechazado antes de carga; mismo resultado
  para folio inexistente y fuera de scope; regresión PostgreSQL y verify completo.
- **DoD:** pruebas, diff/check y evidencia en AlanHandoff.
- **Evidencia local:** regresión original con 3 fallos de 5; corrección con
  verify completo BUILD SUCCESS, 259 tests, 0 failures/errors/skipped.
- **Límite histórico:** SH-D01 estaba pendiente en esta entrega; el usuario
  aprobó después la base local. Implementación en BD2-FP-001.

### BD2-FP-001 — Fase 1: idempotencia transaccional local

- **Estado:** EN_QA — aceptación y verify local PASS; revisión pendiente.
  Owner José / BD2; reviewers BD1 (base compartida) y BD3 (test de upgrade).
- **Rama:** `feature/bd2-financial-foundation`; incremento sobre `be09de4`.
- **DoR:** FP-000 integrada; SH-D01 local aprobado explícitamente por el usuario.
  Reutilizar Reservations/Folio, C2, AuditService y PostgreSQL. No nace módulo.
- **Alcance:** recibo persistente append-only; clave 8–128 caracteres; identidad
  Staff/property/operación/clave; payload canonicalizado sin secretos; dedupe,
  conflicto, efecto/recibo/audit atómicos y bloqueos entre transacciones/JVMs.
- **Aceptación:** reintentos y concurrencia no duplican efecto; autorización
  vigente antes de recuperar resultado; aislamiento por actor/property/operación;
  payload/version/política distinta generan conflicto; rollback no deja recibo;
  upgrade/idempotencia/append-only PostgreSQL y verify sin exclusiones.
- **Archivos:** LocalOperationService/Request/Receipt y repositorio JDBC,
  nuevo changeset en 004ServiceReservations, contrato 21 y pruebas.
- **DoD/evidencia:** Java 21/PostgreSQL 17, `./mvnw -B verify` BUILD SUCCESS;
  281 tests, 0 failures/errors/skipped, incluidos 22 tests nuevos.
  Upgrade/reaplicación y diff revisados; detalles en AlanHandoff.
- **Límites:** sin caducidad automática, HTTP, proveedor ni nuevos permisos.
  Pagos externos y APIs financieras mantienen sus decisiones pendientes.

### Próximas entregas financieras y lifecycle

Desde el traspaso de 2026-10-03, Alan / BD1 y Juan / BD3 asumen conjuntamente
estas entregas pendientes; José pasa al Frontend. El reparto específico de cada
tarea queda por acordar entre ellos: propuesta y contexto en documento 23.
La autoría de entregas anteriores se conserva; EN_QA no significa integrada.
Reviewers del dominio afectado según contrato. Fuente de
aceptación, archivos previstos y dependencias por tarea:
`19_BD2_FINANCE_LIFECYCLE_PHASE0.md`, sección Entregas. DoR siempre exige el
contrato aplicable aprobado y dependencias COMPLETADAS; no implementar desde mocks.

| ID / módulo | Estado | Dependencias y decisión que falta |
| --- | --- | --- |
| BD2-FP-001 / 1 base transaccional | EN_QA | SH-D01 local aprobado; verify PASS, revisión pendiente; no requiere SH-D03 |
| BD2-FP-002 / 2A lectura folio | PENDIENTE | FP-000; FP-D02 (propuesta en documento 20) |
| BD2-FP-003 / 2B escritura folio | PENDIENTE | FP-001; FP-D04/contrato de escritura |
| BD2-FP-004 / 3 pagos/garantía | PENDIENTE | FP-001/003; FP-D01/03 y SPI BD1 |
| BD2-FP-005 / 4A distribución | PENDIENTE | FP-003/004; FP-D05 y master/direct bill |
| BD2-FP-006 / 4B invoices | PENDIENTE | FP-003/004; FP-D06 |
| BD2-LC-001 / 5A cancelación | PENDIENTE | FP-003/004; LC-D01 |
| BD2-LC-002 / 5B no-show | PENDIENTE | FP-003/004; LC-D02/night audit |
| BD2-LC-003 / 6 waitlist | PENDIENTE | FP-001; LC-D03/cotización/admisión |
| BD2-LC-004 / 7A room move | PENDIENTE | FP-001/003; LC-D04/SH-D02/HK |
| BD2-LC-005 / 7B extensión | PENDIENTE | FP-001/003; LC-D05/SH-D02/cotización |
| BD2-FP-LC-QA / 8 integración | PENDIENTE | Entregas incluidas y SPIs reales COMPLETADAS |

### Juan / BD3 — Auditoría de brechas de entrega

#### BD3-AUDIT-FIX-01 — Durabilidad de Night Audit y consultas con property scope

- **Estado:** EN_QA — implementación BD3 y verify automatizado PASS; QA manual del owner pendiente.
- **Owner:** Juan / BD3; revisión local Codex.
- **Base/rama:** base local `feature/bd3-ar-receivables`; rama de tarea `feature/bd3-audit-fixes`.
- **DoR:** los servicios y contratos internos existen; la auditoría identificó que la excepción revierte BLOCKED/audit y que reservation detail consulta por ID antes del scope. Sin cambios de API, permisos o migración.
- **Alcance:** separar el registro durable de intento bloqueado y su auditoría del rollback de cierre; probar persistencia después de completar la transacción; filtrar Reservation y ReservationStay por properties autorizadas en SQL.
- **Archivos previstos:** servicios/repositorios/tests de Operations y Reservations, además de este seguimiento.
- **Aceptación:** BLOCKED y su evento de auditoría permanecen consultables tras finalizar la transacción fallida; los detalles/listados de estancias solo devuelven filas de properties autorizadas.
- **Progreso:** fase 1 y fase 2 implementadas. Night Audit 4/4 y ReservationQuery 3/3 PASS; `./mvnw -B verify` PASS con Java 21/PostgreSQL 17 (331 tests, 0 failures/errors/skipped), JAR y `git diff --check` PASS.
- **DoD:** pruebas relevantes y `./mvnw -B verify` en Java 21/PostgreSQL 17; revisión de diff y `git diff --check`. Estado final EN_QA hasta QA manual del owner.
- **Fuera de alcance/bloqueado:** publicar APIs (contratos/seguridad BD1), admisión de OOO (protocolo BD2), conserjería/valet y ATS de room blocks (reglas producto), transporte externo (BD1), posting de Night Audit/promotions/rewards (BD2), permisos HTTP comerciales (BD1), compras y AR con reglas/decisiones pendientes.
- **Siguiente paso:** QA manual del owner; tras confirmación, marcar COMPLETADA. Los hallazgos fuera del alcance BD3 quedan con las dependencias registradas arriba.

### Juan / BD3 — F14.2 Cuentas por cobrar y Direct Bill

- **Estado:** PENDIENTE — DoR incompleto; existe propuesta documental, no contrato aprobado.
- **Alcance:** acuerdo de crédito por Company/Property, asociación con folio COMPANY y saldos/aging sobre la fuente financiera acordada.
- **Fuera de alcance:** segundo ledger de folios, pagos/invoices, endpoints no confirmados, postings de promociones/rewards y compras.
- **Dependencias:** FP-D04 y escritura/SPIs de Folio de BD2; confirmar reglas de crédito/aprobación/aging, fuente del saldo y permiso/scope.
- **Contrato:** `36_BD3_AR_DIRECT_BILL_CONTRACT_PROPOSAL.md`.
- **Siguiente paso:** aprobar las decisiones abiertas del contrato; luego registrar archivos/acceptance y pasar a READY. No implementar postings mientras falte autorización de negocio o SPI financiero.

## Alan / BD1 — Plan de implementación integral

**Actualización:** 2026-10-04. **Base inspeccionada:** main `ea50726` (PR #93).
**Owner:** Alan / BD1. **Estado del programa:** EN_PROGRESO — AD-01 aprobado;
BE-014B-COM-01/02 integrados en main; otros incrementos pendientes.
El usuario solicita planificar sus once responsabilidades y usar AlanPlan/AlanHandoff
para control. La planificación y el inicio de BE-014A están autorizados; no confirman por sí solos
los contratos API, permisos nuevos, proveedores ni reglas pendientes.
Se conserva el seguimiento anterior BE-001 a BE-005 y BD2.

### Punto de partida verificado

- BE-001 a BE-005 completadas según handoff: Foundation, Staff/Guest Auth, C2 y BFF.
- Inventario/ATS/admisión y catálogos C/R/U integrados. Booking usa admisión
  transaccional en el contexto completo; otros escritores deben coordinar sus locks.
- Reservations/Folio, Operations y Commercial tienen servicios y migraciones.
  La inspección de controllers encuentra HTTP de Auth e Inventory; no una API
  completa de reservas, operaciones, comercial o finanzas.
- Los seis servicios Commercial ya exigen COMMERCIAL_MANAGE y validan property
  scope contra el snapshot Staff; los contratos HTTP y el actor de sesión siguen
  pendientes.
- GuestProfile y ReservationLinkService ya existen. Este último resuelve referencia
  y correo; ReservationLinkVerificationPort es una interfaz vacía. Falta contrato
  invocable, desafío OTP y asociación autorizada; no esperar la creación del módulo.
- GoogleOidcClientImpl y ResendEmailSender existen. Esta planificación no prueba
  Google ni entrega de correo en vivo. Su disponibilidad externa queda SIN VERIFICAR.
- C1/C2/C3 vigentes: Guest/Staff separados, un rol Staff fijo, permisos desde BD,
  scope explícito; MFA Staff excluido hasta modificar C1. Roles no personalizables.
- Último verify documentado: 300 tests PASS en BE-014B-COM-02 (Java 21,
  PostgreSQL 17); el usuario confirmó su QA y PR #93 lo integró en main.

### Cobertura de los once requisitos del usuario

| # | Responsabilidad | Tareas de entrega |
| --- | --- | --- |
| 1 | Protección APIs de reservas, operaciones, comercial y finanzas | BE-014A/B |
| 2 | Permisos comerciales/financieros y sustitución de SUPER_ADMIN provisional | BE-014A/B con BD2/BD3 |
| 3 | Centro de integraciones, channels, error queue, retries y recuperación | BE-007A/B, BE-009, BE-015A/B |
| 4 | Reportes, exportaciones y revenue KPIs desde datos reales | BE-010A/B |
| 5 | CRUD Staff, roles y memberships según contratos | BE-006A/B |
| 6 | Revocación administrativa y por cambios sensibles | BE-006B/C |
| 7 | MFA Staff, privacidad y consentimientos | BE-011A/B, BE-012A/B |
| 8 | AuditTrail consultable, filtros, scope y paginación | BE-008A/B |
| 9 | Vínculo OTP de reservas históricas | BE-013A/B |
| 10 | Google y Resend en presentación | BE-016A/B |
| 11 | Adapters de pagos y mensajería coordinados | BE-015A/B |

Los sufijos A son contratos/preparación; B son implementación/validación y C,
cuando existe, cierre específico. No se marca completada la tarea padre hasta
cerrar todos sus incrementos incluidos. Cada incremento nace PENDIENTE y pasa
READY solo al cumplir su DoR; una dependencia contractual exige A COMPLETADA,
una dependencia funcional exige B/C COMPLETADA según la entrega.

### Orden de entrega y dependencias

| Fase | Entregas | Condición de entrada / salida |
| --- | --- | --- |
| 0 — acuerdos | BE-014A, BE-008A, BE-006A, BE-007A, BE-015A, BE-013A, BE-016A | Inventario real y revisores; salida: contratos aplicables aprobados, decisiones abiertas explícitas y entorno de presentación identificado |
| 1 — acceso y administración | BE-014B por dominio, BE-008B, BE-006B/C | Acuerdos A; auditoría inicial reutiliza auth_audit_events/AuditService y se integra al contrato común sin duplicar historia |
| 2 — Guest verificable | BE-013B, BE-016B | C3 + SPI/contrato OTP; Google/Resend configurados y evidencia de entrega real para cierre externo |
| 3 — integraciones | BE-007B, BE-015B, BE-009 | Idempotencia compartida y adapters aprobados; cada proveedor se cierra con sandbox y consumidores reales |
| 4 — analítica | BE-010A/B | Fórmulas/fuentes confirmadas; ingresos financieros reales disponibles para ADR/RevPAR y filtros por business date |
| 5 — MFA y privacidad | BE-011A/B, BE-012A/B | Cambio de C1/C8 y C9 aprobados; contratos pueden prepararse desde fase 0 |
| 6 — cierre | BE-017 | Entregas incluidas completas, integración BD2/BD3, aceptación y presentación verificadas |

Este orden es de prioridad, no una dependencia artificial entre todas las fases.
Contratos independientes y preparación de Google/Resend pueden avanzar sin esperar
pagos; reportes independientes pueden entregarse cuando sus propias fuentes estén
listas. No declarar KPIs completos si faltan ingresos, fórmulas o business date.
Sin estimaciones de fechas hasta conocer contratos, disponibilidad BD2/BD3 y sandbox.

### Reglas de coordinación y decisiones pendientes

| Decisión | Autoridad / revisión | Qué debe quedar confirmado |
| --- | --- | --- |
| Acceso por operación | BD1 + BD2/BD3; consumidores Web/Android afectados | Matriz contexto/ruta/permiso/rol/scope/actor, acceso público y Guest, errores y BFF; reutilizar C2 antes de proponer permisos nuevos |
| C4 administración | BD1 + producto | Campos, unicidad, alcance GERENCIA, protección administrativa, baja/retención y cambio de membership; roles fijos consultables/asignables |
| Roles personalizables | Producto, Change Control C2 | Solo si se solicita/aprueba cambiar el catálogo fijo; no forma parte automática de BE-006 |
| C5 integraciones | BD1 + BD2/BD3 | Categorías/proveedores, secret references, callbacks, retry/backoff, estados inciertos, recuperación e idempotencia |
| C6 auditoría | BD1 + owners emisores | Taxonomía, eventos existentes, retención, detalle seguro, filtros/paginación y acceso org/property |
| C7 analítica | Producto + BD1/BD2/BD3 | Fórmulas, numeradores/denominadores, descuentos/reembolsos, moneda, timezone, business date y fuentes SQL |
| C8 MFA / cambio C1 | Producto + BD1 | Factor, usuarios obligados, enrolamiento, desafío, recuperación, revocación, límites y auditoría |
| C9 privacidad | Producto + BD1/BD3 | Propósitos/canales, evidencia, titularidad GuestProfile, retenciones y DSR |
| C3 extensión OTP | BD1 + BD3 + consumidor Guest | Firma del puerto, endpoints/DTO/BFF, vínculo persistente y carreras; mantener reglas OTP ya aprobadas |
| SH-D01 de BD2 | BD1 + BD2 | Servicio/persistencia compartidos de dedupe, namespace, payload canónico, retención y recuperación; no dos motores incompatibles |
| SPIs externos | BD1 + BD2 pagos / BD3 mensajería | Dueño del efecto, proveedor/sandbox, moneda/métodos, callback auténtico, delivery/status y recuperación |

Alan coordina la protección y contratos compartidos. BD2/BD3 mantienen las reglas
de negocio y aprueban cambios a sus servicios; Alan no crea un segundo booking,
folio, night audit ni motor comercial. En cada PR queda claro quién incorpora
controllers/BFF y quién asegura autorización en entradas internas. Una fachada
segura no sustituye scope/permiso en el servicio y predicados SQL en repositorios.

### BE-014 — Protección transversal de APIs y permisos

- **Estado:** BE-014A EN_QA — AD-01, AD-02 y AD-03 aprobadas; AD-04 a AD-06 y
  contratos HTTP pendientes. BE-014B EN_PROGRESO — COM-01/02 completados,
  OPS-01 y FIN-01 completados; otros dominios pendientes. Prioridad inicial.
- **Entrega:** `21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md` PROPOSED: catálogo SQL C2,
  matrices de acceso, brechas de scope/actor/filtros, decisiones AD-01 a AD-06 y
  acceptance por dominio. Nueve enlaces y referencias/guards contrastados;
  diff --check PASS. Sin Java/SQL ni nueva ejecución Maven.
- **Decisión inmediata:** AD-01, AD-02 y AD-03 aprobadas por el usuario para
  Commercial, finanzas y ServiceRequests, respectivamente. Revisar integración
  con owners antes de BE-014B. AD-04 a AD-06 siguen abiertas; AD-04 bloquea
  envío externo por contradicción Reception/SUPER_ADMIN.
- **Rama:** `feature/bd1-api-access-contracts`, creada desde main `9003567` antes
  de editar esta entrega; conserva cambios documentales previos.
- **Inicio autorizado:** 2026-10-04; inventario de interfaces, SQL C2 y cadenas
  revisado. Contratos HTTP operativos aún no disponibles: se documentan como
  pendientes sin inventar rutas, y se prepara propuesta para revisión BD2/BD3.
- **Dependencias:** BE-002/003/005; A requiere inventario BD2/BD3, B requiere A
  COMPLETADA y contrato del endpoint disponible. Entrega B separada por dominio.
- **DoR A:** identificar entradas HTTP y de servicio existentes/propuestas;
  reunir C2, documento 20 y contratos de operaciones/comercial con sus owners.
- **Entrega A:** matriz por operación de reservas/stays/folios/pagos/HK/OOO/OOS/
  night audit/B2B/grupos/promos/rewards; contexto Staff/Guest/público, permiso,
  PROPERTY/ALL_PROPERTIES, actor, pertenencia de recurso y errores. Confirmar
  operaciones financieras que exigen devolución/anulación y acceso del AUDITOR.
  No copiar permisos de mocks ni autorizar recursos por UUID o correo.
- **DoR B:** matriz y nuevos permisos, si hacen falta, aprobados mediante Change
  Control; servicio y rutas aplicables confirmados. B no inventa APIs ajenas.
- **Entrega B:** guards de servicio, chains de seguridad y repositorios scoped;
  actores desde sesión; reemplazar SUPER_ADMIN provisional solo donde el contrato
  lo indique; BFF/OpenAPI coordinados. No query global + filtro posterior.
- **Aceptación:** ausencia/token inválido/Guest cruzado/sesión revocada -> 401;
  Staff sin permiso o property -> 403; recurso ajeno no revela datos ni existencia;
  cada rol autorizado tiene casos positivos y negativos por operación. Cambio de
  permiso/membership se aplica sin esperar exp JWT; acceso Guest prueba titularidad.
- **Archivos previstos:** contrato de acceso nuevo en backend/docs; securityauth,
  chains/guards/repos de cada dominio, tests HTTP/SQL, Liquibase RBAC solo si aprobado;
  consumidores BFF/DTO/Mapper afectados bajo coordinación de owner.
- **Reviewers:** BD2/BD3 para su dominio; consumidores Web/Android si cambia API.

#### BE-014A-FIN-01 — Confirmación de permisos financieros AD-02

- **Estado:** COMPLETADA (2026-10-04). El usuario aprobó AD-02 y la QA
  documental; revisión de integración del owner financiero y Web pendiente.
- **Rama/base:** `feature/bd1-api-access-contract-approval` desde `main`
  actualizado `d258d60` (PR #97 integra el esquema Staff).
- **DoR:** C2 y catálogo SQL existentes; propuesta BE-014A/documento 21 y
  FP-D02/documento 20 disponibles; FolioServiceImpl y LocalOperationServiceImpl
  inspeccionados. Al iniciar este incremento, AD-01 comercial era la única
  decisión de acceso ya aprobada.
- **Alcance/archivos:** precisar AD-02 en `docs/21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md`
  y seguimiento. Corregir la fila de reversos al comportamiento real: el servicio
  permite CHARGE/PAYMENT y rechaza ADJUSTMENT. Sin Java, SQL, rutas, permisos nuevos
  ni aprobación de FP-D02/04 o del proveedor de pagos.
- **Aceptación/DoD:** matriz de rol/operación/scope trazable al catálogo C2 y al
  método actual; distinguir compensación contable de refund externo; decisión
  explícita sobre AUDITOR. Revisar diff/enlaces, entregar QA documental y esperar
  aprobación antes de cerrar, commit o push.
- **Evidencia local:** catálogo C2, FolioServiceImpl, LocalOperationServiceImpl
  y propuesta FP-D02 contrastados; nueve enlaces locales válidos y
  `git diff --check` PASS. Maven no aplica: solo cambia documentación.
- **QA manual:** aprobación explícita del usuario de las cinco filas AD-02;
  cierre, commit y push autorizados. BE-014A global sigue EN_QA para AD-03 a
  AD-06 y contratos HTTP pendientes.

#### BE-014A-OPS-01 — Facultad limitada de Recepción AD-03

- **Estado:** COMPLETADA (2026-10-04). El usuario aprobó AD-03 y la QA
  documental; revisión de integración BD3/Web pendiente antes de implementación.
- **Rama/base:** `feature/bd1-reception-service-access-ad03` desde `main`
  actualizado `ccf72a2` (PR #98 integra AD-02).
- **DoR:** C2 y catálogo SQL confirmados; propuesta BE-014A/documento 21;
  ServiceRequestService/Repository y regla global de mensajería inspeccionados.
  AD-04 de respuesta externa permanece independiente y pendiente.
- **Alcance/archivos:** precisar en documento 21 una capacidad de Recepción
  para abrir y consultar ServiceRequests por PROPERTY sin concederle
  OPERATIONS_MANAGE ni modificar mensajería. Seguimiento AlanPlan/Handoff.
  Sin SQL, Java, rutas HTTP, rol o permiso nuevo efectivo hasta Change Control.
- **Aceptación/DoD:** justificar alternativa, matriz de roles/acciones y límites
  de scope/actor/relaciones; separar transiciones de Operaciones y envío externo;
  revisar enlaces/diff y entregar QA documental antes de cerrar, commit y push.
- **Evidencia local:** catálogo/roles C2, cinco categorías y métodos
  ServiceRequest inspeccionados; nueve enlaces válidos y `git diff --check` PASS.
  Maven no aplica a la propuesta documental; no hay permiso efectivo ni HTTP.
- **QA manual:** el usuario aprobó explícitamente el permiso nuevo, las dos
  filas de acciones y la consulta de las cinco categorías. Commit/push
  autorizados; la migración RBAC y guards se harán en otro incremento.

#### BE-014B-OPS-01 — RBAC y entrada Staff para solicitudes

- **Estado:** COMPLETADA (2026-10-04). El usuario confirmó que todas las
  pruebas manuales terminaron sin errores; commit y push autorizados.
- **Rama/base:** `feature/bd1-service-request-intake` desde `main` actualizado
  `71911e1` (PR #99 integra AD-03).
- **DoR:** AD-03 aprobada, C2/Staff Auth/PropertyScopeResolver disponibles;
  ServiceRequestService interno, repositorio y pruebas BD3 inventariados.
  Revisión BD3/Web de integración pendiente; no existe contrato HTTP aprobado.
- **Alcance/archivos:** changeset 003 nuevo para SERVICE_REQUEST_INTAKE de
  RECEPCION/SUPER_ADMIN, entrada Staff interna de open/get/list con sesión,
  permiso, PROPERTY y recursos relacionados scoped; pruebas PostgreSQL y
  seguimiento. Mantener métodos BD3 existentes para transición/assign y sus
  contratos; no abrir API HTTP ni mensajería AD-04.
- **Aceptación/DoD:** Recepción y roles OPERATIONS_MANAGE pueden abrir/leer
  solicitudes de su property; sin permiso/sesión/property se rechaza antes de
  leer/escribir; actor viene de sesión; vínculos ajenos no se aceptan. Pruebas
  positivas/negativas, migración/upgrade, verify completo y diff. Entregar QA
  manual y esperar confirmación antes de commit/push.
- **Límite:** el servicio BD3 de transiciones sigue interno y requiere guard
  propio antes de cualquier exposición HTTP; este incremento solo protege el
  puerto Staff de intake/lectura AD-03.
- **Evidencia local:** 9 pruebas focalizadas y `verify` completo 306 PASS,
  cero failures/errors/skipped, BUILD SUCCESS y JAR con PostgreSQL 17/Java 21.
  Upgrade Liquibase incluido; QA manual del usuario PASS según
  `docs/28_BD1_SERVICE_REQUEST_INTAKE_QA.md`.

#### BE-014B-FIN-01 — Acceso Staff interno a lectura y postings de folio

- **Estado:** COMPLETADA (2026-10-04). El usuario confirmó que todas las
  pruebas manuales terminaron bien; commit y push autorizados.
- **Rama/base:** `feature/bd1-folio-staff-access-ad02` desde `main` actualizado
  `cbb8a51` (PR #100 integra OPS-01).
- **DoR:** AD-02 aprobada; C2, Staff Auth, PropertyScopeResolver, FolioService y
  consultas/repo financieros existentes. FP-D02/04 y contratos HTTP siguen
  propuestos, por lo que esta entrega no crea endpoints ni modifica lifecycle.
- **Alcance/archivos:** entrada Staff interna para get/balance/movements,
  postCharge/postPayment/postReversal; permiso FOLIO_PAYMENT_OPERATE, PROPERTY,
  actor de sesión y permiso adicional PAYMENT_REFUND_VOID para reverso de PAYMENT.
  Predicados scoped en folio/movimiento original, pruebas PostgreSQL, contrato
  de alcance y seguimiento. El motor FolioService BD3 conserva su contrato.
- **Aceptación/DoD:** sesión y permisos actuales; folio ajeno/no existente
  indistinguibles, original ajeno/no existente indistinguibles; Recepción puede
  compensar CHARGE pero no PAYMENT; Gerencia sí puede ambos; actor confiable;
  regresión financiera y verify completo Java 21/PostgreSQL 17. Entregar QA
  manual y esperar confirmación antes de completar, commit o push.
- **Límites:** openFolio, settle/reopen/close, proveedor de pagos, HTTP y
  paginación FP-D02 quedan para incrementos/contratos propios.
- **Evidencia local:** 18 pruebas focalizadas y `verify` completo 310 PASS,
  cero failures/errors/skipped, BUILD SUCCESS en PostgreSQL 17/Java 21.
  QA manual del usuario PASS según `docs/29_BD1_FOLIO_STAFF_ACCESS_QA.md`.

#### BE-014B-COM-01 — Reutilización del permiso comercial

- **Estado:** COMPLETADA — implementación y revisión local PASS; el usuario
  ejecutó las cuatro suites comerciales sin errores y confirmó el cierre.
  Commit/push autorizados en `feature/bd1-commercial-permissions`; revisión BD3
  corresponde a la integración posterior. 2026-10-04.
- **Evidencia:** guard compartido COMMERCIAL_MANAGE en los seis servicios;
  45 tests comerciales PASS en la versión final, flujos GERENCIA/SUPER_ADMIN
  y denegaciones sin permiso. Verify completo con wrapper Maven 3.9.16, Java 21/
  PostgreSQL 17: 270 tests, 0 failures/errors/skipped, BUILD SUCCESS y JAR.
  git diff --check PASS; sin cambios SQL/permisos/roles/endpoints.
  Detalle y comandos en AlanHandoff BE-014B-COM-01.
- **Rama/base:** `feature/bd1-commercial-permissions`, nueva desde `9003567`
  con documentación previa local conservada.
- **DoR:** AD-01 aprobado explícitamente por el usuario: reutilizar
  COMMERCIAL_MANAGE en empresas/agencias/grupos/blocks/promociones/rewards.
  Catálogo y asignaciones C2 existentes; no exige migración de permisos.
- **Alcance de este incremento:** sustituir guard provisional SUPER_ADMIN por
  permiso efectivo, conservar contratos internos/scope/lifecycle/audit existentes,
  actualizar documentación y probar flujos GERENCIA/SUPER_ADMIN y denegaciones.
- **Límites:** AD-02 a AD-06 pendientes; no aprobar otras filas de documento 21.
  No crear REST/BFF ni declarar terminada la protección transversal BE-014B.
  Sesión/actor confiables y hardening de recursos relacionados se entregan en
  incrementos posteriores coordinados con BD3 antes de exposición HTTP.
- **Archivos:** seis implementaciones/interfaces Commercial, helper de permiso,
  suites comerciales, documento 21 y seguimiento.
- **Aceptación/DoD:** permiso obligatorio incluso para snapshot SUPER_ADMIN;
  GERENCIA con permiso opera los seis servicios, roles sin permiso rechazados;
  regresión de aislamiento/lifecycle, verify completo PostgreSQL/Java 21 y diff.
  QA manual del usuario PASS conforme a `22_BD1_COMMERCIAL_MANUAL_QA.md`;
  confirmación de cierre recibida. Este incremento no crea rutas HTTP: los seis
  servicios son internos y no hay contrato HTTP comercial aprobado.

#### BE-014B-COM-02 — Property scope en servicios comerciales internos

- **Estado:** COMPLETADA (2026-10-04). Implementación y pruebas locales PASS;
  el usuario ejecutó los tests sin fallos y confirmó el cierre.
- **Rama/base:** `feature/bd1-commercial-scope` desde `main` actualizado `d08383e`.
- **Dependencias/DoR:** BE-014B-COM-01 cerrado; C2 y regla global de property scope
  confirmados; seis servicios internos y repositorios scoped existentes. No requiere
  nueva ruta HTTP ni decisión de permisos AD-02 a AD-06.
- **Alcance/archivos:** validar que el scope recibido pertenece al snapshot Staff,
  su organización, memberships y permiso MULTI_PROPERTY_READ; limitar mutaciones
  a PROPERTY; llevar a predicados SQL la búsqueda de vínculos Company/Agency,
  Reservation, Stay y Reward original en Commercial. Cambios en helper/servicios
  Commercial, repositorios dependientes, tests y seguimiento.
- **Aceptación/DoD:** rechazar scope fabricado/ajeno antes del lookup; recursos
  vinculados ajenos son indistinguibles de inexistentes; listados multi-property
  limitados a properties de la sesión; regresión Commercial y verify completo con
  PostgreSQL/Java 21, diff --check. Entregar QA manual al usuario y esperar su
  confirmación antes de COMPLETADA, commit y push.
- **Evidencia:** 48 pruebas comerciales PASS (incluye aserciones SQL de scope),
  verify completo 300 PASS, cero failures/errors/skipped, JAR y diff --check
  PASS en PostgreSQL 17/Java 21. QA manual del usuario PASS según
  `24_BD1_COMMERCIAL_SCOPE_MANUAL_QA.md`; commit/push autorizados en la rama.
- **Límites:** contratos HTTP, actor derivado de sesión, finanzas/operaciones y
  cambios de permisos fuera de este incremento; revisar con BD3 al integrar.

### BE-008 — AuditTrail común y consulta administrativa

- **Estado:** BE-008A COMPLETADA; C6-D01 a D06 aprobadas por el usuario.
  BE-008B-AUTH-01 COMPLETADA como fundamento de persistencia.
  BE-008B-AUTH-02 COMPLETADA: persistencia para atribución futura, con sujeto
  resuelto y QA manual PASS. BE-008B-AUTH-03 COMPLETADA: atribución en emisores
  Staff seleccionados. Proyección/consulta administrativa y contratos de
  exposición permanecen PENDIENTES de sus incrementos y DoR propios.
- **Dependencias:** A inventaría AuditService/auth_audit_events; B requiere C6
  aprobado y contratos de acceso/persistencia del alcance que implemente.
  BE-014A aplica a las nuevas entradas de lectura; AUTH-01 solo protege una
  tabla existente conforme a C6 y no depende de AD-04 a AD-06 ni de HTTP/BFF.
- **Entrega A / DoR B:** fijar taxonomía, actor, property u organización,
  entity/action/reason/time/correlation, detalle permitido, retención y consulta;
  acordar reutilización/proyección de eventos existentes sin duplicación.
- **Entrega B:** contrato común append-only, emisores iniciales Auth Admin e
  Integrations, query con AUDIT_READ y scope previo, filtros y paginación estable.
- **Aceptación:** evento acompaña commit y rollback según semántica acordada;
  no UPDATE/DELETE de historia; filtros/páginas sin fuga de properties y sin
  secretos/PAN/CVV/PII innecesaria. Evento global nunca da acceso global implícito.
- **Archivos previstos:** contrato C6, módulos/emisores existentes, módulo audit
  si aprobado, migrations 008, DTO/query/API y pruebas PostgreSQL/HTTP/upgrade.
- **Reviewer:** BD2/BD3 por emisores y consumidores administrativos afectados.

#### BE-008A — Propuesta de contrato C6

- **Estado:** COMPLETADA (2026-10-04). Contrato conceptual C6-D01 a D06
  aprobado por el usuario tras revisión; revisión de integración BD2/BD3 pendiente.
- **Rama/base:** `feature/bd1-audit-contract-c6` desde `main` actualizado
  `ea50726` (PR #93); COM-02 ya integrado.
- **DoR:** BE-003/C2 disponible y AuditService, reservation_audit_events,
  auth_audit_events y guest_auth_audit_events inventariados. BE-008B requiere
  C6 aprobado; este incremento A prepara una propuesta para esa decisión.
- **Alcance/archivos:** `docs/25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md`, AlanPlan y
  AlanHandoff. Taxonomía y fuentes, actor/contexto, organización/property,
  filtros/paginación, detalle seguro, retención y decisiones de persistencia.
  Sin Java, SQL, endpoints ni permiso nuevo.
- **Aceptación/DoD:** propuesta trazable a esquemas y emisores reales, matriz
  de decisiones/reviewers y casos QA de alcance/append-only; revisión documental,
  enlaces y diff --check PASS. El usuario revisa la propuesta antes del cierre,
  commit y push; BE-008B queda pendiente de C6 aprobado.
- **Evidencia:** inventario de tres tablas y sus emisores/ausencias verificado,
  cuatro enlaces locales válidos y `git diff --check` PASS; aprobación explícita
  del usuario. No se ejecuta Maven: solo cambia Markdown y no existe nueva
  superficie HTTP/SQL que probar. Commit/push autorizados en esta rama.

#### BE-008B-AUTH-01 — Protección append-only de auditoría Staff

- **Estado:** COMPLETADA (2026-10-05); implementación, validación local y QA
  manual ejecutado y confirmado PASS por el usuario. Sin commit/push/merge.
- **Rama/base:** `feature/bd1-staff-auth-audit-append-only`, desde `main`
  `722ce96`; se conservan los cambios documentales del registro READY previo.
- **Owner:** Alan / BD1. **Reviewers:** BD2/BD3 por consumidores de auditoría;
  seguimiento colaborativo no bloqueante salvo excepciones del DoD común.
- **Alcance exacto:** añadir protección PostgreSQL contra UPDATE y DELETE de
  eventos existentes en `auth_audit_events`, equivalente a la que ya protege
  `reservation_audit_events`. INSERT continúa permitido; una transacción que
  revierte puede descartar sus inserciones no confirmadas. No cambiar el
  comportamiento de login/refresh/logout ni sus códigos de evento.
- **Límite del incremento:** no implementar proyección/search/get, atribución
  actor/sujeto/organización, backfill, API, BFF, exportación, productores nuevos
  ni política de purga. C6-D06 (persistencia de fallos y revocación rechazada)
  queda para su incremento de Auth/BE-006C; esta protección no corrige el
  rollback de `StaffAuthServiceImpl` ni acredita AuditTrail C6 completo.
- **Dependencias y DoR PASS:** BE-001/002/003 y BE-008A COMPLETADAS; C6 aprobado;
  tabla y emisores Staff existentes inspeccionados; ausencia de trigger Staff
  confirmada en la base `722ce96`; patrón append-only disponible en 004. La búsqueda de
  usos actuales localizó inserciones Staff, sin UPDATE/DELETE de esa tabla.
  Java 21/PostgreSQL 17 y Compose QA/CI ya configurados. No requiere decisión
  de negocio nueva, contrato HTTP, proveedor ni aprobación de reviewers.
- **Decisiones aprobadas reutilizadas:** C6-D01 conserva la fuente original y
  evita duplicar historia; C6-D04 prohíbe purga automática/hard delete en V1.
  C6, sección «Detalle seguro, escritura y retención», exige probar protección
  equivalente para `auth_audit_events`; sus casos de aceptación exigen rechazar
  UPDATE/DELETE y preservar el rollback de mutaciones locales. Reglas de
  persistencia y auditoría Backend refuerzan ese invariante.
- **Persistencia/módulo:** SecurityAuth existente, prefijo 003; changeset
  aditivo con función/trigger propios sobre `auth_audit_events`, incorporado
  al changelog 003. Sin módulo 008 ni segunda tabla histórica; no editar
  changesets aplicados ni eventos legados. Implementado en
  `007-staff-auth-audit-append-only.yaml`, ID `003-staff-auth-007`, con función
  `bd1_reject_staff_auth_audit_mutation` y trigger `trg_staff_auth_audit_append_only`.
- **HTTP/permisos/scope:** no hay superficie HTTP nueva ni request/response,
  errores públicos, OpenAPI o Postman nuevos. BE-014A identifica la lectura
  AuditTrail separada con `AUDIT_READ` y scope previo, confirmados por C2/C6;
  AUTH-01 no expone esa lectura ni amplía roles, permisos o memberships.
  No atribuir organización/property a eventos heredados desde membership actual.
- **Acceptance criteria:** (1) migración preserva byte a byte los campos de
  eventos previos; (2) INSERT/lectura interna actual funcionan tras commit;
  (3) UPDATE/DELETE directos, también masivos sobre filas existentes, fallan
  sin alterar ninguna fila; (4) inserción seguida de rollback no deja evento
  confirmado; (5) instalación vacía, upgrade desde el master previo y
  reaplicación conservan datos/checksums previos y reproducen la protección;
  (6) login, refresh válido y logout siguen funcionando y sus eventos
  confirmados permanecen insertables; (7) las protecciones de reservas y
  Guest ya existentes permanecen operativas.
- **Pruebas previstas:** integración PostgreSQL mediante JDBC real, savepoints
  o transacciones independientes para comprobar rechazos sin invalidar otras
  aserciones; dataset de upgrade con eventos previos y comparación de campos.
  Regresión de `ReservationsSchemaUpgradeTests` y de los flujos Staff actuales.
  Fixtures aisladas/rollback, sin desactivar triggers ni debilitar invariantes.
  Desde `backend/`, usar `compose.bd2-test.yaml` con un nombre de proyecto QA
  aislado: tests focalizados `StaffAuthAuditAppendOnlyIntegrationTests` y
  `ReservationsSchemaUpgradeTests`, después `mvn -B --no-transfer-progress verify`.
  CI aplicable: `verify-backend` y `verify-stack` cuando se publique con autorización.
- **Evidencia local ya validada:** 8 pruebas focalizadas PASS (7 nuevas + upgrade existente);
  `mvn -B --no-transfer-progress verify` completo: 338 pruebas PASS, cero
  failures/errors/skipped y BUILD SUCCESS en PostgreSQL 17/Java 21 mediante
  `compose.bd2-test.yaml`, proyecto aislado `pms_bd1_authaudit`. Se comprobó el
  bloque SQL de la guía: UPDATE/DELETE generan P0001, campos conservados,
  INSERT/rollback devuelve contadores 1→0 y evento confirmado permanece en 1.
  `git diff --check` PASS; changesets previos intactos y checksums del master
  anterior preservados en upgrade/reaplicación. CI remoto no ejecutado: no se
  publicó la rama. La comprobación local de la guía no sustituye QA del usuario.
- **QA manual confirmado PASS (2026-10-05):** el usuario ejecutó el QA aplicable
  y confirmó changeset `003-staff-auth-007` EXECUTED, trigger presente,
  INSERT permitido, UPDATE/DELETE rechazados con P0001, conservación del
  registro y rollback limpio según `docs/36_BD1_STAFF_AUTH_AUDIT_APPEND_ONLY_QA.md`.
  Las 8 pruebas focalizadas y verify de 338 pruebas PASS corresponden a la
  validación previa; no se ejecutan de nuevo por este cierre documental.
- **DoD:** aceptación y pruebas relevantes PASS; suite completa sin exclusiones
  y CI aplicable PASS; manifest/upgrade/reaplicación y `git diff --check` PASS;
  guía QA con resultados esperados y evidencia sanitizada; plan/handoff y docs
  del incremento coherentes. QA manual ejecutado y confirmado PASS por el
  usuario; criterio de cierre cumplido y estado COMPLETADA. QA manual en BD
  descartable: verificar evento existente, rechazos de UPDATE/DELETE,
  conservación del registro e INSERT seguido de rollback. Commit/push/merge
  requieren autorización explícita.
- **Archivos del incremento:**
  `src/main/resources/db/changelog/003ServiceSecurityAuth/007-staff-auth-audit-append-only.yaml`
  y
  `src/main/resources/db/changelog/003ServiceSecurityAuth/db.changelog.yaml`,
  `src/test/java/com/pms/hotelboutique/backend/modules/securityauth/StaffAuthAuditAppendOnlyIntegrationTests.java`,
  `src/test/resources/db/changelog/db.changelog-before-staff-auth-audit-append-only.yaml`, guía
  `docs/36_BD1_STAFF_AUTH_AUDIT_APPEND_ONLY_QA.md`, AlanPlan y AlanHandoff.
- **Fuentes:** `docs/25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md`,
  `docs/21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md` (fila AuditTrail/C2),
  `docs/04_PERSISTENCE_RULES.md`, `docs/05_IDEMPOTENCY_AND_AUDIT.md`,
  `docs/07_TESTING_STRATEGY.md`, esquema 003-001, trigger 004-005,
  `AuthAuditEventRepository` y emisores `StaffAuthServiceImpl`/bootstrap.

#### BE-008B-AUTH-02 — Persistencia para atribución futura de auditoría Staff

- **Estado:** COMPLETADA (2026-10-05); implementación, validación local y
  QA manual ejecutado y confirmado PASS por el usuario. Cierre documental
  exclusivo de AUTH-02, sin cambios funcionales ni commit/push/merge.
- **Rama/base actuales:** `feature/bd1-staff-auth-audit-attribution`, HEAD
  `8e7c6ce` (merge PR #115 de AUTH-01). Rama ya existente al iniciar esta
  actualización; se conservan los cambios documentales previos de AUTH-02.
  No se creó ni cambió rama en esta entrega.
- **Owner:** Alan / BD1. **Reviewers:** BD2/BD3 por emisores/consumidores;
  seguimiento colaborativo según DoD común, sin bloqueo pendiente.
- **Dependencias y DoR PASS:** BE-001/002/003, BE-008A y AUTH-01 COMPLETADAS;
  C6-D01/D02/D03 y decisión del usuario del 2026-10-05 aprobadas. Esquema,
  entidad e INSERT actuales inspeccionados; scope y actor siguen C6, sujeto
  resuelto abajo. Persistencia en módulo 003 existente, sin dependencia de
  contrato HTTP/BE-014A para este alcance. Pruebas, aceptación y archivos
  definidos; Java 21/PostgreSQL 17 configurados en `compose.bd2-test.yaml`.
- **Alcance exacto:** agregar solo seis columnas a `auth_audit_events` mediante
  changeset aditivo en SecurityAuth/003, preservando función/trigger de
  `003-staff-auth-007`, datos y checksums. No crear subject_id/subject_type,
  otra tabla histórica ni módulo 008. Sin backfill, población por emisores,
  API/BFF, consulta/proyección administrativa ni corrección C6-D06.
- **Decisión del sujeto aprobada por el usuario:** `staff_user_id` sigue siendo
  el sujeto persistido y nunca representa al actor. En la futura proyección,
  si no es NULL: `subjectType=STAFF_USER`, `subjectId=staff_user_id`; si es NULL:
  ambos metadatos del sujeto son NULL. Esta regla queda documentada, no se
  implementa la proyección en AUTH-02. No copiar staff_user_id a actor_id.

  | Metadato C6 | Única columna nueva correspondiente | Tipo PostgreSQL | Nullability / default |
  | --- | --- | --- | --- |
  | organizationId | organization_id | UUID | nullable, sin DEFAULT |
  | propertyId | property_id | UUID | nullable, sin DEFAULT |
  | scopeKind | scope_kind | VARCHAR(16) | nullable, sin DEFAULT |
  | actorContext | actor_context | VARCHAR(16) | nullable, sin DEFAULT |
  | actorId | actor_id | UUID | nullable, sin DEFAULT |
  | correlationId | correlation_id | UUID | nullable, sin DEFAULT |

- **Constraints exactos previstos:**
  1. CHECK de `scope_kind`: NULL o valor exacto PROPERTY/ORGANIZATION.
     CHECK de `actor_context`: NULL o STAFF/GUEST/SYSTEM/UNKNOWN. Rechazar
     vacíos, espacios, diferencias de mayúsculas y cualquier otro código;
     no normalizar ni introducir defaults.
  2. CHECK de coherencia de scope: permitir solo (a) scope_kind,
     organization_id y property_id todos NULL; (b) PROPERTY con organization_id
     y property_id no NULL; (c) ORGANIZATION con organization_id no NULL y
     property_id NULL. Evaluar de forma booleana total (`IS NULL`/`IS NOT NULL`
     y `COALESCE(..., FALSE)` donde proceda), evitando que SQL UNKNOWN acepte
     combinaciones incompletas. Nullable permite ausencia de atribución;
     no significa que una atribución parcial sea un scope válido.
  3. FK nullable `organization_id -> organizations(id)` y FK compuesta
     `(property_id, organization_id) -> properties(id, organization_id)`;
     reutilizar la unicidad `uq_properties_id_organization` de 003-005.
     FK con MATCH SIMPLE, ON UPDATE NO ACTION y ON DELETE NO ACTION, no
     diferibles; la coherencia anterior evita saltar la FK compuesta para
     PROPERTY. Ninguna cascada ni SET NULL que modifique historia.
  4. Sin FK de actor_id: C6 contempla actores STAFF/GUEST/SYSTEM y la fuente
     no autoriza un vínculo único a staff_users. Sin FK de correlation_id,
     sin UNIQUE nuevo y sin NOT NULL nuevo. No imponer nuevas reglas de
     obligatoriedad de actor_id por contexto ni relacionarlo con el sujeto.
     El incremento no implementa atribución confiable por emisores.
- **Compatibilidad legacy:** upgrade e INSERT actuales omiten las seis columnas
  y estas quedan NULL. No escribir UNKNOWN físicamente sobre el legado ni
  deducir actor, scope u organización desde staff_user_id, session_id o
  memberships actuales. C6 mantiene UNKNOWN como clasificación futura del actor
  desconocido en el sobre; su proyección está fuera de este incremento.
  Conservar los seis campos originales: `id UUID NOT NULL`,
  `event_type VARCHAR(64) NOT NULL`, `staff_user_id UUID NULL`,
  `session_id UUID NULL`, `occurred_at TIMESTAMPTZ NOT NULL` y
  `detail VARCHAR(160)` sin NOT NULL en el changeset original (JPA declara
  nullable=false). No alterar sus definiciones ni el constructor legacy.
  session_id permanece referencia interna sensible, sin nueva exposición.
- **Persistencia implementada:** archivo aditivo
  `src/main/resources/db/changelog/003ServiceSecurityAuth/008-staff-auth-audit-attribution.yaml`,
  changeset `003-staff-auth-008`, incluido después de 007 en el changelog 003.
  No editar 001 a 007 ni el trigger append-only; no DML sobre historia,
  índices adicionales ni dependencias externas. Mapeo nullable compatible en
  `AuthAuditEvent` sin modificar los emisores ni poblar nuevos metadatos.
- **Acceptance/tests:** matriz cubierta por pruebas PostgreSQL reales y verify
  local PASS; bootstrap se conserva por constructor/emisor intactos, sin
  atribuir una ejecución de bootstrap independiente a esta entrega:
  1. Instalación vacía: metadata PostgreSQL confirma exactamente las seis
     columnas nuevas, tipos/longitudes, nullable y ausencia de defaults;
     no existen columnas físicas subject_id/subject_type. CHECK/FK previstos
     presentes y función/trigger append-only sin cambios.
  2. Upgrade desde master anterior a AUTH-02 con eventos Staff variados
     (staff_user_id/session_id presentes y NULL): comparar los seis campos
     originales por ID, cantidad e identidad de filas; las seis columnas
     nuevas quedan NULL. Todos los checksums previos permanecen iguales.
     Reaplicar Liquibase no agrega filas, cambios ni segunda ejecución de 008.
  3. INSERT JDBC que omita los seis campos nuevos y constructor JPA legacy:
     ambos funcionan y dejan metadatos NULL. Probar sujeto presente y ausente;
     actor_id sigue NULL en ambos, incluso con memberships actuales.
  4. Fixtures JDBC con metadatos explícitos: aceptar PROPERTY de organización
     correcta y ORGANIZATION con property NULL; aceptar actor_context NULL y
     cada uno de STAFF/GUEST/SYSTEM/UNKNOWN. correlation_id UUID opcional.
     Son fixtures de prueba; no cambiar emisores para generarlas.
  5. Rechazar scope/actor_context inválidos (incluidos vacío y minúsculas),
     organización inexistente, property inexistente o de otra organización,
     PROPERTY sin organización/property, ORGANIZATION sin organización o con
     property, y scope NULL con organización/property no NULL. CHECK genera
     SQLSTATE 23514; referencias inválidas coherentes generan 23503.
     Usar savepoints o transacciones separadas para aislar cada rechazo.
  6. UPDATE/DELETE individuales y masivos sobre filas existentes, incluidos
     metadatos nuevos: P0001 y filas intactas. INSERT con metadatos seguido
     de rollback deja cero eventos; INSERT confirmado conserva valores.
     Intentar borrar/cambiar la clave de organización/property referenciada
     falla con 23503 sin borrar ni cambiar el evento.
  7. Regresión HTTP/JPA de login, refresh válido, logout y bootstrap mantiene
     contratos y códigos existentes; eventos confirmados insertables con las
     seis columnas nuevas NULL. No acreditar persistencia de fallos/refresh
     rechazado: C6-D06 queda fuera. Regresión de protecciones Guest/Reservations.
- **Archivos/tests implementados:** changeset y changelog 003, `AuthAuditEvent`,
  `StaffAuthAuditAttributionIntegrationTests`, fixture
  `db.changelog-before-staff-auth-audit-attribution.yaml` de master
  anterior a AUTH-02, guía `37_BD1_STAFF_AUTH_AUDIT_ATTRIBUTION_QA.md` y
  AlanPlan/AlanHandoff. Ajuste mínimo del test upgrade AUTH-01: el master
  vigente agrega 007 y 008 sobre su fixture anterior, no solo 007.
  Desde backend, Compose aislado con
  proyecto `pms_bd1_authattr`: focalizados
  `StaffAuthAuditAttributionIntegrationTests,StaffAuthAuditAppendOnlyIntegrationTests,ReservationsSchemaUpgradeTests`,
  después `mvn -B --no-transfer-progress verify` completo y `git diff --check`.
  CI aplicable verify-backend/verify-stack al publicar con autorización.
- **DoD/cierre:** aceptación y pruebas PostgreSQL/regresión locales PASS;
  focalizados 17 PASS y verify completo 347 PASS ya validados, sin repetirlos
  por este cierre. QA manual ejecutado y confirmado PASS por el usuario;
  criterio de cierre cumplido. Guía y documentos coherentes; CI remoto no
  ejecutado porque no se publicó la rama. Los 338 PASS de AUTH-01 no acreditan
  AUTH-02; su evidencia propia se conserva abajo. Commit/push/merge siguen
  requiriendo autorización explícita.
- **Fuentes/decisión:** C6 (`25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md`), decisión
  explícita del usuario del 2026-10-05 registrada arriba, reglas de persistencia
  y testing, changelogs 002-001/003-001/005/007, entidad y emisores Staff actuales.
- **Evidencia local (2026-10-05):** 17 pruebas focalizadas PASS (9 nuevas de
  AUTH-02, 7 AUTH-01 y 1 upgrade Reservations); verify completo 347 pruebas
  PASS, cero failures/errors/skipped y BUILD SUCCESS, proyecto aislado
  `pms_bd1_authattr`, PostgreSQL 17.11/Java 21.0.9 mediante Compose. Instalación
  vacía, upgrade/reaplicación, datos/checksums/trigger, constructor JPA legacy,
  constraints y regresión de servicios Staff comprobados. Comparación contra
  HEAD: changesets versionados anteriores y emisores Staff intactos.
  Guía SQL comprobada en base QA: changeset EXECUTED; 6 nullable sin defaults;
  0 columnas físicas de sujeto; metadata_null/subject_preserved=true; tres
  rechazos 23514, uno 23503 y dos P0001; contadores rollback 1→0, legado 1.
  `git diff --check` PASS. CI remoto no ejecutado: no se publicó la rama.
  La comprobación local de la guía no sustituye QA manual del usuario.
- **QA manual confirmado PASS por el usuario (2026-10-05):** changeset
  `003-staff-auth-008` EXECUTED; seis columnas nuevas presentes, nullable y sin
  defaults; constraints de scope y actor presentes; INSERT legacy permitido;
  INSERT con atribución válida permitido; staff_user_id y actor_id separados.
  scope_kind inválido rechazado con SQLSTATE 23514; actor_context inválido
  rechazado con SQLSTATE 23514; UPDATE y DELETE rechazados con P0001;
  registro preservado y rollback final limpio con count=0. Evidencia confirmada
  por el usuario conforme a la guía 37; no se ejecutan pruebas de nuevo en
  este cierre ni se cambia código/migraciones.
- **Bloqueos de AUTH-02:** ninguno; el cierre no completa BE-008B, sus emisores,
  consulta administrativa ni C6-D06. Otros incrementos conservan sus estados.
- **Siguiente según fase 1 y continuidad C6:** preparar el siguiente incremento de BE-008B para atribuir
  metadatos a eventos Staff nuevos, aprovechando la persistencia AUTH-02.
  Antes de READY, definir y registrar el mapeo por emisor de organización,
  PROPERTY/ORGANIZATION, actor confiable separado del sujeto y correlación,
  más aceptación, archivos y pruebas. C6 fija el sobre pero no ese mapeo
  operativo; no inferirlo del sujeto ni de memberships históricas. Sin backfill
  ni C6-D06 en esa continuidad acotada. No se asigna ID nuevo, se inicia código
  ni se marca otro incremento READY. Consulta administrativa permanece pendiente
  de su DoR y contratos de acceso/exposición propios.


#### BE-008B-AUTH-03 — Atribución segura en emisores de autenticación Staff

- **Estado:** COMPLETADA (2026-10-05); implementación, validación local y
  QA manual ejecutado y confirmado PASS por el usuario. Cierre documental
  exclusivo de AUTH-03; no se inicia otro incremento.
  Rama feature/bd1-staff-auth-audit-emitter-attribution, base 6f03373;
  registros documentales previos conservados, sin commit/push/merge.
- **Owner:** Alan / BD1. **Reviewers:** BD2/BD3 por emisores/consumidores;
  colaboración conforme al DoD común.
- **Dependencias/DoR:** BE-001/002/003, BE-008A y BE-008B-AUTH-01/02
  COMPLETADAS; C6-D01/D02/D03 aprobadas; C6-D06 permanece fuera del alcance.
  AUTH-02 provee columnas nullable
  y trigger append-only. StaffPrincipal se revalida en
  StaffJwtAuthenticationFilter; login valida credenciales y refresh valida
  token-hash, sesión y usuario activos. Bootstrap asigna explícitamente la
  membresía SUPER_ADMIN a la organización sembrada. C6 define Staff/System,
  PROPERTY/ORGANIZATION y separación actor/sujeto. No falta decisión de negocio
  para esta selección acotada. Correlation y property quedan opcionales y su
  ausencia se representa como NULL; no se fabrica contexto.
- **Alcance:** poblar metadatos solo para login correcto, refresh rotado válido,
  logout autenticado y bootstrap de Staff. Usar columnas AUTH-02 sin DDL ni
  backfill. Mantener staff_user_id como sujeto; actor se deriva de la prueba
  de credencial/sesión y se escribe únicamente en actor_context/actor_id.
  Sin API/BFF/consulta administrativa ni C6-D06.
- **Mapa por emisor:**

  | Evento | organizationId | propertyId / scopeKind | actorContext / actorId | correlationId / sujeto |
  | --- | --- | --- | --- | --- |
  | STAFF_LOGIN_SUCCEEDED | NULL: login no selecciona una organización autorizable en la acción auditada | NULL / NULL: no selecciona propiedad; no convertir propiedades de la sesión en una acción PROPERTY ni clasificar login de cualquier rol como evento ORGANIZATION | STAFF / StaffUser.id tomado del objeto cargado tras validar password y estado activo, nunca leído de staff_user_id como prueba de actor | NULL: no hay correlación de request disponible / staff_user_id permanece el Staff autenticado |
  | STAFF_REFRESH_ROTATED | NULL: refresh no recibe ni selecciona organización | NULL / NULL: sesión no representa una propiedad concreta | STAFF / session.getStaffUser().getId() solo después de comprobar token encontrado, refresh activo, sesión activa y Staff activo | NULL: el request no propaga correlación / staff_user_id conserva al sujeto Staff |
  | STAFF_SESSION_REVOKED con causa de logout | NULL: logout no contiene operación de organización | NULL / NULL: logout termina una sesión, no una acción de propiedad | STAFF / StaffPrincipal.staffUserId autenticado y revalidado por StaffJwtAuthenticationFilter y asociado a la sesión revocada | NULL: no existe correlación disponible / staff_user_id conserva al sujeto |
  | STAFF_BOOTSTRAP_CREATED | UUID sembrado 4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1, el mismo pasado explícitamente a ensureSuperAdminMembership | NULL / ORGANIZATION: bootstrap crea la membership SUPER_ADMIN de esa organización; sin propiedad asignada por el evento | SYSTEM / NULL: proceso bootstrap, no un actor Staff | NULL: proceso sin request / staff_user_id es el Staff creado |

- **Fuera de alcance por evento:** STAFF_LOGIN_FAILED queda fuera por C6-D06:
  intento fallido debe sobrevivir 401 fuera de la transacción que revierte, y
  este incremento no corrige ese flujo ni atribuye por username.
  STAFF_SESSION_REVOKED con causa refresh_rejected queda fuera por C6-D06 y por
  rollback del rechazo; no atribuirlo mediante el sujeto/session_id ni cambiar
  la semántica de refresh. Las demás causas/revocaciones administrativas no
  tienen emisor actual. No emitir correlation, property ni organización para
  flujos de sesión a partir de membership, token claims sin revalidar,
  session_id o datos del body.
- **Persistencia/API implementada:** fábricas staffAction/bootstrapCreated
  en AuthAuditEvent; se actualizaron los productores y el constructor/factory
  necesarios de AuthAuditEvent, StaffAuthServiceImpl y
  StaffBootstrapConfiguration; conservar constructores/emisores de prueba
  existentes. No modificar el esquema, el sujeto, session_id, códigos de evento,
  límites de transacción, respuestas HTTP o permisos. Logout revalida
  StaffPrincipal contra sesión/usuario activos antes de atribuir actor;
  bootstrap usa saveAndFlush antes de la membership JDBC para que el Staff
  insertado sea visible dentro de la misma transacción. Se mantiene el
  constructor legacy para los flujos excluidos y consumidores existentes.
- **Acceptance:** (1) login correcto guarda STAFF actor id del Staff cuya
  contraseña se validó; staff_user_id sigue siendo sujeto y puede tener el
  mismo UUID por ser login propio, con procedencias/campos distintos. (2) refresh
  válido rota y registra STAFF del usuario de la sesión validada; evento de
  rechazo no se amplía. (3) logout del principal activo atribuye STAFF solo
  después de validar correspondencia sesión/usuario. (4) bootstrap registra
  SYSTEM/null y ORGANIZATION con el UUID explícito, sin propiedad. (5) en estos
  eventos correlation_id queda NULL; login/refresh/logout dejan organization,
  property y scope NULL; no se derivan desde membership actual ni historia.
  (6) conservar códigos/detalles/eventos sujetos originales y no introducir
  INSERT duplicados; evento sigue en su transacción/flujo existente.
- **Pruebas implementadas:** tests PostgreSQL de atribución por cada emisor incluido,
  afirmando source de actor, sujeto y NULLs; flujo real login-refresh-logout;
  bootstrap con organization seed, actor_context=SYSTEM y actor_id IS NULL;
  ausencia de metadatos nuevos en login fallido/refresh rechazado sin intentar
  corregir C6-D06. Probar identidad de filas/event count, checksums/upgrade,
  append-only/rollback y regresión Staff. Focalizados y mvn -B
  --no-transfer-progress verify en PostgreSQL 17/Java 21; guía QA manual.
- **Archivos entregados:** StaffAuthServiceImpl.java,
  StaffBootstrapConfiguration.java, AuthAuditEvent.java,
  StaffAuthAuditEmitterIntegrationTests.java y actualización de la regresión
  de sesiones en StaffAuthAuditAttributionIntegrationTests.java (ahora espera
  actor STAFF y scope/correlation NULL). Guía
  38_BD1_STAFF_AUTH_AUDIT_EMITTER_QA.md y AlanPlan/AlanHandoff. Sin changeset,
  permisos ni rutas nuevos.
- **Límites/cierre:** QA manual confirmado PASS por el usuario; criterio de
  cierre cumplido. Se conservan 26 focalizados PASS y verify 355 PASS previos,
  sin repetir pruebas por este cierre documental. CI remoto no ejecutado;
  se evalúa al publicar con autorización. AUTH-03 no completa proyección/consulta
  ni el resto de BE-008B.
- **Evidencia local (2026-10-05):** 26 focalizados PASS (8 nuevos de emisores,
  9 de persistencia AUTH-02, 7 append-only AUTH-01, 1 upgrade Reservations y
  1 seguridad HTTP). Verify completo: 355 pruebas PASS, cero failures/errors/
  skipped y BUILD SUCCESS en PostgreSQL 17.11/Java 21.0.9, proyecto aislado
  pms_bd1_authemit mediante compose.bd2-test.yaml. La primera corrida detectó
  visibilidad JPA/JDBC en bootstrap; saveAndFlush la corrigió sin cambiar
  límites transaccionales y los focalizados completos se repitieron PASS.
  Constructor legado, actor/sujeto independientes, exclusión de fallos/
  rechazos, rollback de logout, historia, upgrade/checksums y append-only
  comprobados. Comparación contra HEAD: migraciones/changelogs intactos.
  Guía 38 comprobada con JAR real en 127.0.0.1:18083: login 201, refresh 200,
  logout 204; cuatro eventos con expected=true, bootstrap_count=1;
  UPDATE/DELETE P0001, all_fields_preserved=true, legacy_unattributed=true
  y after_rollback=0. Git diff --check PASS. CI remoto no ejecutado porque
  no se publicó la rama. La comprobación del agente no sustituye QA del usuario.
- **QA manual confirmado PASS (2026-10-05):** el usuario confirma login 201,
  refresh 200 y logout 204; bootstrap SYSTEM + ORGANIZATION correcto; eventos
  de sesión con actorContext=STAFF y actorId=staff_user_id; todos los eventos
  inspeccionados expected=t; bootstrap_count=1. UPDATE rechazado con P0001;
  DELETE rechazado con P0001; all_fields_preserved=t. INSERT legacy permitido
  sin atribución automática, legacy_unattributed=t; rollback limpio,
  after_rollback=0, conforme a la guía 38. No se cambia código funcional ni
  migraciones en este cierre.
- **Siguiente:** esperar autorización para acordar otro incremento. No iniciar
  ni marcar READY otra tarea; commit/push/merge siguen sin autorización.

### BE-006 — Staff, roles fijos, memberships y sesiones administrativas

- **Estado:** BE-006A COMPLETADA; C4-D01 a D07 aprobadas por el usuario.
  BE-006B/C PENDIENTES de BE-014A, migración/auditoría, entrega de credenciales
  y revisión de contratos HTTP/BFF con owners.
- **Dependencias:** BE-002/003/005 completas; B requiere C4/BE-006A y BE-014A;
  definir en A auditoría con esquema vigente y contrato BE-008A. C depende de B.
- **Entrega A / DoR B:** aprobar C4: altas/consultas/edición/activación/suspensión,
  baja según retención, reset administrativo, roles fijos consultables/asignables,
  membership única, propiedades autorizadas y endpoints BFF. Confirmar protección
  de administradores, concurrencia y que GERENCIA no otorgue acceso fuera de su scope.
- **Entrega B:** CRUD auditado Staff y membership; único rol C2; GERENCIA no crea
  ni asigna SUPER_ADMIN. Cambio de contraseña/rol/estado/membership revoca todas
  las sesiones y refresh tokens afectados en la transacción acordada.
- **Entrega C:** listado scoped/paginado de sesiones, revocación administrativa
  individual/masiva auditada y consulta de auth_audit_events; verificar carreras
  refresh/revocación. Cambios a asignaciones de permisos, si aprobados, invalidan
  acceso y revocan sesiones afectadas conforme al contrato.
- **Aceptación:** duplicados rechazados sin alta parcial; sin escalamiento de rol
  ni properties; JWT ya emitido y refresh dejan de funcionar tras cambio sensible;
  logout Guest aislado; reset no filtra credenciales; rollback no deja usuario y
  sesiones inconsistentes. No autorregistro ni recuperación autónoma Staff.
- **Archivos previstos:** contrato C4, securityauth api/application/persistence,
  changesets nuevos 003 consecutivos, audit y tests; BFF/DTO/Mapper coordinados.
- **Reviewer:** owner Web de Staff/seguridad y BD2/BD3 por efectos de acceso.

#### BE-006A — Propuesta de contrato C4 para administración Staff

- **Estado:** COMPLETADA (2026-10-04). C4-D01 a D07 aprobadas por el usuario;
  revisión de integración Web/BD2/BD3 pendiente.
- **Rama/base:** `feature/bd1-staff-admin-contract-c4` desde `main` actualizado
  `fdc2ed3` (PR #95); C6 integrado por PR #94.
- **DoR:** C1/C2 y BE-002/003/005 implementados, C6 aprobado para auditoría;
  esquema Staff, repositorios, sesión y rutas BFF existentes inventariados.
  BE-006B sigue bloqueado hasta aprobar C4, BE-014A por dominio y decisiones
  de migración/auditoría/entrega de credenciales.
- **Alcance/archivos:** propuesta `docs/26_BD1_STAFF_ADMIN_CONTRACT_C4_PROPOSAL.md`
  y seguimiento AlanPlan/Handoff. Precisar CRUD Staff, roles fijos,
  membership única, scope, protección de administradores, sesiones y auditoría.
  Sin código, SQL, endpoints operativos, nuevos roles o permisos.
- **Aceptación/DoD:** referencias de esquema y auth C1/C2/C6 comprobadas;
  operaciones, restricciones, errores, concurrencia, BFF y decisiones abiertas
  documentados. Revisar enlaces/diff y ofrecer QA manual al usuario; esperar
  su revisión y aprobación antes de cerrar, commit y push.
- **Evidencia:** seis enlaces locales válidos, esquema/RBAC/repositorios Staff y
  BFF actual contrastados; `git diff --check` PASS y aprobación explícita del
  usuario. Sin Java/SQL/HTTP nuevo, por lo que no aplica Maven a esta entrega
  documental. Commit/push autorizados en la rama C4.

#### BE-006B-SCHEMA-01 — Invariantes de persistencia Staff C4

- **Estado:** COMPLETADA (2026-10-04). QA manual sin errores confirmada por el
  usuario; commit/push autorizados en esta rama.
- **Rama/base:** `feature/bd1-staff-admin-schema` desde `main` actualizado `5ba93ae`.
- **DoR:** C4-D02/D06 aprobadas; BE-006A integrada. La unicidad de una
  membership por Staff ya existe en `003-one-role-per-staff.yaml`; no requiere
  una segunda constraint. BE-014A y revisión HTTP/BFF siguen pendientes para
  el CRUD BE-006B.
- **Alcance/archivos:** nuevo changeset 003 y pruebas PostgreSQL para correo
  Staff único normalizado, propiedad dentro de la organización de membership y
  versión de concurrencia. Documentar consultas previas a migración sin
  transformar datos históricos. Sin CRUD, endpoints, revocación ni Guest Auth.
- **Aceptación/DoD:** migración falla si existen datos incompatibles, sin borrar
  registros; inserciones cruzadas o correos con distinto case se rechazan;
  Staff existente obtiene versión inicial 0. Ejecutar integración y `verify`,
  `git diff --check`, entregar QA manual y esperar confirmación antes de cerrar.
- **Evidencia local:** `verify` PostgreSQL 17/Java 21: 302 pruebas PASS, cero
  fallos/errores y BUILD SUCCESS. Las 8 pruebas focalizadas de constraints y
  upgrade histórico pasan tras comprobar la versión de un Staff preexistente.
  Guía: `docs/27_BD1_STAFF_SCHEMA_MIGRATION_QA.md`.
- **QA manual:** el usuario ejecutó las pruebas indicadas y confirmó que todas
  terminaron sin errores. El CRUD HTTP BE-006B permanece pendiente de BE-014A
  y revisión de los contratos con Web.

### BE-013 — OTP y vínculo de reservas históricas

- **Estado:** BE-013A COMPLETADA; BE-013B EN_PROGRESO en su incremento
  Backend. Integración BD3/Guest Web y entrega externa siguen pendientes.
- **Dependencias:** BE-004 completa; GuestProfile/ReservationLinkService existen.
  B requiere A aprobada y contrato invocable del puerto con BD3; delivery externo
  y aceptación de presentación se cierran con BE-016B.
- **Entrega A / DoR B:** fijar firma/resultado mínimo de ReservationLinkVerificationPort,
  lookup seguro, endpoints/BFF y relación GuestAccount-reserva; acordar unicidad,
  asociación previa, concurrencia, rate limits y fallo de envío sin inventar reglas.
- **Entrega B:** emitir OTP hasheado al correo de reserva, verificar referencia y
  correo Google verificado; 10 minutos, 5 intentos, reenvío mínimo 60 segundos y
  un solo uso según C3. Vincular solo tras desafío válido y sesión Guest vigente.
- **Aceptación:** genéricas para inexistente/correo erróneo; expiración, bloqueo,
  replay, dos verificaciones concurrentes y reenvío probados; sesión/cuenta distinta
  no usa el desafío; ni OTP ni datos privados en logs; error Resend recuperable
  conforme al contrato. Coincidencia de correo sola no vincula.
- **Archivos previstos:** extensión C3, guestauth services/api/persistence, SPI y
  adaptador Reservations con BD3, nuevos changesets, Resend y tests/BFF.
- **Reviewer:** BD3 y consumidor Guest Web/Android aplicable.

#### BE-013A-01 — Contrato del desafío y asociación histórica

- **Estado:** COMPLETADA (2026-10-04). El usuario aprobó L-01 a L-07 y la
  entrega documental; commit y push autorizados.
- **Rama/base:** `feature/bd1-historical-reservation-otp-contract` desde
  `main` actualizado `eb088d7` (PR #101 integra FIN-01).
- **DoR:** BE-004/C3 aprobado; ReservationLinkService, GuestProfile,
  GuestAccount/Guest Auth y EmailSender ya existen. El puerto
  ReservationLinkVerificationPort está vacío; no hay OTP ni asociación.
- **Alcance/archivos:** propuesta de firma/resultado mínimo del puerto,
  autorización Guest y BFF, persistencia de desafío/vínculo, estados,
  concurrencia, privacidad, límites y fallo de entrega en contrato nuevo;
  corregir nota factual obsoleta de C3 y actualizar seguimiento. Sin Java,
  SQL, endpoint ni envío externo en esta fase.
- **Aceptación/DoD:** separar reglas C3 aprobadas de decisiones nuevas;
  contrastar propuestas con esquema/código y reglas Guest/Reservations; revisar
  enlaces/diff, entregar QA documental y esperar aprobación antes de cerrar,
  commit o push.
- **Evidencia local:** fuentes C3, Auth, Reservations, esquema y tests de lookup
  contrastados; enlaces Markdown y `git diff --check` PASS. Sin Java/SQL/HTTP,
  por lo que Maven no aplica a esta entrega documental. QA y decisiones aprobadas
  en `docs/30_BD1_HISTORICAL_RESERVATION_OTP_CONTRACT_PROPOSAL.md`.

#### BE-013B-BACKEND-01 — Emisión, verificación y vínculo OTP Backend

- **Estado:** COMPLETADA (2026-10-04); el usuario confirmó las pruebas
  manuales sin errores y autorizó el cierre con commit y push.
- **Rama/base:** `feature/bd1-historical-reservation-otp` desde `main`
  actualizado `1f6c30e` (PR #102 integra el contrato L-01 a L-07).
- **DoR:** C3 y L-01 a L-07 aprobados; Guest Auth, Reservations,
  EmailSender y PostgreSQL/Liquibase disponibles. Revisiones BD3/Guest Web
  necesarias para integración, sin impedir preparar esta rama Backend.
- **Alcance/archivos:** puerto invocable Reservations, changeset 004 nuevo de
  desafíos/vínculos, servicio Guest y API BFF-only, audit seguro, pruebas
  PostgreSQL/HTTP y seguimiento. Sin cambios Web ni entrega Resend en vivo.
- **Aceptación/DoD:** sesión Guest vigente, lookup genérico, límites C3/L-05,
  OTP protegido, un uso, reenvío/expiración/intentos, concurrencia y
  asociación por reserva; fake EmailSender en pruebas, verify completo,
  migración/upgrade y diff. QA manual antes de cerrar, commit o push.
- **Evidencia local:** 13 pruebas focalizadas y verify completo 321 PASS,
  cero failures/errors/skipped, BUILD SUCCESS en PostgreSQL 17/Java 21.
  Migración fresca y upgrade desde changelog pre-OTP PASS; en la base de upgrade
  el changeset 004-007 aplicó y 10 pruebas OTP pasaron. Guía
  `docs/31_BD1_HISTORICAL_RESERVATION_OTP_BACKEND_QA.md`; ambas rutas se
  guardaron en `postman/BD1-Backend-APIs.postman_collection.json`.

### BE-007 — Centro de integraciones, error queue e idempotencia

- **Estado:** BE-007A PENDIENTE; BE-007B PENDIENTE.
- **Dependencias:** A requiere BE-003 y acuerdo SH-D01/BE-015A con BD2;
  B requiere C5/A, BE-014A, contrato audit BE-008A y persistencia confirmada.
- **Entrega A / DoR B:** registro property/category/provider/capabilities/config,
  secret references, health, contrato API/BFF y permisos; estados de queue,
  reintentos/límites/backoff, concurrencia, recuperación tras caída y operación incierta.
- **Entrega B:** configuración validada, health verificable, error queue con
  historial append-only, retry manual/recuperación autorizados y auditados;
  dedupe persistente compartido con BD2. No almacenar secretos en texto plano.
- **Aceptación:** misma key/payload retorna resultado original; payload distinto
  genera conflicto; retries simultáneos no duplican side effects; rollback,
  caída tras envío/antes de confirmación y timeout quedan recuperables. Cuando
  el proveedor no ofrece dedupe, acordar conciliación antes de prometer un solo efecto.
- **Archivos previstos:** C5, integrations si módulo aprobado, 007 registry/queue/
  idempotency, shared SPI acordado, API/DTO, PostgreSQL/HTTP/tests de fallos.
- **Reviewer:** BD2 por dedupe/pagos y BD3 por mensajería/channels operativos.

### BE-015 — Adapters externos de pagos y mensajería

- **Estado:** BE-015A PENDIENTE; BE-015B PENDIENTE por proveedor.
- **Dependencias:** A con BD2/BD3 y propuestas FP-D01/03/SH-D01;
  B requiere A, BE-007B o base de dedupe equivalente compartida aprobada,
  secretos/sandbox y flujos consumidores disponibles para integración final.
- **Entrega A / DoR B:** contratos de provider y SPI: BD2 posee ledger/lifecycle/
  folio; BD3 reglas y destinatarios de mensajería; BD1 transporte, secretos,
  callbacks auténticos, retry y recuperación. Aprobar canales, mensajes,
  consentimiento cuando aplique y propiedad del estado incierto.
- **Entrega B:** adapters aprobados con timeouts/errores seguros, verificación
  callback, dedupe y conciliación. Resend OTP no implica proveedor comercial
  confirmado para toda la mensajería. Nunca recibir/persistir PAN/CVV en PMS.
- **Aceptación:** authorize/capture/void/refund parciales según contrato BD2,
  callbacks duplicados/desordenados y timeouts; sin segundo movimiento contable;
  mensajería sin envío duplicado y estado de entrega según evidencia del proveedor.
  Sandbox + consumidor real + cross-property antes de COMPLETADA por proveedor.
- **Archivos previstos:** contrato SPI/provider, adapters integrations/guestauth
  según responsabilidad, consumers BD2/BD3, callback/API, tests de contrato y sandbox.
- **Reviewer:** BD2 pagos y BD3 mensajería; consumidores públicos afectados.

### BE-009 — Channels reales

- **Estado:** PENDIENTE; contrato y adapter se entregan por channel.
- **Dependencias / DoR:** ATS/RatePlans existen; completar C5, provider/channel y
  mappings aprobados; BE-007B/014A y contrato con booking/admisión BD2/BD3.
- **Entrega:** sincronizar inventario/tarifas y recibir eventos autorizados;
  health, errores/retry/recuperación en el centro; conciliar diferencias sin
  duplicar reservas. Confirmar semántica de reservas nuevas/cambios/cancelación.
- **Aceptación:** payload/callback auténtico, duplicados/desorden/timeout/reconexión,
  mappings por property, tarifa exacta, ATS respetado y ausencia de sobreventa
  para los escritores participantes; prueba sandbox de ida/vuelta con evidencia.
- **Archivos previstos:** contrato channel/mapping, adapters, consumers booking/
  inventory, queue/audit y pruebas. No diseñar reglas del channel desde fixtures.
- **Reviewer:** BD2 inventario/finanzas y BD3 consumidor operativo/comercial.

### BE-010 — Reportes, exportaciones y revenue KPIs

- **Estado:** BE-010A y BE-010B-ONBOOKS-01 COMPLETADAS; el HTTP On-books diario
  está integrado en `main` por PR #109. Revisiones de paridad ATS/ReservationStay
  y del BFF Web pendientes; otros reportes/KPIs siguen pendientes de sus fuentes
  y decisiones específicas.
- **Dependencias:** A inventaría tablas y fórmulas con BD2/BD3; B requiere C7/A,
  BE-014A y fuentes reales de cada indicador. Folio PAYMENT no prueba capture.
- **Entrega A / DoR B:** definir occupancy/rooms sold/available, ADR/RevPAR/revenue,
  pickup/pace, fechas/timezone/business date, cancelación/no-show/OOO, moneda,
  snapshots históricos, filtros y permisos. Definir formato/límites/exportación.
- **Entrega B:** consultas scoped y resultados verificables por property antes
  de agregar ALL_PROPERTIES; exportar solo campos y properties autorizados;
  no sumar monedas distintas ni promediar ratios sin fórmula aprobada.
- **Aceptación:** dataset controlado persistido con resultado manual exacto,
  noches/límites/DST, multi-room contado por stay, cancelaciones/reembolsos según C7,
  denominador cero y monedas según contrato; filtros/paginación/exportación seguros
  y sin fórmulas ejecutables en formatos de hoja de cálculo; presupuesto de consulta
  y límites de export acordados/probados. Sin cifras derivadas de mocks Web.
- **Archivos previstos:** C7, reporting solo si aprobado, SQL/query/DTO/API,
  migrations/índices nuevos justificados, tests y consumidores de reportes.
- **Reviewer:** BD2 finanzas/inventario, BD3 business date/comercial y owner Revenue.

#### BE-010A-01 — Propuesta C7 de métricas y exportación

- **Estado:** COMPLETADA (2026-10-04); el usuario revisó D01–D09, aprobó el
  primer reporte On-books diario y confirmó límites/permiso/export. Commit y
  push autorizados por el flujo de QA acordado. C7-D03 sigue pendiente.
- **Rama/base:** `feature/bd1-reporting-contract-c7` desde `main` actualizado
  `9ecd208` (PR #105 integra BE-016A y PR #104 Web público).
- **DoR:** BE-003/C2 y fuentes Reservations, Inventory, Folio y Night Audit
  presentes; BE-010A inventaría fórmulas y vacíos antes de implementar.
- **Alcance/archivos:** `docs/33_BD1_REPORTING_CONTRACT_C7_PROPOSAL.md`,
  AlanPlan/Handoff. Inventario de tablas reales, decisiones de granularidad,
  denominador, ingresos, fechas, monedas, permisos y export; sin Java, SQL,
  ruta HTTP, permiso nuevo o valor de KPI calculado.
- **Aceptación/DoD:** cada fuente enlazada al código/migración; decisiones
  D01–D09 explícitas, brechas financieras/históricas reconocidas y secuencia
  por indicador; enlaces/diff revisados. Entregar QA manual y esperar aprobación
  antes de cerrar, commit o push.
- **Evidencia local:** nueve enlaces válidos, D01–D09 presentes y
  `git diff --check` PASS. QA de decisiones del usuario registrada; no aplica
  Maven: solo documentación.
- **Dependencias posteriores:** BE-010B On-books está completada. Siguen abiertas
  la revisión BD2/BD3 de paridad ATS/ReservationStay y la revisión Web del BFF;
  revenue/ADR/RevPAR requieren D03 y pace requiere D05.

#### BE-010B-ONBOOKS-01 — Consulta Backend HTTP On-books diario

- **Estado:** COMPLETADA (2026-10-05) e integrada en `main` por PR #109
  (`7e0bda0`); QA manual confirmada por el usuario y `verify-backend`/
  `verify-stack` PASS. El ajuste de conexiones de CI quedó integrado por PR #110
  (`5b2746e`).
- **Rama/base:** `feature/bd1-daily-on-books-report` desde `main` actualizado
  `b5d6630` (PR #106 integra C7).
- **DoR:** C7-D01/D02/D06/D07/D08 aprobadas para primer reporte; C2 Staff,
  PropertyScopeResolver, tablas Rooms/OOO/Reservations/Stays y ATS SQL existen.
  C7-D03 pendiente no bloquea On-books sin importes. Las revisiones BD2/BD3
  de paridad y Web del BFF son seguimiento colaborativo, no dependencias para
  cerrar este alcance Backend: la paridad se apoya en las consultas y pruebas
  del Backend; la ruta BFF queda explícitamente fuera de esta entrega.
- **Alcance/archivos:** consulta de inventario por property/stay date y
  `GET /api/v1/reports/on-books/daily`, autorización Staff `COMMERCIAL_MANAGE`
  y `MULTI_PROPERTY_READ` explícito para ALL_PROPERTIES, SQL scoped, DTO,
  `Cache-Control: private, no-store`, tests PostgreSQL/HTTP, contrato y
  colección Postman. El BFF Web pertenece a una integración Web posterior;
  no revenue, ADR,
  RevPAR ni CSV en este incremento.
- **Aceptación/DoD:** capacidad física−OOO única; OOS intacto; stays elegibles
  por noche y padre no cancelado; multi-room, cero denominador, property ajena,
  sesión revocada y multi-property probados. Rango ≤366 noches, límite de filas,
  porcentaje reproducible y HTTP 400/401/403/200. Tests focalizados + verify
  completo, diff, Postman y QA manual.
- **Evidencia local:** 10 pruebas focalizadas PASS; `verify` completo 331 PASS,
  cero failures/errors/skipped y BUILD SUCCESS en PostgreSQL 17/Java 21.
  Contrato Backend aprobado en
  `docs/34_BD1_ON_BOOKS_HTTP_CONTRACT_PROPOSAL.md`; QA en
  `docs/35_BD1_DAILY_ON_BOOKS_QA.md`. QA manual confirmó 200 en ambos scopes,
  401/403/400, límites 366/367 noches, no-store, DTO/cero denominador y orden.
  Tras fallo CI por `too many clients already`, `verify` 331 PASS con
  PostgreSQL de 100 conexiones y pool Hikari de test limitado a 5. En PR #109,
  `verify-backend` y `verify-stack` SUCCESS con hotfix `d2c1a21`; PR #110 integra
  el límite Hikari de CI. La revisión de código confirma que ATS y On-books
  comparten elegibilidad ReservationStay y OOO/OOS; las revisiones BD2/BD3 y Web
  pueden aportar correcciones concretas, pero no bloquean el cierre Backend.

### BE-011 — MFA local Staff

- **Estado:** BE-011A PENDIENTE; BE-011B PENDIENTE.
- **Dependencias / DoR B:** cambio explícito aprobado de C1 + C8/A; BE-006C y
  contrato audit/access disponibles. Guest conserva MFA delegado a Google.
- **Entrega A:** decidir factor, obligatoriedad por rol, enrolamiento/confirmación,
  desafío previo a sesión completa, recuperación, revocación, límites y secretos.
- **Entrega B:** factor y recuperación acordados, protección de secretos,
  auditoría segura y revocación al cambiar factor/recuperación según C8.
- **Aceptación:** contraseña sola no concede sesión completa cuando MFA requerido;
  replay/expiración/intentos/concurrencia y recuperación probados; no semillas,
  códigos o recovery codes en logs/respuestas indebidas; no bypass vía refresh.
- **Archivos previstos:** C1 superseded/extendido y C8, securityauth/BFF,
  changesets y tests; dependencia criptográfica nueva solo si aprobada.
- **Reviewer:** producto y owner Web seguridad.

### BE-012 — Privacidad y consentimientos

- **Estado:** BE-012A PENDIENTE; BE-012B PENDIENTE por consentimiento/DSR.
- **Dependencias / DoR B:** GuestProfile existe; C9/A, BE-014A, auditoría y
  fuentes/retención legales confirmadas. No inferir jurisdicción ni plazos.
- **Entrega A:** propósitos/canales, source/version/evidence/time, identidad del
  titular, representación Staff, exportación/anonimización y retención financiera.
- **Entrega B:** historial versionado y revocable, exportación autorizada y
  anonimización conforme al contrato; GuestAccount no sustituye GuestProfile.
- **Aceptación:** revocar SMS no revoca Email; Guest solo accede a su vínculo
  autorizado; Staff requiere permiso/scope; export no filtra terceros; anonimizar
  no elimina historia financiera/audit retenida y reintento no duplica operación.
- **Archivos previstos:** C9, servicio/módulo aprobado, persistence/profile/link,
  migrations nuevas, audit/API/BFF y pruebas DSR/aislamiento.
- **Reviewer:** producto/retención, BD3 GuestProfile y consumidores Guest.

### BE-016 — Google y Resend en entorno de presentación

- **Estado:** BE-016A COMPLETADA; BE-016B PENDIENTE; externo SIN VERIFICAR.
- **Dependencias:** A puede iniciar desde ahora; B requiere acceso/configuración
  del entorno, cuenta de prueba/remitente y BE-013B para OTP E2E completo.
- **Entrega A:** checklist reproducible del host/HTTPS/callback Google, BFF y
  cookies, secretos mediante entorno, remitente/dominio Resend y destinatario de
  prueba autorizado. Registrar solo presencia/configuración pública, nunca valores secretos.
- **Entrega B:** Google real login/session/refresh/logout; desafío OTP vía Resend
  y recepción real en buzón, verificación/vínculo; errores de provider y correlación.
- **Aceptación:** evidencia fechada de entorno/commit, Network browser solo BFF,
  tokens fuera de JS, Guest/Staff aislados; recepción del correo comprobada.
  Respuesta HTTP del proveedor no sustituye entrega externa. Sin acceso externo,
  registrar impedimento/evidencia faltante y mantener validación pendiente.
- **Archivos previstos:** guía de presentación/smoke y evidencia sanitizada;
  cambios de configuración/código solo ante defecto concreto autorizado.
- **Reviewer:** responsable despliegue y consumidor Guest; BD3 vínculo.

#### BE-016A-01 — Preflight reproducible de Google, Resend y OTP

- **Estado:** COMPLETADA (2026-10-04); guía y corrección de Compose verificadas
  manualmente por el usuario. Commit y push autorizados.
- **Rama/base:** `feature/bd1-presentation-google-resend-preflight` desde `main`
  actualizado `b60f465` (PR #103 integra BE-013B-BACKEND-01).
- **DoR:** BE-004/C3, adaptadores Google/Resend y BE-013B Backend integrados;
  no se requieren secretos ni acceso externo para preparar el preflight.
- **Alcance/archivos:** guía `docs/32_BD1_PRESENTATION_GOOGLE_RESEND_PREFLIGHT.md`,
  estado factual C3, Compose raíz y `.env.example` para pasar la clave HMAC OTP,
  AlanPlan/Handoff. Sin nuevas rutas, cambios de auth o pruebas en vivo.
- **Aceptación/DoD:** variables y callback exacto inventariados; comandos de
  presencia que no imprimen valores; checklist de cookies/Network, login,
  refresh, logout, recepción OTP y evidencia sanitizada; Compose validado,
  enlaces y diff revisados. El usuario confirma QA manual antes de cierre.
- **Evidencia:** Compose `config --quiet`, enlaces locales, passthrough OTP,
  comando de longitud con valores sintéticos y `git diff --check` PASS.
  El usuario ejecutó desde `backend/` `docker compose -f ../compose.yaml
  config --quiet` sin errores. Google/Resend del entorno de presentación
  permanecen SIN VERIFICAR hasta BE-016B.

### BE-017 — Cierre integrado BD1

- **Estado:** PENDIENTE.
- **Dependencias / DoR:** incrementos incluidos en los once puntos completos;
  decisiones aplicables aprobadas, providers y consumidores reales disponibles.
- **Entrega:** acceptance por requisito, suite PostgreSQL completa, HTTP/OpenAPI/
  BFF, migraciones upgrade/instalación, replay/concurrencia/recuperación, seguridad
  cross-property/Guest/Staff y smoke del entorno de presentación. Reviewers BD2/BD3.
- **Aceptación:** ninguna responsabilidad cerrada solo por documentación, mocks,
  tests omitidos o evidencia externa no ejecutada; limitaciones reales explícitas.
  Handoff enlaza commit/PR, comandos/resultados y siguiente paso por requisito.
- **Archivos previstos:** regresiones de integración y evidencia/handoff/plan;
  no ampliar dominio para cerrar la tarea.

### Persistencia y prefijos

| Prefijo | Responsabilidad | Regla |
| --- | --- | --- |
| 003 | Security/Auth/Staff/MFA/OTP según diseño aprobado | Próximo changeset nuevo; no editar aplicados ni fijar numeración sin revisar rama vigente |
| 007 | Integrations | Reservado; registry/queue/retry solo tras C5 y aprobación módulo |
| 008 | Audit | Reservado; crear solo tras C6 y decisión de reutilización |
| 009 o siguiente libre | Reporting/otros módulos nuevos | Reservar al confirmar arquitectura; no asignar dos módulos al mismo prefijo |
| 001 | Payments | Reservado para owner Payments; uso y SPI requieren acuerdo BD1/BD2 |

Folios existentes permanecen en 004 ServiceReservations. No mover migraciones por
cambio de ownership. El changelog maestro incluye solo módulos implementados y
respeta dependencias; perfiles parciales no alteran el contrato de integración.

### Control operativo, DoR y DoD comunes

Antes de cada incremento:

1. Revisar estado local/base actual sin sobreescribir cambios previos. Por
   instrucción explícita del usuario (2026-10-04), crear una rama nueva antes
   de modificar archivos al iniciar cada tarea de implementación; nunca trabajar
   directamente en main. Registrar rama y base en AlanHandoff.
2. Confirmar contratos/DEC, dependencias COMPLETADAS, owner/reviewers, acceptance,
   archivos previstos y configuración de prueba. Contrato pendiente = PENDIENTE,
   no READY; registrar la decisión faltante.
3. Marcar READY/EN_PROGRESO en este archivo y agregar entrada en AlanHandoff con
   rama/base/alcance/siguiente paso. Actualizar ambos al cambiar de estado.
4. Entregar contrato y código en incrementos revisables por dominio/proveedor.
   No ampliar permisos/roles/scope por conveniencia de implementación.

DoD de código: aceptación específica PASS; pruebas automatizadas relevantes y
suite/CI aplicable PASS; QA manual PASS del owner de la tarea; pruebas de
dominio/SQL/HTTP/contrato según impacto; `./mvnw -B verify` Java 21/PostgreSQL 17
sin exclusiones; migraciones vacío/upgrade/idempotencia cuando existan; diff
revisado y `git diff --check`; OpenAPI/BFF/DTO/Mapper y documentación coherentes;
evidencia sanitizada; seguridad, property scope e integración validados cuando
correspondan. Providers requieren además sandbox; presentación requiere
validación en vivo. Las revisiones de otros owners/reviewers no bloquean avance
ni cierre con esta evidencia PASS. Son bloqueantes únicamente si el docente lo
exige, branch protection/política de repositorio requiere aprobación, existe
contradicción real entre fuentes de verdad, o falta una decisión de negocio
necesaria que no esté registrada en una fuente de verdad aprobada. Codex no
infiere ni inventa decisiones de producto. Registrar la revisión como seguimiento
y escalar hallazgos concretos; no mantener tareas pendientes por silencio o
revisión externa. La tarea de implementación permanece EN_QA hasta que el usuario
ejecute el QA manual aplicable y confirme el resultado PASS; solo después puede
marcarse COMPLETADA. Esa confirmación no requiere aprobación de otros
owners/reviewers. Commit, push y merge requieren autorización explícita.

DoD de contrato: referencias/capacidades comprobadas, propuesta y aprobación
separadas, campos/métodos/rutas/errores/permiso/scope/idempotencia/audit documentados,
reviewers y decisiones registradas. La aprobación de otro owner solo es requisito
si la exigen explícitamente el docente o la política del repositorio. Si hace
falta una decisión de negocio necesaria que no esté registrada en una fuente de
verdad aprobada, debe resolverse con la autoridad correspondiente antes de
presentar el contrato como aprobado; no se sustituye esa decisión con una
inferencia de Codex ni con el silencio de un reviewer.

Cada entrada de AlanHandoff registra: ID/incremento y estado; rama/base/commit/PR;
contrato/decisión y reviewers; alcance entregado; comandos, entorno y resultados;
evidencia HTTP/SQL/externa y límites; impedimentos/decisiones pendientes; siguiente
paso concreto. Mantener historial append-only y anteponer la actualización nueva.
No llevar tareas Backend al XLSX. No actualizar memorias externas como parte del plan.

**Estado final del incremento vigente:** AUTH-UNIFIED-01 COMPLETADA; Alan confirmó
QA manual PASS, incluido Google Guest completo, el 2026-10-06 en localhost:3001.
Esperar autorización para nueva tarea o publicación; sin commit/push/merge.
Registro previo de próximos pasos:

**Próximo paso concreto:** BE-004-ACCOUNT-SUMMARY-01 y BE-005-AUTH-API-01
COMPLETADAS con QA manual final real PASS confirmado por el usuario (2026-10-06);
esperar autorización para una nueva tarea. BE-008B-AUTH-03 y BE-005-OPENAPI-01
mantienen su cierre con QA manual PASS. Proyección/consulta y C6-D06 mantienen su alcance y dependencias
pendientes. Commit/push/merge requieren autorización explícita.

## Entorno de validación

En la validación original, el host tenía Java Runtime 25 sin `javac`. La validación reproducible de
BE-001 se ejecuta con `maven:3.9.11-eclipse-temurin-21` y PostgreSQL 17 en
Docker; el workflow Backend CI usa Temurin 21.


### STAFF-RESERVATIONS-READ-01 — Integración Staff /reservas PostgreSQL

- **Estado:** COMPLETADA (READY → EN_PROGRESO → EN_QA → COMPLETADA);
  QA manual aplicable PASS confirmado por Alan, 2026-10-08.
- **Owner/reviewers:** Alan integración; Juan BD3 y José UI Web, colaborativos.
- **Rama/base:** `feature/staff-reservations-postgres` desde `bbfd1e7`; árbol limpio
  al inicio. Sin commit/push/merge autorizados.
- **Dependencias/DoR:** ReservationQueryService y scope SQL BD3, C2 aprobado,
  Staff Auth/BFF/refresh reales y UI José existentes; solicitud autoriza lectura
  y HTTP/OpenAPI faltante. Se conserva RESERVATION_MANAGE, PROPERTY explícito,
  responsible GuestProfile separado de ocupantes; sin facultades financieras.
- **Contrato/archivos:** [49](49_STAFF_RESERVATIONS_READ_CONTRACT.md), adapter Staff
  sobre queries, dos GET/chain Staff/OpenAPI, BFF allowlist, DTO/mapper/service/hooks
  y adaptación nullable de componentes existentes. Sin migrations/dependencias.
- **Aceptación:** PASS; PostgreSQL real en listado y detalle, N stays/room nullable,
  header histórico válido, aislamiento Guest/Staff/property y permisos actuales,
  refresh acotado, ningún dato financiero/ocupación/política inventado.
- **DoD:** PASS; focalizados y full verify Backend, Web tests/typecheck/lint/build
  con mocks false, generated OpenAPI/mappings y diff PASS previos; QA manual
  aplicable de Alan PASS con NEXT_PUBLIC_USE_MOCK_API=false. Caso sin permiso
  NO EJECUTABLE manualmente por falta de fixture, con cobertura técnica existente;
  ninguna regla vigente exige su ejecución manual para este cierre.
- **Evidencia:** Backend focalizados 24 PASS y full verify 840 PASS, sin fallos/errores/skips;
  Java21/PostgreSQL17 aislado. Web focalizados 232 PASS; full suite 1579/270 PASS
  con `--maxWorkers=2`, typecheck/lint/build mock=false PASS y diff PASS. OpenAPI
  generado 44 operaciones/34 paths/52 schemas/13 tags, sin exclusiones.
- **Siguiente:** incremento cerrado conforme a [49](49_STAFF_RESERVATIONS_READ_CONTRACT.md);
  no avanzar a otra tarea ni realizar commit/push/merge sin autorización.


#### STAFF-RESERVATIONS-READ-01 — Corrección técnica de intercepción MSW

- **Estado al entregar la corrección:** EN_QA; Alan reportó lectura correcta con mocks=false y una
  incidencia con mocks=true. Según la decisión de cierre de abajo, esta última
  es una incidencia técnica, no un FAIL del QA manual obligatorio.
- **Autorización/alcance:** Alan solicita únicamente excluir GET list/detail BFF
  de intercepción MSW. Contrato 49 y Backend/UI sin cambios en esta corrección.
- **Entrega:** worker wrapper antes del script MSW generado + registro enable;
  tests worker/service/workspace con ambos flags y regresión de mocks existentes.
- **Evidencia:** focalizados 41/full 1596 PASS, typecheck/lint/builds ambos flags y
  diff PASS; smoke Firefox ambos flags contra PostgreSQL PASS. Detalle en Handoff.
- **Seguimiento:** QA manual aplicable mocks=false confirmado PASS y cierre
  COMPLETADA registrado abajo; evidencia técnica de esta corrección conservada.

#### STAFF-RESERVATIONS-READ-01 — Decisión de cierre QA, 2026-10-08

- **Decisión aprobada:** el gate manual/E2E se ejecuta únicamente con
  `NEXT_PUBLIC_USE_MOCK_API=false`. Mocks=true no es gate manual ni modo de
  integración real de esta tarea; no declarar FAIL manual por su comportamiento.
- **Cobertura técnica:** se conservan los tests de boundaries con ambos flags,
  exclusión MSW y regresión de otros mocks; no cambia producto ni Backend.
- **Limitación manual:** Staff autenticado sin RESERVATION_MANAGE sigue
  **NO EJECUTABLE** por falta de fixture; esperado403, sin atribuir PASS manual.
- **Estado vigente:** COMPLETADA tras QA manual aplicable mocks=false PASS
  confirmado por Alan; cierre registrado abajo. Sin commit/push/merge.

#### STAFF-RESERVATIONS-READ-01 — Cierre con QA manual aplicable PASS, 2026-10-08

- **Estado/aceptación/DoD:** EN_QA → COMPLETADA; aceptación y DoD PASS. Alan
  confirmó los nueve casos manuales de [49](49_STAFF_RESERVATIONS_READ_CONTRACT.md)
  con NEXT_PUBLIC_USE_MOCK_API=false: lectura PostgreSQL/listado, detalle/stays,
  property403, propertyId400, inexistente404, anónimo401, Guest401, refresh y
  ausencia de datos/finanzas inventados. Mocks=true fuera del gate manual.
- **Limitación conservada:** Staff autenticado sin RESERVATION_MANAGE:
  NO EJECUTABLE manualmente por falta de fixture; esperado403, cobertura técnica
  existente PASS, sin PASS manual atribuido ni fixtures/permisos modificados.
  El DoD vigente permite cerrar con esta limitación explícita.
- **Validación:** evidencia técnica previa Backend/Web/OpenAPI conservada;
  cierre exclusivamente documental, git diff --check PASS. Sin suites nuevas.
- **Siguiente:** incremento cerrado; cualquier trabajo adicional o publicación
  requiere autorización independiente. Sin commit/push/merge.
