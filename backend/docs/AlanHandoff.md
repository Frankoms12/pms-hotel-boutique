# AlanHandoff — Seguimiento Backend

## 2026-10-08 — STAFF-RESERVATIONS-READ-01: cierre con QA manual aplicable PASS

- **Estado/aceptación/DoD:** EN_QA → COMPLETADA; aceptación y DoD PASS. Alan
  confirmó el QA manual aplicable con NEXT_PUBLIC_USE_MOCK_API=false:
  listado Staff → PostgreSQL PASS; detalle real/stays PASS; property fuera de
  scope403 PASS; propertyId ausente/inválido400 PASS; reserva inexistente404 PASS;
  anónimo401 PASS; Guest separado de Staff401 PASS; refresh Staff real PASS;
  datos ausentes/financieros no inventados PASS. Resultados del owner, no una
  nueva ejecución del agente. Matriz en [49](49_STAFF_RESERVATIONS_READ_CONTRACT.md).
- **Gate:** mocks=true no forma parte del QA manual/E2E obligatorio según la
  decisión aprobada; tests técnicos de boundaries existentes conservados.
- **Limitación manual aceptada:** Staff autenticado sin RESERVATION_MANAGE
  permanece NO EJECUTABLE por falta de fixture; esperado403 y cobertura técnica
  existente en StaffReservationReadIntegrationTests. Sin PASS manual atribuido,
  creación de fixture ni alteración de permisos. Backend AGENTS/DoD común exigen
  QA manual aplicable PASS y no obligan a ejecutar manualmente este caso;
  permiten el cierre con la limitación documentada.
- **Evidencia/validación:** Backend focalizados24/full verify840 PASS, OpenAPI
  parity PASS; Web focalizados41/full1596 PASS y typecheck/lint/builds PASS previos
  conservados. Esta actualización solo modifica documentación; git diff --check
  PASS, sin repetir suites ni cambiar código/tests/fixtures. Las entradas EN_QA
  anteriores se conservan como historia y quedan supersedidas por este cierre.
- **Siguiente:** incremento cerrado; trabajo adicional o publicación requiere
  autorización independiente. Sin commit/push/merge.

## 2026-10-08 — STAFF-RESERVATIONS-READ-01: decisión de cierre QA

- **Decisión aprobada por Alan:** QA manual/E2E obligatorio únicamente con
  `NEXT_PUBLIC_USE_MOCK_API=false`. Mocks=true no es gate manual ni modo de
  integración real para esta tarea; no declarar FAIL manual por su comportamiento.
  Sustituye las instrucciones previas de repetir QA manual con ambos flags.
- **Evidencia conservada:** tests técnicos de boundaries y smoke automatizado
  anteriores permanecen; no se cambian producto, Backend, código ni tests.
- **Caso pendiente no ejecutable:** Staff autenticado sin RESERVATION_MANAGE,
  esperado403 en listado/detalle, sigue **NO EJECUTABLE** manualmente por falta de
  fixture activa con login real sin ese permiso. Sin PASS/FAIL manual atribuido.
- **Estado vigente:** COMPLETADA tras QA manual aplicable mocks=false PASS
  confirmado por Alan; cierre vigente arriba. Sin commit/push/merge.

## 2026-10-08 — STAFF-RESERVATIONS-READ-01: corrección de intercepción MSW

Registro de corrección EN_QA histórico; estado vigente COMPLETADA según el cierre vigente arriba.

- **Estado:** EN_QA; Alan reportó lectura correcta con mocks=false y una
  incidencia con mocks=true. La decisión de cierre QA documentada arriba la clasifica como
  incidencia técnica, no como FAIL del QA manual obligatorio.
  Autoriza exclusivamente corregir el boundary de GET listado/detalle reales.
- **Rama/base:** `feature/staff-reservations-postgres`, `bbfd1e7`; cambios previos
  de la integración conservados. Sin commit/push/merge.
- **Causa comprobada:** el worker MSW generado aplicaba `respondWith` a los GET
  reales; `onUnhandledRequest: bypass` solo hace passthrough después de esa
  intercepción. La composición ya seleccionaba BFF, pero faltaba exclusión nativa
  antes de MSW. Test ejecutando el script original reproduce esa intercepción.
- **Corrección:** `public/pmsMockServiceWorker.js` registra primero el listener
  limitado a GET same-origin de listado/detalle BFF y no usa `respondWith`;
  importa el worker MSW generado intacto. `enableMocking` registra ese wrapper.
  No handler/fixture nuevo para datos Staff ni cambios Backend/contrato/UI.
- **Tests PASS:** focalizados 41/6 archivos; full Web 1596/271 con maxWorkers=2,
  sin exclusiones; typecheck/lint y builds mocks=true/false PASS. diff PASS.
- **Smoke real PASS:** Firefox aislado sobre Web QA 3002, mocks=true, Backend
  actual 8081/PostgreSQL existente. Login Staff real, listado/detalle 200,
  ELUXSM4J74 con 2 stays y 0 mensajes REQUEST/RESPONSE MSW para esas lecturas;
  UI detalle correcta. Firefox mocks=false también listado/detalle 200, misma
  reserva/2 stays, UI correcta, sin worker ni mensajes MSW. Mock health ok y contrato provisional 200/5 filas/4 mensajes
  MSW conservados. No credenciales/tokens impresos ni fixtures DB modificados.
- **Siguiente:** QA manual/E2E del stack real únicamente con mocks=false.
  No se exige repetir mocks=true como gate manual. Mantener EN_QA hasta
  confirmación manual PASS; no cambiar otros alcances.

## 2026-10-08 — STAFF-RESERVATIONS-READ-01: Staff /reservas real

Registro de entrega EN_QA histórico; estado vigente COMPLETADA según el cierre vigente arriba.

- **Estado:** EN_QA; autorizado por Alan para listado/detalle PostgreSQL,
  preservando UI José. Owner integración Alan; reviewers Juan/José colaborativos.
- **Rama/base:** `feature/staff-reservations-postgres`, `bbfd1e7`; sin cambios previos.
- **Contrato:** [49](49_STAFF_RESERVATIONS_READ_CONTRACT.md); GET reservations y
  detalle, RESERVATION_MANAGE C2 existente/PROPERTY explícito, live auth/scope.
  Perfil responsable mínimo y N stays/catálogos reales; room nullable. Recibo
  financiero fuera de exposición; no inferir captura desde APPROVED.
- **Entrega:** reuse ReservationQueryService, HTTP Staff/OpenAPI, BFF cookie
  HttpOnly/allowlist y refresh compartido/acotado; DTO → mapper → service → hooks
  consumidos por UI existente. Datos ausentes nullable/ocultos; mutaciones no
  habilitadas. Sin migraciones, secretos, dependencias ni asignación nueva.
- **Pruebas Backend PASS:** Compose `pms-staff-reservations-qa`, PostgreSQL17
  tmpfs sin puertos ni DB aplicación, Java21/Maven3.9.11. Comandos dentro de verify:
  `mvn -B --no-transfer-progress -Dtest=StaffReservationReadIntegrationTests,ReservationQueryServiceIntegrationTests,OpenApiContractIntegrationTests test`
  →24 PASS; `mvn -B --no-transfer-progress verify` final →840 PASS, cero
  failures/errors/skipped, BUILD SUCCESS/JAR. OpenAPI 14 tests incluidos,
  paridad mappings 44 operaciones/34 paths/52 schemas/13 tags, sin exclusiones.
  Proyecto QA detenido/eliminado después de verificar; DB aplicación intacta.
- **Pruebas Web PASS:** focalizados de reservations + Staff-session service +
  staff-property-workspace + BFF Staff →232 PASS en 37 archivos; full
  `npm test -- --maxWorkers=2` →1579 PASS en270 archivos, sin exclusiones.
  `npm run typecheck`, `npm run lint`, `NEXT_PUBLIC_USE_MOCK_API=false npm run build`
  y `git diff --check` PASS. Build incluye ambos handlers BFF.
- **Incidencia de validación:** full Web con workers predeterminados mostró dos
  carreras intermitentes de aserción de cleanup de cart en checkout público
  (fuera del diff); checkout aislado 12 PASS y full con 2 workers PASS. Sin tocar
  checkout ni relajar assertions. Errores iniciales de schema OpenAPI/fixture
  de organización/test de empty corregidos antes de los resultados finales.
- **Archivos:** contrato 49/baseline 39/plan/handoff, Reservations query/projection/
  HTTP/Staff chain/OpenAPI/tests; Web app workspace/BFF, lib/http Staff refresh,
  auth service reutilizado y módulo reservations DTO/mapper/service/hooks/model/
  presentación/tests; guards nullable de calendar/waitlist para compilar el modelo.
  Sin CSS nuevo ni UI rehecha. next-env generado restaurado a su contenido inicial.
- **Bloqueos/límites:** QA manual Alan todavía pendiente ([guía49](49_STAFF_RESERVATIONS_READ_CONTRACT.md)).
  No recibo financiero expuesto sin contrato/autorización propia; listado HTTP
  no paginado con consultas por reserva documentadas. CI remoto no ejecutado.
- **Siguiente:** QA manual 49 de Staff real, DB, N stays/room nullable/property/
  refresh/Guest aislado, únicamente con NEXT_PUBLIC_USE_MOCK_API=false según la
  decisión de cierre QA documentada arriba. Mantener EN_QA hasta Alan PASS;
  sin commit/push/merge ni avance a otra tarea.


## Alan / A4 post-J6 — cierre con QA manual PASS (2026-10-08)

- **Estado / aceptación:** COMPLETADA. Alan confirmó explícitamente
  «QA manual A4 post-J6: PASS» tras ejecutar el recorrido en el stack local
  actual. Aceptación y DoD A4 PASS; cierre propio de J6 conservado.
- **Rama/base:** `qa/a4-public-booking-post-j6`, base main `aafdb7b`.
  Cambios documentales previos conservados; sin código/tests/migraciones.
- **Evidencia manual:** availability real de HB-GT-DEMO → creación201;
  replay201 con respuesta idéntica y conteos sin cambios. PostgreSQL:
  1 Reservation CONFIRMED +2 stays RESERVED sin habitación +1 recibo.
  Reserva `495bbced-44b2-4de5-8873-2da31e79f5a9`, código `TCUBZR9SBM`,
  total260000 minor GTQ. Staff anónimo401; Swagger live PASS para audiencia
  pública availability/bookings y respuestas201/400/404/409/422/500.
  Resultados de terminal aportados por Alan; sin secretos/tokens/cookies.
- **QA técnico previo:**184 focalizados,832 verify y45 checks de smoke PASS;
  evidencia y límites íntegros en la entrada anterior. No se repitieron suites
  ni smoke durante este cierre documental. `git diff --check` PASS.
- **Entrega / siguiente:** solo AlanPlan/AlanHandoff actualizados; nueva entrada
  antepuesta, historial append-only conservado. A4 cerrada; sin commit/push/
  merge ni avance a otra tarea sin autorización.

## Alan / A4 post-J6 — cierre técnico sobre main (2026-10-08)

- **Estado:** EN_QA; QA técnico PASS, confirmación manual post-J6 de Alan
  pendiente. J6 conserva su cierre propio; no se atribuye su PASS manual a A4.
- **Rama/base:** `qa/a4-public-booking-post-j6`, HEAD/main/origin/main `aafdb7b`,
  PR140 integrado; árbol inicial limpio. Validación exclusivamente A4, sin
  defecto encontrado ni cambios de producto/código/tests/migraciones/Web.
- **Pruebas reales:** Compose aislado, Maven3.9.11/Java21.0.9/PostgreSQL17.11,
  sin puertos del host. `mvn -o -B --no-transfer-progress -Dtest=... test`:
  184 PASS (nueve clases availability/J6/core/receipt/Security/OpenAPI).
  `mvn -o -B --no-transfer-progress verify`:832 PASS, cero failures/errors/
  skipped, BUILD SUCCESS/JAR. Avisos SpringDoc/agente JVM preexistentes.
- **Smoke HTTP/PG:**45 checks automatizados PASS con el JAR validado. GET
  availability anónimo200/6 ofertas; POST201 con2 STD y1 DLX/dos noches,
  430000 minor GTQ. Una Reservation CONFIRMED y3 stays RESERVED reales,
  roomId NULL,1 perfil/1 recibo/4 eventos audit. Replay201: snapshot, IDs y
  referencia de pago simulado idénticos; cero duplicación en todos los conteos.
  ATS STD4→2/DLX4→3, sin segundo consumo; GuestAccount/Folio sin altas.
- **Seguridad/errores:** solo GET availability y POST bookings anónimos en
  este flujo, sin Set-Cookie; otros métodos, vecinos, trailing slash, Staff
  y /error directo probados401.400/404/409/500 y códigos aprobados comprobados
  por HTTP real sin escrituras parciales.422 PAYMENT_DECLINED y ERROR500 de
  gateway comprobados en fixtures de integración; sin toggles HTTP/producto.
- **Swagger/paridad:** HTML/config200; OpenAPI live/generated y mappings
  coinciden:42ops/32paths/47schemas/13tags, sin exclusiones; únicas operaciones
  de negocio x-audience=public: GET availability/POST bookings, sin auth.
  Contrato booking201/400/404/409/422/500 y header obligatorio comprobados.
- **Evidencia ignorada:** `target/a4-postj6-focused.log`, focused-reports,
  `a4-postj6-verify.log`, surefire-reports, OpenAPI generado/mappings,
  `a4-postj6-openapi-live.json`, `a4-postj6-runtime-smoke.json/log`.
  BD desechable tmpfs y entornos QA retirados; stack del hotel y sus datos
  conservados. `git diff --check` PASS; solo AlanPlan/AlanHandoff modificados.
  Smoke técnico no equivale a aceptación manual ni comprobación visual de Alan.
- **Siguiente:** QA manual post-J6 y PASS explícito de Alan; mantener EN_QA.
  Sin commit/push/merge ni avance a otra tarea. Historial previo conservado.

## Juan / J6 — integración main PR143 y resolución autorizada (2026-10-08)

- **Estado / base:** integración local QA técnica PASS; J6 conserva COMPLETADA
  y el QA manual PASS confirmado por Juan el 2026-10-08. Rama
  feature/backend-public-booking-core, desde `f13df76`, integra main `2bfacba`.
- **Autorización / resolución:** usuario autorizó este merge y resolver dos
  conflictos: inserciones de Juan/Alan en el handoff y clasificación anónima
  de booking/Guest registration en OpenApiContractIntegrationTests. Conservar
  ambos bloques e historiales completos, sin borrar entradas de Alan ni Juan.
- **Alcance verificado:** implementación HTTP J6 idéntica al commit aceptado;
  Security/OpenAPI global, migraciones, dependencias, recursos y Web idénticos
  a main. No modificación propia de Guest Auth ni rutas públicas adicionales.
- **Validación:** `mvn -B --no-transfer-progress verify` PASS, 832 pruebas,
  cero failures/errors/skipped, BUILD SUCCESS y JAR generado. Incluye HTTP/PG
  J6(57), OpenAPI J6(5), paridad global(13), Security(27) y regresiones Guest Auth.
  Java21.0.9/Maven3.9.11/PostgreSQL17.11; Compose pms-public-j6-qa aislado.
  OpenAPI42ops/32paths/47schemas/13tags; contrato de negocio público solo
  GET availability/POST booking. Avisos JVM preexistentes; sin warnings críticos.
- **Evidencia:** target/public-booking-j6-main143-verify.log,
  public-booking-j6-main143-surefire-reports, OpenAPI/counts/JAR ignorados.
  Historial reconstruido y conservación de documentos ajenos verificados.
- **Entrega / siguiente:** merge y commit local autorizados; push de la
  integración exclusivamente a la rama actual pendiente de autorización.
  El PR140 remoto se actualizará con ese push; cambio de borrador/merge del PR
  requiere autorización independiente. No se declara un nuevo QA manual.

## Juan / J6 — cierre con QA manual PASS (2026-10-08)

- **Estado / aceptación:** COMPLETADA. Juan confirmó expresamente «QA manual
  PASS» para J6 el 2026-10-08, tras la lista de validación del flujo público,
  persistencia, replay/conflicto/precio/stock, Swagger y protección de Staff.
- **Rama / entrega:** feature/backend-public-booking-core, commit `4c18940`
  de implementación publicado con autorización; PR140 abierto como borrador.
- **Evidencia técnica:** focalizados148 PASS; `mvn -B --no-transfer-progress verify`
  794 PASS, cero failures/errors/skipped y JAR generado. Java21.0.9,
  Maven3.9.11/PostgreSQL17.11. Se conserva la evidencia de la entrada anterior;
  este cierre documental no modifica código ni requiere reejecutar la suite.
- **CI:** 2/2 PASS sobre `4c18940`:
  [verify-backend](https://github.com/Al0219/pms-hotel-boutique/actions/runs/37732935434/job/113165956896)
  y [verify-stack](https://github.com/Al0219/pms-hotel-boutique/actions/runs/37732935348/job/113165956716).
- **DoD / revisión:** contrato HTTP, seguridad real, OpenAPI, persistencia,
  idempotencia/rollback/concurrencia y alcance J6 verificados con evidencia técnica
  PASS y aceptación manual del owner. DoD J6 PASS; historial de Alan preservado.
  A4 y los estados de otras tareas se mantienen bajo sus confirmaciones propias.
- **Entrega documental / siguiente:** Juan autorizó commit y push de este cierre
  a su rama el 2026-10-08; cambio de borrador y merge del PR140 pendientes
  de autorización explícita.

## Juan / J6 — integración A4 y validación técnica (2026-10-07)

- **Estado / rama:** EN_QA, validación técnica PASS y QA manual pendiente;
  feature/backend-public-booking-core. Main `308174d` integrado localmente en `860d3bd`,
  padres e6a2340/308174d; PR140 existente. Sin push nuevo.
- **Conflicto / autorización:** usuario aprobó conservar íntegros los bloques
  de Alan y Juan y adaptar tres pruebas: SecurityConfigurationIntegrationTests,
  PublicBookingPreJ6SecurityHttpIntegrationTests y OpenApiContractIntegrationTests.
  Handoff resuelto por concatenación; ambas versiones verificadas contra sus
  padres, sin pérdida de contenido. Cuatro documentos untracked ajenos intactos.
- **Alcance vigente:** matcher de Alan importado intacto, sin editar configuración
  Security/OpenAPI global ni cerrar su tarea A4. Probes pre-J6 actualizados al
  INVALID_REQUEST HTTP400 real; clasificación global de POST booking público. Filtros
  reales habilitados en J6 y prueba HTTP real de creación/replay/PG/Swagger.
  Sin cambios de contratos, servicios, migraciones, dependencias o código Web.
- **Corrección J6:** filtros reales expusieron RequestRejectedException al leer
  un header con control; advice propio ahora devuelve INVALID_REQUEST400 sin
  datos de entrada. No modificar el firewall, servicio/core ni reglas de Alan.
- **Evidencia final:** focalizados148 PASS; mvn -B --no-transfer-progress verify:
  794 PASS, 0 failures/errors/skipped, BUILD SUCCESS y JAR generado. Java21.0.9,
  Maven3.9.11/PostgreSQL17.11, Compose aislado sin puertos del host. Logs
  target/public-booking-j6-a4-focused-final.log y public-booking-j6-a4-verify.log;
  surefire-reports/JAR/OpenAPI J6-A4 en target ignorado. Diff-check/scope PASS.
- **Validación integral:** HTTP real anónimo201 + snapshot PG/replay201 iguales,
  pago/reserva/stays una sola vez, MockMvc con filtros en todos los casos;
  fechas/IDs/cantidades/roomId NULL, precio/stock/DECLINED/ERROR y rollback/
  concurrencia del core PASS. OpenAPI global y vivo: 39ops/29paths/43schemas/12tags;
  Staff/otros métodos/paths y /error directo protegidos. Configuraciones globales
  idénticas a main. Único fallo inicial de header500 corregido sin debilitar tests;
  avisos SpringDoc/agente JVM preexistentes, sin warnings críticos nuevos.
- **Manual / siguiente:** usuario debe revisar availability→booking y filas PG
  de Reservation/N stays/receipt, replay/conflicto/precio/stock/Swagger y vecinos
  Staff. Rechazo/error del gateway solo en fixtures, sin parámetros públicos.
  Entregar commit `fix(public-booking): validate HTTP booking with A4` y reporte;
  esperar autorización de push y QA manual PASS. J6/A4 no marcadas COMPLETADAS.

## AUTH-GUEST-REG-HISTORY-01 — Registro Guest verificado e historial

- **Estado:** COMPLETADA; implementación y QA automatizado PASS. Alan confirmó QA manual final PASS y autorizó el cierre del incremento.
- **QA manual final:** PASS confirmado por Alan: 1 reserva histórica con el mismo email verificado se vincula; N reservas compatibles con ese email se vinculan todas; email distinto → 0 links; un link de otra GuestAccount no se transfiere; Account Summary lee exclusivamente los `guest_reservation_links` persistidos.
- **Owner/rama/base:** Alan / BD1; `feature/guest-registration-verified-history`, base `6223196`; árbol inicial limpio. Sin commit/push/merge.
- **DoR/decisiones:** registro exclusivamente Guest email/password8..50 y máximo72 bytes UTF-8 reales, confirmación solo Web; sin nombre/marketing/consentimientos. Cuenta solo tras OTP8/10min/5 intentos; resend60s, 3/email/hora y 10/email/día. Login sin mínimo nuevo. Cookies/contextos separados.
- **Nueva regla aprobada:** email verificado auto-vincula todas las Reservation compatibles por bookingGuest.email trim/lowercase; sin filtro de fechas/estado/property ACTIVE. Sin transferencias; OTP manual complementario. Google nuevo reutiliza el puerto.
- **Alcance:** pending registration, evidencia verificada, provenance append-only, tres endpoints/BFF, UI OTP y F5, restore/logout Guest y mocks de datos sin autoridad auth; OpenAPI/Postman/docs/tests/migración.
- **Validación/DoD:** suites Backend/Web, clean/upgrade/checksums, contratos/generated/live, Compose y smoke sanitizado; evidencia automatizada previa conservada y cierre autorizado por QA manual final PASS de Alan.
- **Siguiente:** incremento cerrado tras QA manual PASS; cualquier publicación o trabajo adicional requiere autorización independiente. Resend alternativo conserva su limitación externa resend.dev; reglas Guest/Staff y límites intactos. Sin commit/push/merge.


### Cierre — QA manual final de Alan

**COMPLETADA** por confirmación explícita de Alan. PASS de auto-link para 1/N
reservas compatibles por el mismo email verificado; email distinto sin links;
ownership ajeno sin transferencia; Account Summary solo desde links persistidos.

Se conserva íntegra la evidencia previa de SMTP/OTP y aislamiento Staff/Guest.
Las menciones EN_QA y pendientes manuales de los registros históricos siguientes
corresponden a esos pases previos y quedan supersedidas por este cierre. No se
repitieron suites ni smoke en este pase documental. A4 mantiene su estado parcial.

### Ajuste QA posterior — SMTP Gmail detrás de EmailSender

**EN_QA**, misma rama `feature/guest-registration-verified-history`; sin
commit/push/merge. Nuevo SmtpEmailSender/SmtpEmailConfiguration y starter-mail
administrado por Spring Boot; selección PMS_EMAIL_PROVIDER=smtp/resend, default
resend. Transporte Resend intacto salvo condición de selección exclusiva.
Registro/OTP manual usan el mismo boundary sin cambios de servicios/contratos,
anti-enumeration, cuotas o migraciones. No endpoints nuevos/modificados.

SMTP valida al arrancar host/port/username/app-password/from no vacíos y puerto
válido. STARTTLS enable+required, AUTH, identidad TLS, UTF8, timeouts5/10/10s;
sin debug ni errores con causas/datos sensibles. Health del hotel no conecta
SMTP periódicamente; la entrega conserva el manejo de fallo actual del caller.
Compose transmite las variables; demo fuerza Resend/SMTP vacío. `.env` intacto;
`.env.example` y C3 documentan configuración sin credenciales.

- `./mvnw -B --no-transfer-progress verify` en Java21/PostgreSQL17 aislados:
  **743 PASS**, cero failures/errors/skipped; incluye **12 tests SMTP** con
  transporte mock y configuración sintética, sin correo real. Contratos/migraciones
  e integración Guest existentes pasan. Web no modificado; no suite Web repetida.
- Maven local limitado por escritura sandbox en `.m2`; validación trasladada a
  Docker con cache generado existente. Ownership de `backend/target` restaurado
  a1000:1000 tras finalizar; PostgreSQL efímero de pruebas retirado.
- Compose integrado config/up build/ps y demo config PASS; tres servicios healthy,
  volumen del hotel preservado. Runtime: PMS_EMAIL_PROVIDER=smtp, cinco variables
  SMTP configuradas, host/puerto coincide Gmail587; valores sensibles no expuestos.
- Smoke HTTP público/health sin envio y diff-check PASS. Gmail real no contactado
  para delivery; recepción/OTP quedan pendientes de QA manual de Alan. El bloqueo
  resend.dev anterior permanece histórico/aplicable únicamente al provider Resend.

### Ajuste QA posterior — copy neutral y salida privada Staff

**EN_QA**, sin commit/push/merge. Se elimina el párrafo introductorio Guest de
Crear cuenta y el copy202 queda condicional, sin afirmar envío realizado.
Existentes→202 genérico→0 Resend permanece intacto y no se reinvestiga.
Backend/OTP/Resend sin cambios; limitación resend.dev es bloqueo externo de QA.

Guard compartido: 401 definitivo tras refresh/retry→transición→`router.replace("/")`
y limpieza exclusiva de caches Staff. Revalidación BFF al recuperar foco de ventana,
además de visibilidad vigente; cookies compartidas, sin auth por ventana/polling.
Espera revalidación de cached null antes de decidir, evitando expulsar un login
nuevo por estado anterior. 5xx/network/DTO siguen recuperables; Guest aislado.
La decisión sustituye el guard estático anterior, conservado abajo como historial.

Validación final: `NEXT_PUBLIC_USE_MOCK_API=false npm run check` PASS
(lint/typecheck/1412 tests en250 archivos/build); Compose config/up build/ps PASS,
postgres/backend/web healthy, volumen intacto; git diff-check PASS. Backend verify
no repetido: no cambios de código Backend en este pase.

Smoke Firefox real con perfil temporal: copy retirado; login Staff→dashboard;
dos ventanas comparten sesión; logout ventana1→`/`; foco explícito en ventana2
headless→revalidación BFF→`/`; acceso directo sin sesión a dashboard/reservas/
calendario/staff-habitaciones→`/`, sin guard permanente. No registro, OTP ni correo
real enviado. Aislamiento Guest/Staff comprobado en tests.

Siguiente: repetir QA manual Alan cross-window y registro real cuando el proveedor
permita el destinatario. No cambiar reglas de seguridad para resolver resend.dev.

### Ajuste QA posterior — form state y reset LOCAL propuesto

**EN_QA**, sin commit/push/merge. Solo fix Web; Backend, límites y producción
intactos. Causa: submitted/touched se conservaban tras vaciar password/confirm
al enviar y al Volver; además el requestId SSR podía restaurarse tras tabs.
Login y registro ya tenían emails React separados. No se confirma autofill en
el perfil Firefox de Alan; perfil temporal limpio no autocompleta ni hereda.

- Reset de validación al enviar válidamente/Volver; Volver conserva solo email,
  tabs descartan restore inicial, CTA explícito login transfiere solo email.
- Web **1406 PASS /250 archivos**; focalizado **51 PASS**. Typecheck/lint/build
  `NEXT_PUBLIC_USE_MOCK_API=false` PASS. Backend verify no repetido: sin cambios
  de código Backend en este pase.
- Compose config/up `-d --build`/ps PASS, tres servicios healthy, volumen intacto.
- SQL propuesto: `qa/AUTH-GUEST-REG-HISTORY-01_LOCAL_RESET.sql`, **NO ejecutado**;
  SELECTs sin secretos, targets por email + UUID explícitos, locks, orden FK,
  lista vacía y ROLLBACK por defecto. Protege CONSUMED/evidencia verificada.
- DB local observada: 6 INVALID +5 UNKNOWN, 12 request events, 7 delivery rows.
  Solo un requestId se atribuye inequívocamente al smoke previo registrado;
  restantes requieren email/requestIds QA confirmados por Alan. UNKNOWN indica
  delivery de resultado incierto: el reset no resuelve proveedor/entrega.
- Cuota: guest_registration_request_events; delivery: guest_registration_deliveries;
  cooldown/intentos/no-op: guest_pending_registrations. No helper oficial ni
  endpoint administrativo añadido. GuestAccount Google y resto del hotel intactos.
- Tras reset autorizado local: borrar únicamente cookie pms_guest_registration,
  recargar /acceso, repetir tabs/429/OTP422/Volver/CTA login/F5 y registro OTP.
  Contextos consumidos/proof-backed conservan cuotas hasta su ventana temporal.

### Ajuste QA posterior — existentes sin Resend + botones PMS

**Estado EN_QA**, sin commit/push/merge, misma rama. Causa previa: `deliver(existing=true)` llamaba `sendExistingGuestAccessInstructions`; método y correo informativo retirados. Existentes password/Google/DISABLED mantienen202 opaco sin OTP, password hash persistido, delivery, sender/executor, credential/identity nuevas, cambios de status, sesión ni auto-link. No-op con binding INVALID conserva continuación segura para resend/verify, no challenge utilizable. Nuevo011 de request-budget/backfill mantiene cuotas/cooldown/errores indistinguibles sin inventar envíos; anteriores010/009 aplicados intactos.

- Backend verify **731 PASS**, cero fallos/errores/skipped; OpenAPI focal **13 PASS**, mismo inventario41 operaciones/31paths/41schemas/12tags, docs de comportamiento sin envíos y paridad live/generated.
- Web **1401 PASS/250 archivos**; typecheck/lint/build sin mocks PASS. Tests neutral202, CTA login sin request/email solo memoria/password vacío, focus, loading/disabled y doble-submit; anteriores Google/Guest/Staff/UTF8 conservados.
- Estilos: `Button` y helper compartido `buttonClassName` para anchors (sin controles anidados), primary/outline/ghost; tokens existentes, CTA48px, auxiliares44px, radius12px, Inter. CSS scoped de acceso sin colores arbitrarios/overrides de primary/register/google/guest, spinner duplicado ni estilos dead de consents/strength. Disabled con tokens y contraste legible, hover compartido, active/focus/reduced-motion, inputs/OTP/tabs alineados.
- Firefox real perfil temporal: Login/Create/OTP desktop1440 y tablet768; el sistema impone mínimo500px de ventana, por lo que móviles390/320 se verificaron dentro de frame same-origin con esos viewports CSS reales. Sin overflow; targets48px/radius12px/font Inter; focus-visible real por teclado solid2px en ambos viewports móviles. Capturas comparadas contra home/habitaciones/checkout vacío/cuenta demo, sin rediseño global. Guest login UI→cuenta y logout UI→acceso PASS. Capturas temporales `/tmp/pms-noop-shots`, sin correos reales ni tokens.
- Smoke integrado posterior: registration202 (solo requestId), resend202 tras61s; SQL persistencia **deliveries0 / OTP ausente / password hash ausente**. Staff y Guest login201, sesión Staff200 tras logout Guest204, logout Staff204, Google307. Prueba de ausencia de llamadas sender/executor para password/Google/DISABLED/repeated/case-insensitive en integración; ningún envío informativo ni correo real de prueba.
- Configuración runtime actual: HMAC/Resend API key/from **configurados**; no se leyeron/imprimieron valores ni se escribieron secretos. Tablas y datos previos conservados; Compose up build/ps healthy. El estado vacío registrado en el pase anterior abajo es histórico.
- Smoke nuevo con recepción Resend/OTP verify externo queda para Alan: no hay destinatario QA nuevo autorizado ni OTP proporcionado, no se envió correo de prueba arbitrario. Flujo nuevo sender/delivery/verify/linking validado en integración. Google inicio307, consentimiento interactivo pendiente.
- Siguiente: QA manual final de Alan; no marcar COMPLETADA.

### Evidencia técnica y límites de QA de AUTH-GUEST-REG-HISTORY-01

- Web final: `npm test` **1393 PASS / 250 archivos**; `npm run typecheck`, `npm run lint` y `NEXT_PUBLIC_USE_MOCK_API=false npm run build` PASS. Auth real en ambos flags verificado mediante tests; los fixtures de otros dominios reciben sesión BFF controlada exclusivamente en tests.
- Backend: PostgreSQL17/Java21 en Compose aislado `pms-guest-reg-qa`; `./mvnw -B --no-transfer-progress verify` **726 PASS, 0 fallos, 0 errores, 0 skipped**, BUILD SUCCESS (2026-10-07 21:28 UTC). Tests de registro incluyen 0/1/N, foreign profile/link, acompañantes, múltiples stays, intentos/rates/daily, colisiones, replay/binding, Google, rollback credential/link/session, concurrencia registro/verify/manual-auto/profile mutation. Migración clean/upgrade con fila OTP previa y checksums históricos PASS focalizado.
- OpenAPI live/generated: paths y components igualdad exacta PASS; **41 operaciones / 31 paths / 41 schemas / 12 tags**. Tres nuevos endpoints, schemas writeOnly/límites/binding y Postman BD1 actualizados.
- Compose integrado: config/up `-d --build`/ps PASS; postgres/backend/web healthy, puerto 127.0.0.1:3001. Volumen de datos conservado. Permisos de artefactos generados `backend/target` resueltos mediante chown solo de ese directorio; no cambios de código para ocultar el fallo del entorno.
- Smoke HTTP final: Staff login201, Guest login201, access Guest ausente401 → refresh200 → retry200; Account Summary BFF canónico200; Staff sigue200 tras refresh y logout Guest204; Staff logout204. Públicas `/`, `/habitaciones`, `/acceso`, `/cuenta`200. Inicio Google307; no se completó consentimiento/OIDC interactivo real.
- Registro real integrado devuelve503 porque **RESEND_API_KEY, RESEND_FROM_EMAIL y PMS_RESERVATION_LINK_OTP_HMAC_KEY no están configurados**. No se enviaron emails reales, no se sustituyó el proveedor productivo por uno fake y no se expusieron secretos. OTP/verify/auto-link se comprobaron con EmailSender controlado en integración. Smoke completo de cuenta nueva/OTP real/históricas debe hacerlo Alan tras configurar el entorno y un destinatario autorizado.
- **Histórico del pase previo, decisión pendiente sustituida por aprobación posterior:** BCrypt(12) conserva límite técnico72 bytes UTF-8: actualmente un valor de <=50 caracteres que exceda72 bytes devuelve400, sin truncamiento ni prehash. No se adoptó una política adicional sin decisión; consulta pendiente a Alan para resolver esta incompatibilidad técnica. Staff/hashes existentes intactos.
- OTP manual no cambia: confirmationCode + OTP reservation-specific mantiene restricciones previas de matching al email de la cuenta. Esta entrega no añade un email alternativo al request manual ni habilita vinculación cross-email. La regla nueva sustituye la obligatoriedad universal de ese flujo para las coincidencias verificadas.
- F5 durante OTP, logout Guest→`/acceso`, fallo de logout sin simular éxito, recuperación de5xx y aislamiento se verificaron automatizadamente. Navegación visual/browser y QA manual de Alan siguen pendientes; no declaradas PASS por el smoke HTTP.
- No commit/push/merge. No marcar COMPLETADA. Siguiente: configurar proveedor/HMAC, resolver72 bytes y realizar QA manual con 0/1/N reservas y Google real.

### Pase posterior aprobado — 72 bytes UTF-8 y preparación OTP real

Estado **EN_QA**, misma rama, sin commit/push/merge. La consulta BCrypt previa queda resuelta por decisión explícita de Alan: registration8..50 caracteres y máximo72 bytes UTF-8; login sin mínimo8, máximo50 caracteres y72 bytes. Backend usa `getBytes(StandardCharsets.UTF_8)`; Browser/BFF `TextEncoder`. No trim, lowercase, normalización, prehash ni truncamiento. BCrypt(12) intacto. Registro byte overflow400; acceso canónico/Backend401 con credenciales genéricas antes de lookup/BCrypt. Se conserva el boundary400 genérico de input del POST Staff BFF previo, sin cambios de su implementación.

Validación de este pase: Backend **728 PASS, 0 fallos/errores/skipped**, verify BUILD SUCCESS (2026-10-07 21:43 UTC); Web **1399 PASS/250 archivos**; typecheck/lint/build sin mocks/diff-check PASS. Compose reconstruido, postgres/backend/web healthy; OpenAPI live/generated paths/components PASS. Smoke byte-limit canonical/login Backend401 genérico para known/unknown, registration BFF400, sin cookies. OTP real sigue bloqueado por configuración; no QA manual declarada PASS.

Tests nuevos: 72/75 bytes con caracteres de3 bytes; 72/74 con2 bytes; emoji72/76; NFC/decomposed y espacios conservados; rechazo Browser/BFF antes de transporte; cuentas conocidas/desconocidas con mismo error; OpenAPI documenta bytes sin cambiar maxLength50. El fixture de stays de la prueba de acompañantes ahora crea/elimina su propio RoomType: no depende de datos que deje otro test, sin tocar lógica de producto ni dataset demo.

#### Configuración local: inspección sin secretos

No se abrió `.env` ni se imprimieron valores: se clasificó únicamente presencia/vacío en los procesos de contenedores.

| Variable | Estado runtime | Uso |
|---|---|---|
| PMS_RESERVATION_LINK_OTP_HMAC_KEY | vacía | HMAC registration con separación de propósito; mínimo32 bytes de clave; también OTP manual |
| RESEND_API_KEY | vacía | Authorization server-side contra Resend |
| RESEND_FROM_EMAIL | vacía | from literal que Backend envía al proveedor |
| PMS_JWT_SECRET | configurada | Firma Guest session al verify; configuración existente |
| PMS_WEB_PUBLIC_URL | configurada | Origin BFF; localhost:3001 canónico |
| PMS_BACKEND_INTERNAL_URL | configurada | Transporte BFF→Backend |
| GOOGLE_CLIENT_ID | configurada | Google Guest |
| GOOGLE_CLIENT_SECRET | configurada | Google Guest |
| GOOGLE_REDIRECT_URI | configurada | Solo Google; callback canónico `/api/auth/guest/google/callback` |

No existe flag de provider para registration: ResendEmailSender está registrado siempre; OTP es8 dígitos introducido en UI y no requiere callback/webhook/email-link propio. Backend espera `pms.resend.from-email` mapeado desde RESEND_FROM_EMAIL, sin fallback automático.

- HMAC ausente/corto: POST registration503 (estado actual).
- HMAC listo pero API key/from ausentes o rechazo proveedor: POST202 persiste pending; entrega asíncrona falla, estado UNKNOWN, no cuenta utilizable; verify422 genérico. El rechazo del proveedor no cambia anti-enumeration. 202 no garantiza envío. Resend se puede reintentar después de configurar, sujeto a cuotas/expiry.
- No hay remitente local configurado que validar. `onboarding@resend.dev` permite desarrollo exclusivamente hacia el email asociado a la cuenta Resend; otros destinatarios/aliases requieren dominio remitente verificado. [Resend oficial](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Alan puede configurar temporalmente la misma terminal, sin escribir secretos al repo:

```bash
export PMS_RESERVATION_LINK_OTP_HMAC_KEY="$(openssl rand -hex 32)"
read -rsp 'RESEND_API_KEY: ' RESEND_API_KEY
printf '\n'
export RESEND_API_KEY
export RESEND_FROM_EMAIL='PMS QA <onboarding@resend.dev>'
export NEXT_PUBLIC_USE_MOCK_API=false
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

Usar key real creada en Resend con permiso de envío; no una cadena sintética para RESEND_API_KEY. Para múltiples inbox/aliases controlados usar remitente del dominio verificado. Mantener HMAC estable durante QA: regenerarla invalida verificadores pendientes. No ejecutar `docker compose config` sin `--quiet` ni imprimir env. No se generaron/aplicaron secretos automáticamente ni se enviaron emails en este pase.

#### Datos 0/1/N — propuesta, NO ejecutada

Inspección PostgreSQL local: **0 reservations, 0 guest_profiles, 0 grupos de email sin reclamar**. Bootstrap demo crea catálogo/inventario/cuentas, no reservas históricas. No existe endpoint REST confirmado para crear GuestProfile/Reservation header ni POST público bookings; los comandos/services de Juan no equivalen a API.

Para A usar correo nuevo controlado sin reservas. Para B/C proponer fixtures explícitos únicamente en DB QA desechable o copia aislada: un GuestProfile sin GuestAccount y1 o3 Reservation headers que lo referencien como booking_guest_id. No insertar links/proof, no modificar reservas ajenas, pagos, ATS o código booking. Usar distintos correos nuevos recibibles, <=50; no borrar cuentas/links append-only para reutilizar una dirección.

Plantilla para que Alan ejecute manualmente SOLO en la DB QA elegida (no ejecutada por Codex): abrir psql interactivo con ON_ERROR_STOP y usar datos ingresados localmente. Si decide usar el stack local de desarrollo actual: `docker compose --env-file .env exec postgres psql -U pms_app -d pms_hotel -v ON_ERROR_STOP=1`; revisar primero que sea DB de desarrollo/QA.

```sql
\prompt 'Correo QA nuevo y controlado: ' qa_email
\prompt 'Cantidad (1 o 3): ' qa_count
BEGIN;
SELECT NOT EXISTS (
  SELECT 1 FROM guest_accounts
  WHERE lower(btrim(email))=lower(btrim(:'qa_email'))
) AS qa_new_account \gset
\if :qa_new_account
WITH property AS (
  SELECT id FROM properties WHERE code='HB-GT-DEMO'
), profile AS (
  INSERT INTO guest_profiles
    (id,property_id,first_name,last_name,email,status,created_at,updated_at)
  SELECT gen_random_uuid(),id,'QA','GuestHistory',
    lower(btrim(:'qa_email')),'ACTIVE',now(),now() FROM property
  RETURNING id,property_id
), candidates AS (
  SELECT gen_random_uuid() AS id,p.id AS booking_guest_id,p.property_id
  FROM profile p CROSS JOIN generate_series(1,:'qa_count'::integer)
)
INSERT INTO reservations
  (id,property_id,booking_guest_id,confirmation_code,status,currency,
   source_channel,source_reference,created_at,updated_at)
SELECT id,property_id,booking_guest_id,
  'QH'||substr(replace(id::text,'-',''),1,12),'PENDING','GTQ',
  'QA_GUEST_HISTORY','AUTH-GUEST-REG-HISTORY-01 QA',now(),now()
FROM candidates;
COMMIT;
\else
ROLLBACK;
\echo 'Correo ya registrado: usar otro correo controlado.'
\endif
```

Confirmar INSERT count1/3 y existencia de HB-GT-DEMO antes de probar. No stays en esta plantilla: summary linkedReservationsCount debe ser1/3; upcomingStay puede sernull y no se espera listado completo. Los fixtures se descartan con la DB QA, sin UPDATE/DELETE de links. Esta preparación no implementa ni altera booking de Juan.

#### QA manual A–N

Base `http://localhost:3001`. Preparación: proveedor listo, direcciones nuevas controladas según restricción Resend, mocks de datos false, DevTools Network con Preserve log. HMAC estable. Cuotas por email:3 envíos/hora,10/día; cooldown60s, OTP10min, continuación30min y5 intentos. Separar correos/casos o esperar cuotas; no resetear DB para saltarse límites. Antes de A–G/L/M/N cerrar sesiones Guest/Staff por sus flujos UI; K establece coexistencia de forma controlada.

Regla S para **cada** caso: compartir únicamente nombre del caso, PASS/FAIL, URL, método/status, mensaje seguro y count esperado. **NO compartir OTP, passwords, JWT, cookies, binding, API keys, headers/body sensibles, correos reales ni HAR sin sanear.** Resend dashboard/email solo revisión local; no capturas del OTP. Backend201 tokens NO se inspeccionan desde JavaScript.

| Caso / URL | Acción exacta | Esperado | Network (sin compartir secretos; regla S) |
|---|---|---|---|
| A `/acceso`→`/cuenta` | Crear cuenta con correo nuevo sin fixtures, password8..50/max72bytes y confirmación exacta; copiar OTP recibido y verificar | OTP view tras202; éxito lleva a cuenta y count0 | POST `/api/auth/guest/registrations`202 UUID únicamente; POST `/verify`200 `{authenticated:true,context:GUEST}`; GET `/api/auth/guest/session`200 y `/api/auth/guest/account/summary`200 count0 |
| B `/acceso`→`/cuenta` | Preparar1 header con bookingGuest email igual; registrar usando mixed case y verificar | Link automático sin confirmationCode; count1 | Mismos202/200/summary200; linkedReservationsCount1; sin requests reservation-link manual |
| C `/acceso`→`/cuenta` | Preparar3 headers para otro correo nuevo; registrar y verificar | Count3, un link por Reservation; no historial completo prometido | Summary200 linkedReservationsCount3; antes de verify no candidates/counts |
| D `/acceso` OTP | En pending nuevo introducir8 dígitos diferentes del OTP recibido; repetir hasta5 si se prueba bloqueo | Error seguro, sin sesión; quinto bloquea, OTP correcto posterior falla | POST `/verify`422; no cookies Guest aplicadas ni summary autorizado |
| E `/acceso` OTP | Esperar más de10min desde envío, menos de30min de contexto; enviar código anterior | Expirado/invalid genérico, no signed-in; resend sujeto a cuota | POST `/verify`422; no sesión nueva |
| F `/acceso` OTP | Tras registro observar botón/cooldown; esperar60s, Reenviar; intentar código anterior y luego nuevo recibido | Reenvío202; anterior422; nuevo éxito; intentos anteriores conservados | POST `/resend`202; verify anterior422, nuevo200. Intento anticipado por request existente repetido <60s devuelve429; cuarto envío/hora429 |
| G `/acceso` OTP | F5 antes de verify; no reintroducir password; verificar con correo recibido | OTP view restaurada; continuación revalidada en Backend | GET `/acceso`200; no POST registration repetido al cargar; verify200 con contexto cookie HttpOnly; ningún storage con credentials |
| H `/cuenta`→`/acceso` | Cerrar sesión Guest | Solo Guest sale; destino acceso | DELETE `/api/auth/guest/session`204 antes de navegación; si503 conservar ruta/sesión y permitir retry |
| I `/acceso`→`/cuenta` | Login con email/password exactos de A; sin min8 nuevo para credenciales previas | Guest válido; summary conserva links | POST `/api/auth/login`201 `{authenticated:true,context:GUEST}`; sesión/summary200 |
| J `/cuenta` | F5 autenticado; opcional esperar access TTL vigente para restauración | Cuenta se conserva/restaura, sin falso signed-out | GET session200; si401: POST guest/refresh200 una vez, retry session200 una vez. 5xx muestra error recuperable |
| K `/acceso`, `/dashboard`, `/cuenta` | Iniciar pending Guest en tab1. Tab2 `/acceso`, elegir Iniciar sesión y acceder Staff. Verificar Guest en tab1. F5 dashboard tab2. Logout Guest tab1; comprobar Staff. Re-login Guest y logout Staff tab2 | Coexistencia; Guest logout→acceso conserva Staff; Staff logout→/ conserva Guest | GET Staff session200 después de verify/logout Guest; GET Guest session200 después de logout Staff. DELETE por contexto204; cookies/caches ajenos intactos |
| L `/acceso`→Google→`/cuenta` | Google desde cualquiera de los tabs con cuenta controlada; nueva sin colisión para auto-link | OIDC real, sin OTP adicional; cuenta nueva auto-link según fixtures. Cuenta password previa con ese email no se fusiona | GET `/api/auth/guest/google`307; callback redirect y sesión/summary200 tras consentimiento válido. Colisión: error seguro, no500 ni overwrite |
| M `/acceso` Crear cuenta | Repetir registro con email ya usado en A; otra password | Mismo202 y copy genérico; no OTP ni correo informativo; no overwrite | Registration202 UUID; verify con código arbitrario422. Login password original201; sin409/email-exists/counts |
| N `/acceso` | En Crear cuenta usar25 caracteres `界` (25chars/75bytes) y confirmación igual; probar también Iniciar sesión conocido/desconocido | Registro muestra error multibyte, sin enviar; login error genérico. 24 `界` son72bytes y válidos para registro | UI: ningún POST registro/login en rechazo local. BFF forzado: registration400 y acceso canónico401; Backend mismo400/401, nunca500. maxLength sigue50 |

Detalle: éxito Web verify200 frente a Backend201 es el contrato BFF actual. No pedir confirmationCode en B/C; summary es autoridad persistida. Los estados expired/bloqueado comparten422 y copy segura: UI no distingue información privada.

### Archivos de este incremento (incluidos ajustes QA posteriores)

- `backend/docs/10_GUEST_AUTH_CONTRACT_C3.md`
- `backend/docs/30_BD1_HISTORICAL_RESERVATION_OTP_CONTRACT_PROPOSAL.md`
- `backend/docs/31_BD1_HISTORICAL_RESERVATION_OTP_BACKEND_QA.md`
- `backend/docs/42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md`
- `backend/docs/44_UNIFIED_LOGIN_CONTRACT_QA.md`
- `backend/docs/AlanHandoff.md`
- `backend/docs/AlanPlan.md`
- `backend/postman/BD1-Backend-APIs.postman_collection.json`
- `backend/src/main/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiConfiguration.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiSchemaConfiguration.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/infrastructure/security/PasswordLoginValidator.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/infrastructure/security/SecurityConfiguration.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/api/GuestLoginRequest.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAuthService.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestAuthServiceImpl.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/domain/GuestAccount.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/infrastructure/email/EmailSender.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/infrastructure/email/ResendEmailSender.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/securityauth/api/StaffLoginRequest.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/securityauth/api/UnifiedLoginRequest.java`
- `backend/src/main/resources/db/changelog/003ServiceSecurityAuth/db.changelog.yaml`
- `backend/src/main/resources/db/changelog/004ServiceReservations/db.changelog.yaml`
- `backend/src/test/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiContractIntegrationTests.java`
- `backend/src/test/java/com/pms/hotelboutique/backend/infrastructure/security/UnifiedLoginIntegrationTests.java`
- `backend/src/test/java/com/pms/hotelboutique/backend/infrastructure/security/UnifiedLoginMigrationIntegrationTests.java`
- `backend/src/test/java/com/pms/hotelboutique/backend/modules/reservations/PublicBookingReceiptSchemaUpgradeTests.java`
- `backend/src/test/java/com/pms/hotelboutique/backend/modules/securityauth/StaffAuthAuditAppendOnlyIntegrationTests.java`
- `backend/src/test/java/com/pms/hotelboutique/backend/modules/securityauth/StaffAuthAuditAttributionIntegrationTests.java`
- `backend/src/test/resources/db/changelog/db.changelog-before-bd2.yaml`
- `backend/src/test/resources/db/changelog/db.changelog-before-bd3.yaml`
- `backend/src/test/resources/db/changelog/db.changelog-before-public-booking-receipts.yaml`
- `backend/src/test/resources/db/changelog/db.changelog-before-staff-auth-audit-append-only.yaml`
- `backend/src/test/resources/db/changelog/db.changelog-before-staff-auth-audit-attribution.yaml`
- `backend/src/test/resources/db/changelog/db.changelog-before-unified-login.yaml`
- `frontend/pms-hotel-web/docs/13_AUTH_AND_SESSIONS.md`
- `frontend/pms-hotel-web/docs/49_PUBLIC_02_IDENTITY_ACCESS.md`
- `frontend/pms-hotel-web/docs/51_PUBLIC_02_EXISTING_RESERVATION_LINK.md`
- `frontend/pms-hotel-web/src/app/(public)/acceso/guest-identity-access.tsx`
- `frontend/pms-hotel-web/src/app/(public)/acceso/page.tsx`
- `frontend/pms-hotel-web/src/app/api/auth/auth-routes.test.ts`
- `frontend/pms-hotel-web/src/app/api/auth/guest/refresh/route.ts`
- `frontend/pms-hotel-web/src/app/api/auth/guest/session/route.ts`
- `frontend/pms-hotel-web/src/app/api/auth/login/route.test.ts`
- `frontend/pms-hotel-web/src/app/api/auth/login/route.ts`
- `frontend/pms-hotel-web/src/data/mocks/server.ts`
- `frontend/pms-hotel-web/src/lib/login-input.test.ts`
- `frontend/pms-hotel-web/src/lib/login-input.ts`
- `frontend/pms-hotel-web/src/modules/account/components/account-dashboard-page.tsx`
- `frontend/pms-hotel-web/src/modules/account/components/public-account.test.tsx`
- `frontend/pms-hotel-web/src/modules/account/components/reservation-link-page.test.tsx`
- `frontend/pms-hotel-web/src/modules/account/components/reservation-link.test.tsx`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-access-page.module.css`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-access-page.test.tsx`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-access-page.tsx`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-real-session.test.tsx`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-registration-form.tsx`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-session-check.tsx`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-session-provider.tsx`
- `frontend/pms-hotel-web/src/modules/auth/hooks/use-guest-session-controller.ts`
- `frontend/pms-hotel-web/src/modules/auth/model/guest-registration.ts`
- `frontend/pms-hotel-web/src/modules/auth/service/guest-session.service.ts`
- `frontend/pms-hotel-web/src/modules/auth/service/unified-login.service.test.ts`
- `frontend/pms-hotel-web/src/modules/auth/service/unified-login.service.ts`
- `frontend/pms-hotel-web/src/modules/checkout/components/public-checkout-review-page.test.tsx`
- `frontend/pms-hotel-web/src/modules/checkout/components/public-guest-data-page.test.tsx`
- `frontend/pms-hotel-web/src/modules/checkout/components/public-real-checkout.test.tsx`
- `frontend/pms-hotel-web/src/shared/components/button/button.tsx`
- `frontend/pms-hotel-web/src/shared/components/button/index.ts`
- `backend/src/main/java/com/pms/hotelboutique/backend/infrastructure/security/PasswordLoginExceptionHandler.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/api/GuestRegistrationController.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/api/GuestRegistrationExceptionHandler.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestRegistrationException.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/GuestRegistrationService.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/VerifiedEmailHistoryPort.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/guestauth/application/VerifiedEmailHistoryService.java`
- `backend/src/main/java/com/pms/hotelboutique/backend/modules/reservations/application/VerifiedEmailHistoryAdapter.java`
- `backend/src/main/resources/db/changelog/003ServiceSecurityAuth/010-guest-registration.yaml`
- `backend/src/main/resources/db/changelog/003ServiceSecurityAuth/011-guest-registration-request-quota.yaml`
- `backend/src/main/resources/db/changelog/004ServiceReservations/009-verified-email-history.yaml`
- `backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/GuestRegistrationIntegrationTests.java`
- `backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/GuestRegistrationMigrationIntegrationTests.java`
- `backend/src/test/resources/db/changelog/db.changelog-before-guest-registration.yaml`
- `frontend/pms-hotel-web/src/app/api/auth/guest/registrations/resend/route.ts`
- `frontend/pms-hotel-web/src/app/api/auth/guest/registrations/route.ts`
- `frontend/pms-hotel-web/src/app/api/auth/guest/registrations/verify/route.ts`
- `frontend/pms-hotel-web/src/lib/bff/guest-registration.test.ts`
- `frontend/pms-hotel-web/src/lib/bff/guest-registration.ts`
- `frontend/pms-hotel-web/src/modules/auth/components/guest-registration-form.test.tsx`
- `frontend/pms-hotel-web/src/modules/auth/dtos/guest-registration.dto.ts`
- `frontend/pms-hotel-web/src/modules/auth/hooks/use-guest-registration.ts`
- `frontend/pms-hotel-web/src/modules/auth/mappers/guest-registration.mapper.ts`
- `frontend/pms-hotel-web/src/modules/auth/service/guest-registration.service.ts`
- `frontend/pms-hotel-web/src/modules/auth/service/guest-session.service.test.ts`
- `frontend/pms-hotel-web/src/test/guest-session-fixture.ts`

## Reserva pública — A4: Security pre-J6 (entrega parcial)

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

## Juan / J6 — A4 confirmado con Alan; preparación de commit (2026-10-07)

- **Decisión explícita:** usuario mantiene A4 con Alan. J6 se entrega con
  integración pendiente; no modificar SecurityConfiguration, configuración
  OpenAPI global ni OpenApiContractIntegrationTests. QA manual sigue pendiente;
  J3/J1/J2/J5/J4/J6 conservan EN_QA, sin declarar COMPLETADA.
- **Rama / alcance:** feature/backend-public-booking-core, base `738d428`.
  Preparar commit independiente `feat(public-booking): expose public booking endpoint`
  con solo los ocho archivos autorizados J6: controller/advice, metadata de
  Request/View, tests HTTP/OpenAPI y entradas propias de plan/handoff. Preservar
  los cuatro documentos untracked ajenos y el historial de Alan.
- **Evidencia vigente:** código sin cambios desde QA: focalizados61 PASS,
  verify766 con765 PASS/1 failure global de audiencia/0 errors/skipped;
  package separado PASS y JAR generado; Java21.0.9/Maven3.9.11/PostgreSQL17.11.
  diff --check/alcance revisados. No reejecutar suite por esta decisión documental.
- **Entrega a A4:** abrir solo matcher POST booking y cerrar audiencia/paridad
  global. Al habilitarlo, actualizar la prueba J6 que documenta el401 actual y
  habilitar filtros en PublicBookingHttpIntegrationTests para acreditar HTTP
  anónimo con seguridad real. Revalidar verify, Swagger, vecinos Staff protegidos
  y QA integral/manual. PR138 ya MERGED; no crear otro PR sin nueva instrucción.
- **Siguiente:** reportar hash del commit parcial y resultado integral FAIL;
  pedir autorización de push exclusivamente a la rama actual y detenerse.

## Juan / J6 — endpoint HTTP: entrega parcial EN_QA (2026-10-07)

- **Estado / rama:** EN_QA, Juan / BD3; feature/backend-public-booking-core,
  base `738d428`; código J6 implementado, integración A4 y QA manual pendientes.
  Sin commit/push. Cuatro untracked ajenos preservados; historial previo intacto.
- **Entregado:** POST exclusivo, header obligatorio, HTTP201 para creación/replay,
  DTOs existentes sin campos nuevos, solo SIMULATED_CARD; advice exclusivo con
  códigos 400/404/409/422/500 aprobados y mensajes sanitizados. Delegación J4 y
  snapshot persistida; metadata Swagger local, sin configuración global ajena.
- **Pruebas propias:** mvn -B --no-transfer-progress
  -Dtest=PublicBookingHttpIntegrationTests,PublicBookingOpenApiIntegrationTests test:
  61 PASS, 0 failures/errors/skipped (56 HTTP/PG y 5 OpenAPI/seguridad). HTTP/PG
  usa addFilters=false exclusivamente en su contexto: no acredita POST anónimo
  productivo. Prueba separada con filtros confirma el 401 actual y vecinos protegidos.
- **Verify integral:** mvn -B --no-transfer-progress verify: 766 tests,
  765 PASS, 1 failure, 0 errors/skipped, BUILD FAILURE. Única falla:
  OpenApiContractIntegrationTests.securitySchemesAndEveryOperationAudienceMatchTheActualTransport,
  línea118: expected staff / actual public para booking. Paridad paths/mappings
  y pruebas restantes PASS. No editar ni excluir prueba global asignada a A4.
- **Compilación / evidencia:** mvn -B --no-transfer-progress -DskipTests package
  PASS, JAR generado; solo comprobación separada de compilación/empaquetado,
  verify sigue FAIL. Java21.0.9/Maven3.9.11/PostgreSQL17.11, Compose J6 aislado sin
  puertos. Logs focalizados/verify/package, surefire-reports J6 y OpenAPI generado
  conservados en target ignorado. diff --check y alcance PASS.
- **Validaciones:** IDs/fechas reales, un padre y cantidad exacta de stays con
  roomId NULL, SIMULATED/APPROVED/reference sintética y snapshot PostgreSQL;
  requests/keys y campos de tarjeta rechazados, precio/stock/pago/404/config,
  replay/payload alterado, no duplicados, rollback tras flush y concurrencia HTTP
  PASS. Primera pasada falló solo una aserción propia de schema: corregida para
  admitir exclusiveMinimum=0 (quantity > 0 en OAS3.1), sin cambiar validación J3.
- **Bloqueo / decisión:** DOCX A4 reserva matcher anónimo y paridad global a Alan.
  J6 local declara public; matcher vigente devuelve401 y assertion global asume
  staff. Usuario debe decidir A4 por Alan o excepción mínima explícita para
  SecurityConfiguration y prueba global. Detener integración; no atribuir QA manual
  PASS ni cerrar DoD/COMPLETADA. PR138 MERGED; ningún PR adicional creado.

## Juan / J6 — endpoint HTTP: inicio (2026-10-07)

- **Estado / rama:** EN_PROGRESO, Juan / BD3; feature/backend-public-booking-core,
  base `738d428`; sin cambios rastreados iniciales, cuatro untracked ajenos intactos.
- **Autorización / contrato:** usuario autorizó J6 y aprobó explícitamente 201
  para creación/replay y 500 para BOOKING_FAILED. DOCX mantiene los demás DTOs y
  códigos. J3/J1/J2/J5/J4 siguen EN_QA; no atribuir QA manual PASS.
- **Alcance:** POST booking, header obligatorio, DTOs existentes/SIMULATED_CARD,
  delegación PublicBookingService, advice sanitizado exclusivo y Swagger local;
  pruebas propias HTTP/PostgreSQL/OpenAPI. Sin contratos nuevos, migraciones,
  dependencias, cambios legacy ni Security/OpenAPI global de Alan.
- **Dependencia / límite:** DOCX A4 asigna a Alan matcher público y paridad global.
  POST actualmente requiere autenticación; assertion global OpenAPI solo reconoce
  availability pública. No ocultar ese gap ni presentar tests sin filtros como
  acceso anónimo productivo. PR #138 MERGED (`6223196` en main remoto); no PR nuevo.
- **Siguiente:** validar J6 con Java21/PostgreSQL17 y reportar evidencia/limitaciones;
  resolver A4 con su owner si impide verify o QA HTTP integral. Sin push automático.

## AUTH-UNIFIED-01 — Cierre COMPLETADA (2026-10-06)

- **Estado final:** EN_QA → COMPLETADA. Alan confirmó QA manual PASS en
  http://localhost:3001 y aprobó explícitamente el incremento.
- **Aceptación manual:** Staff demo, qa_staff SUPER_ADMIN y Guest demo PASS;
  dashboard Staff, aislamiento Guest/Staff y F5/restauración PASS; logout desde
  dashboard/calendario→`/` y Atrás sin recuperar sesión Staff PASS; email formato/
  maxLength50, password maxLength50, Google Guest completo, continuar como invitado
  y puerto canónico localhost:3001 PASS.
- **DoD técnico registrado:** Backend verify478 PASS; Web1323/242 archivos PASS;
  logout focalizados23 PASS; typecheck/lint/build sin mocks/diff-check PASS.
  OpenAPI paridad PASS, 38ops/28paths/37schemas/11tags. Compose y Firefox PASS;
  Web127.0.0.1:3001 único puerto publicado, Backend/PostgreSQL internos.
- **Rama/alcance:** feature/auth-unified-login-port-standardization, base main
  2e387a3 PR #133; cierre solo documental. Funcionalidad y cambios previos
  preservados; sin commit/push/merge. Registro/recuperación/cambio password/MFA
  siguen fuera del incremento. Detalle: [guía44](44_UNIFIED_LOGIN_CONTRACT_QA.md).
- **Siguiente:** esperar autorización explícita para una nueva tarea o publicación.
  Sin bloqueos pendientes para cerrar AUTH-UNIFIED-01.

Las entradas anteriores de AUTH-UNIFIED-01 conservadas a continuación son historial
de entrega. Sus estados EN_QA y QA manual pendiente describen ese momento y quedan
sustituidos por este cierre COMPLETADA, incluido el PASS de Google Guest completo.

## AUTH-UNIFIED-01 — Logout Staff a Home (2026-10-06), EN_QA

- Causa: mutation confirmaba logout y publicaba null, pero no navegaba; guard
  privado mostraba sesión requerida en la ruta actual. Ahora espera BFF, limpia
  sesión/cancela caches Staff relevantes y router.replace("/"). Estado de salida
  evita guard durante transición; failure conserva sesión/ruta. Sin cambiar guard
  ni Backend/BFF/contratos, sin refresh innecesario, Guest independiente intacto.
- Archivos: staff-session-provider.tsx, nuevo staff-logout-navigation.test.tsx,
  fixtures RouterContext de staff-session-provider.test.tsx y dashboard/auth-regression
  actualizados; WebAuth/guía44/AlanPlan/Handoff. Seis regresiones nuevas; focalizados23
  PASS; npm test1323/242 PASS, typecheck/lint/diff-check PASS.
- Docker reconstruido3 healthy, solo Web3001. Firefox real desde calendario y
  dashboard: URL exacta http://localhost:3001/, sin guard en Home, history.length
  estable (replace), Atrás a ruta privada guard/Staff401, Guest coexistente200
  preservado. Acceso directo calendario sin auth continúa guard sin redirigir.
- Evidencia sanitizada /tmp/pms-logout-{focused,web-suite,typecheck,lint,compose,browser}.log
  y browser-results.json. Stack disponible; EN_QA hasta Alan manual PASS.
  Misma rama, cambios previos/.env preservados, sin commit/push/merge.

## AUTH-UNIFIED-01 — Límites finales 50/50 (2026-10-06), EN_QA

- Decisión final de Alan sustituye email320/password256 por máximo50 en login
  Staff/Guest/fachada: email required/formato/trim/lowercase; password required/
  NotBlank, intacta, sin complejidad nueva. HTML50, validación Browser/BFF compartida,
  DTOs50 y boundary directo de servicios. Patrón email común evita divergencia
  detectada con @Email por defecto (dominio con guion bajo); sin rejected credentials.
- Persistencia intacta: email varchar320, password_hash varchar255, hashes60;
  BCryptPasswordEncoder(12) sin cambios, sin nueva migración ni tocar aplicadas.
  DTO/password writeOnly y toString redactado; registro/recuperación siguen excluidos.
- Pruebas: Web focalizados207 PASS; Backend login/OpenAPI25 PASS y auth/auditoría57
  PASS en pasada previa. Verify final478 PASS, cero failures/errors/skipped;
  npm test final1317/241 archivos PASS; typecheck/lint/build sin mocks PASS.
  Un timeout de carrito durante builds concurrentes: rerun aislado15 PASS y suite
  final completa PASS; sin ampliar timeouts ni modificar pruebas ajenas.
- Docker final up --build/ps PASS, 3 healthy, solo Web127.0.0.1:3001. Firefox real
  confirma max50 y bloqueo del carácter51 con teclas; formato/50 exacto, BFF51→400;
  Staff demo, Guest demo y qa_staff login/destino/F5/logout PASS. Restores Staff
  con refresh válido acotados; Guest/Staff401 cruzados aislados. Invitado conserva
  carrito real sin crear sesión. qa_staff sigue ACTIVE/SUPER_ADMIN, hash60 intacto.
- OpenAPI runtime/generado paths/components idénticos: 38ops/28paths/37schemas/11tags;
  los tres inputs max50/formatemail/password/writeOnly PASS. Backend directo51 y
  formato inválido→400; 50 normalizado desconocido→401, pasa validación. Google
  Guest start307/state/nonce/PKCE/callback3001 sin Staff cookies; regresiones OIDC
  automatizadas PASS, callback con cuenta Google real pendiente de manual Alan.
- Documentación/7 colecciones Postman alineadas. Evidencia sanitizada en
  /tmp/pms-limits-{focused-web,final-focused-backend,backend-verify,web-suite,
  typecheck,lint,build,compose,browser,cart-rerun}.log y openapi-live.json.
  Rama actual preservada, .env intacto, sin commit/push/merge. EN_QA hasta Alan PASS.

## Cuenta qa_staff integrada — autorización de Alan (2026-10-06)

- Creada en BD del Compose raíz: qa_staff@example.test, ACTIVE/SUPER_ADMIN;
  membership organización demo + property HB-GT-DEMO activas. No modifica la
  cuenta del QA aislado ni .env ni bootstrap/migraciones/código del proyecto.
- BCryptPasswordEncoder(12) existente, alta transaccional y evento append-only
  STAFF_BOOTSTRAP_CREATED, SYSTEM/ORGANIZATION, local_qa_provisioning.
- Verificación http://localhost:3001: login201 STAFF, session200 SUPER_ADMIN,
  STAFF_MANAGE y membership demo confirmadas; logout de sesión de prueba204.
  Credencial QA sintética y persistencia local documentadas en guía44.
- AUTH-UNIFIED-01 permanece EN_QA; sin commit/push/merge.

## AUTH-UNIFIED-01 — Corrección QA Web Staff (2026-10-06), EN_QA

- **Hallazgo reproducido en Firefox:** login201; session Staff200 con permiso
  SERVICE_REQUEST_INTAKE; Guest401; UI «Sesión Staff requerida». El mapper Web
  rechazaba ese permiso existente en 003/006 y el guard etiquetaba cualquier error
  como ausencia de sesión. Guest401 es correcto sin cookie Guest; no compartían
  query key ni estado. No cambios adicionales de código Backend ni migraciones.
- **Corrección:** mapper contractual; query Staff compartida entre acceso/guard,
  separada de Guest; null solo tras 401 definitivo, mapping inválido error de carga,
  cache válido conservado en refetch/transporte; logout cancela lecturas y limpia
  solo cache Staff. Restauración existente un refresh/retry reutilizada desde ambas
  entradas, con rotación concurrente única y cancelación. BFF Staff no-store,
  Backend5xx→503, sin convertirlo en401 ni emitir logout global desde BFF401.
- **F5:** reproducción inicial con access válido devolvió200 y aun así guard falló
  por mapper. No se confirmó el motivo del primer401 del caso manual original.
  En Firefox se retiró solo access (refresh conservado): F5→session401→refresh200
  una vez→session200→dashboard visible, sin focus. Sin refresh, bloquea y termina.
- **Validación:** 24 regresiones nuevas; auth/providers/dashboard focalizados170
  PASS; npm test1280/239 archivos PASS; typecheck/lint/build sin mocks PASS.
  Compose config/up --build PASS; 3 servicios healthy, solo Web127.0.0.1:3001.
  Firefox real PASS login/dashboard, Guest401 aislado, F5 válido, focus,
  restauración acotada y logout/F5 bloqueado. git diff --check PASS.
- **Límites:** UI/Backend/OpenAPI email max50 y password max50 confirmados;
  password sin normalización ni complejidad de login. El dashboard monta identidad
  y scope, pero las métricas siguen usando el contrato fixture Private09 y muestran
  error de datos en modo real; no es fallo de sesión y queda fuera de esta corrección.
  Google completo y cierre manual de Alan pendientes; estado permanece EN_QA.
- **Evidencia sanitizada:** /tmp/pms-staff-{auth-focused,web-tests,typecheck,lint,
  build,compose-up,browser-before,browser-after}.log; secuencias HTTP en
  /tmp/pms-staff-browser-{before,after}.json, captura dashboard-fixed.png.
  Sin commit/push/merge; cambios previos y .env preservados.

## AUTH-UNIFIED-01 — Entrega EN_QA (2026-10-06)

- **Estado:** EN_QA; implementación y QA técnico PASS, QA manual Alan pendiente.
  Rama feature/auth-unified-login-port-standardization desde main 2e387a3 PR #133,
  actualizado/limpio antes de iniciar; sin commit/push/merge.
- **Modelo/contrato:** [44](44_UNIFIED_LOGIN_CONTRACT_QA.md). StaffUser conserva
  username/workEmail/passwordHash, roles/permisos/memberships/scope y sesiones;
  GuestAccount/GuestIdentity Google independientes. No identidad central por roles.
  Email trim/lowercase/max50 + password universal; GuestPasswordCredential 1:1
  hash BCrypt(12), mismas sesiones/refresh Guest. Google-only sin password falla
  genéricamente. Fachada valida ambos passwords antes de revelar contexto; ambos
  válidos exigen selección/revalidación, sin crear sesión durante discovery.
- **Web/BFF:** /acceso único con Header/Footer público, correo/password, Google
  Guest y continuar como invitado sin crear sesión/limpiar carrito. Cookies
  pms_staff_* / pms_guest_* existentes, HttpOnly/Secure/SameSite preservados;
  sin tokens raw en JS. Login pms_session sintético y formularios de registro
  sin consumidores retirados. Errores de entrada Backend sanitizados sin rejected
  values; toString de requests redactado. Origen BFF público correcto en Docker y
  retorno checkout único durante hidratación Guest comprobados por regresiones.
- **Persistencia/demo:** nuevo changeset 003-auth-unified-password-009 (Credential
  Guest e índice Guest normalizado); índice Staff normalizado 003/005 reutilizado.
  Ningún changeset anterior editado. Clean/upgrade/checksums/reaplicación/colisiones
  PASS en esquemas efímeros. Bootstrap dev/demo + flag, excluye prod/production;
  Staff RECEPCION demo con Property scope y Guest con credential, hashes/IDs
  preservados al reiniciar. Credenciales sintéticas en dataset local.
- **Automatizado:** mvn -B --no-transfer-progress verify Java21/PostgreSQL17 aislado:
  475 PASS, cero failures/errors/skipped. Web 1256 PASS/237 archivos; focalizados
  de UI/BFF/retorno 47 PASS; typecheck/lint/build NEXT_PUBLIC_USE_MOCK_API=false PASS.
  OpenAPI 12 tests PASS y vivo/generado paths/components idénticos: 38 operaciones,
  28 paths, 37 schemas, 11 tags. Postman JSON/payload email PASS. diff --check PASS.
- **Runtime:** Compose raíz config/up --build/ps PASS, postgres/backend/web healthy;
  Web 127.0.0.1:3001→3000 único host port; Backend 8080/tcp y PostgreSQL 5432/tcp
  internos. Debug 8081 solo override explícito. Dev ocupado falla EADDRINUSE 3001;
  sin puerto alternativo; probe Docker ocupado también falla, sin reasignación. BFF email/password Guest/Staff 201, me 200, refresh 200,
  logout 204→401; logout Guest preserva Staff. /acceso/Header/Footer, /cuenta,
  /dashboard y journey anónimo HTTP 200. Negativos genéricos/no enumeration PASS.
  Google start/OIDC 307 con callback3001 y parámetros esperados sin exponerlos.
  Ningún PMS en host3000. Stacks ajenos/QA histórico y .env preservados.
- **Evidencia local sanitizada:** /tmp/pms-auth-{verify,web-tests,final-focused-web,
  typecheck,lint,build,compose-up,smoke,dev-conflict}.log; generated/mappings/counts
  en backend/target y /tmp/pms-auth-runtime-openapi.json. PostgreSQL verify efímero
  retirado al finalizar; stack integrado queda disponible para Alan.
- **Límites/siguiente:** QA técnico HTTP no es QA visual ni Google callback real.
  Alan ejecuta guía 44 y confirma manual PASS antes de COMPLETADA. Registro,
  forgot/reset/change password/MFA excluidos; no avanzar a otra tarea.

## AUTH-UNIFIED-01 — Inicio (2026-10-06)

- **Estado:** EN_PROGRESO; DoR READY, autorización explícita del usuario.
- **Base/rama:** main actualizado `2e387a3` PR #133 y limpio; rama solicitada
  `feature/auth-unified-login-port-standardization`. Sin commit/push/merge.
- **Decisiones/contrato:** [44](44_UNIFIED_LOGIN_CONTRACT_QA.md), Guest/Staff separados,
  email/password universal, Google solo Guest, invitado público, Web fijo 3001.
- **Inspección:** StaffUser username/workEmail/passwordHash + RBAC/membership;
  GuestAccount/GuestIdentity Google sin password, sesiones y refresh independientes;
  BCrypt(12). No identidad común por roles.
- **Siguiente:** implementación y QA automatizado/runtime; mantener EN_QA hasta Alan.


## Juan / J4 — servicio público: entrega técnica EN_QA (2026-10-07)

- **Estado / owner:** EN_QA, Juan / BD3; validación técnica final PASS, QA manual
  pendiente. Usuario aprobó ACTIVE para reservas nuevas; replay original J1.
- **Rama / base / commit:** feature/backend-public-booking-core / 10c0d82;
  commit exclusivo `feat(public-booking): orchestrate public booking service`.
  Push pendiente de autorización posterior; J3/J1/J2/J5 publicadas y aún EN_QA.
- **Entregado:** Service interface/impl, response View de campos exactos y Exception
  de códigos aprobados; integración J3/J1/DemoRatePolicy/InventoryAdmissionPort/J2/J5/
  booking/confirmación existentes. Precio/plan reales antes de pago, refresh de tipos
  bajo locks y nueva comparación; callback exclusivamente local y misma READ_COMMITTED
  de J1. Snapshot validada/roundtrip antes de completar; replay sin reevaluar ni escribir.
- **Validación final:** mvn -B --no-transfer-progress
  -Dtest=PublicBookingServiceTests,PublicBookingServiceIntegrationTests,PublicBookingReceiptIntegrationTests,PublicBookingMappingIntegrationTests,PublicBookingMappingServiceTests,SimulatedPaymentGatewayAdapterTests,DemoRatePolicyTests,PublicAvailabilityServiceTests test:
  136 PASS (45 J4 + 91 regresión). mvn -B --no-transfer-progress verify:
  686 PASS, cero failures/errors/skipped, BUILD SUCCESS y JAR generado.
  Java 21.0.9/Maven 3.9.11/PostgreSQL 17.11; Compose aislado pms-public-j4-qa,
  snapshot exacto de fuentes/POM/docs y cache existente, reportes/artefactos en target
  ignorado. Logs public-booking-j4-focused-final.log y public-booking-j4-verify-final.log.
- **Corrección propia:** cuatro stubs unitarios ejecutaban el callback anterior
  con args null al reemplazarse; corregidos con doReturn/doThrow, sin cambios de
  producción. Reejecución completa PASS, sin errores pendientes ni warnings críticos
  nuevos; avisos SpringDoc/agente de tests ya presentes en fases anteriores.
- **Evidencia:** total Availability × quantities igual a Booking (1080000 para
  tres categorías × dos unidades × dos noches), un padre/seis stays y pago una vez.
  Gates precio/stock/invalid/config/rechazo/error, snapshots sin Guest/tarjeta,
  replay/conflicto y replay tras cambio de estado/catálogo PASS. Rollback tardío con
  flush, serialización, commit diferido y exterior sin filas parciales. Cinco carreras
  PG con key/stock y locks observados; un solo booking comprometido. Pago simulado
  mantiene conexión/tx; no efecto externo real, SDK o fakes productivos.
- **Alcance / siguiente:** cuatro fuentes nuevas, dos tests J4 y entradas propias
  en estos dos docs; sin migración, endpoint, Security/OpenAPI ni cambios de Alan/
  legacy. Cuatro untracked ajenos preservados. Mantener EN_QA hasta QA manual PASS;
  reportar commit y detenerse para autorización de push. No iniciar J6 ni PR/merge.

## Juan / J4 — servicio público: inicio (2026-10-07)

- **Estado / owner:** READY → EN_PROGRESO, Juan / BD3. Usuario autorizó J4 y
  aprobó ACTIVE para nuevas reservas; inexistente/INACTIVE → PROPERTY_NOT_FOUND.
  Replay original J1 sin reevaluar elegibilidad/pricing/stock actuales.
- **Rama / base:** feature/backend-public-booking-core / 10c0d82, J5 publicada
  y sincronizada. J3/J1/J2/J5 aún EN_QA sin confirmación manual. Árbol inicial sin
  cambios rastreados; cuatro documentos untracked ajenos intactos.
- **Diseño / alcance:** cuatro fuentes propias de Service/Impl/View/Exception y
  tests J4 unit/PG; solo estas entradas. J3 valida/hash; J1 posee READ_COMMITTED,
  lock global y snapshot. Callback nuevo usa catálogo público/DemoRatePolicy Alan,
  valida precio y ratePlan, admite demanda, refresca precio bajo locks antes de
  pago simulado y persiste/confirm mediante J5/servicios existentes. Recibo al éxito.
- **Límites / decisiones:** callback solo local; sin gateway real, IO externo,
  REQUIRES_NEW/async/conexión independiente. APPROVED, DECLINED → PAYMENT_DECLINED,
  ERROR/fallo técnico → BOOKING_FAILED; stock → NO_AVAILABILITY, precio → PRICE_CHANGED
  antes de pago. IDs/tipos/cantidades/fechas/un solo padre exactos; JSON del contrato
  sin Guest/scope/tarjeta. Snapshot original en replay. Sin Security/OpenAPI/endpoint,
  migración, pricing alternativo ni cambios a interfaces/implementaciones de Alan.
- **DoD / siguiente:** tests éxito/precio/stock/pago/replay/conflicto, snapshots,
  rollback tardío/exterior/commit y concurrencia con PG real; focalizados + verify
  Java 21/PostgreSQL 17, diff --check/scope PASS. Entregar EN_QA y commit exclusivo
  J4; detenerse para autorización de push y QA manual. No iniciar J6.

## Juan / J5 — mapeo público: entrega técnica EN_QA (2026-10-07)

- **Estado / owner:** EN_QA, Juan / BD3; validación técnica PASS, QA manual
  pendiente. Tres precisiones J5 aprobadas explícitamente por el usuario.
- **Rama / base / commit:** feature/backend-public-booking-core / ab411f4;
  commit exclusivo `feat(public-booking): map guests and stays to reservation model`.
  Push pendiente de autorización posterior; J3/J1/J2 publicadas y siguen EN_QA.
- **Entregado:** mapper interface/impl read-only y repositorio público de lookup
  scoped, exacto por COLLATE C y LIMIT 2. Un solo CreateBookingCommand con responsable
  nuevo inline o candidato único ACTIVE/misma Property/sin cuenta/nombres y correo
  idénticos; quantity expandida sin agregar ocupantes, roomId NULL. Canal WEB_DIRECTA,
  sourceReference/notes NULL. Request/hash raw intactos y trim legacy de escritura
  conservado por aprobación; sin actualizar ni vincular perfiles existentes.
- **Validación final:** mvn -B --no-transfer-progress
  -Dtest=PublicBookingMappingServiceTests,PublicBookingMappingIntegrationTests,ReservationBookingServiceIntegrationTests,InventoryBookingIntegrationTests,GuestProfileServiceIntegrationTests,GuestProfileTests,PublicBookingValidationServiceTests test:
  123 PASS (35 J5 + 88 regresión). mvn -B --no-transfer-progress verify:
  641 PASS, cero failures/errors/skipped, BUILD SUCCESS y JAR generado. Java
  21.0.9/Maven 3.9.11/PostgreSQL 17.11, Compose aislado pms-public-j5-qa y snapshot
  exacto de fuentes/POM/docs; cache existente, reportes/artefactos en target ignorado.
  Logs public-booking-j5-focused-final.log y public-booking-j5-verify-final.log.
- **Corrección propia:** primer test de rollback consultaba JDBC antes del flush
  de inserciones JPA pendientes. Se agregó flush solo en esa fixture; no se cambió
  producción/servicios legacy. Reejecución completa PASS; sin errores pendientes.
  Avisos SpringDoc/agente de tests preexistentes, sin warnings críticos nuevos.
- **Evidencia / alcance:** quantity 1/3 y múltiples categorías/entradas bajo un
  solo padre; perfiles nuevos/reutilizados/excluidos/ambiguos y filas existentes
  intactas; case/Unicode/espacios y hash sin normalizar. Cero writes al preparar,
  rollback de perfil/reserva/stays/audit y rechazo de inventario sin filas parciales.
  Tres fuentes nuevas, dos tests J5 y entradas propias en estos dos docs. Sin
  migraciones, pricing/pago/confirmación/HTTP ni cambios de Alan; cuatro untracked
  ajenos conservados. Booking real probado mediante servicios ya existentes.
- **Siguiente:** checklist QA manual en AlanPlan; conservar EN_QA hasta confirmación
  PASS del usuario. Reportar commit, pedir autorización de push y detenerse;
  no iniciar J4 ni crear PR/merge.

## Juan / J5 — mapeo público: inicio (2026-10-07)

- **Estado / owner:** READY → EN_PROGRESO, Juan / BD3. Usuario autorizó J5 y
  aprobó reutilización exacta y acotada, canal WEB_DIRECTA/refs NULL, y trim legacy
  solo al persistir conservando request/hash J3 exactos.
- **Rama / base:** feature/backend-public-booking-core / ab411f4; J2 publicada
  tras autorización, sincronizada. J3/J1/J2 aún EN_QA sin confirmación manual.
  Sin cambios rastreados iniciales; cuatro documentos untracked ajenos conservados.
- **Contrato:** candidato único ACTIVE, misma Property y sin GuestAccount,
  nombres/correo exactos; cero o varias coincidencias crean uno nuevo. Excluir
  cuentas vinculadas, INACTIVE, otra Property o Property NULL. Nunca actualizar
  perfiles existentes ni deducir acceso Guest por coincidencia de contacto.
- **Alcance / archivos:** mapper interface/impl y repositorio query-only propio de
  Reservations, dos tests unit/PG y estas entradas. Un CreateBookingCommand con
  responsable inline o existente, quantity expandida, roomId NULL y occupants
  vacío. Lookup de RoomTypes reales scoped y Guest exacto con COLLATE C/LIMIT 2.
- **Límites / DoD:** mapper read-only, creación dentro de booking/admisión existente;
  sin pricing/pago/confirmación/HTTP, migraciones ni cambios legacy/Alan. Verificar
  cantidades, categorías, un solo padre, perfil nuevo/existente/exclusiones,
  coincidencias ambiguas, case/Unicode/espacios, hash preservado y rollback;
  focalizados, verify Java 21/PostgreSQL 17, diff --check y scope PASS. Entregar
  EN_QA, commit exclusivo J5 y detenerse para autorización de push y QA manual.
  No iniciar J4.

## Juan / J2 — pasarela simulada: entrega técnica EN_QA (2026-10-07)

- **Estado / owner:** EN_QA, Juan / BD3; validación técnica PASS, QA manual
  pendiente. APPROVED como único éxito aprobado explícitamente por el usuario.
- **Rama / base / commit:** feature/backend-public-booking-core / 5f3c1f6;
  commit exclusivo `feat(public-booking): add simulated payment gateway`.
  Push pendiente de autorización posterior; J3/J1 publicadas y aún EN_QA.
- **Entregado:** PaymentGatewayPort y records request/result; adapter local
  Spring único, siempre APPROVED en runtime. Request solo amountMinor long/GTQ;
  provider SIMULATED fijo y referencias SIM-UUID; DECLINED/ERROR sin referencia
  seleccionables únicamente por constructor package-local de fixture. Validator
  de snapshot J1 acepta solo APPROVED tras decisión J2; migraciones intactas.
- **Límites:** sin IO, SDK, secretos, metadata sensible, persistencia propia,
  conexión/transacción independiente ni async. Sin pricing, mapper, orquestación
  pública, endpoint o cambios de Alan. Futura pasarela real requiere otro contrato.
- **Validación:** mvn -B --no-transfer-progress
  -Dtest=PaymentContractTests,SimulatedPaymentGatewayAdapterTests,SimulatedPaymentGatewayIntegrationTests,PublicBookingReceiptRequestTests,PublicBookingReceiptIntegrationTests,PublicBookingReceiptSchemaUpgradeTests,ReservationsSchemaUpgradeTests test:
  71 PASS (35 J2 + 36 regresión). mvn -B --no-transfer-progress verify:
  606 PASS, cero failures/errors/skipped, BUILD SUCCESS y JAR generado.
  Maven 3.9.11/Java 21.0.9/PostgreSQL 17.11; Compose aislado pms-public-j2-qa,
  snapshot exacto de Backend, cache existente y reportes/artefactos en target.
  Logs public-booking-j2-focused.log y public-booking-j2-verify.log ignorados.
  Avisos SpringDoc/agente de tests preexistentes en J1, sin warnings críticos nuevos.
- **Evidencia / alcance:** éxito/rechazo/error, referencias concurrentes, forma
  del request sin metadata, wiring real y siete tablas intactas tras simulaciones;
  callback de InventoryAdmissionPort sin cambios, rollback y rechazo de demanda
  antes del pago PASS. Cuatro fuentes nuevas, ajuste de éxito snapshot, tres
  tests J2 y entradas propias en estos dos docs. Documentos ajenos preservados.
- **Siguiente:** QA manual reproducible descrita en AlanPlan; conservar EN_QA
  hasta confirmación PASS del usuario. Reportar commit, pedir autorización de
  push y detenerse. No iniciar J5 ni crear PR/merge.

## Juan / J2 — pasarela simulada: inicio (2026-10-07)

- **Estado / owner:** READY → EN_PROGRESO, Juan / BD3. Usuario autorizó J2 y
  resolvió CAPTURED/APPROVED seleccionando explícitamente APPROVED como único éxito.
- **Rama / base:** feature/backend-public-booking-core / 5f3c1f6; J1 publicada
  tras autorización y sincronizada. J3/J1 conservan EN_QA sin confirmación manual.
  Árbol inicial sin cambios rastreados; cuatro documentos untracked ajenos intactos.
- **Contrato / decisiones:** PaymentRequest solo importe long exacto y GTQ;
  provider SIMULATED, éxito APPROVED y referencia sintética SIM-UUID. Runtime
  Spring siempre éxito; DECLINED/ERROR solo por fixture package-local de tests,
  sin HTTP/configuración. Sin metadata sensible ni políticas de precio nuevas.
- **Alcance:** PaymentGatewayPort, PaymentRequest/Result y adapter Reservations;
  ajustar únicamente la aceptación del éxito en snapshot J1 tras la decisión J2;
  pruebas contrato/unit/PostgreSQL y estas entradas propias. Sin migraciones,
  pricing, booking público, mapping, endpoint ni modificaciones de Alan.
- **Límite / DoD:** adapter exclusivamente local, sin IO ni persistencia, apto
  para callback InventoryAdmissionPort sin modificarlo. Verificar pruebas de
  éxito/rechazo/error, referencias, wiring, cero escrituras, rollback y callback;
  focalizados y verify completo Java 21/PostgreSQL 17, diff --check/alcance PASS.
  Entregar EN_QA y commit independiente J2; detenerse para autorización de push
  y QA manual del usuario. J5 no iniciada.

## Juan / J1 — recibo persistente: entrega técnica EN_QA (2026-10-06)

- **Estado / owner:** EN_QA, Juan / BD3; validación técnica final PASS, QA manual
  pendiente. Contrato DOCX y precisiones de recibos aprobados en esta sesión.
- **Rama / base / commit:** feature/backend-public-booking-core / 7bb6277;
  entrega en commit exclusivo `feat(public-booking): add persistent idempotency receipt`.
  Push pendiente de autorización posterior; J3 ya publicada, sin atribuir QA manual.
- **Entregado:** recibo COMPLETED inmutable con PK global opaca/collation C, hash
  J3 y respuesta JSONB sin Guest/tarjetas; FK a Reservation y referencias vinculadas
  a la snapshot. Service/port, repositorio JDBC y changeset nuevo 008, con inclusión
  append-only en el changelog modular. No cambia ningún changeset histórico.
- **Transacción / límites:** READ_COMMITTED writable, advisory lock por clave hasta
  commit/rollback exterior. Replay devuelve el registro original sin callback ni
  consulta del lifecycle mutable; hash distinto produce IDEMPOTENCY_KEY_REUSED.
  Fallo de callback, insert, commit o rollback exterior revierte booking/recibo y
  libera clave, incluso para otro payload. Flush JPA antes de JDBC/FK; primer
  recibo exige padre persistido CONFIRMED/GTQ y mismo confirmationCode. Callback
  servidor exclusivamente local, sin efectos externos, REQUIRES_NEW ni async.
- **Validación final:** mvn -B --no-transfer-progress
  -Dtest=PublicBookingReceiptRequestTests,PublicBookingReceiptIntegrationTests,PublicBookingReceiptSchemaUpgradeTests,ReservationsSchemaUpgradeTests test:
  36 PASS. mvn -B --no-transfer-progress verify: 571 PASS, cero failures/errors/
  skipped, BUILD SUCCESS y JAR generado. Java 21.0.9/Maven 3.9.11/PostgreSQL 17.11;
  Compose efímero pms-public-j1-qa con copia exacta de fuentes/POM/docs y cache
  Maven ya disponible; artefactos/reportes devueltos a backend/target, ignorados.
- **Evidencia PG:** dos conexiones esperan advisory lock observado, callback una
  sola vez tras commit; tras rollback se ejecuta nuevamente. Replay/conflicto,
  FK/PK/append-only, límites Unicode, snapshots sin campos ajenos, fallo al commit,
  recovery y coherencia del padre PASS. Upgrade pre-J1 conserva los 23 checksums
  anteriores y la reserva existente, agrega solo changeset 24 y reaplica sin cambios.
- **Alcance:** ocho fuentes J1, una migración nueva y su inclusión, tres tests J1,
  un changelog de test pre-J1 y entradas propias en seguimiento. Cuatro documentos
  untracked originales conservados. Sin pricing, gateway, HTTP ni cambios de Alan.
- **Siguiente:** QA manual descrita en AlanPlan; mantener EN_QA hasta confirmación
  PASS del usuario. Reportar commit y detenerse para autorización de push; sin J2.

## Juan / J1 — recibo persistente: inicio (2026-10-06)

- **Estado / autorización:** READY → EN_PROGRESO, Juan / BD3. Usuario autorizó
  continuar desde J3 y aprobó las cinco precisiones de J1 en esta sesión.
- **Rama / base / dependencias:** feature/backend-public-booking-core / 7bb6277;
  J3 publicada y sincronizada, 77 focalizados/536 verify PASS; sigue EN_QA sin
  confirmación manual. Árbol inicial sin cambios rastreados; cuatro untracked ajenos.
- **Decisiones:** unicidad global; solo COMPLETED al éxito, inmutable sin purga/TTL.
  Callback y recibo en una transacción READ_COMMITTED local; errores o rollback
  exterior dejan la clave libre, incluso para otro payload. Advisory lock hasta
  commit/rollback; luego replay/conflicto o nuevo intento. Snapshot de respuesta
  JSONB sin Guest/tarjetas, preservada ante cambios posteriores de la reserva.
- **Diseño / archivos:** fuentes de recibo/puerto/repositorio en Reservations,
  changeset nuevo 008 y append de include, pruebas unit/PG/upgrade; seguimiento
  propio de Juan. Flush JPA antes del INSERT JDBC por FK de Reservation. No editar
  changesets aplicados ni contratos/implementaciones de Alan. Sin J2/J4/J5/J6.
- **DoD / siguiente:** focalizados, verify completo Java 21/PostgreSQL 17, revisión
  de migración/checksums/alcance y diff --check; registrar EN_QA y commit exclusivo
  de J1, detenerse para autorización de push. QA manual aún debe confirmarse.

## Juan / J3 — validación y hash: entrega técnica EN_QA (2026-10-06)

- **Estado / owner:** EN_QA, Juan / BD3; implementación y validación técnica PASS,
  QA manual del usuario pendiente. Contrato DOCX y precisiones aprobados en esta sesión.
- **Rama / base / commit:** feature/backend-public-booking-core / 8a6228d;
  entrega en commit exclusivo `feat(public-booking): implement J3 validation and request hashing`.
  Push de este incremento pendiente de autorización posterior; sin PR/merge.
- **Entregado:** DTO inmutable, validación de clave/Property real/fechas/GTQ/stays/
  quantities/Guest/modo simulado y hash SHA-256 V1 con formato explícito en AlanPlan.
  Stays ordenados sin fusionar duplicados, nombres/correo exactos; consulta de
  existencia Property de solo lectura. Errores application con códigos del contrato.
- **Precisión numérica:** se detectó truncamiento de JSON fraccionario por el mapper
  predeterminado; deserializadores locales a los dos campos Integer/Long del DTO
  rechazan fracciones, strings y overflow. No cambia el mapper global. Valores
  enteros equivalentes como 1/1.0 conservan valor y hash, sin float/double ni redondeo.
  También se corrigió una referencia de tabla en el test nuevo de conteos SQL.
- **Validación final:** mvn -B --no-transfer-progress
  -Dtest=PublicBookingValidationServiceTests,PublicBookingValidationIntegrationTests test:
  77 PASS (62 unit + 15 integración). mvn -B --no-transfer-progress verify:
  536 PASS, cero failures/errors/skipped, BUILD SUCCESS y JAR generado.
  Maven 3.9.11/Java 21.0.9/PostgreSQL 17.11, Compose efímero pms-public-j3-qa;
  fuentes/POM/docs copiados exactamente a /tmp del contenedor, artefactos/reportes
  devueltos a backend/target. Logs focused-final/verify allí, ignorados por Git.
- **SQL / alcance:** pruebas confirman Property exacta, ausencia de nuevas reservas,
  stays, perfiles, eventos de auditoría y recibos tras validar/hashear. JSON real:
  fechas imposibles, fracciones, modo no permitido y campos desconocidos rechazados.
  Se conservan los cuatro documentos untracked previos y el historial de Alan.
  Cambios solo en seis fuentes J3, dos tests J3 y estas entradas de seguimiento;
  sin migraciones, endpoint, seguridad, pricing, receipt, gateway ni otras fases.
- **QA manual / siguiente:** checklist y vector reproducible en AlanPlan; usuario
  debe confirmar QA manual PASS antes de marcar COMPLETADA. Solicitar autorización
  para push del commit de J3 y detenerse; no iniciar J1.

## Juan / J3 — validación y hash: inicio (2026-10-06)

- **Estado / autorización:** READY → EN_PROGRESO; usuario aprueba explícitamente
  el contrato DOCX y las precisiones de J3 en esta sesión. Solo J3 en este incremento.
- **Rama / base:** feature/backend-public-booking-core / 8a6228d. Rama vacía de
  nuevos cambios ya publicada por autorización previa; publicación de J3 pendiente.
  Árbol inicial sin cambios rastreados; cuatro documentos untracked conservados.
- **Owner / dependencias:** Juan / BD3; A1/A2/A3 COMPLETADAS, modelos reales y
  PostgreSQL/Liquibase existentes. Registro autorizado por Backend AGENTS y
  seguimiento común de Juan/BD3; conservar todas las entradas de Alan.
- **Contrato / decisiones:** DTO y J3 del Plan_Tareas_Backend_Reserva_Publica_Alan_Juan;
  clave opaca 8–128 caracteres Unicode sin controles ni normalización. Hash SHA-256
  V1 con campos UTF-8 y longitudes explícitas. Ordenar stays por roomTypeId,
  ratePlanId y quantity sin fusionar duplicados; nombres/correo exactos. Incluir
  Property, fechas, GTQ, clientTotalMinor, stays y Guest; excluir clave y modo
  constante SIMULATED_CARD. Reglas completas y DoR/DoD en entrada J3 de AlanPlan.
- **Alcance / archivos:** DTO application inmutable, Service interface/implementation,
  excepción con código y repositorio Property de solo existencia; pruebas J3.
  Sin endpoint, seguridad, pricing, migración, recibo ni gateway.
- **Validación prevista:** focalizados J3 y mvn -B --no-transfer-progress verify
  con Compose existente Java 21/PostgreSQL 17 aislado; diff --check y revisión de
  archivos. Host Maven usa Java 17; no modificar configuración global.
- **Siguiente:** implementar/validar J3 y registrar evidencia EN_QA; commit de esta
  fase autorizado por instrucción original, sin push hasta autorización posterior.

## Cierre de QA manual final — Demo/Web público (2026-10-06)

- **Resultado:** Alan confirmó QA manual PASS en `feature/web-public-availability-real`.
  Demo Bootstrap Docker, Web Public Availability real y Public booking journey
  pre-submit quedan **COMPLETADAS**. A1/A2/A3 conservan su cierre COMPLETADO.
- **Validado:** stack Docker integrado; catálogo real de seis RoomTypes y galerías;
  carrito global/persistencia y filtros; edición de fechas/huéspedes con
  revalidación atómica; Header → catálogo Home; Guest Google session/account según
  el contrato vigente; Guest checkout, Review y llegada a Payment. El bloqueo de
  confirmación final funciona correctamente. El Account Summary solo permite
  firstName/lastName cuando existe perfil asociado; no se atribuyen nombres a
  Google cuando falta GuestProfile.
- **Pendiente / fuera de scope, a cargo de Juan:** `POST /api/v1/public/bookings`,
  PaymentGateway simulado Backend, persistencia Reservation/ReservationStay,
  confirmationCode e idempotencia booking. No se afirma persistencia ni reserva
  confirmada.
- **Siguiente:** cierre documental de AlanPlan, AlanHandoff y guías Web/dataset.
  Sin cambios de código, commit, push ni merge.

## Dataset local demo integrado — EN_QA (2026-10-06)

- **Alcance autorizado:** conservar rama `feature/web-public-availability-real` y
  todo el trabajo pendiente. Bootstrap local Inventory y Web público hasta Payment;
  sin lógica de Juan, booking real, Staff/Android, commit/push/merge. A1/A2/A3 siguen
  COMPLETADAS; Web y este incremento EN_QA hasta QA manual final.
- **Entrega:** `DemoDataBootstrap` reutiliza ApplicationRunner; transacción y lock,
  Property demo-only HB-GT-DEMO/GTQ/ACTIVE, 6 tipos y 24 Rooms. Flag false por defecto
  en aplicación; requiere dev/demo y true, excluye prod/production. Compose local
  activa demo y suministra UUID a Web automáticamente. Sin migraciones nuevas,
  precios duplicados, borrados ni entidades futuras sin contrato.
- **Pruebas Backend:** focalizados 10 PASS; `mvn -B --no-transfer-progress verify`
  459 PASS, sin failures/errors/skipped, en Java 21/PostgreSQL efímero separado.
- **Smoke integrado:** PostgreSQL/Backend/Web healthy; dataset 6/24 y BFF con seis
  ofertas GTQ/ATS=4/totales correctos. Google start 307 hacia accounts.google.com;
  no se sigue OAuth ni se publica state/codes/tokens/cookies. Recorrido completo
  callback/exchange/HttpOnly/return pendiente de QA manual de Alan.
- **Validación Web:** suite 1212 PASS / 233 archivos; typecheck/lint/build real
  PASS. Firefox contra el stack integrado: siete pantallas hasta Payment en cinco
  anchos (1440/1024/768/375/320), sin overflow; slider con teclado y selección/total
  real PASS, confirmación final bloqueada. Compose config y git diff --check PASS.
- **Guía y siguiente:** [Local Demo Dataset](../../docs/LOCAL_DEMO_DATASET.md),
  validar manualmente catálogo/carrito/formulario/Payment y Google en este stack.
  La presentación real no confirma ni cobra una Reservation.

## Reserva pública — A2/A3: cierre formal y QA manual PASS (2026-10-06)

- **Estado:** A2 y A3 COMPLETADAS; QA técnico y QA manual PASS confirmado por Alan,
  cierre formal autorizado por el usuario. A1 conserva COMPLETADA; incremento
  público superior PENDIENTE. Rama feature/backend-public-availability, base A3
  b653804; historial previo conservado.
- **QA manual PASS (Alan):** entorno aislado y login Staff sintético; Property
  ACTIVE/GTQ, STD/DLX/SUITE con dos Rooms físicas por tipo. Para dos noches,
  availableUnits=2 en los tres tipos; nightly/total minor units STD 65000/130000,
  DLX 85000/170000, SUITE 120000/240000. rooms=1/2 → tres ofertas;
  rooms=3 → 200 offers=[]. Fecha inválida, rooms=0 y UUID inválido → 400;
  Property inexistente → 404; público sin token → 200; Staff vecino sin token → 401.
  OpenAPI path presente, operationId=publicAvailability, security=[] y Swagger UI
  200 PASS. Cleanup del entorno QA completado.
- **Evidencia técnica previa conservada:** focalizados PASS (A3 48), mvn -B
  --no-transfer-progress verify 449 PASS y git diff --check PASS; sin repetir suites.
  Contrato/procedimiento/evidencia en [43](43_PUBLIC_AVAILABILITY_CONTRACT_QA.md).
- **Alcance / validación:** cierre documental únicamente en AlanPlan, AlanHandoff
  y estado/resultado de 43; git diff --check PASS y status/stat/name-only revisados.
  Código y cambios previos preservados; sin commit/push ni cambios de Auth/Account.
- **Siguiente:** A2/A3 cerradas; esperar autorización para otra tarea. Sin booking.

## Reserva pública — A3: endpoint HTTP availability (2026-10-06)

- **Estado:** EN_QA; únicamente A3 autorizada. A2 permanece EN_QA hasta QA manual
  conjunto; A1 COMPLETADA. Owner Alan / BD1; historial Auth/Account/A1/A2 conservado.
- **Rama/base:** feature/backend-public-availability, HEAD b653804; árbol inicial
  limpio, sin commit/push/merge.
- **Entrega:** GET /api/v1/public/availability, cuatro params obligatorios
  propertyId/arrival/departure/rooms; rooms mapea roomsRequested. DTO HTTP separados
  de views con mapper explícito, campos aprobados sin datos Staff. Reutiliza ATS
  y pricing A1/A2. Contrato/QA en [43](43_PUBLIC_AVAILABILITY_CONTRACT_QA.md).
- **Decisión:** solo Property ACTIVE; INACTIVE e inexistente reciben 404 idéntico.
  Fachada valida estado antes de pricing/tipos. 400 inválidos; sin capacidad 200 [];
  errores de configuración demo 500 con code explícito ProblemDetail, sin detalles
  internos ni respuesta parcial. Moneda incompatible nunca se convierte.
- **Seguridad / OpenAPI:** única apertura GET exacto de esta ruta; Staff vecinos
  siguen protegidos. security=[] y x-audience=public; DTOs, params y 200/400/404/500
  anotados. Baseline runtime previo verificado 35 operaciones/25 paths/32 schemas/
  10 tags; posterior generado/vivo 36 operaciones/26 paths/34 schemas/11 tags,
  paridad con mappings y documento vivo paths/components PASS, sin exclusiones.
- **Pruebas PASS:** mvn -B --no-transfer-progress
  -Dtest=PublicAvailabilityHttpIntegrationTests,PublicAvailabilityServiceIntegrationTests,OpenApiContractIntegrationTests,SecurityConfigurationIntegrationTests
  test: 48 PASS (21 HTTP, 14 application, 11 OpenAPI, 2 seguridad). mvn -B
  --no-transfer-progress verify: 449 PASS, cero failures/errors/skipped, BUILD SUCCESS.
  Maven 3.9.11/Java 21/PostgreSQL 17.11 efímero pms-public-a3-qa, sin exclusiones.
  HTTP cubre acceso anónimo, identidad/precios reales, DTO exacto sin Staff,
  catálogo/ATS vacío, 404 inexistente/inactiva, fechas/UUID/int inválidos y ausentes,
  alias no aceptado, 500 de tarifa/moneda y protección Staff/otros métodos/paths.
  OpenAPI detectó inicialmente rooms como string; anotación corregida a int32
  antes del PASS final. Comparación aditiva detectó colisión del operationId
  availability; A3 usa publicAvailability para preservar availability Staff.
  Paths previos y cuatro security schemes conservados exactamente; tests y
  verify reejecutados tras la corrección. git diff --check PASS (incluidos nuevos sin staging),
  status/stat/name-only revisados; colección BD1/Auth e historial Handoff conservados.
- **Smoke runtime PASS:** JAR del verify en contenedor temporal sin bootstrap,
  misma BD efímera reiniciada (solo Property seed ACTIVE GTQ, cero RoomTypes),
  127.0.0.1:18087. /v3/api-docs, Swagger UI HTML y swagger-config 200; público sin
  credencial 200 offers=[], rooms=0 400, Property inexistente 404, Staff vecino 401.
  No prueba manual vendible ni navegador visual; stack normal intacto. Entorno
  temporal retirado; override en /tmp, ningún Compose repo modificado. Logs
  /tmp/pms-public-a3-focused.log, /tmp/pms-public-a3-verify.log y
  /tmp/pms-public-a3-runtime-smoke.json.
- **Datos QA:** repo ofrece perfil manual-qa efímero y CRUD/colecciones Staff para
  catálogo. Propuesta 43 reutiliza esos mecanismos para una Property ACTIVE y
  STD/DLX/SUITE con dos Rooms cada uno. Sin ejecutar población ni crear seeds.
- **Límites / siguiente:** QA manual vendible pendiente de Alan; no atribuir PASS
  al catálogo vacío. Ningún booking/frontend, migración ni Auth/Account alterado.
  Detenerse al finalizar A3.

## Reserva pública — A2: disponibilidad pública real application (2026-10-06)

- **Estado:** EN_QA inicial/final por instrucción del usuario; solo A2 autorizada,
  pendiente de nuestra revisión. A1 COMPLETADA en 42a785a; A3 no iniciada, incremento
  superior PENDIENTE. Owner Alan / BD1; historial previo Auth/Account/A1 conservado.
- **Rama/base:** feature/backend-public-availability, HEAD 42a785a; árbol inicial
  limpio. Sin commit/push/merge.
- **Entrega / contrato:** PublicAvailabilityService.search(PublicAvailabilityQuery)
  devuelve PublicAvailabilityView con offers reales, ATS y precio GTQ por tipo para
  todo el rango. Query requiere propertyId/arrival/departure, arrival < departure y
  roomsRequested > 0. Campos exactos y semántica en AlanPlan; sin HTTP.
- **Autoridades:** AvailabilityPort/AvailabilityService calculan mínimo vendible
  por noche con reglas vigentes OOO/stays/overbooking=0; no se reimplementan.
  Repo público de solo consulta restringe Property/RoomTypes por propertyId sin
  tocar repositorios/scope Staff. Moneda viene de Property y debe coincidir con
  DemoRatePolicy.currency(); mismatch explícito, sin conversión.
- **Pricing:** DemoRatePolicy mantiene un solo mapa, ahora también clasifica
  DEMO_STANDARD/DEMO_DELUXE/DEMO_SUITE; identidad String en ratePlanId/code.
  rateFor/totalFor siguen siendo autoridad de importes; ninguna fórmula nueva ni
  RatePlan persistido. Tarifas aprobadas A1 intactas. Error sin tarifa se propaga.
- **Lectura / errores:** snapshot readOnly REPEATABLE_READ; no asigna habitaciones
  ni escribe inventario/reservas. ATS < roomsRequested omite oferta; orden lexical
  Java por code. PropertyNotFoundException, IllegalArgumentException y error interno
  DEMO_CURRENCY_MISMATCH, sin traducción HTTP.
- **Pruebas PASS:** mvn -B --no-transfer-progress
  -Dtest=DemoRatePolicyTests,PublicAvailabilityServiceTests,PublicAvailabilityServiceIntegrationTests
  test: 41 PASS (20 policy, 8 unit A2, 13 integration A2). mvn -B
  --no-transfer-progress verify: 426 PASS, cero failures/errors/skipped, BUILD SUCCESS
  (1m02s), Maven 3.9.11/Java 21/PostgreSQL 17.11 efímero, sin exclusiones,
  Compose pms-public-a2-qa retirado al finalizar. Fixtures deterministas rollback,
  sin seeds ni población del catálogo de aplicación. Casos de composición: datos
  reales/GTQ, ATS 0/insuficiente/igual/superior, tres tarifas, rango restrictivo,
  OOO y stays consumidores, validaciones, Property inexistente/ajena, orden estable,
  sin tarifa, moneda incompatible y catálogo vacío. Test unit verifica delegación
  de ATS y total, evitando fórmula duplicada. Logs /tmp/pms-public-a2-focused.log
  y /tmp/pms-public-a2-verify.log. git diff --check PASS (incluye revisión de siete
  nuevos sin staging); git status/stat/name-only revisados, historial previo intacto.
- **Límites / siguiente:** revisión A2 del usuario pendiente; A3 decidirá exposición
  HTTP/errores y preparación QA manual. Elegibilidad pública de Property (estado/
  publicación) no definida en A2; solo existencia/propertyId. Ningún Controller,
  SecurityConfiguration/OpenAPI, Auth/Account, migración ni Compose modificado.
  Detenerse al finalizar A2; no iniciar A3.

## Reserva pública — A1: cierre formal y QA manual PASS (2026-10-06)

- **Estado:** A1 COMPLETADA; QA manual PASS confirmado por Alan y cierre formal
  autorizado por el usuario. QA técnico previo conservado: 20 focalizados PASS,
  verify 405 PASS, cero failures/errors/skipped; sin repetir suites.
- **Tarifas aprobadas GTQ/noche:** STANDARD/CLASSIC/STD/KING/TWIN Q650 (65000);
  DELUXE/DLX Q850 (85000); SUITE Q1200 (120000).
- **Alcance:** cierre documental únicamente en AlanPlan/AlanHandoff; código e
  historial previo conservados. Rama feature/backend-public-availability;
  sin commit/push. Incremento público superior PENDIENTE; A2/A3 no iniciadas.
- **Validación:** git diff --check PASS; git status revisado, conservando los tres
  archivos nuevos de código/tests de la implementación anterior.
- **Siguiente:** A1 cerrada; esperar autorización para otra tarea, sin avanzar a A2.

## Reserva pública — A1: tarifas demo autoritativas (2026-10-06)

- **Estado:** EN_QA; A1 implementada, QA técnico PASS; confirmación manual del usuario
  pendiente. Alcance A1 explícitamente autorizado. Incremento público
  superior PENDIENTE; A2/A3 no iniciadas. Historial Auth/Account conservado.
- **Rama/base:** feature/backend-public-availability, HEAD cae59de; árbol inicial
  limpio. Sin commit/push/merge.
- **Decisión / inspección:** GTQ y tarifas aprobadas por el usuario; RoomType.code
  es identidad de catálogo por propiedad, independiente de UUID/nombre. Fixtures
  STD, DLX, SUITE, KING y TWIN; PostgreSQL de aplicación consultado en lectura:
  cero RoomTypes. Sin seeds/migraciones de tipos ni nuevos registros de catálogo.
  KING/TWIN base Q650 explícita; tabla completa y códigos QA excluidos en AlanPlan.
- **Entrega:** DemoRatePolicy en inventory/application, reusable por Availability
  y Booking futuros; MonetaryAmount/MinorUnits existentes, rango StayDateRange,
  noches calendario y multiplicación exacta long. Sin precio externo, impuestos,
  descuentos, temporadas ni promociones. Error DEMO_RATE_NOT_CONFIGURED explícito.
- **Pruebas / evidencia:** mvn -B --no-transfer-progress -Dtest=DemoRatePolicyTests
  test: 20 PASS. mvn -B --no-transfer-progress verify: 405 PASS, cero
  failures/errors/skipped, BUILD SUCCESS (1m11s). Maven 3.9.11/Java 21/PostgreSQL
  17.11 efímero, Compose pms-public-a1-qa independiente, sin exclusiones.
  Casos: ocho códigos, totales 65000/255000/240000, GTQ, fechas iguales/invertidas,
  códigos sin tarifa/nombres engañosos, independencia UUID/propiedad/nombre y
  rango amplio exacto en long. Bytecode multiplyExact(JJ)J sin float/double;
  git diff --check PASS y archivos nuevos revisados sin staging. Logs sanitizados:
  /tmp/pms-public-a1-focused.log y /tmp/pms-public-a1-verify.log.
- **Límite:** ningún endpoint, SecurityConfiguration ni OpenAPI modificado;
  sin integración A2/A3 ni cambios en Auth/Account. Catálogo local vacío: A1 no
  implica disponibilidad pública consumible. code es editable; renombrarlo a un
  código no configurado falla explícitamente hasta revisar el mapeo.
- **Siguiente:** revisión/QA A1 del usuario: confirmar tabla de tarifas y ejemplos
  de totales; no hay QA HTTP aplicable. No marcar COMPLETADA hasta confirmación.
  Trabajo detenido al finalizar A1; no avanzar a A2.

## BE-005-AUTH-API-01 / BE-004-ACCOUNT-SUMMARY-01 — Cierre QA manual final (2026-10-06)

- **Estado:** ambos incrementos **COMPLETADA**, por confirmación manual final
  real del usuario y autorización explícita de cierre documental.
- **BE-005-AUTH-API-01:** Google real → callback → /cuenta reconocida sin reload,
  Guest session 200, refresh, logout UI y sesión revocada 401 PASS; Staff
  login/session/refresh/logout PASS. BFF consume login/me/logout/refresh explícitos.
- **BE-004-ACCOUNT-SUMMARY-01:** GET BFF account summary 200 y dashboard con datos
  reales PASS; ausencia de perfil/reservas correcta, logout deja summary/session
  en 401 y QA visual del rediseño PASS.
- **Evidencia previa conservada:** verify Backend 385 PASS; última suite Web
  1056 PASS/214 archivos, 73 pruebas Account/Auth relevantes, typecheck/lint/build
  PASS; OpenAPI y stack integrado validados en las entregas anteriores.
  No se vuelven a ejecutar suites ni se atribuye al agente el QA manual del usuario.
- **Alcance de cierre:** únicamente AlanPlan/Handoff, documentos 40/41/42 y
  documentación Web Account. Contratos, código, auth, cookies y secretos intactos.
  Las entradas siguientes permanecen sin alteración como historial.
- **Siguiente:** ambos incrementos cerrados; esperar autorización para otra tarea.
  Sin commit, push ni merge.

## BE-004-ACCOUNT-SUMMARY-01 — Account Summary Guest real (2026-10-06)

- **Estado:** EN_QA tras DoR READY, implementación y evidencia automatizada.
  Incremento independiente; AUTH-API-01 permanece EN_QA. Ninguno COMPLETADA
  sin confirmación manual final del usuario.
- **Rama/base:** feature/backend-guest-account-summary-01, HEAD 9ade01d.
  Working tree previo inspeccionado/preservado por snapshot de hashes, sin stash
  ni commit/push/merge, secretos o cambios a .env.
- **Contrato:** [42](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md): GET Guest/BFF
  summary desde GuestPrincipal exclusivamente; perfiles asociados, vínculos OTP
  reales y próxima estancia confirmada. DTO/UI adaptados, OpenAPI mismo alcance.
- **Fuentes:** GuestAccount y relación GuestProfile persistente N; L-02/L-07
  exigen vínculo específico guest_reservation_links, nunca email/perfil compartido.
  No contratos Guest comerciales/fiscales/mensajería, quedan fuera del response.
- **Entrega:** cuenta propia, perfiles N sin seleccionar principal, count de
  vínculos OTP y primera estancia RESERVED de reserva CONFIRMED desde hoy
  según timezone property. Snapshot REPEATABLE_READ entre lecturas. No campos
  comerciales/fiscales/mensajería; UI honesta sin placeholders; mocks preservados.
  BFF fijo/same-origin, cookie Guest, 401/503, whitelist incluso anidada.
- **Pruebas:** 31 Backend focalizados, verify final 385 PASS sin exclusiones;
  120 Web relevantes/20 archivos y suite 1055 PASS/214. Typecheck/lint/build y
  git diff --check PASS. Firma StaffPrincipal de fixture ajustada a código actual;
  nullabilidad OpenAPI corregida con customizer acotado y prueba estructural.
- **OpenAPI/runtime:** 35/25/32/10, diez tests de contrato, mismo paths/components
  en test/live; summary security/header/200/401 y cinco legacy deprecated PASS.
  Web/Swagger/doc/config 200, summary sin cookie/JWT 401, backend:8080 accesible.
  Root stack reconstruido y tres servicios healthy; volumen/.env preservados.
  PostgreSQL tests efímero retirado, Compose verify intacto. No cambios Auth,
  JWT/cookies/filtros ni migraciones, comprobados por hashes.
- **Evidencia:** [42](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md), C3 y Account Web
  33 actualizados; QA 41 muestra inventario actual sin atribuir summary a AUTH.
  Logs /tmp/account-summary-*.log; OpenAPI integrado en target ignorado.
- **Límite/siguiente:** 200/ownership Backend probados con PostgreSQL, BFF/UI
  con tests HTTP/MSW; stack vivo validado solo anónimo/infraestructura/contrato.
  No nuevo consentimiento Google ni sesión fabricada. QA manual Google →
  summary 200 → dashboard → logout, y regresión Staff/Swagger pendiente;
  mantener ambos incrementos EN_QA hasta PASS final.

## BE-005-AUTH-API-01 — Hidratación Guest UI/BFF (2026-10-06)

- **Estado:** EN_QA; QA previo del usuario Staff/Google real PASS conservado.
  El bug funcional final requiere nuevo PASS manual callback → cuenta → logout.
- **Causa confirmada:** working tree tenía provider en memoria, account=null
  y simulateGuestAccess, sin GET BFF después del callback. El gate interpretaba
  null como signed-out. AuthSocialButtons no existe en Web actual; Google real
  ya tenía enlace BFF en el paso social, ahora inicia desde la opción inicial.
- **Cambio:** nuevo DTO/modelo/mapper/service de sesión real con
  guestAccountId/sessionId/email/context=GUEST. Query guest-session al montar,
  200 hidrata; checking sin flash; solo 401 signed-out; 503/red/contrato inválido
  error recuperable. No ExternalIdentity inventada ni tokens/state/storage.
  DELETE BFF en logout; éxito cancela lecturas y limpia Guest, preservando Staff.
  Fallo conserva estado/retry. Cookies, refresh y Google callback intactos.
- **Mock:** simulateGuestAccess y modelo/fixtures completos conservados.
  Correo simulado solo mock; ningún Apple real. Dos consumidores de account
  toleran identidades desconocidas sin atribuir correo/Google a la sesión real.
- **Pruebas:** 95 auth/BFF/provider PASS; suite completa 1026 PASS/211 archivos,
  13 casos nuevos real/SSR/errores/logout/Google/mock y siete del mapper.
  Typecheck/lint/diff --check PASS; build Web PASS y tres servicios healthy.
  HTTP Web /cuenta y /acceso 200/checking sin flash SSR; Guest sin cookie 401;
  Swagger/doc/config 200, cinco explícitos/cinco deprecated y security 34/24.
  Hashes de preservación PASS. Solo Web reconstruida con --no-deps.
  Logs /tmp/guest-hydration-*.log, sin secretos en evidencia.
- **Límite:** resumen /account/summary provisional sin mapping Backend/BFF.
  El gate permite la cuenta autenticada; la carga de datos de resumen puede
  fallar, sin significar signed-out. Se documenta sin ampliar el incremento.
- **Preservación:** Backend/src, lib/bff y .env sin cambios; no verify Backend
  nuevo (374 PASS previos históricos), no contrato HTTP nuevo/alterado.
  Documentos 40/41 y AlanPlan actualizados. Sin commit/push/merge.
- **Siguiente:** QA final humano sobre Web actualizada, sin reload manual
  después del callback y con logout desde UI; mantener EN_QA hasta confirmación.

## BE-005-AUTH-API-01 — Migración mínima BFF a explícitos (2026-10-05)

- **Estado:** EN_QA; no COMPLETADA. Usuario confirma QA manual previo PASS:
  Staff BFF login/sesión/refresh/logout; Guest Google real login/session 200/
  refresh 200/session 200/logout 204/session 401. Conservar esa evidencia; falta
  confirmación final de la compilación posterior a esta corrección autorizada.
- **Inspección:** working tree actual contenía cinco llamadas legacy en los dos
  session/route.ts Web; controllers actuales ya ofrecen login/me/logout/refresh.
  Rama/base feature/backend-explicit-auth-api-01, HEAD 9ade01d; cambios previos
  intactos, sin secretos/.env/commit/push/merge ni cambio de otras tareas.
- **Cambio:** Staff POST session → POST login, GET session → GET me,
  DELETE session → POST logout; Guest GET session → GET me y DELETE session →
  POST logout. Browser conserva session/refresh, DTOs/status y cookies/error
  handling. Refresh y Google start/exchange intactos. Legacy Backend conservado
  y deprecated solo en metadata OpenAPI; código Backend/helpers sin cambios.
- **Tests Web:** test nuevo auth-routes.test.ts con 37 casos; Vitest alias
  server-only solo para tests usando marker server-side de Next existente.
  Relevantes **62 PASS** (siete archivos), suite completa **1006 PASS** (209
  archivos), typecheck y lint PASS. Tipos .next obsoletos apuntaban a ruta antigua;
  next typegen regeneró artefactos y next-env original se preservó; no cambios
  tsconfig/rutas para evitar el error. `git diff --check` PASS.
- **OpenAPI:** GET vivo 200, paridad 34/24, explícitos/security presentes y
  exactamente cinco legacy deprecated. Hashes comprueban Backend/src y lib/bff
  intactos durante esta corrección. No repetir verify Backend; 374 PASS previos
  conservados como evidencia histórica, sin atribuir una nueva corrida.
- **Docs/evidencia:** tabla de mappings y QA final en docs 40/41, AlanPlan;
  logs locales /tmp/bff-explicit-web-tests.log, bff-explicit-web-suite.log,
  bff-explicit-typegen.log, bff-explicit-typecheck.log y bff-explicit-lint.log.
- **Runtime/evidencia adicional:** solo Web reconstruida con --no-deps, healthy;
  Backend/PostgreSQL no reiniciados. Smoke integrado Staff directo/BFF y
  refresh/logout/revocación PASS; Web/Swagger/doc/config 200. Google start y
  callback inválido mantienen comportamiento; Google real ya tuvo PASS manual
  previo y queda pendiente la confirmación final tras migración. Logs locales
  /tmp/bff-explicit-web-build.log y bff-explicit-http-smoke.log.
- **Siguiente:** QA manual final Staff/Guest de targets migrados sobre Web ya
  reconstruida; mantener EN_QA hasta confirmación. Sin bloqueos de código.

## BE-005-AUTH-API-01 — Stack local integrado canónico (2026-10-05)

- **Estado:** EN_QA; inspección/plan mínimo presentados e implementación posterior
  autorizada por el usuario. Esperar QA manual final Staff/Google/Swagger.
  Rama/base feature/backend-explicit-auth-api-01, HEAD 9ade01d; todo el trabajo
  previo preservado; sin commit/push/merge ni avance de otras tareas.
- **Entrega:** compose.yaml raíz conserva postgres/backend/web y publica Backend
  solo en 127.0.0.1:${PMS_BACKEND_PORT:-8081}; BFF mantiene backend:8080 y Backend
  postgres:5432. PMS_WEB_PUBLIC_URL usa entorno o el puerto Web configurado.
  .env.example alineado a Web 3001/Swagger 8081, mocks false y bootstrap sintético
  local opt-in, sin credenciales activas por defecto. .env existente preservado.
- **Aislamiento:** compose.bd2-test.yaml vuelve a ser exclusivamente postgres/
  verify originales; manual-qa se conserva aparte en compose.auth-manual-qa.yaml.
  Puertos 18085/18086 son evidencia aislada. Demo conserva solo su 18080 mediante
  override de ports, evitando heredar 8081. No cambio de código BFF/auth/JWT/
  cookies ni contratos HTTP; DEC-B-003 registra publicación local autorizada.
- **Pruebas:** config raíz/.env válido sin imprimir secretos; comando exacto
  `docker compose --env-file .env up -d --build` PASS; postgres/backend/web
  healthy. Web/Swagger/doc/config HTTP 200 en 3001/8081. DNS y HTTP interno desde
  Web a backend:8080 200; datasource Backend a postgres interno confirmado.
- **Staff real del entorno:** login/me/logout directo 201/200/204 y me revocado
  401; BFF POST/GET/refresh/DELETE session PASS, cookies HttpOnly/Lax y JSON sin
  tokens; Backend del mismo stack rechaza el access revocado. Identidad y volumen
  existentes preservados; no se imprimen contraseñas ni valores de cookies.
- **Google preflight:** variables presentes solo en Backend; BFF start 307 hacia
  Google con redirect_uri al Web 3001, state/nonce/PKCE. Hash de state confirmado
  en guest_oidc_transactions de este PostgreSQL; callback sintético inválido
  retorna al origen Web correcto y no crea cookies. Consentimiento/retorno Google
  válidos no ejecutados; no se presentan como login Guest manual PASS.
- **Regresión:** verify completo **374 PASS**, BUILD SUCCESS, cero failures/
  errors/skipped, Java 21/PostgreSQL 17 aislados. OpenAPI generado e integrado
  con paths/components iguales, 34 operaciones/24 paths. Compose de tests con
  servicios/cache idénticos a HEAD y cero cuentas local_staff/qa_staff en la BD
  automatizada; ejemplos sin secretos y bootstrap opt-in. Proyecto verify temporal
  detenido al terminar, stack raíz conservado healthy. `git diff --check`, sintaxis Compose y enlaces PASS.
- **Docs/evidencia:** README, docs/13_LOCAL_INTEGRATED_STACK.md, DEC-B-003,
  preflight 32, QA 41, documento 40/AlanPlan actualizados. Artefacto ignorado
  target/openapi-integrated-stack.json; logs locales /tmp/pms-integrated-up.log,
  pms-integrated-smoke.log y pms-integrated-verify.log, sin secretos en evidencia.
- **Siguiente:** usar stack raíz activo para QA final Staff y Google por Web/BFF;
  confirmar PASS antes de cerrar. Entornos de pruebas no condicionan el integrado.

## BE-005-AUTH-API-01 — QA manual Staff determinista (2026-10-05)

- **Estado:** EN_QA; mejora del entorno autorizada por el usuario. Esperar nueva
  confirmación de QA manual PASS; no COMPLETADA. Rama/base sin cambios:
  feature/backend-explicit-auth-api-01, HEAD 9ade01d; trabajo previo preservado.
- **Entrega:** compose.bd2-test.yaml agrega profile manual-qa con servicios
  manual-backend/manual-postgres. Reutiliza Dockerfile y bootstrap Staff existente
  mediante PMS_BOOTSTRAP_ADMIN_USERNAME/EMAIL/PASSWORD; usuario qa_staff, email
  qa_staff@example.test y password público sintético/disposable documentado en
  [guía 41](41_EXPLICIT_AUTH_ENDPOINTS_QA.md), exclusivo de este QA. PostgreSQL
  manual en tmpfs y BD distinta; Backend solo 127.0.0.1:18086.
- **Aislamiento:** postgres/verify efectivos idénticos a HEAD; profile default
  sin servicios manuales y sin variables bootstrap en verify. Sin .env/secretos,
  defaults de aplicación, lógica alternativa de usuarios ni cambio API/OpenAPI.
- **Pruebas reales:** BD manual vacía (cero tablas públicas) → exactamente un
  qa_staff SUPER_ADMIN, una membership y un evento bootstrap. Reinicio Backend
  conserva ID/hash/fecha; no duplica ni sobrescribe. HTTP login 201 → me/session
  200 iguales → logout 204 → me/refresh 401; tras reinicio y legacy PASS.
- **Regresión:** `mvn -B --no-transfer-progress verify` completo **374 PASS**,
  BUILD SUCCESS, cero failures/errors/skipped; Java 21/PostgreSQL 17. BD verify
  separada con cero qa_staff tras la suite. Tmpfs real y PostgreSQL sin host port
  comprobados. Doc/UI/config 200; paths/components 34/24 iguales a tests y sin
  credenciales QA en OpenAPI. `git diff --check`, Compose y enlaces PASS.
- **Evidencia:** target/openapi-manual-qa.json; logs locales
  /tmp/explicit-auth-manual-start.log, explicit-auth-manual-smoke.log y
  explicit-auth-manual-verify.log. Guía 41 con comando único, credenciales
  sintéticas, pasos Swagger y reinicio/reset. Documento 40/AlanPlan actualizados.
- **Runtime/siguiente:** QA manual saludable disponible en localhost:18086;
  solo la BD automatizada de esta validación se retiró. Servicio previo en 18085
  y entornos habituales intactos. Ejecutar login/me/logout en Swagger y confirmar
  PASS; mantener EN_QA, sin commit/push/merge ni avance a otro incremento.

## BE-005-AUTH-API-01 — Entrega EN_QA (2026-10-05)

- **Estado:** EN_QA; implementación/automatizados y smoke HTTP PASS. Pendiente
  QA manual del usuario; no COMPLETADA. Owner Alan / BD1; reviewers Web/BFF y
  Android colaborativos, revisión local Codex.
- **Rama/base:** `feature/backend-explicit-auth-api-01`, HEAD `9ade01d`;
  registro READY preexistente conservado; sin commit/push/merge, migraciones,
  dependencias, cambios de Frontend/BFF ni estado de otros incrementos.
- **Entrega:** cinco aliases Auth delegando en los handlers originales, con
  mismos DTOs/status/reglas/JWT/cookies/permisos/scope/auditoría. Solo matcher
  adicional POST Staff login sin Bearer. Cinco legacy deprecated en metadata
  OpenAPI, sin retirada/redirect; Google sigue siendo el login Guest.
  Addenda C1/C2/C3, inventario 39, documento 40, colección y guía QA 41.
- **Pruebas:** focalizados **56 PASS** (nueve HTTP, nueve OpenAPI y regresión);
  `mvn -B --no-transfer-progress verify` completo **374 PASS**, BUILD SUCCESS,
  cero failures/errors/skipped. Docker pms_explicit_auth aislado, Java 21 y
  PostgreSQL 17; primera corrida corrigió solo flush de fixture transaccional.
- **OpenAPI/HTTP real:** 34 operaciones/24 paths/29 schemas/nueve tags, cinco
  deprecated y cuatro operaciones sin credencial previa/30 protegidas; paridad
  exacta sin exclusiones. JAR QA en 127.0.0.1:18085: doc/UI/config 200 y
  paths/components idénticos a tests. Cuatro combinaciones Staff login/logout
  nuevo/legacy, igualdad me/session, refresh/revocación y negativos Auth PASS.
- **Evidencia regenerable:** target/openapi-generated.json,
  target/openapi-application-mappings.txt, target/openapi-explicit-auth-qa.json;
  logs locales /tmp/explicit-auth-focused.log, explicit-auth-verify.log y
  explicit-auth-http-smoke.log. JSON/scripts colección y enlaces PASS; carpetas
  previas intactas y variables sensibles vacías. Once cuerpos Auth originales
  idénticos a HEAD; diff revisado y `git diff --check` PASS.
- **Hallazgo conservado:** validación JSON Staff genera 400 MVC/MockMvc; Servlet
  redispatcha a /error protegido y devuelve 401 vacío en login y sessions.
  Metadata/QA y test HTTP real documentan la equivalencia; no cambia /error.
- **Entorno temporal:** JAR y PostgreSQL del proyecto pms_explicit_auth detenidos
  al finalizar; guía 41 permite recrear QA. Otros contenedores no intervenidos.
- **Límites/siguiente:** Guest autenticado cubierto con PostgreSQL y cliente
  Google de prueba; no Google externo vivo ni QA manual del usuario acreditados.
  Ejecutar [guía QA específica](41_EXPLICIT_AUTH_ENDPOINTS_QA.md) y confirmar
  PASS para cierre; mantener EN_QA, sin avanzar ni publicar.

## BE-005-AUTH-API-01 — Inicio de implementación (2026-10-05)

- **Estado:** EN_PROGRESO; implementación exclusiva autorizada por el usuario.
- **Rama/base:** `feature/backend-explicit-auth-api-01`, HEAD `9ade01d`;
  rama nueva desde la base local actual, conservando el registro READY previo
  en AlanPlan/AlanHandoff/documento 40. Sin commit/push/merge.
- **Alcance:** cinco aliases Auth, metadata OpenAPI, tests HTTP/contrato,
  colección y guía QA; mismos servicios/DTOs/reglas. Otros incrementos intactos.
- **Siguiente:** implementar y validar focalizados, verify completo y Swagger;
  entregar EN_QA hasta QA manual PASS del usuario.

## BE-005-AUTH-API-01 — Definición de rutas Auth explícitas (2026-10-05)

- **Estado:** READY; DoR completo, solo planificación/documentación. Owner
  Alan / BD1; reviewers Web/BFF y Android colaborativos; revisión local Codex.
- **Rama/base:** `feature/backend-explicit-auth-endpoints`, HEAD `9ade01d`;
  árbol limpio al iniciar. Sin implementación, commit/push/merge ni cambios
  de estado de otros incrementos; historial previo conservado.
- **Contrato/evaluación:** C1/C2/C3 aprobados y controllers actuales compatibles
  con extensión aditiva. Cinco rutas nuevas previstas, mismos servicios/DTOs/
  tokens/auditoría/reglas; Guest mantiene Google start/exchange como login real.
  Antiguos session/sessions conservados y deprecated solo en OpenAPI, sin
  retirada/redirect/cambio semántico. No existe contradicción bloqueante.
- **Registro:** [documento 40](40_EXPLICIT_AUTH_ENDPOINTS_INCREMENT.md) y AlanPlan
  definen matriz HTTP, aceptación, archivos y tests. Swagger obligatorio en el
  mismo incremento: 34 operaciones/24 paths previstos, auth/DTOs/errores/
  summaries/deprecated validados con documento real, sin exclusiones nuevas.
- **Evidencia/límites:** inspección de fuentes, controllers, servicios, DTOs,
  filtros y pruebas; registro exclusivamente documental. `git diff --check`
  PASS. Maven/Swagger HTTP/QA nuevos no ejecutados; evidencia histórica de
  OPENAPI-01 no acredita este incremento. QA manual PASS obligatorio para cierre.
- **Siguiente:** implementar exclusivamente BE-005-AUTH-API-01 cuando el usuario
  lo autorice; no iniciar otra tarea ni publicar.

## BE-005-OPENAPI-01 — Cierre con QA visual PASS (2026-10-05)

- **Estado:** COMPLETADA; QA visual/manual ejecutado y confirmado PASS por
  el usuario. Cierre exclusivo en AlanPlan/AlanHandoff; sin código funcional,
  migraciones, commit/push/merge ni cambios de estado en otros incrementos.
- **Evidencia manual confirmada:** Swagger UI carga sin errores; nueve tags
  y 29 operaciones visibles; paridad con mappings 29/29. Bearer Staff/Guest y
  refresh cookies separados. Actuator/error no aparecen como API de negocio.
  Códigos, DTOs, parámetros, headers y nullability revisados PASS.
- **Validación previa conservada:** focalizados **68 PASS**, incluidos ocho
  tests OpenAPI; `mvn verify` completo **363 PASS**, BUILD SUCCESS, cero
  failures/errors/skipped. Smoke HTTP y artefactos permanecen registrados en
  la entrega anterior; no se repiten suites por este cierre documental.
- **Regla permanente conservada:** todo endpoint HTTP nuevo/modificado debe
  actualizar y validar OpenAPI/Swagger dentro del mismo incremento. Sigue
  vigente en backend/AGENTS.md y docs/02_API_CONTRACT_POLICY.md, sin modificar
  esas fuentes; OpenAPI desactualizado no cumple DoD y las exclusiones requieren
  justificación explícita conforme a la política existente.
- **Preservación/pruebas de cierre:** historial anterior íntegro y append-only;
  cambios preexistentes preservados. `git diff --check` PASS.
- **Siguiente:** esperar autorización para otro incremento o publicación;
  no iniciar otra tarea ni hacer commit/push/merge.

## BE-005-OPENAPI-01 — Entrega OpenAPI/Swagger EN_QA (2026-10-05)

- **Estado:** EN_QA; validación automatizada y smoke HTTP PASS. Pendiente QA
  visual/manual del usuario según DoD común; no COMPLETADA.
- **Rama/base:** chore/backend-openapi-contract-baseline, HEAD 8cb2811;
  árbol limpio al iniciar. Sin commit/push/merge; otros estados preservados.
- **Entrega:** 29 operaciones/19 paths en nueve controllers y 29 schemas,
  29/29 documentadas; auth/DTO/nullability/params/respuestas/headers/límites
  actualizados, BFF interno distinguido de Staff. Regla breve en AGENTS y
  política detallada en 02; inventario/fuentes/QA en
  [39_BACKEND_OPENAPI_BASELINE.md](39_BACKEND_OPENAPI_BASELINE.md).
- **Seguridad:** Bearer Staff/Guest y cookies refresh separados, sin valores de
  credenciales/PII en ejemplos. 26 operaciones protegidas, tres sin credencial
  previa; Actuator/error no son negocio; ninguna exclusión de aplicación.
- **Pruebas reales:** focalizados **68 PASS**, incluidos ocho tests OpenAPI;
  `mvn verify` completo **363 PASS**, BUILD SUCCESS, 0 failures/errors/skipped.
  JAR QA: GET /v3/api-docs, /swagger-ui/index.html y swagger-config **200**;
  paths/components idénticos a tests. Artefactos regenerables en target y
  logs locales /tmp/openapi-focused.log, openapi-verify.log, openapi-http-smoke.log.
- **Preservación:** comparación lexical de 31 archivos Java de aplicación con
  HEAD, sin anotaciones Swagger/imports/whitespace/comentarios, PASS. Sin cambios
  funcionales HTTP/seguridad/negocio, persistencia/migraciones o dependencias.
  `git diff --check` PASS; historia anterior intacta; QA temporal detenido.
- **Gaps/siguiente:** sin gaps bloqueantes de endpoints actuales. QA visual
  Swagger del usuario según documento 39; esperar PASS, sin iniciar otra tarea.

## BE-005-OPENAPI-01 — Inicio de baseline OpenAPI (2026-10-05)

- **Estado:** EN_PROGRESO; puesta al día autorizada por el usuario.
- **Rama/base:** chore/backend-openapi-contract-baseline, HEAD 8cb2811;
  árbol limpio al iniciar. Sin commit/push/merge.
- **Baseline:** 29 operaciones en 9 controllers, presentes en /v3/api-docs
  3.1.0. Auth/respuestas/params/schemas requieren actualización; sin código
  de negocio, seguridad funcional, migraciones ni endpoints nuevos.
- **Siguiente:** documentar y validar paridad/auth/DTO/respuestas, focalizados
  y verify completo; registrar inventario/gaps y entregar EN_QA.

## BE-008B-AUTH-03 — Cierre con QA manual PASS (2026-10-05)

- **Estado:** COMPLETADA; QA manual ejecutado y confirmado PASS por el usuario.
  Rama feature/bd1-staff-auth-audit-emitter-attribution, base 6f03373. Cierre
  documental exclusivo de AUTH-03; sin código funcional/migraciones ni
  commit/push/merge. Otros estados intactos.
- **Evidencia manual confirmada:** login 201, refresh 200, logout 204; bootstrap
  SYSTEM + ORGANIZATION correcto; eventos de sesión con actorContext=STAFF y
  actorId=staff_user_id; todos los eventos inspeccionados expected=t;
  bootstrap_count=1. UPDATE rechazado con P0001; DELETE rechazado con P0001;
  all_fields_preserved=t. INSERT legacy permitido sin atribución automática;
  legacy_unattributed=t; rollback limpio con after_rollback=0, según guía 38
  y confirmación del usuario.
- **Pruebas previas conservadas:** 26 focalizados PASS y verify completo 355
  PASS, cero failures/errors/skipped en PostgreSQL 17.11/Java 21.0.9. No se
  repiten pruebas por el cierre documental. Git diff --check PASS; CI remoto
  no ejecutado porque no se publicó la rama.
- **Límites:** cierre de los emisores seleccionados; proyección/consulta,
  C6-D06 y el resto de BE-008B conservan pendientes. Historial previo intacto;
  reviews colaborativos conforme al DoD común.
- **Siguiente:** esperar autorización para acordar otro incremento; no iniciar
  ni marcar READY otra tarea. Publicación requiere autorización explícita.

## BE-008B-AUTH-03 — Entrega en QA (2026-10-05)

- **Estado:** EN_QA; implementación y validación local PASS, QA manual del
  usuario pendiente; no COMPLETADA. Rama feature/bd1-staff-auth-audit-emitter-attribution,
  base 6f03373. Registros previos preservados, sin commit/push/merge.
- **Implementado:** fábricas de AuthAuditEvent con constructor legacy intacto.
  Login/refresh/logout válidos registran STAFF + identidad validada; sujeto
  sigue staff_user_id, session_id interno y scope/organización/property/
  correlation NULL. Bootstrap registra SYSTEM/actor_id NULL, organización
  explícita usada por membership y ORGANIZATION/property NULL/correlation NULL.
  Logout revalida principal/sesión antes de atribuir; bootstrap hace flush del
  Staff JPA antes de membership JDBC, sin cambiar límites de transacción.
  Login fallido/refresh rechazado conservan eventos legacy sin atribución;
  C6-D06 no se corrige. Sin migraciones, backfill, API/BFF/consulta o permisos.
- **QA automatizado:** 26 focalizados PASS (8 emisores nuevos + 9 AUTH-02 +
  7 AUTH-01 + upgrade Reservations + seguridad HTTP). Verify completo 355 PASS,
  cero failures/errors/skipped, BUILD SUCCESS en PostgreSQL 17.11/Java 21.0.9
  con compose.bd2-test.yaml, proyecto pms_bd1_authemit. Primera corrida detectó
  INSERT JPA pendiente antes de membership JDBC en bootstrap; corregido con
  saveAndFlush y repetidos todos los focalizados PASS. Pruebas negativas
  capturan eventos intentados y revertidos, sin atribuir ni acreditar C6-D06.
- **Guía/evidencia:** docs/38_BD1_STAFF_AUTH_AUDIT_EMITTER_QA.md comprobada
  usando JAR real y credenciales sintéticas en localhost:18083: login 201,
  refresh 200, logout 204; cuatro emisores con expected=true;
  bootstrap_count=1; UPDATE/DELETE P0001, registro íntegro; constructor/INSERT
  legacy sin atribución y rollback limpio con count=0. Comparación contra
  HEAD confirma migraciones/changelogs intactos. Git diff --check PASS.
- **Límites/revisión:** la comprobación local de la guía no sustituye QA manual
  del usuario. CI remoto no ejecutado: rama sin publicar. Reviewers BD2/BD3
  colaborativos conforme al DoD común. Otros incrementos conservan estado.
- **Siguiente:** usuario ejecuta guía 38 y confirma QA manual PASS; mantener
  EN_QA hasta entonces. App/base QA aisladas disponibles; no iniciar otra
  tarea ni publicar sin autorización.

## BE-008B-AUTH-03 — Inicio de implementación (2026-10-05)

- **Estado:** EN_PROGRESO; implementación exclusiva autorizada.
- **Rama/base:** feature/bd1-staff-auth-audit-emitter-attribution, HEAD 6f03373;
  rama existente al iniciar, registros documentales previos preservados.
- **Alcance:** actor Staff en login/refresh/logout válidos; SYSTEM/org explícita
  en bootstrap. Sin atribuir fallos/rechazos, backfill, migraciones, HTTP ni C6-D06.
- **Siguiente:** focalizados y verify completo; entregar EN_QA con guía manual,
  sin commit/push/merge ni cierre antes de QA manual del usuario PASS.

## BE-008B-AUTH-03 — DoR de atribución en emisores Staff (2026-10-05)

- **Estado:** READY; planificación/documentación solamente. DoR completo para
  este incremento mínimo, sin código iniciado. Owner Alan / BD1; reviewers
  BD2/BD3 colaborativos conforme al DoD común.
- **Base/evidencia:** AUTH-02 COMPLETADA y QA manual PASS; C6-D01/D02/D03
  aprobadas; C6-D06 queda fuera de alcance; auth_audit_events dispone de seis columnas nullable y protección
  append-only. Inventario contrastado con StaffAuthServiceImpl,
  StaffJwtAuthenticationFilter, StaffAuthController,
  StaffBootstrapConfiguration, seed de organizations y C6. La fuente de
  correlation no está implementada en estos emisores; scope/property no se
  adivinan para operaciones de sesión.
- **Emisores incluidos y mapa:**
  - STAFF_LOGIN_SUCCEEDED: organización/property/scope/correlation NULL;
    actor STAFF, ID desde StaffUser.id después de password y estado activo
    validados; staff_user_id permanece sujeto. UUID puede coincidir porque es
    login propio, pero actor no se deduce de la columna de sujeto.
  - STAFF_REFRESH_ROTATED: org/property/scope/correlation NULL; actor STAFF,
    ID desde Staff de la sesión solo tras validar token hash, refresh, sesión y
    usuario activos; sujeto sigue staff_user_id.
  - STAFF_SESSION_REVOKED por logout: org/property/scope/correlation NULL;
    actor STAFF desde principal autenticado/revalidado y ligado a esa sesión;
    sujeto sigue en staff_user_id.
  - STAFF_BOOTSTRAP_CREATED: organization_id
    4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1, mismo UUID explícitamente asignado
    por bootstrap a la membresía SUPER_ADMIN; scope ORGANIZATION, property
    NULL; actor SYSTEM y actor_id NULL; correlation NULL; sujeto Staff creado
    en staff_user_id.
- **Emisores excluidos:** STAFF_LOGIN_FAILED y revocación con causa
  refresh_rejected permanecen fuera por C6-D06, que exige preservar fallo/
  rechazo fuera del rollback que acompaña 401. No inferir actor/org/property
  desde username, session_id, claims no revalidados, body o memberships.
  Otras revocaciones administrativas no tienen emisor actual.
- **Acceptance/pruebas/archivos:** eventos incluidos guardan el mapa anterior,
  sujeto y códigos legados intactos, sin duplicar eventos; login/refresh/logout
  real, bootstrap semilla SYSTEM/org, nulos de correlación/scope, upgrade,
  append-only y regresión Staff. Java/PostgreSQL focalizados + verify completo y
  QA manual del usuario. Archivos previstos: StaffAuthServiceImpl,
  StaffBootstrapConfiguration, AuthAuditEvent, tests de integración y guía;
  sin SQL/HTTP/permiso/BFF/consulta.
- **DoR:** no falta decisión de negocio o contrato para el alcance. Scope nulo
  en sesiones evita atribuir una propiedad/organización no seleccionada; el
  bootstrap sí da org explícita por su membership en el UUID semillado. NULL
  correlation refleja que no existe correlación en el emisor. Mantener READY;
  sin asignar otro ID ni cambiar estados de otras tareas.
- **Siguiente:** implementar solo AUTH-03 en rama nueva desde la base actual al
  autorizarse. Proyección/consulta administrativa conserva DoR propio pendiente.

## BE-008B-AUTH-02 — Cierre con QA manual PASS (2026-10-05)

- **Estado:** COMPLETADA; QA manual ejecutado y confirmado PASS por el usuario.
  Rama `feature/bd1-staff-auth-audit-attribution`, base `8e7c6ce`; cierre solo
  documental, sin código/migraciones ni commit/push/merge. Otros estados intactos.
- **Evidencia manual confirmada:** changeset `003-staff-auth-008` EXECUTED;
  seis columnas nuevas presentes, nullable y sin defaults; constraints de scope
  y actor presentes; INSERT legacy permitido e INSERT con atribución válida
  permitido; staff_user_id y actor_id permanecen separados. scope_kind inválido
  y actor_context inválido rechazados, cada uno con SQLSTATE 23514; UPDATE
  rechazado con P0001; DELETE rechazado con P0001; registro preservado y
  rollback final limpio con count=0, según guía 37 y confirmación del usuario.
- **Pruebas previas conservadas:** 17 focalizados PASS y verify completo 347
  PASS, cero failures/errors/skipped, PostgreSQL 17.11/Java 21.0.9. No se
  ejecutan de nuevo por el cierre documental. `git diff --check` PASS;
  CI remoto no ejecutado porque la rama no se publicó.
- **Límites:** cierre exclusivo de persistencia AUTH-02; no completa BE-008B,
  atribución por emisores, proyección/consulta administrativa, API/BFF ni C6-D06.
  Revisiones BD2/BD3 colaborativas según DoD común; historial previo intacto.
- **Siguiente incremento según plan/fase 1:** preparar continuidad BE-008B de
  atribución a eventos Staff nuevos sobre la persistencia disponible. DoR aún
  incompleto: falta definir/registrar mapeo por emisor de organización,
  PROPERTY/ORGANIZATION, actor confiable separado del sujeto y correlación,
  con aceptación, archivos y pruebas. C6 fija el sobre conceptual, no ese
  mapeo operativo. No asignar ID ni inferir atribución/backfill; no incluir
  C6-D06 automáticamente. Consulta/API conservan sus contratos propios.
  No hay otro incremento Backend READY registrado: no se inicia ni cambia
  otro estado. Publicación requiere autorización explícita.

## BE-008B-AUTH-02 — Entrega en QA (2026-10-05)

- **Estado:** EN_QA; implementación y validación local PASS, QA manual del
  usuario pendiente. No marcar COMPLETADA; sin commit/push/merge.
- **Rama/base:** `feature/bd1-staff-auth-audit-attribution`, HEAD `8e7c6ce`;
  registros previos preservados, otros estados intactos.
- **Implementado:** changeset aditivo `003-staff-auth-008`, seis columnas
  nullable sin defaults en auth_audit_events; CHECK de scope/actor y coherencia
  de scope, FKs organización/property sin cascadas según plan. Mapeo JPA
  nullable, constructor e INSERT/emisores existentes intactos. Sujeto sigue
  staff_user_id; session_id interno; sin subject_id/subject_type, backfill,
  población de atribución, API/BFF/consulta ni C6-D06.
- **QA automatizado:** 17 focalizados PASS (9 AUTH-02 + 7 AUTH-01 + upgrade
  Reservations). `mvn -B --no-transfer-progress verify` completo: 347 PASS,
  cero failures/errors/skipped, BUILD SUCCESS en `pms_bd1_authattr` mediante
  compose.bd2-test.yaml, PostgreSQL 17.11/Java 21.0.9. Esquema vacío, master
  previo a 008 con filas legadas, checksums/upgrade/reaplicación, JPA/JDBC legacy,
  scope/actor/FKs, append-only/rollback y login/refresh/logout reales validados.
  Test upgrade AUTH-01 ajustado para incorporar los dos changesets nuevos
  sobre su fixture anterior a 007. Changesets anteriores y emisores intactos.
- **Guía:** `docs/37_BD1_STAFF_AUTH_AUDIT_ATTRIBUTION_QA.md`; bloque SQL
  comprobado en base descartable: 008 EXECUTED, seis columnas nullable sin
  defaults, sin sujeto físico nuevo; INSERT legacy con sujeto y metadata NULL;
  23514/23503 esperados, UPDATE/DELETE P0001; rollback 1→0 y legado preservado 1.
  La comprobación local no sustituye QA del usuario. Proyecto QA disponible.
- **Revisión:** `git diff --check` PASS; no cambios a APIs/emisores/migraciones
  aplicadas. CI remoto no ejecutado porque no se publicó la rama. Reviewers
  BD2/BD3 colaborativos según excepciones del DoD común.
- **Siguiente:** usuario ejecuta guía 37 y confirma QA manual PASS; mantener
  EN_QA hasta entonces. Sin iniciar otra tarea ni publicar sin autorización.

## BE-008B-AUTH-02 — Inicio de implementación (2026-10-05)

- **Estado:** EN_PROGRESO; implementación exclusiva autorizada por el usuario.
- **Rama/base:** `feature/bd1-staff-auth-audit-attribution`, HEAD `8e7c6ce`;
  se conservan los registros documentales previos. Sin commit/push/merge.
- **Alcance:** seis columnas nullable sin defaults, constraints del plan,
  mapeo JPA compatible y pruebas de instalación/upgrade/legacy/append-only.
  Sin población de emisores, backfill, API/BFF/consulta ni C6-D06.
- **Siguiente:** pruebas focalizadas y verify completo; entregar EN_QA con
  guía manual y evidencia real, sin cerrar hasta QA del usuario PASS.

## BE-008B-AUTH-02 — Decisión de sujeto resuelta y DoR READY (2026-10-05)

- **Estado:** READY; únicamente AUTH-02. Decisión del usuario aprobada y DoR
  completo, sin implementación. Owner Alan / BD1; reviewers BD2/BD3
  colaborativos según DoD común. Ningún bloqueo del alcance.
- **Rama/base verificadas:** `feature/bd1-staff-auth-audit-attribution`, HEAD
  `8e7c6ce` con AUTH-01 integrado. Rama ya existente; se conservan cambios
  documentales previos. Sin creación/cambio de rama ni commit/push/merge.
- **Decisión aprobada:** no crear subject_id/subject_type físicos.
  staff_user_id es el sujeto persistido, nunca el actor. Proyección futura:
  staff_user_id no NULL => subjectType=STAFF_USER y subjectId=staff_user_id;
  NULL => ambos NULL. No implementar la proyección en este incremento.
- **Persistencia definida:** solo organization_id UUID, property_id UUID,
  scope_kind VARCHAR(16), actor_context VARCHAR(16), actor_id UUID y
  correlation_id UUID, todos nullable y sin DEFAULT. Scope NULL o
  PROPERTY/ORGANIZATION; actorContext NULL o STAFF/GUEST/SYSTEM/UNKNOWN.
  Coherencia: scope/organización/property todos NULL, o PROPERTY con ambos IDs,
  o ORGANIZATION con organización y property NULL. FK de organización y FK
  compuesta property/organización reutilizando unicidad 003-005, sin cascadas;
  sin FK de actor/correlación ni nuevas reglas de obligatoriedad del actor.
  Detalle exacto de constraints y matriz de aceptación en AlanPlan.
- **Alcance/límites:** changeset nuevo 003-staff-auth-008 en SecurityAuth/003;
  preservar trigger/función append-only, filas, definiciones/checksums previos
  y session_id como referencia interna sensible. INSERT actuales siguen
  omitiendo campos nuevos; todos quedan NULL. Sin backfill, inferencias desde
  memberships/sujeto, población por emisores, API/BFF/consulta ni C6-D06.
- **DoR/evidencia:** dependencias BE-001/002/003, BE-008A y AUTH-01 COMPLETADAS;
  C6 y decisión explícita del usuario resuelven campos y sujeto. Esquemas,
  unicidad property/organización y changelog 003 vigentes contrastados.
  Acceptance, archivos, QA y Java 21/PostgreSQL 17 definidos; no contrato HTTP
  nuevo, módulo 008 ni decisión de negocio pendiente para este alcance.
- **Pruebas previstas:** metadata exacta de seis columnas, vacío/upgrade/
  reaplicación con filas/checksums preservados, INSERT legacy JDBC/JPA,
  fixtures de scope/actor y rechazos 23514/23503, append-only P0001,
  rollback y regresión Staff/Guest/Reservations. Focalizados y verify completo
  con Compose aislado; después QA manual del usuario para cierre.
- **Validación documental:** `git diff --check` PASS; solo AlanPlan/AlanHandoff.
  No Maven ni pruebas de implementación ejecutadas; no reutilizar evidencia
  de AUTH-01. Historial previo de BLOCKED conservado, superado por esta entrada.
- **Siguiente:** implementar exclusivamente AUTH-02 al autorizarlo el usuario;
  entrega futura EN_QA hasta QA manual confirmado PASS. Otros estados intactos.

## BE-008B-AUTH-02 — Registro de persistencia para atribución futura (2026-10-05)

- **Estado:** BLOCKED; planificación autorizada, sin implementación ni READY.
  Owner Alan / BD1; reviewers BD2/BD3 colaborativos, no causa del bloqueo.
- **Base actual:** `main` `8e7c6ce` integra AUTH-01 por PR #115; árbol limpio al
  iniciar este registro. No se crea rama de implementación. Las entradas
  históricas de AUTH-01 conservan su evidencia de entrega original.
- **Alcance:** changeset aditivo en SecurityAuth/003 sobre `auth_audit_events`
  para organización/property/scope, actor separado del sujeto y correlación.
  Preservar filas, checksums, campos originales y trigger append-only; sin
  backfill, población por emisores, módulo 008, API/BFF/consulta ni C6-D06.
- **DoR/evidencia:** BE-001/002/003, BE-008A y AUTH-01 COMPLETADAS; C6 aprobado.
  Inspección de esquemas y emisores confirma compatibilidad requerida con
  INSERT legados. AlanPlan registra la especificación parcial de columnas,
  tipos y nullability: UUID para organización/property/actor/correlación y
  varchar(16) para scope/actorContext, todos nuevos nullable y sin DEFAULT.
  Los campos originales y sus definiciones permanecen intactos; no inferir
  actor ni scope histórico. C6 no completa el mapeo de persistencia del sujeto.
- **Única decisión faltante:** catálogo de `subjectType` y correspondencia con
  `subjectId` para esta fuente; decidir reutilización de `staff_user_id` como
  sujeto Staff o columnas propias, con nombres, tipos y ausencia legada. El
  catálogo del actor no define el del sujeto. No inventar esta especificación.
- **Validación del registro:** revisión documental contra C6, changelogs
  003-001/002/005/007 y 004-005, entidad y cinco inserciones Staff;
  `git diff --check` PASS. No se ejecutó Maven para esta entrega Markdown;
  los 338 PASS de AUTH-01 no acreditan una implementación AUTH-02.
- **Aceptación futura:** vacío/upgrade/reaplicación preservan datos/checksums;
  columnas nuevas sin atribución e INSERT legados compatibles; scope/sujeto
  explícitos válidos; trigger UPDATE/DELETE y rollback intactos; regresión y
  verify Java 21/PostgreSQL 17 PASS, más QA manual confirmado por el usuario.
- **Siguiente:** resolver solo la decisión del sujeto, completar la
  especificación en AlanPlan y reevaluar DoR antes de marcar AUTH-02 READY.
  Sin código, commit/push/merge ni cambios de estado de otros incrementos.

## BE-008B-AUTH-01 — Cierre con QA manual PASS (2026-10-05)

- **Estado:** COMPLETADA; QA manual ejecutado y confirmado PASS por el usuario.
  Rama `feature/bd1-staff-auth-audit-append-only`, base `722ce96`;
  sin commit/push/merge ni cambios de código o migraciones en este cierre.
- **Evidencia manual:** changeset `003-staff-auth-007` EXECUTED, trigger presente,
  INSERT permitido, UPDATE/DELETE rechazados con P0001, conservación del
  registro y rollback limpio según `docs/36_BD1_STAFF_AUTH_AUDIT_APPEND_ONLY_QA.md`.
- **Pruebas ya validadas:** focalizados 8 PASS y
  `mvn -B --no-transfer-progress verify` 338 PASS, cero failures/errors/skipped,
  en PostgreSQL 17/Java 21. No se repiten en este cierre documental;
  `git diff --check` PASS. CI remoto no ejecutado: rama sin publicar.
- **Límites/revisiones:** cierre exclusivo de AUTH-01; resto de BE-008B y
  C6-D06 pendientes de sus incrementos. Revisiones BD2/BD3 colaborativas no
  bloqueantes salvo las excepciones del DoD común. Historial previo intacto.
- **Siguiente paso Backend:** acordar y registrar un incremento con DoR completo
  según prioridad de fase 1 (resto de BE-008B, BE-014B por dominio y BE-006B/C),
  confirmando contratos aplicables, dependencias, aceptación, archivos y pruebas.
  No hay otro incremento Backend READY registrado; no se inicia otra tarea
  ni se modifica su estado. Publicación sujeta a autorización explícita.

## BE-008B-AUTH-01 — Entrega en QA (2026-10-05)

- **Estado:** EN_QA; implementación y validación local PASS. QA manual del
  usuario pendiente; no se marca COMPLETADA ni se hizo commit/push/merge.
- **Rama/base:** `feature/bd1-staff-auth-audit-append-only`, desde `722ce96`;
  registro documental previo preservado.
- **Implementado:** changeset aditivo `003-staff-auth-007`, función y trigger
  propios sobre `auth_audit_events`: UPDATE/DELETE generan P0001; INSERT,
  rollback y registros existentes preservados. Sin cambios a emisores Staff,
  HTTP/BFF, roles/permisos ni consultas administrativas; C6-D06 sigue pendiente.
- **QA local:** 8 pruebas focalizadas PASS (7 nuevas y upgrade existente);
  `mvn -B --no-transfer-progress verify`: 338 PASS, cero failures/errors/skipped,
  BUILD SUCCESS con PostgreSQL 17/Java 21 en `compose.bd2-test.yaml`, proyecto
  `pms_bd1_authaudit`. Instalación limpia, master anterior con eventos legados,
  checksums/upgrade/reaplicación, mutaciones individuales/masivas, INSERT/rollback,
  protección Reservations/Guest y login/refresh/logout reales comprobados.
- **Guía:** `docs/36_BD1_STAFF_AUTH_AUDIT_APPEND_ONLY_QA.md`. Bloque SQL comprobado
  localmente: dos errores P0001, detalle/fecha conservados, contadores 1→0 y
  evento confirmado conservado. No sustituye QA manual del usuario.
- **Revisión:** `git diff --check` PASS; no se editaron changesets aplicados.
  CI remoto no ejecutado porque la rama no se publicó. Revisiones BD2/BD3
  colaborativas, bajo las excepciones del DoD común.
- **Siguiente paso:** el usuario ejecuta la guía y confirma QA manual; conservar
  EN_QA hasta entonces. Resto de BE-008B fuera de esta entrega.

## BE-008B-AUTH-01 — Inicio de implementación (2026-10-05)

- **Estado:** EN_PROGRESO; código autorizado por el usuario, sin commit/push/merge.
- **Rama/base:** `feature/bd1-staff-auth-audit-append-only`, desde `main`
  `722ce96`; se conservan los cambios documentales previos de AlanPlan/Handoff.
- **Alcance:** changeset 003 aditivo para impedir UPDATE/DELETE sobre auditoría
  Staff; pruebas PostgreSQL de instalación, upgrade/reaplicación, conservación,
  INSERT/rollback y regresión Staff. Sin HTTP/BFF ni cambios de Auth funcional.
- **Siguiente paso:** ejecutar pruebas relevantes y verify; dejar EN_QA con
  evidencia real y guía para QA manual del usuario.

## BE-008B-AUTH-01 — DoR de protección append-only Staff (2026-10-05)

- **Estado:** READY; planificación autorizada, sin implementación. Owner Alan / BD1;
  reviewers BD2/BD3 colaborativos bajo las excepciones del DoD común.
- **Base del registro:** `main` `722ce96`; árbol limpio al iniciar. Crear una
  rama nueva al autorizarse la implementación; no se creó rama de código.
- **DoR/evidencia:** BE-001/002/003 y BE-008A completas; C6-D01/D04 y su regla
  append-only aplicables. Tabla/emisores Staff inspeccionados: INSERT existentes,
  sin protección PostgreSQL contra UPDATE/DELETE. Patrón equivalente en 004;
  QA/CI Java 21/PostgreSQL 17 configurados. Sin decisión de negocio faltante.
- **Alcance:** changeset aditivo en SecurityAuth/003 para proteger
  `auth_audit_events`, con INSERT/rollback y datos legados preservados. Pruebas
  de persistencia, upgrade/reaplicación y regresión Staff; guía QA. Sin HTTP/BFF,
  módulo 008, lectura administrativa ni corrección C6-D06 en este incremento.
- **Validación del registro:** fuentes C6/BE-014A y esquema/emisores contrastados;
  `git diff --check` PASS; historial previo verificado intacto. Las pruebas de
  implementación aún no se ejecutaron.
- **Siguiente paso:** implementar únicamente AUTH-01 tras autorización; mantener
  EN_QA hasta QA manual ejecutado y confirmado PASS por el usuario. El resto de
  BE-008B sigue pendiente de sus incrementos; sin commit/push en este registro.

## BE-010B-ONBOOKS-01 — Actualización de seguimiento (2026-10-05)

- **Cierre técnico:** BE-010B ya está técnicamente cerrada; se conserva el estado registrado en la entrada histórica.
- **Revisiones:** BD2/BD3 y Web son seguimiento colaborativo no bloqueante. Solo pasan a bloqueo bajo las excepciones del DoD común vigente en AlanPlan.
- **Alcance:** BFF Web queda fuera del alcance Backend y corresponde a un incremento Web posterior.
- **Siguiente paso Backend:** acordar y registrar una nueva tarea con DoR completo. Actualmente no hay otro incremento Backend READY.

## BE-010B-ONBOOKS-01 — On-books diario Backend HTTP (2026-10-05)

- **Estado:** COMPLETADA e integrada en `main` por PR #109 (`7e0bda0`).
  El fix CI de conexiones quedó integrado por PR #110 (`5b2746e`). QA manual
  confirmada por el usuario; `verify-backend` y `verify-stack` de PR #109 PASS.
- **Rama/base:** `feature/bd1-daily-on-books-report` desde `main` actualizado
  `b5d6630` (PR #106 integra C7); árbol limpio al iniciar.
- **DoR:** C7 habilita On-books sin D03; Staff Auth/C2 y ATS SQL disponibles.
  Contrato HTTP Backend aprobado por usuario; BFF Web pendiente de su owner.
- **Plan/archivos:** consulta Inventory con SQL property-scoped, servicio Staff,
  controlador `GET /api/v1/reports/on-books/daily`, respuesta y errores públicos,
  pruebas PostgreSQL/HTTP, contrato doc34 y Postman BD1.
- **Implementado:** `DailyOnBooksRepository` filtra org/IDs antes de agregados
  por stay date; `DailyOnBooksService` valida sesión Staff/COMMERCIAL_MANAGE,
  PROPERTY/ALL_PROPERTIES, 366 noches/50 000 filas y porcentaje sin dividir
  por cero. HTTP exige filtros excluyentes, 400/401/403/200 y no-store;
  Postman contiene los dos modos Staff. Sin BFF Web ni CSV.
- **QA local:** 10 pruebas focalizadas PASS y `verify` completo 331 PASS,
  cero failures/errors/skipped, BUILD SUCCESS en PostgreSQL 17/Java 21.
  El PostgreSQL descartable de `compose.bd2-test.yaml` admite 200 conexiones
  para los contextos Spring y pruebas concurrentes. Guía
  `docs/35_BD1_DAILY_ON_BOOKS_QA.md`; Postman JSON y `git diff --check` PASS.
- **CI:** el primer intento de PR #109 agotó conexiones al iniciar Liquibase.
  La verificación local con PostgreSQL `max_connections=100` pasó con 331
  pruebas. PR #109 pasó `verify-backend` y `verify-stack` con el límite Hikari
  de pruebas (`d2c1a21`); PR #110 integró en `backend-ci.yml` pool máximo 2 y
  mínimo idle 0 para contener el consumo de conexiones de CI.
- **QA manual:** 200 por property y ALL_PROPERTIES; 401 sin Staff; 403 sin
  permiso, property ajena o falta de MULTI_PROPERTY_READ; 400 con scope doble
  o ausente, fechas invertidas y 367 noches. 366 noches válido; no-store, DTO,
  denominador cero y orden PASS, según confirmación del usuario.
- **Siguiente paso:** BD2/BD3 revisan paridad ATS/ReservationStay y el owner Web
  revisa el BFF. Tras esas revisiones, acordar y registrar la siguiente tarea
  Backend con DoR completo; no hay otro incremento Backend READY registrado.

## BE-010A-01 — Propuesta de reporting C7 (2026-10-04)

- **Estado:** COMPLETADA; el usuario revisó D01–D09 y aprobó iniciar On-books
  diario. Commit/push autorizados según flujo acordado.
- **Rama/base:** `feature/bd1-reporting-contract-c7` desde `main` actualizado
  `9ecd208`; PR #105 integra BE-016A y #104 Web público. Árbol limpio al iniciar.
- **DoR:** C2/BE-003 y esquemas Reservations, Inventory, Folio, Night Audit
  existentes; BE-010A puede inventariar datos y proponer fórmulas. BE-016B
  sigue separado: `.env` local carece de Resend/remitente y clave OTP; valores
  secretos no se imprimieron ni registraron.
- **Hallazgo:** stays y ATS permiten on-books por noche actual; FolioMovement
  no identifica ingreso habitación/servicio/impuesto ni business date; los
  cambios históricos y la capacidad OOO liberada no dan pace/denominador
  histórico reproducible. PAYMENT contable no equivale a capture de proveedor.
- **Alcance:** contrato `docs/33_BD1_REPORTING_CONTRACT_C7_PROPOSAL.md` con
  inventario, D01–D09, secuencia por KPI y QA. Sin API/SQL/Java ni nuevas rutas
  para la colección Postman.
- **QA local:** 9 enlaces locales, nueve decisiones D01–D09 y
  `git diff --check` PASS. QA manual de decisiones recibida; Maven no aplica:
  solo Markdown.
- **Decisiones:** D01/D02/D07/D09 aprobadas; D04 condicionada a D03; D05
  posterior; D06 parcialmente aprobada; D08 acceso inicial aprobado. CSV máximo
  366 días/50 000 filas. Primer reporte por property/stay date: físico, OOO,
  disponible, on-books y porcentaje; llegadas/salidas opcionales. No revenue.
- **Siguiente paso:** publicar la rama; tras merge, iniciar BE-010B On-books en
  rama nueva desde main actualizado y concretar contrato HTTP/BFF. D03 exige
  owner/fuente BD2/BD3 antes de métricas financieras.

## BE-016A-01 — Preflight Google/Resend de presentación (2026-10-04)

- **Estado:** COMPLETADA; QA manual confirmada por el usuario. Commit y push
  autorizados según el flujo acordado.
- **Rama/base:** `feature/bd1-presentation-google-resend-preflight` desde
  `main` actualizado `b60f465` (PR #103 integra OTP Backend); árbol limpio al
  iniciar.
- **DoR:** C3/BE-004 y BE-013B Backend integrados; adaptadores externos
  existentes. BE-016A no requiere credenciales reales para preparar el entorno.
- **Hallazgo:** el Compose habitual no pasaba
  `PMS_RESERVATION_LINK_OTP_HMAC_KEY`; la emisión OTP exige al menos 32 bytes.
- **Alcance:** passthrough de la clave OTP en Compose raíz y marcador vacío en
  `.env.example`; guía de preflight y actualización factual C3. No se agregan
  rutas HTTP, por lo que la colección Postman BD1 no cambia.
- **QA local:** `docker compose -f ../compose.yaml config --quiet`, enlaces
  locales, passthrough de clave, comando de longitud OTP con valores sintéticos
  y `git diff --check` PASS. No ejecutar Google o Resend sin
  entorno/credenciales de presentación; código/test de auth no cambia.
- **QA manual:** primera ejecución del usuario desde `backend/` con
  `-f compose.yaml` no encontró el archivo raíz; guía aclarada con los comandos
  válidos desde raíz y desde `backend/`. Repetición con
  `docker compose -f ../compose.yaml config --quiet` terminó sin errores.
- **Límites:** host, cuenta Google y buzón autorizados aún no identificados;
  login externo, cookies y recepción del correo siguen SIN VERIFICAR en BE-016B.
- **Siguiente paso:** publicar la rama; después preparar BE-016B cuando se
  identifiquen host, cuenta Google y buzón autorizados para evidencia real.

## BE-013B-BACKEND-01 — OTP histórico Backend (2026-10-04)

- **Estado:** COMPLETADA; el usuario confirmó las pruebas manuales sin errores
  y autorizó commit/push.
- **Rama/base:** `feature/bd1-historical-reservation-otp` desde `main`
  actualizado `1f6c30e` (PR #102); árbol limpio al iniciar.
- **DoR:** C3 y L-01 a L-07 aprobados; puerto Reservations vacío, lookup
  interno existente, EmailSender disponible; BD3 y Guest Web revisan integración.
- **Alcance:** desafíos/vínculos en 004 (depende de Reservations), emisión/verificación Guest con límites y
  auditoría segura, puerto BD3 y API BFF-only. Web BFF y Resend real fuera de
  esta rama.
- **Implementado:** lookup scoped por código/correo, OTP HMAC y desafío
  ligado a cuenta/sesión, emisión asíncrona, límites, vínculo único por
  Reservation, audit append-only y dos rutas Guest con anotaciones OpenAPI.
- **QA local:** 13 pruebas focalizadas y verify completo 321 PASS, cero
  failures/errors/skipped, BUILD SUCCESS con PostgreSQL 17/Java 21. Primera
  corrida completa detectó fixtures persistentes en tests nuevos; corregidos
  con limpieza y repetición sobre BD fresca PASS. Upgrade separado desde
  changelog pre-OTP: changeset 004-007 aplicado, 10 pruebas OTP PASS. Guía
  `docs/31_BD1_HISTORICAL_RESERVATION_OTP_BACKEND_QA.md`.
- **Límites:** Guest Web BFF, revisión BD3 y Resend de presentación pendientes.
- **Postman:** las dos rutas OTP están en
  `postman/BD1-Backend-APIs.postman_collection.json`; la guía QA explica
  variables, ejecución manual y dependencia del envío real.
- **Siguiente paso:** publicar la rama y solicitar revisión de BD3/Guest Web
  en PR; integrar BFF y verificar Resend en el entorno de presentación después.

## BE-013A-01 — Contrato OTP de reservas históricas (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó L-01 a L-07 y la entrega
  documental; commit y push autorizados.
- **Rama/base:** `feature/bd1-historical-reservation-otp-contract` desde
  `main` actualizado `eb088d7` (PR #101 integra FIN-01); árbol limpio al iniciar.
- **DoR/evidencia:** C3 aprueba referencia + correo Google verificado + OTP de
  10 minutos, cinco intentos, reenvío mínimo de 60 segundos y uso único.
  ReservationLinkService resuelve código/correo; el puerto Guest está vacío;
  GuestProfile tiene FK opcional a cuenta, sin vínculo por reserva.
- **Alcance:** contrato propuesta para puerto, endpoints/BFF, desafío,
  asociación específica de Reservation, concurrencia, idempotencia, privacidad
  y recuperación de entrega. No implementación ni proveedor en vivo.
- **QA local:** código/esquema/C3 y pruebas actuales de lookup contrastados;
  enlaces locales y `git diff --check` PASS. No aplica Maven: solo Markdown.
  QA documental y aprobación del usuario en
  `docs/30_BD1_HISTORICAL_RESERVATION_OTP_CONTRACT_PROPOSAL.md`.
- **Siguiente paso:** publicar la rama y esperar integración en `main`; después
  revisar el puerto con BD3/Guest Web antes de BE-013B. Pruebas externas separadas.

## BE-014B-FIN-01 — Acceso Staff a folio AD-02 (2026-10-04)

- **Estado:** COMPLETADA. El usuario confirmó que todas las pruebas manuales
  terminaron bien; commit y push autorizados.
- **Rama/base:** `feature/bd1-folio-staff-access-ad02` desde `main` actualizado
  `cbb8a51` (PR #100 integra OPS-01); árbol limpio al iniciar.
- **DoR:** AD-02 aprobada; C2, Staff Auth y resolver de PROPERTY existentes.
  FolioService recibe UUID/actorId crudos; FP-D02/04 y HTTP siguen propuestos.
- **Alcance:** puerto Staff interno para lectura y postings ordinarios/reversos,
  con permiso financiero, scope SQL y permiso extra sobre PAYMENT. Conservar
  contratos BD3 y dejar apertura/lifecycle/HTTP/proveedor fuera de esta entrega.
- **Implementado:** StaffFolioService revalida sesión/permisos/PROPERTY; busca
  folio y movimiento original por predicado de propiedad antes de delegar al
  motor contable. Los postings llevan actor de sesión y PAYMENT reversal exige
  PAYMENT_REFUND_VOID.
- **QA local:** 18 pruebas focalizadas y verify completo 310 PASS, cero
  failures/errors/skipped, BUILD SUCCESS con PostgreSQL 17/Java 21. Guía
  `docs/29_BD1_FOLIO_STAFF_ACCESS_QA.md`; QA manual del usuario PASS.
- **Siguiente paso:** publicar la rama y esperar su integración en `main`
  antes de iniciar otra tarea en rama nueva. FP-D02/04, apertura, lifecycle y
  API HTTP pendientes.

## BE-014B-OPS-01 — Inicio RBAC e intake Staff (2026-10-04)

- **Estado:** COMPLETADA. El usuario confirmó que todas las pruebas manuales
  terminaron sin errores; commit y push autorizados.
- **Rama/base:** `feature/bd1-service-request-intake` desde `main` actualizado
  `71911e1` (PR #99 integra AD-03); árbol limpio al iniciar.
- **DoR/evidencia:** AD-03 aprobada. C2 no contiene aún SERVICE_REQUEST_INTAKE;
  ServiceRequestService BD3 no recibe principal ni hace guard, y sus mutaciones
  por UUID permanecen internas. No hay controller de Operations. El modelo tiene
  cinco categorías; list usa scope SQL, get/transition usan findById.
- **Alcance:** nueva migración RBAC, entrada Staff protegida solo para
  open/get/list por PROPERTY y pruebas. Métodos BD3 de transición/assign,
  mensajería externa AD-04 y HTTP quedan pendientes de contratos/revisión.
- **Implementado:** changeset 003-006 asigna SERVICE_REQUEST_INTAKE a RECEPCION
  y SUPER_ADMIN; StaffServiceRequestService valida sesión/permiso/property,
  deriva actor y valida vínculos scoped antes del servicio BD3. Detalle/lista
  consultan SQL por property; no se expone HTTP.
- **QA local:** 9 pruebas focalizadas PASS; verify completo 306 PASS, cero
  failures/errors/skipped, JAR y BUILD SUCCESS en PostgreSQL 17/Java 21.
  Guía `docs/28_BD1_SERVICE_REQUEST_INTAKE_QA.md`; QA manual del usuario PASS.
- **Siguiente paso:** publicar esta rama y esperar su integración en `main`
  antes de crear la rama siguiente. Integración BD3/Web, guard de transiciones
  y contrato HTTP siguen pendientes.

## BE-014A-OPS-01 — Propuesta de acceso Recepción AD-03 (2026-10-04)

- **Estado:** COMPLETADA. AD-03 y QA documental aprobadas por el usuario;
  commit/push autorizados en esta rama. BD3/Web revisan integración después.
- **Rama/base:** `feature/bd1-reception-service-access-ad03` desde `main`
  actualizado `ccf72a2` (PR #98); árbol limpio al iniciar.
- **DoR/evidencia:** C2 da OPERATIONS_MANAGE solo a SUPER_ADMIN/GERENCIA/
  OPERACIONES. ServiceRequestService tiene open/get/list y transiciones/assign;
  get y transiciones cargan por ID, list recibe scope explícito pero sin validar
  sesión. El modelo incluye CONCIERGE, VALET, HOUSEKEEPING, MAINTENANCE y OTHER.
- **Alcance:** proponer acceso limitado de Recepción a ServiceRequests en doc 21;
  AD-04 mensajería externa no se modifica. Sin código/SQL/API en esta fase.
- **QA local:** catálogo/roles C2, servicio, repositorio y categorías contrastados;
  nueve enlaces Markdown válidos y `git diff --check` PASS. Maven no aplica.
- **QA manual:** el usuario aprobó las dos filas y las cinco categorías el
  2026-10-04.
- **Siguiente paso:** publicar la rama; revisar integración con BD3/Web e
  implementar catálogo/guards en otra rama desde `main` actualizado. AD-04
  mensajería externa sigue pendiente.

## BE-014A-FIN-01 — Revisión de acceso financiero AD-02 (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó AD-02 y la QA documental; commit y
  push autorizados en esta rama. Revisión de integración financiera/Web pendiente.
- **Rama/base:** `feature/bd1-api-access-contract-approval` desde `main`
  actualizado `d258d60` (PR #97); árbol limpio al iniciar.
- **DoR/evidencia:** C2 contiene FOLIO_PAYMENT_OPERATE y PAYMENT_REFUND_VOID.
  RECEPCION posee solo el primero; AUDITOR no posee ninguno. FolioServiceImpl
  permite reverso de CHARGE/PAYMENT y rechaza ADJUSTMENT; PAYMENT es contable,
  no acredita devolución del proveedor. LocalOperationServiceImpl valida permiso
  y property desde la sesión Staff para operaciones locales futuras.
- **Alcance:** precisar propuesta AD-02 y corregir matriz documental en doc 21;
  BE-014A/FP-D02 siguen pendientes de aprobación aplicable. Sin código/SQL/HTTP.
- **QA local:** catálogo C2/servicios/propuesta FP-D02 contrastados; nueve
  enlaces Markdown válidos y `git diff --check` PASS. Maven no aplica a esta
  entrega documental.
- **QA manual:** el usuario aprobó las cinco filas de AD-02 el 2026-10-04.
- **Siguiente paso:** publicar la rama; revisar con owner financiero y Web antes
  de integrar implementación/API. AD-03 a AD-06 siguen abiertas y requieren
  incrementos o decisiones propios en ramas nuevas desde `main` actualizado.

## BE-006B-SCHEMA-01 — Invariantes Staff C4 (2026-10-04)

- **Estado:** COMPLETADA. El usuario confirmó QA manual sin errores y autorizó
  el cierre, commit y push según el flujo acordado.
- **Rama/base:** `feature/bd1-staff-admin-schema` desde `main` actualizado
  `5ba93ae`. `../docs/entregables/` preexistente queda intacto.
- **DoR/evidencia:** C4-D02/D06 aprobadas y BE-006A integrada. El changeset
  003 ya impone membership única por Staff. Faltan unicidad case-insensitive de
  workEmail, FK de property/organization y versión de concurrencia.
- **Alcance:** migración aditiva, guía de preflight y pruebas PostgreSQL.
  BE-006B CRUD/HTTP, BE-006C sesiones, auditoría C6 y BE-014A permanecen pendientes.
- **Implementado:** changeset 003-005 con `version` Staff, índice único para
  `lower(btrim(work_email))` y FK compuesta property/organization; `@Version`
  en StaffUser. Fixtures de upgrade fijados a changesets históricos.
- **Pruebas locales:** integración nueva 2 PASS; suite completa 302 PASS,
  cero fallos/errores, BUILD SUCCESS; focalizadas de constraints y upgrade
  histórico 8 PASS (incluye Staff preexistente con versión 0). Guía de preflight
  y QA: `docs/27_BD1_STAFF_SCHEMA_MIGRATION_QA.md`.
- **QA manual:** el usuario ejecutó las pruebas y reportó cero errores.
- **Siguiente paso:** publicar esta rama; después iniciar la siguiente tarea
  en otra rama desde `main` actualizado. Revisar datos reales con preflight
  antes de aplicar la migración fuera del entorno aislado.

## BE-006A — Aprobación y cierre del contrato Staff C4 (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó C4-D01 a D07 tras recibir la guía
  de revisión. BE-006B/C permanecen PENDIENTES de sus dependencias y del contrato
  HTTP/BFF final; revisión Web/BD2/BD3 pendiente para integración.
- **Rama/base:** `feature/bd1-staff-admin-contract-c4` creada desde `main`
  actualizado `fdc2ed3` (PR #95); C6 integrado por PR #94.
  `../docs/entregables/` preexistente queda intacto.
- **DoR/evidencia:** C1/C2 y BE-002/003/005 disponibles; C6 aprobado. Schema
  003 define StaffUser, roles, membership, sessions y refresh; BFF actual solo
  ofrece sesión Staff. No existe CRUD administrativo Staff. El PK compuesto de
  organization_memberships permite varias organizaciones para un usuario pese
  al único rol/membership C2, y `role_code` vive en StaffUser y membership.
- **Alcance/archivos:** contrato C4 propuesto en documento 26 y seguimiento;
  operaciones, scope, protección de administradores, revocación/audit,
  concurrencia y BFF. No modificar Java, SQL ni Web en esta tarea.
- **Hallazgos:** membership PK permite varias organizaciones; StaffUser.roleCode
  duplica el rol efectivo de membership; workEmail SQL es único con distinción de
  mayúsculas; el BFF solo tiene sesión/refresh, no CRUD. C4 propone constraints,
  sincronización y rutas candidatas, sin presentarlas como implementadas.
- **QA local:** seis enlaces Markdown válidos, fuentes C1/C2/C6 y schema/Java
  contrastados, `git diff --check` PASS. Maven no aplica: sin cambio de código.
- **QA manual:** el usuario aprobó documento 26/C4-D01 a D07. No se afirma que
  exista CRUD HTTP ni revocación administrativa funcional. Commit/push autorizados
  en la rama C4; `../docs/entregables/` queda intacto.
- **Siguiente paso:** publicar la rama; preparar BE-014A/contrato API y
  migración/auditoría de BE-006B en otra rama desde `main` actualizado.

## BE-008A — Aprobación y cierre del contrato AuditTrail C6 (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó C6-D01 a D06 tras recibir la guía
  de revisión manual. Revisión BD2/BD3 pendiente para integración; BE-008B
  continúa PENDIENTE por BE-014A y arquitectura/API específica.
- **Rama/base:** `feature/bd1-audit-contract-c6` desde `main` actualizado
  `ea50726` (PR #93 que integra COM-02). Sin commit/push de esta tarea;
  `../docs/entregables/` preexistente queda intacto.
- **DoR/evidencia:** C2/AUDIT_READ aprobado. AuditService y tabla
  reservation_audit_events ya ofrecen eventos append-only; Auth Staff usa
  auth_audit_events separado sin property/organización ni trigger append-only.
  Guest auth tiene una tabla separada. Consultas crudas actuales de AuditService
  no reciben scope y no se exponen como API administrativa.
- **Alcance/archivos:** propuesta C6 en documento 25, actualización de
  AlanPlan/Handoff; inventario, taxonomía, scope, consulta/paginación, detalle
  permitido, retención y decisiones/reviewers. No se cambió Java, SQL ni rutas.
- **Hallazgo relevante:** Auth Staff intenta persistir eventos de fallo y luego
  lanza StaffAuthenticationException bajo @Transactional; el rollback puede
  eliminar el evento y la revocación intentada. C6-D06 exige prueba/corrección
  en el incremento de implementación correspondiente; no se declara auditado
  el fallo de login en esta entrega.
- **Revisión local:** fuentes y roles C2 contrastados, cuatro enlaces Markdown
  válidos, sin trailing whitespace, `git diff --check` PASS. No aplica Maven por
  ser propuesta documental sin cambios Java/SQL/HTTP.
- **QA manual:** usuario aprobó la propuesta C6-D01 a D06; guía entregada en
  `25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md`. Commit/push autorizados en esta rama.
  El contrato no prueba un AuditTrail HTTP operativo.
- **Siguiente paso:** publicar rama; preparar BE-006A/C4 o cerrar dependencias
  BE-008B en otra rama desde `main` actualizado.

## BE-014B-COM-02 — Confirmación manual y cierre (2026-10-04)

- **Estado:** COMPLETADA. El usuario ejecutó los tests sin fallos y confirmó
  cerrar esta tarea; commit/push autorizados en su rama.
- **Rama/base:** `feature/bd1-commercial-scope`, creada desde `main` actualizado
  `d08383e`. `../docs/entregables/` ya estaba
  sin seguimiento y queda intacto.
- **DoR/evidencia:** COM-01 cerrado y presente en main; C2 y regla global de
  property scope exigen memberships, organización y SQL scoped. Inventario de los
  seis servicios muestra comprobaciones locales de scope sin vincularlo al snapshot
  y búsquedas por ID previas al filtro en Group, RoomBlock y Reward.
- **Alcance:** validar scope contra snapshot, limitar escrituras a PROPERTY y
  aplicar predicados SQL a vínculos Commercial con repositorios existentes/nuevos.
  No cambia permisos, endpoints, finanzas ni operaciones.
- **Entregado:** guard compartido vincula scope con organización y properties del
  snapshot, exige MULTI_PROPERTY_READ y conjunto completo para ALL_PROPERTIES,
  y PROPERTY para escrituras. Company/Agency de Group, Reservation de RoomBlock,
  Stay de Earn y entrada original de Reverse se cargan con predicado SQL scoped.
  Pickup limita reservas/stays a la propiedad del block. Sin rutas HTTP nuevas.
- **Pruebas locales:** cuatro suites comerciales 48 PASS (13 + 13 + 12 + 10),
  incluidos rechazos de scope fabricado y aserciones sobre repositorios SQL;
  verify completo 300 PASS, cero failures/errors/skipped, BUILD SUCCESS y JAR.
  Docker PostgreSQL 17, Java 21, wrapper Maven. `git diff --check` PASS.
- **Guía:** `24_BD1_COMMERCIAL_SCOPE_MANUAL_QA.md`, con comandos y resultados
  esperados para ejecución por el usuario.
- **Siguiente paso:** commit/push de esta rama; revisión BD3 durante integración.
  Abrir otra rama desde `main` actualizado para la siguiente tarea.

## BE-014B-COM-01 — Confirmación manual y cierre (2026-10-04)

- **Estado:** COMPLETADA para el incremento comercial. El usuario ejecutó los
  comandos de `22_BD1_COMMERCIAL_MANUAL_QA.md` sin errores y confirmó cerrar
  esta tarea. La suite local previa sigue en 270 tests PASS (45 comerciales),
  Java 21/PostgreSQL 17, JAR y `git diff --check` PASS.
- **Rama/base:** `feature/bd1-commercial-permissions` sobre `9003567`.
  Commit y push autorizados por el usuario tras su QA; registrar hash y remoto
  en la respuesta de publicación. `main` no se modifica.
- **Alcance cerrado:** permiso C2 COMMERCIAL_MANAGE en los seis servicios
  internos. No se publican rutas HTTP comerciales en este incremento; el
  contrato HTTP, la sesión/actor en nuevos controllers y el scope SQL adicional
  pertenecen a las entregas BE-014B posteriores.
- **Siguiente paso:** commit/push de la rama; revisión BD3 durante integración.
  Abrir otra rama al iniciar la siguiente tarea de implementación y repetir
  entrega de pruebas manuales antes de su cierre/publicación.

## BE-014B-COM-01 — QA manual solicitada (2026-10-04)

- **Estado:** EN_QA. El usuario definió una regla permanente: presentar pruebas
  manuales al finalizar cada tarea; esperar su resultado y confirmación antes
  de COMPLETADA, commit y push. Esta entrega todavía no tiene confirmación manual.
- **Rama/base:** `feature/bd1-commercial-permissions`, main `9003567`.
  No se ha creado commit, hecho push ni cambiado main.
- **Guía entregada:** `22_BD1_COMMERCIAL_MANUAL_QA.md`. Desde `backend/`, ejecutar
  las cuatro suites comerciales en Compose con PostgreSQL 17 y wrapper Maven;
  comprobar 45 tests PASS (13 + 13 + 12 + 7), cero failures/errors/skipped y
  revisar `target/surefire-reports/`. El comando de limpieza está en la guía.
- **Evidencia automática previa:** verify completo local 270 tests PASS, Java 21,
  PostgreSQL 17 y wrapper Maven 3.9.16; `git diff --check` PASS. No sustituye
  la ejecución/confirmación del usuario.
- **Límite verificable:** estos servicios aún no tienen API HTTP Commercial;
  la guía comprueba servicios internos con Spring/PostgreSQL, no login ni Postman.
- **Siguiente paso:** recibir resultado del usuario; corregir fallos si aparecen.
  Tras confirmación, actualizar AlanPlan/Handoff a COMPLETADA y hacer commit/push
  en esta rama. La revisión BD3 corresponde al flujo de publicación posterior.

## BE-014B-COM-01 — Implementación y QA local PASS (2026-10-04)

- **Estado:** EN_QA — implementación y revisión local PASS. Revisión de owner BD3
  y publicación pendientes; no se marca todo BE-014B como COMPLETADO.
- **Rama/base:** `feature/bd1-commercial-permissions` creada antes del código;
  main `9003567` conserva su commit. Sin commit/push/PR; planificación previa
  local preservada y entregables externos al backend intactos.
- **Decisión:** usuario aprobó explícitamente AD-01/COMMERCIAL_MANAGE.
  AD-02 a AD-06 y contratos HTTP de los otros dominios no están aprobados aquí.
- **Entregado:** CommercialAuthorization.requireManage comprueba permiso efectivo
  y falla ante snapshot ausente o permissions nulo. Company/Agency/EventGroup/
  RoomBlock/Promotion/Reward sustituyen todos sus requireSuperAdmin, incluyendo
  llamadas delegadas de RoomBlock. Interfaces documentan el contrato interno C2.
  SUPER_ADMIN también necesita el permiso en su snapshot; C2 ya lo asigna junto
  a GERENCIA. No se crea B2B_MANAGE ni se modifica catálogo/migraciones/roles.
- **Pruebas:** fixtures SUPER_ADMIN reflejan COMMERCIAL_MANAGE real; ciclos de
  empresa/agencia/grupo/block/promo/rewards parametrizados para GERENCIA y
  SUPER_ADMIN; aislamiento existente probado también como GERENCIA. Nueva suite
  deniega lecturas/escrituras de los seis servicios antes de lookup para roles sin
  permiso, snapshot null y permission set null; incluye rechazo de redeem.
- **QA enfocada inicial:** wrapper Maven 3.9.16 en Java 21/PostgreSQL 17,
  cuatro suites seleccionadas, 42 tests PASS. Se agregaron luego tres variantes
  de aislamiento y una aserción de redeem; la suite completa final incluye todo.
- **QA completa inicial:** compose original con Maven de imagen 3.9.11,
  270 tests PASS. Como el wrapper fija 3.9.16, se revalida el DoD con éste.
- **QA final obligatoria:** `./mvnw -B --no-transfer-progress verify`, wrapper
  Maven 3.9.16, Temurin 21/PostgreSQL 17 desechable; BUILD SUCCESS, 270 tests,
  0 failures, 0 errors, 0 skipped y JAR empaquetado. De éstos, 45 comerciales:
  CommercialService 13, GroupService 13, PromotionReward 12, CommercialPermission 7.
  Auth, Inventory, Reservations y otras regresiones incluidas sin exclusiones.
- **Comando reproducible desde backend:** crear override Compose con
  `services.verify.command: ["./mvnw", "-B", "--no-transfer-progress", "verify"]`;
  ejecutar `docker compose -p pms-bd1-commercial-qa -f compose.bd2-test.yaml
  -f /tmp/pms-bd1-wrapper-verify.yaml up --abort-on-container-exit
  --exit-code-from verify`. Override y log `/tmp/pms-bd1-wrapper-verify.log`
  son artefactos locales efímeros; no hay secretos de aplicación ni puertos host.
- **Revisión:** cambio Java limitado a comprobación de permiso/comentarios;
  scope, lifecycle, dinero y auditoría existentes conservados. Diff --check PASS;
  sin cambios resources/pom/workflows. No prueba Google/Resend/providers en vivo.
- **Límites:** APIs Commercial todavía no existen. Snapshot/scope/actor internos
  mantienen sus firmas; antes de HTTP se requieren sesión activa, actor confiable
  y hardening SQL de recursos relacionados descritos en documento 21.
  Este incremento no declara completa la protección transversal ni acceso Guest.
- **Siguiente paso:** revisión BD3 del incremento y publicación al autorizarse;
  continuar hardening de acceso interno/SQL en rama nueva para la siguiente tarea.
  Acordar AD-02 con BD2 sin asumir aprobación de políticas financieras.

## BE-014B-COM-01 — Inicio del permiso comercial (2026-10-04)

- **Estado:** EN_PROGRESO. AD-01 aprobado por el usuario; otras decisiones pendientes.
- **Rama/base:** `feature/bd1-commercial-permissions` creada antes de editar;
  base commit `9003567`, documentación previa conservada, sin commit/push/PR.
- **DoR:** aprobación explícita COMMERCIAL_MANAGE, permiso C2 existente y
  asignado a GERENCIA/SUPER_ADMIN. Sin nuevos roles/permisos/migraciones.
- **Alcance/archivos:** guard compartido de permiso en seis servicios Commercial,
  contratos internos actualizados y pruebas positivas/negativas de regresión.
- **Límite:** este incremento no publica REST ni completa sesiones/actor/scope
  de nuevas APIs. Los hardenings relacionados del documento 21 siguen pendientes.
- **Validación prevista:** suites Commercial enfocadas, verify completo Java 21/
  PostgreSQL 17 aislado en Docker, diff y handoff. Socket Docker requiere escalación.
- **Siguiente paso:** cambiar guards y fixtures según catálogo real; ejecutar QA.

## BE-014A — Propuesta preparada para revisión (2026-10-04)

- **Estado:** EN_QA; revisión documental local PASS. Documento 21 PROPOSED;
  no aprobado y BE-014B PENDIENTE. No se declara protección funcional implementada.
- **Rama/base:** `feature/bd1-api-access-contracts`, main `9003567`; creada antes
  de editar esta entrega. Sin commit/push/PR. Instrucción de rama nueva por tarea
  registrada en AlanPlan; los cambios anteriores siguen preservados.
- **Entregado:** documento 21: nueve permisos/roles contrastados con SQL C2,
  superficies y brechas reales, matrices Reservations/Finanzas/Operations/
  Commercial/Audit/Guest, contexto/scope/actor/transporte/errores, seis decisiones
  y acceptance para cada incremento BE-014B. No inventa endpoints de dominios
  que aún no tienen controllers ni confirma propuestas financieras de BD2.
- **Hallazgos nuevos:** Staff/Guest filtros restringidos a prefijos Auth; Inventory
  tiene chain dedicada. Seis servicios comerciales tienen guard SUPER_ADMIN,
  incluido RoomBlock que delega en EventGroup. Queries de detalle Reservation/Folio
  y enlaces/rewards requieren scope SQL antes de load. APIs externas siguen pendientes.
- **Propuesta inmediata:** AD-01 reutiliza COMMERCIAL_MANAGE para empresas,
  agencias, grupos/blocks/promociones/rewards; AD-02 reutiliza permisos financieros
  C2, añade condición PAYMENT_REFUND_VOID para reverso PAYMENT y conserva AUDITOR
  sin lectura financiera implícita. Son decisiones propuestas, no cambios al catálogo.
- **Contradicción real AD-04:** regla global solo Recepción responde externamente
  frente a C1 SUPER_ADMIN todas las funciones. No implementar autorización de ese
  flujo hasta decisión registrada; otros dominios pueden avanzar con su propio DoR.
- **Validación:** script documental PASS: 9 enlaces existentes, 10 referencias
  explícitas de clases, 6 guards Commercial (incluye delegación RoomBlock), 9 códigos
  del SQL y AD-01 a AD-06. git diff --check PASS. Inspección de interfaces/servicios,
  chains y queries; sin Maven, sandbox externo o smoke funcional en esta entrega.
- **Pendientes/reviewers:** aprobación AD-01 con BD3/BD1 y AD-02 con BD2/BD1;
  AD-03/04 permisos y regla de mensajería, AD-05 master profile, AD-06 invoices.
  Reviewers previstos, sin contactos externos ni revisión de owners ejecutada.
- **Siguiente paso:** decidir AD-01 y preparar BE-014B Commercial en rama nueva,
  con guards/actor/queries/pruebas según contrato aprobado. Nunca trasladar esta
  propuesta a producción como si todos los contratos ya estuvieran CONFIRMED.

## BE-014A — Inicio de matriz de acceso transversal (2026-10-04)

- **Estado:** EN_PROGRESO — propuesta documental; BE-014B permanece PENDIENTE.
- **Rama/base:** `feature/bd1-api-access-contracts`, creada desde main `9003567`
  antes de modificar esta entrega. Sin commit/push/PR.
- **Autorización:** usuario permite iniciar y exige una rama nueva por tarea.
  Esta regla queda también en AlanPlan; no se trabaja directamente en main.
- **DoR de preparación:** BE-002/003/005 completadas según registro; C1/C2/C3 y
  documento 20 revisados; interfaces y SQL del catálogo real inventariados.
  No hay contratos HTTP publicados para Operations/Commercial/Reservations;
  la matriz no inventa sus rutas y registra revisión pendiente de BD2/BD3.
- **Alcance:** proponer reutilización C2, matriz por operación y brechas de
  autorización/scope/actor; criterios para futura implementación por dominio.
- **Archivos:** nuevo contrato de acceso propuesto, AlanPlan y AlanHandoff.
- **Cambios previos:** planificación local de la sesión anterior conservada;
  entregables en raíz no se modifican. Java/SQL/permisos siguen sin cambios.
- **Siguiente paso:** preparar documento 21 y revisar referencias/cobertura;
  después obtener decisiones aplicables antes de código BE-014B.

## BD1-PLAN-20261004 — Plan de las once responsabilidades de Alan

- **Fecha/base:** 2026-10-04; checkout local main `9003567`, PR #73 integrado.
- **Estado:** planificación documental preparada y revisada; todas las nuevas
  implementaciones PENDIENTES. No aprueba contratos ni declara trabajo funcional completo.
- **Solicitud:** organizar protección de APIs/permisos, integraciones/channels,
  reportes/export/KPIs, Staff/memberships/sesiones, MFA/privacidad, AuditTrail,
  OTP histórico, Google/Resend de presentación y adapters pagos/mensajería.
- **Rama/commit/PR de esta entrega:** sin rama nueva, commit, push ni PR; cambios
  documentales locales en los dos archivos solicitados. No se ha iniciado código.
- **Cambios previos conservados:** AlanPlan tenía actualizaciones locales del
  registro de módulos y tareas BE-006 a BE-013; se integran/amplían sin eliminar
  su alcance. `docs/entregables/` en raíz estaba sin seguimiento y no se modifica.
- **Entregado:** AlanPlan mapea 11 requisitos, orden de fases y coordinación,
  contratos/decisiones pendientes, DoR/aceptación/archivos/reviewers por tarea y
  DoD común. Conserva BE-001 a BE-005 y BD2; desglosa BE-006/007/008/010/011/012/013
  y añade BE-014 acceso, BE-015 adapters, BE-016 presentación y BE-017 cierre.
- **Base técnica comprobada:** controllers actuales Auth/Inventory; servicios y
  esquema Reservations/Operations/Commercial existentes; Promotions/Rewards con
  SUPER_ADMIN provisional. GuestProfile y ReservationLinkService ya existen;
  ReservationLinkVerificationPort sigue vacío. Google/Resend tienen adapters,
  pero no se validaron externamente en esta revisión.
- **Contratos vigentes:** C1/C2/C3. Roles fijos consultables/asignables; CRUD de
  roles personalizables exigiría modificar C2. MFA Staff requiere modificar C1
  y aprobar C8. Documento financiero 20 permanece PROPOSED. C4-C9, matriz nueva
  y SPIs/provider requieren revisión/aprobación; SH-D01 se coordina con BD2.
- **Reviewers previstos:** BD2 por finanzas/inventario/dedupe/providers; BD3 por
  reservas/operaciones/comercial/mensajería/OTP; consumidores y producto cuando
  cambien contratos, fórmulas o política. No se han enviado mensajes externos.
- **Validación de esta entrega:** lectura de docs/AGENTS/XLSX, contratos y código;
  cobertura 1-11, IDs/dependencias/referencias, diff y git diff --check revisados.
  Sin cambios Java/SQL/seguridad/configuración ni ejecución Maven: la evidencia
  histórica de 254 tests PASS no valida las implementaciones pendientes.
- **Pendientes:** acordar matriz de acceso, C4/C6 y SH-D01; proveedores/sandbox,
  fórmulas C7, C8/C9 y entorno de presentación sin confirmación en este plan.
- **Siguiente paso:** preparar BE-014A con owners BD2/BD3; después contratos
  BE-008A/C6 y BE-006A/C4. BE-016A y los otros contratos independientes pueden
  avanzar sin esperar finanzas. Marcar READY solo al completar DoR de cada incremento.
## BE-HANDOFF-001 — Traspaso BD2: entrega (2026-10-03)

- **Estado:** COMPLETADA — preparación documental, aceptación/DoD y revisión local
  Codex PASS; rama chore/backend-demo, sobre f5fc545. No cierra tareas de negocio.
- **Autoridad:** usuario deja implementación Backend y se enfoca en Frontend;
  BD1/BD3 continúan el Backend. Solicita commit/push y lista de entregas/pendientes.
- **Entregado:** documento 23 con inventario, ramas verificadas, tareas y límites;
  ownership global y tracking actualizados sin alterar la autoría histórica.
- **Inspección:** los cuatro worktrees BD2 están limpios y sus entregas publicadas.
  En main solo hay una copia no versionada de Backend-Demo: hash idéntico al JSON
  ya publicado en f5fc545; no requiere otro commit ni se borra la copia del usuario.
- **Validación:** origin/main 54f7dbd; fase 0 a2241d6 y scope be09de4 integrados;
  idempotencia e5421f9 y demo f5fc545 publicados, no integrados.
  Cinco documentos revisados, siete enlaces locales válidos y 12 tareas cubiertas.
  Diff --check PASS. Solo Markdown: no se repite Maven; evidencia anterior de
  verify 281 tests y Postman 53/81 se conserva como histórica, no nueva ejecución.
- **Publicación:** commit/push solicitado explícitamente por el usuario, en
  chore/backend-demo; sin commits a main ni merge/rebase. Revisión/CI de las
  entregas de código sigue pendiente. No se duplican commits ya publicados.
- **Pendiente receptores:** integrar financial-foundation antes de demo/handoff,
  acordar reparto detallado y contratos, y continuar implementación Backend.
  José cambia su foco a Frontend; propuestas de reparto no son aprobación implícita.

## BE-DEMO-001 — Presentación simplificada: entrega (2026-10-02)

- **Estado:** EN_QA — aceptación/DoD local PASS; revisión BD1/CI de PR pendientes.
  Rama chore/backend-demo, base e5421f9;
  checkout principal main intacto. Trabajo financiero siguiente permanece pendiente.
- **Autoridad:** usuario solicita un Compose con todo el backend y usuario de prueba
  listo, evitando pasos manuales. Se reutilizan runtime y bootstrap BD1.
- **Entrega:** compose.demo.yaml independiente con volumen de demostración y puerto
  loopback, una colección Postman con variables locales y datos creados por API;
  instrucciones breves y tracking. Sin nuevas rutas, migraciones ni cambios Java.
- **QA runtime:** build/arranque con un comando PASS; PostgreSQL/backend healthy,
  health UP, Swagger/OpenAPI reales. Bootstrap por servicio BD1, sin bypass de auth.
  Restart/recreate del backend conserva propiedad previa y exactamente un Staff
  demo; Liquibase reaplica cero cambios de los 18 existentes.
- **QA Postman:** colección sin environment externo, 53 requests/81 assertions,
  0 failures; repetición tras restart: 53/81 PASS. IDs/tokens se propagan solos.
  Tipo sin Room ATS=0; con una Room ATS=1; RatePlan conserva ATS. Negativos y
  logout/revocación correctos. No hay SQL manual para crear fixtures comerciales.
- **QA completa:** `./mvnw -B verify` en copia temporal Linux, Java 21/PostgreSQL 17,
  BUILD SUCCESS: 281 tests, 0 failures/errors/skipped. Base de tests separada de demo.
  Sin omitir pruebas, cambiar workflow, Java, migraciones o dependencias.
- **Revisión:** ocho archivos de Compose/colección/docs/tracking; diff --check PASS.
  Config resuelta contiene solo backend/postgres y volumen demo; no modifica el
  Compose habitual ni su base. Reportes/logs y helpers privados fuera del repo.
- **Integración:** origin/main actualizado a 3ff0061; desde 131448e solo cambiaron
  archivos de despliegue Web, no backend/compose.yaml/workflow Backend.
  Rama dependiente de financial-foundation e5421f9 para incluir la última base
  local BD2. PR de demo contra esa rama; si ya se integra, revisar contra main.
- **Publicación:** commit/push por entrega conforme a autorización vigente.
  Reviewer BD1 para runtime compartido; no se afirma aprobación remota localmente.
  Se deja demo encendida en localhost:18080; se retira solo el proyecto de QA.
  Tareas nuevas de Folio/Payments/lifecycle permanecen pendientes como solicitó el usuario.

## BD2-FP-001 — Idempotencia local: entrega (2026-10-02)

- **Estado:** EN_QA — aceptación/verify local PASS; revisión BD1/BD3 pendiente.
  Rama feature/bd2-financial-foundation, sobre be09de4; worktree aislado.
- **Autoridad:** usuario aprueba explícitamente la propuesta SH-D01 local.
  Contrato implementable y límites registrados en documento 21 antes de código.
- **Entrega:** callback local autorizado con actor/scope BD1, fingerprint
  canonicalizado/versionado, recibo append-only y lock transaccional PostgreSQL.
  No crea módulo, API, permiso o flujo de pago; no llama proveedores.
- **Integración necesaria:** ReservationsSchemaUpgradeTests fijaba 17 cambios y
  tres triggers. Nuestra migración rompe ese supuesto: ahora compara con el master
  instalado, incluyendo identidades/checksums y triggers, sin debilitar upgrade,
  reaplicación, tablas o seed. No se corrige Night Audit ni otro trabajo BD3.
- **QA final:** `./mvnw -B verify` completo, Java 21/PostgreSQL 17: BUILD SUCCESS,
  281 tests, 0 failures, 0 errors, 0 skipped; 22 nuevos (5 unitarios y 17 de
  integración). Sin exclusiones ni cambios de workflow/configuración.
  Conexiones independientes verifican espera hasta commit, conflicto concurrente
  y recuperación tras rollback. Fallo de audit durante commit revierte movimiento,
  recibo y evento. Revocación, scope y permisos se recalculan también al reintentar.
  Guardas rechazan read-only/aislamiento incompatible; constraints/append-only
  se prueban en PostgreSQL, no solo mediante mocks.
- **Migración:** master crece a 18 changesets; se agrega 004-reservations-006.
  Upgrade desde baseline de seis, identidades/checksums del master vigente,
  reaplicación, tablas/triggers y seed preservados; no se alteran changesets previos.
- **Integración actual:** origin/main 131448e ya contiene be09de4 (PR #77).
  `git diff HEAD origin/main -- backend .github/workflows/backend-ci.yml` vacío
  antes del nuevo commit; cambios restantes de main son solo despliegue Web.
  El backend/workflow que se verificó coincide con la base de integración actual,
  sin merge/rebase ni modificaciones en el checkout principal main.
- **Revisión local:** 15 archivos previstos; cambios limitados a puerto/repo,
  nueva migración, tests y cinco documentos. Sin artefactos temporales ni secretos.
  git diff --check PASS. Revisión de PR y checks GitHub pendientes de publicación.
- **Entrega/siguiente paso:** commit/push por incremento autorizado; PR hacia main
  con BD1 para base compartida y BD3 para adaptación del test de upgrade.
  Acordar FP-D02 antes de implementar lectura HTTP de folio.
- **Límites posteriores:** contrato HTTP/lectura, escrituras financieras y
  recovery de efectos externos mantienen sus aprobaciones pendientes.

## BD2-FP-001A — Inicio de base financiera (2026-10-02)

- **Rama/base:** `feature/bd2-financial-foundation`, origin/main `5419606`.
  Worktree aislado; main principal intacto.
- **Estado:** EN_QA — aceptación y verify local PASS; revisión BD1 pendiente.
  Prerrequisito de scope, no cierre de Fase 1.
- **Autoridad:** usuario solicita empezar Fase 1; C2 obliga a restringir SQL
  antes de leer. El nuevo ownership asigna folios a BD2, sin duplicar servicios.
- **Archivos previstos:** FolioRepository, getFolio en ReservationQueryServiceImpl,
  pruebas FolioScopeIntegrationTests y seguimiento. Sin endpoints nuevos.
- **Regresión original:** cinco pruebas PostgreSQL, tres fallos demostrados:
  carga de folio ajeno, carga antes de rechazar scope ausente y error diferente
  para folio ajeno/inexistente. Sin errores ni pruebas omitidas.
- **Corrección:** findByIdAndPropertyIdIn en repositorio; getFolio valida scope
  antes de query y devuelve folio no encontrado para ID ajeno/inexistente.
  No se cambian consultas de reservas ni interfaces públicas existentes.
- **Validación final:** `./mvnw -B verify` completo, Java 21/PostgreSQL 17,
  BUILD SUCCESS: 259 tests, 0 failures, 0 errors, 0 skipped. Las cinco pruebas
  nuevas pasan; compilación, migraciones y suites existentes preservadas.
  Sin exclusiones, cambios al workflow ni cambios a módulos BD1/operaciones.
- **Revisión local:** diff limitado a cinco archivos previstos; sin esquema,
  API, dependencia, configuración local o credenciales nuevas. Main intacto.
- **Entrega:** commit/push por incremento autorizado previamente por el usuario;
  rama `feature/bd2-financial-foundation`, revisión propuesta BD1 antes de merge.
- **Decisión pendiente en esa entrega:** SH-D01: clave/payload/alcance/retención y persistencia
  local de idempotencia. Consulta explícita al usuario; no inferir aprobación.
- **Propuesta consultada:** base local en el módulo existente; clave opaca de
  8–128 caracteres; unicidad por Staff/property/operación/clave; payload validado
  y canonicalizado sin secretos; mismo payload recupera resultado y distinto
  genera conflicto; registro y efecto en una transacción; sin caducidad
  automática ni llamadas a proveedores. El usuario la aprobó posteriormente;
  contrato y nueva entrega registrados arriba en BD2-FP-001.
- **Siguiente paso vigente:** revisión del incremento de idempotencia local.

## BD2-FP-000 — Fase 0 financiera y lifecycle (2026-10-02)

- **Rama/base:** `feature/bd2-finance-lifecycle-contracts`, origin/main `9eb2380`.
  Worktree aislado; checkout principal en main, limpio.
- **Estado:** COMPLETADA — preparación documental y revisión local PASS.
  Reparto/plan autorizados; contratos nuevos PROPOSED, sin aprobación implícita.
- **Entregado:** documento 19 (capacidades/brechas, ownership, interfaces entre
  equipos, decisiones pendientes, 12 tareas/dependencias/aceptación) y documento
  20 (propuesta de lectura folio, DTO/errores/permisos, idempotencia y contratos
  semánticos de todos los flujos). DEC-B-008 y Team Structure registran el reparto.
- **Hallazgos:** reutilizar Folio/Query/Booking/Audit existentes; reforzar scope
  en detalle, reversos concurrentes, posting/cierre, asignación física y snapshots
  de tarifa/política. PAYMENT contable no sustituye capture/refund del proveedor.
  Master folio comercial/HK/night audit siguen coordinados con BD3; integración
  provider/Auth/callback con BD1. No se modificaron implementaciones ajenas.
- **Validación:** lectura de docs globales/XLSX/AGENTS, revisión de fuentes actuales,
  11 referencias locales existentes, 12 tareas cruzadas y Markdown/diff revisados.
  git diff --check PASS. Sin cambios Java/SQL/workflow/dependencias; no se ejecutó
  Maven nuevamente: los 254 tests PASS corresponden al cierre anterior integrado.
- **Publicación:** commit/push de esta entrega documental conforme a autorización
  vigente; PR hacia main. Reviewers BD1/BD3 y consumidores según alcance del contrato.
- **Pendientes:** proveedor/sandbox, garantía pública, política de folio, invoices,
  cancelación/no-show/waitlist/move/extensión y SPIs, sin asumir respuestas.
- **Siguiente paso:** acordar SH-D01 para la fase 1 y FP-D02 para lecturas scoped;
  completar DoR correspondiente antes de código. No todas las decisiones pendientes
  deben resolverse para comenzar una entrega independiente.

## BD2-010 — Cierre de integración con BD3 (2026-10-02)

- **Rama/base:** `feature/bd2-integration-closeout`, origin/main `345481b`.
  Worktree aislado; checkout principal en main sin modificaciones.
- **Estado:** COMPLETADA. PR #72 integrado en main `9eb2380`; el usuario confirma
  revisión aprobada y checks GitHub exitosos. Evidencia local registrada abajo.
- **BD3 confirmado:** `faa7876` conecta booking al InventoryAdmissionPort con
  demanda conjunta; su stub ATS es @Primary solo en tests. El contexto completo
  prueba el motor real y el contrato sin puerto se prueba separadamente sin Spring.
  Las dos suites que bloqueaban la integración ahora pasan sin parches ajenos.
- **Regresiones entregadas:** seis pruebas en InventoryBookingIntegrationTests,
  con servicios BD2/BD3 y changelog completos en un schema PostgreSQL exclusivo.
  ATS disminuye exactamente uno; padre cancelado libera; demanda solapada se suma;
  noches adyacentes comparten capacidad; fallo tardío revierte perfil, reserva,
  stays y auditoría; OOO resta y OOS conserva capacidad. Dos bookings concurrentes
  para la última unidad esperan el lock hasta el commit exterior: solo uno confirma.
- **Validación base:** main actualizado, `./mvnw -B verify`: BUILD SUCCESS,
  248 tests, 0 failures, 0 errors, 0 skipped.
- **Validación final:** rama de cierre sobre ese main, mismo comando sin filtros:
  BUILD SUCCESS, 254 tests, 0 failures, 0 errors, 0 skipped; JAR empaquetado.
  Docker Temurin 21/PostgreSQL 17, wrapper Maven del proyecto y variables de CI
  en base desechable. Se incluyen esquema/upgrade/idempotencia, permisos/scope,
  HTTP/OpenAPI, catálogos y todas las suites BD3; workflow intacto.
- **Revisión:** diff limitado a la nueva suite BD2 y documentación; diff --check
  limpio. Sin cambios en producción, migraciones, BD3, credenciales o configuración local.
- **Cierre del alcance aprobado:** fases BD2 1–5 y C/R/U de Properties, RoomTypes,
  Rooms y RatePlans. Las evidencias Newman previas (40 solicitudes/58 assertions)
  se conservan abajo; no se repitieron en este cierre sin cambios de API.
- **Límites conservados:** baja/retención/reactivación/reclasificación requieren
  política y contrato aparte. La garantía concurrente cubre el booking conectado;
  addStay directo y alta OOO, de otros módulos, deben coordinar el mismo protocolo.
  No se declara sobreventa cero para todos los escritores del PMS.
- **Siguiente paso:** nuevo alcance financiero/lifecycle en BD2-FP-000. Para probar
  HTTP, seguir `14_BD2_TESTING_AND_POSTMAN.md`; no existe aún un endpoint REST de booking.

Los registros siguientes son históricos; sus pendientes de fixtures y conexión
BD3 quedan sustituidos por la evidencia de cierre anterior.

## BD2-009 — RatePlans y cierre C/R/U de catálogos BD2

- **Rama/base:** `feature/bd2-rate-plans-crud`, Rooms `4cea3db` ya publicado.
- **Estado:** EN_QA. Implementación C/R/U terminada y validada; CI global pendiente BD3.
- **Entregado:** contrato 18, API/DTO/OpenAPI, dinero exacto BIGINT/ISO, permisos
  y scope C2 vigentes antes de SQL, locks/no-op y auditoría transaccional.
  RatePlan no agrega inventario ni modifica precios históricos de reservas.
- **QA enfocada:** BUILD SUCCESS, 21 tests; 9 RatePlans y 12 regresiones Rooms/RoomTypes.
- **Verify final:** `./mvnw -B verify`, Java 21/PostgreSQL 17: BUILD FAILURE,
  217 tests, 0 failures, 8 errors solo BD3, 0 skipped. Las 40 pruebas de los
  cuatro catálogos BD2 pasan, incluidas las 27 nuevas de estos tres incrementos.
- **Postman real:** Properties 14 requests/20 assertions, RoomTypes 8/11,
  Rooms 8/11, RatePlans 10/16: total 40 requests/58 assertions PASS.
  SQL: una fila por catálogo pese a 409, dos eventos (alta/edición) por entidad,
  actor Staff real y precio final 9999 unidades menores GTQ. ATS de tarifas=1
  antes/después. Swagger real publica precio string y RatePlanView.
- **Limpieza:** runtime QA retirado y credenciales/environments/reportes privados
  eliminados fuera del repositorio. Solo fuentes, tests, contratos y guía en Git.
- **Publicación autorizada:** commit/push de esta entrega. PRs por dependencia:
  RoomTypes `feature/bd2-room-types-crud` → main;
  Rooms `feature/bd2-rooms-crud` → RoomTypes;
  RatePlans `feature/bd2-rate-plans-crud` → Rooms.
  Integrar primero RoomTypes, luego Rooms y finalmente RatePlans; ajustar las bases al incorporar cada entrega.
- **Pendientes reales:** definir política de baja/retención/reclasificación para
  completar D; no hay DELETE ni status nuevo. BD3 debe conectar admisión según
  contrato 13 para garantizar sobreventa cero en escrituras de booking.
- **Errores BD3, sin modificar sus archivos:**
  ReservationBookingServiceIntegrationTests: 7 errores de contexto porque
  ControllableAvailabilityConfiguration y AvailabilityService ofrecen dos
  AvailabilityPort; propuesta BD3: dar prioridad al stub únicamente en su fixture.
  ReservationBookingWithoutAvailabilityTests: el contexto completo ahora carga
  ATS real y rechaza el tipo sin Rooms; propuesta BD3: probar ausencia de puerto
  en contexto mínimo que realmente no cargue el motor/API de inventario.
  Siguen presentes también en la rama remota BD3 revisada, sin incorporarla.
- **Retomar:** cuando BD3 corrija sus fixtures/conecte admisión, actualizar
  referencias y validar integración en copia aislada antes de cerrar CI/PR.
  No hubo merge/rebase sobre nuestras ramas, cambios main ni modificaciones BD3.

## BD2-008 — Rooms

- **Rama/base:** `feature/bd2-rooms-crud`, RoomTypes `1c0ed07` ya publicado.
- **Estado:** EN_QA. Contrato 17 publicado antes de crear las APIs.
- **Dependencias:** C2/AuditService y schema existentes. No requiere cambios BD3.
- **Entregado:** alta física, consultas scoped y PATCH de código, permisos C2,
  bloqueo de RoomType compatible con admisión, row lock de edición y audit.
- **QA enfocada:** BUILD SUCCESS, 15 tests; 9 Rooms y 6 regresiones RoomTypes.
  Capacidad +1, no-op, tipos cruzados, 409, lock NOWAIT, rollback y HTTP real.
- **Postman final:** colección Rooms ejecutada: 8 solicitudes/11 assertions PASS.
- **Verify completo:** BUILD FAILURE, 208 tests, 0 failures, 8 errors solo BD3, 0 skipped.
- **Publicación:** commit/push autorizado. Siguiente entrega RatePlans; sin DELETE/reclasificación.

## BD2-007B — RoomTypes: implementación

- **Rama:** `feature/bd2-room-types-crud`. Contrato 16 autorizado por el usuario.
- **Estado:** EN_QA; C/R/U validado. Scope C2 antes de SQL, permisos vigentes,
  bloqueo de fila, auditoría transaccional y OpenAPI tipado; sin DELETE/status.
- **QA:** verify enfocado BUILD SUCCESS, 9 tests sin fallos/errores/omitidas.
  Incluye PostgreSQL, rollback real de auditoría, referencias, ATS sin Rooms,
  HTTP entre transacciones, JWT Guest/revocación y permisos negativos.
- **Verify completo:** 198 tests, 0 failures, 8 errors BD3, 0 skipped; ejecutado
  antes de añadir la prueba HTTP final. Sin cambios BD3 ni exclusiones de tests.
- **Postman final:** colección RoomTypes ejecutada: 8 solicitudes/11 assertions PASS.
- **Publicación:** commit/push autorizado. Main incorporó solo la propuesta
  documental en PR #68 (`302080b`); no trae correcciones de fixtures BD3.
- **Siguiente paso:** Rooms y RatePlans en ramas dependientes separadas.
  Baja/retención sigue pendiente de política; no se inventan borrados.

## BD2-007A — Preparación de RoomTypes

- **Rama/base:** `feature/bd2-room-types-crud`, `origin/main` `c2699ff`.
  Properties fue incorporado mediante PR #67; su código está conservado.
- **Estado:** preparación COMPLETADA; BD2-007B pendiente de confirmar contrato API.
- **Dependencias:** fundación BD2-002 completada, C2 y AuditService existentes.
  Los fixtures/booking pendientes de BD3 no son dependencia de este incremento.
- **Entregado:** contrato 16 con rutas/permisos propuestos, DTO, scope SQL,
  unicidad por propiedad, auditoría transaccional, UTC y aceptación verificable.
- **Revisión:** contrastado con schema/JPA/C2 y los locks de admisión. Código único
  por propiedad; nombre puede repetirse. No añade Rooms ni modifica ATS.
  Solo documentación; diff/check revisados, sin nueva ejecución Maven.
- **Publicación:** commit/push autorizado de estos tres archivos en esta rama.
- **Siguiente paso:** confirmar contrato y comenzar BD2-007B. No hay DELETE,
  baja/status ni cambio de propiedad; sus políticas requieren otra definición.

## BD2-006B — Properties: contrato aprobado y APIs

- **Rama:** `feature/bd2-properties-crud`; contrato 15 aprobado por el usuario.
- **DoR:** C2, esquema Property y AuditService disponibles; no modificar BD3.
- **Estado:** EN_QA; alcance BD2 validado, CI global pendiente de fixtures BD3.
  Publicación por commit/push autorizada.
- **Entregado:** POST/GET de Properties y GET/PATCH por ID; permisos existentes
  por método, sesión vigente y scope aplicado en SQL; edición de nombre/código
  con bloqueo de fila y auditoría before/after transaccional. No-op sin cambios
  de timestamps/eventos. Validación estricta, 409 por unicidad y OpenAPI.
- **QA enfocada:** wrapper verify con selección explícita de las tres clases
  Properties: BUILD SUCCESS, 13 tests sin fallos/errores/omitidas y JAR empaquetado.
  Incluye PostgreSQL, rollback real de auditoría, bloqueo NOWAIT, aislamiento,
  permisos, JWT Guest/revocación y escrituras HTTP entre transacciones separadas.
- **Postman/Newman:** 14 solicitudes y 20 assertions PASS con login/C2 reales.
  SQL confirmó dos eventos (alta/edición), actor Staff real, property/correlation
  correctos y una sola propiedad pese al intento duplicado.
- **Correcciones QA:** precisión PostgreSQL de microsegundos preserva timestamps
  entre requests; OpenAPI declara 200/201 con DTO y errores con ProblemDetail.
  Live Swagger confirmó los schemas; se conservan pruebas de regresión.
- **Verify completo final:** `./mvnw -B verify`, Java 21/PostgreSQL 17:
  BUILD FAILURE, 190 tests, 0 failures, 8 errors, 0 skipped. Las 13 pruebas
  Properties pasan también en esta ejecución; los errores pertenecen solo a
  ReservationBookingServiceIntegrationTests (7, dos beans AvailabilityPort) y
  ReservationBookingWithoutAvailabilityTests (1, ATS real en supuesto sin puerto).
  No se cambió BD3, el workflow ni la selección de tests del verify completo.
  Logs de evidencia fuera del repositorio: pms-bd2-properties-focused.log y
  pms-bd2-properties-verify-final.log.
- **Base actualizada:** `origin/main` `c05a091` integró PR #66 (propuesta).
  Su árbol es idéntico a `73c6f9f`; el código combinado no añade diferencias
  de ejecución. Esta entrega funcional necesitará un nuevo PR.
- **Siguiente paso:** abrir PR funcional desde esta rama hacia main; resolver
  los fixtures de BD3 en su rama responsable y continuar con contrato RoomTypes.
  Baja/reactivación y cambios de moneda/zona permanecen fuera de esta entrega.

## BD2-006A — Propuesta de administración de propiedades

- **Rama/base:** `feature/bd2-properties-crud`, `origin/main` `9552325`.
  Fase 5 integrada por PR #65; su conexión productiva BD3 continúa pendiente.
- **Estado histórico:** preparación de propuesta COMPLETADA; aprobación e
  implementación posteriores registradas arriba en BD2-006B.
- **Entregado:** `15_BD2_PROPERTIES_CRUD_CONTRACT_PROPOSAL.md`; primera entrega
  C/R/U de Properties y secuencia RoomTypes/Rooms/RatePlans/bajas, con ownership BD2.
- **Decisiones al preparar la propuesta:** rutas/permisos operativos, alta limitada al
  SUPER_ADMIN de su organización y edición solo de nombre/código. Baja y
  reactivación necesitan definición de acceso a properties inactivas bajo C2.
- **Revisión:** coherencia con C2, modelo/schema existentes y reglas de dominio;
  distinguir propuesta de contrato confirmado. Diff/whitespace revisados.
  Solo documentación; no se declara una nueva ejecución Maven ni una API creada.
- **Siguiente paso:** confirmar propuesta, implementar BD2-006B y validar
  PostgreSQL/HTTP/OpenAPI/Postman antes de su commit/push. No modificar fixtures BD3.

## BD2-005 — Admisión e integración (Fase 5)

- **Rama:** `feature/bd2-inventory-admission`, desde Fase 4 publicada en `0dbaa74`.
- **Estado:** EN_QA; entrega BD2 validada, conexión BD3 pendiente. Publicación autorizada.
- **PR objetivo:** `main`; Fase 4 integrada mediante PR #64 en `a4dc6b0`.
  El fetch previo a esta entrega confirma que sus fixtures BD3 no cambiaron.
- **DoR:** motor/API BD2 disponibles y esquema BD3 integrado en `origin/main`.
- **Hallazgo:** booking BD3 comprueba cada stay antes de escribir; no acumula
  demanda multi-room ni serializa dos transacciones que venden la última unidad.
- **Entregado:** `InventoryAdmissionPort`, demanda conjunta, locks PostgreSQL
  por property/RoomType, excepción de agotamiento y rollback. Contrato en
  `13_BD2_INVENTORY_ADMISSION_CONTRACT.md`; guía y colección Postman en
  `14_BD2_TESTING_AND_POSTMAN.md` y `../postman/BD2-Inventory.postman_collection.json`.
- **QA BD2:** `./mvnw -B verify` BUILD SUCCESS, Java 21/PostgreSQL 17;
  46 pruebas, cero fallos/errores/omitidas. Incluye 8 pruebas de admisión real
  y 2 con servidor HTTP real. Log TEMP: `pms-bd2-phase5-verify-http-fix.log`.
- **Corrección HTTP:** `sendError(403)` provocaba error dispatch a `/error`,
  protegido por la cadena global; se reemplaza por `setStatus` solo en BD2.
  No se cambian Auth BD1 ni rutas globales. Regresión cubierta con HTTP real.
- **Postman:** Newman PASS, 8 solicitudes/13 assertions contra runtime combinado
  con login/scope reales; fixture de una habitación, credenciales efímeras.
  Runtime detenido y credenciales/reporte privado eliminados de TEMP.
- **Integración real aislada:** fuentes BD3 de `origin/main` `7c060c9` intactas,
  con cuatro tests temporales que envuelven `ReservationBookingService` en el
  puerto nuevo: ATS disminuye exactamente uno, cancelación libera sin borrar
  stay, demanda multi-room se rechaza antes de crear y consumo JPA pendiente
  se observa en la siguiente admisión. Cuatro PASS, sin mock ATS ni booking.
  Esta envoltura pertenece a la validación; no conecta el booking productivo.
- **Verify combinado:** BUILD FAILURE, 181 pruebas incluyendo las 4 temporales;
  cero failures, 8 errors, cero omitidas. Siete errores en el contexto de
  `ReservationBookingServiceIntegrationTests` por beans `availabilityService`
  y `availabilityPort` competidores; uno en
  `ReservationBookingWithoutAvailabilityTests` por presencia del ATS real.
  Los demás tests, incluidos todos los BD2, pasan. Fuentes/fixtures BD3 intactos.
  Log TEMP: `pms-bd2-phase5-combined-http-fix.log`.
- **Límite:** los escritores que no utilicen el puerto siguen fuera de su
  garantía. No declarar sobreventa cero global ni Fase 5 COMPLETADA todavía.
- **Siguiente paso BD3:** resolver el mock `AvailabilityPort` no primario y el
  contexto que supone que no hay puerto; conectar el booking al callback del
  puerto de admisión, con validación y revisión del owner, antes de cerrar Fase 5.

## BD2-004 — API Staff de disponibilidad (Fase 4)

- **Rama:** `feature/bd2-availability-api`, dependiente de BD2 Fase 3 en `277390d`.
- **Estado:** COMPLETADA para entrega BD2; publicada en `0dbaa74`.
- **Contrato:** `12_BD2_AVAILABILITY_API_CONTRACT.md`; consulta Staff por
  property/room type y fechas locales, mínimo ATS, sin precios ni reserva.
- **Seguridad:** servicios JWT/sesión/permiso/scope C2 reutilizados; cadena BD2
  limitada a la ruta de disponibilidad y autorización por método. No se cambia BD1.
- **Dependencia:** las tablas BD3 ya están en `origin/main` (`7c060c9`), pero
  todavía no forman parte de esta rama dependiente; sus correcciones de tests
  permanecen fuera de esta rama.
- **QA:** `./mvnw -B verify` BUILD SUCCESS con Java 21, PostgreSQL 17 y Maven
  3.9.16 del wrapper; 36 pruebas, cero fallos/errores/omitidas. Incluye 11 pruebas
  HTTP con JWT firmado, separación Guest/Staff, sesión revocada, permisos vivos,
  scope antes de ATS, cero unidades, errores 400/404 y schemas OpenAPI.
  El puerto ATS se sustituye solo en el contexto de pruebas HTTP; el query SQL
  real se mantiene cubierto por las pruebas de Fase 3. No sustituye Fase 5.
- **Siguiente paso:** PR de Fase 4 dependiente de Fase 3; iniciar Fase 5 con
  validación aislada contra `origin/main` y revalidar cuando BD3 ajuste sus tests.

## BD2-CI-001 — Entrega de corrección BD2

- **Rama:** `feature/bd2-availability-engine`; corrección publicada en `277390d`.
  Fase 3 ya publicada en `ec8c68f` y `99fe5a0`.
- **Corrección:** validar upgrade contra el total del master instalado en limpio;
  comprobar el changeset `002-management-002` y conservar idempotencia/Property.
- **Validación:** `./mvnw -B verify` PASS, 25 pruebas, cero fallos/errores/omitidas;
  Java 21, PostgreSQL 17 y Maven 3.9.16 del wrapper. Diff revisado.
- **Dependencia:** BD3 debe ajustar sus contextos de pruebas al motor ATS real;
  la referencia combinada del PR `a7b9b14` falla en sus dos pruebas de booking.
- **Retomar:** cuando BD3 integre sus correcciones, revalidar el PR BD2. Tras
  integrar BD2, iniciar la siguiente tarea desde `origin/main` actualizado.
  Pendientes de BD2: Fase 4 (API/contrato/scope) y Fase 5 (integración transaccional).

## BD2-003 — Fase 3 completada (entrega BD2)

- **Rama:** `feature/bd2-availability-engine`, basada en `origin/main` `8e67b7d`.
- **Commit/push:** `ec8c68f` publicado en `origin/feature/bd2-availability-engine`.
- **Estado:** COMPLETADA para entrega BD2; lista para PR/revisión del equipo.
- **Entregado:** `AvailabilityService` calcula el mínimo de unidades vendibles
  por noche como `max(0, físico - OOO - ReservationStay consumidor)`. El query
  usa IDs explícitos de propiedad/tipo, cuenta habitaciones OOO distintas y
  excluye Reservation padre cancelada.
- **Consumo BD3 verificado en** `origin/feature/bd3-foundation` (`d1cb2b7`):
  `RESERVED`/`IN_HOUSE` consumen; `CANCELLED`/`NO_SHOW`/`CHECKED_OUT` liberan.
  Cancelar Reservation no cascada a stays; el `EXISTS` contra el padre cubre
  deliberadamente ese caso. BD3 ya tiene tests de ciclo de vida para esos estados.
- **Entregado:** `PropertyStayTime` y `UtcStayInstantRange` convierten límites
  locales `[arrival, departure)` a UTC con `ZoneId`, incluyendo cambios DST.
- **Scope:** SQL limitado por `propertyId`; de acuerdo con el contrato existente,
  la capa de aplicación/HTTP debe autorizar la propiedad antes de llamar al puerto.
  No se agrega autenticación al query interno.
- **Validación:** `docker compose -p pms-bd2-phase1 -f
  backend/compose.bd2-test.yaml up --abort-on-container-exit --exit-code-from
  verify` — BUILD SUCCESS en PostgreSQL 17/Temurin 21; 25 pruebas, cero
  fallos/errores/omitidas. Incluye prueba SQL con estados consumidores,
  fechas `[arrival, departure)` y Reservation padre cancelada; ATS por
  mínimo/no negativo; y límites UTC a través de DST.
- **Dependencia de integración:** el query requiere las tablas BD3 `reservations`
  y `reservation_stays`, presentes en `origin/feature/bd3-foundation`, todavía
  no integradas a `main`; el ATS entra en funcionamiento cuando BD3 se integre.
- **Límite:** el precheck no bloquea ni serializa admisiones concurrentes; la
  garantía de sobreventa cero requiere el trabajo transaccional posterior.

## BD2-002 — Fase 2 completada

- **Rama:** `feature/bd2-entities-repositories`.
- **Base:** `origin/main` en `a59a235`; Fase 1 integrada mediante PR #60.
- **Estado:** COMPLETADA — aceptación y DoD local PASS, 2026-10-01.
- **Archivos:** dominio y persistencia de `modules/inventory`, pruebas JPA,
  contrato BD2 y estos documentos de seguimiento.
- **Entregado:** entidades JPA Property, RoomType, Room, RatePlan y
  OutOfOrderRecord; repositorios property-scoped; conteo de habitaciones OOO
  distintas por noche local.
- **Validación:** `docker compose -p pms-bd2-phase1 -f
  backend/compose.bd2-test.yaml run --rm --no-deps verify mvn -B
  --no-transfer-progress verify` — BUILD SUCCESS en PostgreSQL 17/Temurin 21;
  19 pruebas, cero fallos/errores/omitidas. Validó migración, Hibernate,
  roundtrip JPA de monedas/fechas, aislamiento de scope, exclusión de OOS y
  registros liberados, y solapamientos OOO contados una vez por Room/noche.
- **Artefacto:** JAR empaquetado con los cinco tipos de dominio y sus cinco
  repositorios; no se añadieron cambios a Liquibase.
- **Revisión local:** `git diff --check` PASS. Sin PR ni publicación remota.
- **Siguiente paso:** Fase 3 (motor ATS) requiere la coordinación de consumo por
  ReservationStay con BD3 y control atómico antes de habilitar overbooking cero.

## BD2-001 — Fase 1 completada

- **Rama:** `feature/bd2-foundation-contracts`.
- **Owner:** BD2.
- **Autorización:** plan de Fase 1 indicado por el usuario el 2026-09-30.
- **Base:** esquema y seguridad existentes de BD1; no se recrea `properties`.
- **Contrato:** `11_BD2_CORE_FOUNDATION_CONTRACT.md`.
- **Estado:** COMPLETADA — aceptación y DoD local PASS, 2026-09-30.
- **Entregado:** changeset `002-management-002`, valores/converters monetarios,
  AvailabilityPort, rango local de noches y configuración de mock solo para tests.
- **Validación:** PostgreSQL 17 y Maven/Temurin 21 aislados mediante
  `compose.bd2-test.yaml`: `mvn -B verify` terminó con BUILD SUCCESS y código 0.
  18 pruebas, cero fallos/errores/omitidas (7 existentes + 11 nuevas).
- **Migraciones:** instalación vacía con seis changesets; actualización BD1
  (cinco changesets) a BD2 (seis), seguida de reaplicación sin cambios. Property
  inicial preservada; no se modificaron changesets previos.
- **Restricciones verificadas:** referencias cruzadas entre propiedades, precios
  negativos, códigos duplicados, períodos vacíos, liberación incompleta y borrado
  de una Room con historial son rechazados por PostgreSQL.
- **Dinero:** roundtrip de converters, escala de moneda, precisión decimal,
  overflow y mezcla de monedas cubiertos. El mapeo de entidades será Fase 2.
- **Artefacto:** JAR contiene AvailabilityPort, valores/converters y migración;
  no contiene AvailabilityStubConfiguration ni el changelog base de pruebas.
- **Revisión local:** scope y cambios inspeccionados; `git diff --check` PASS.
  No se declara revisión externa, PR ni publicación a GitHub.
- **Siguiente paso:** Fase 2, entidades y repositorios según el contrato de BD2.
  ATS real, autorización de endpoints y consumo atómico con BD3 siguen pendientes.

## Foundation Backend — BE-001

- **Rama:** `feature/backend-foundation`
- **Base:** `main` en `94ee1f0`
- **Tarea:** BE-001 — Foundation y control Backend
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-29

### Entregado

- Bootstrap Spring Boot 4.1.1 con Java 21, Spring MVC, JPA, PostgreSQL,
  Liquibase, Spring Security, Resource Server OAuth2 y OpenAPI.
- Un único `compose.yaml` raíz que construye y levanta PostgreSQL, Backend y
  Web; solo Web publica un puerto al host y Backend queda en la red privada.
- Liquibase como único mecanismo de esquema, con Hibernate en `ddl-auto: validate`
  y changelog modular inicial `003ServiceSecurityAuth` sin tablas de negocio.
- Perímetro `SecurityFilterChain` sin estado: health y documentación técnica
  públicos; cualquier ruta no declarada se deniega.
- OpenAPI técnico disponible; no se publicaron endpoints ni DTOs de negocio no
  confirmados.
- Control de trabajo Backend en `AlanPlan.md` y `AlanHandoff.md`, más workflows
  GitHub Actions para Backend y para la pila Docker completa.

### Evidencia de validación

- `maven:3.9.11-eclipse-temurin-21 mvn -q -DskipTests compile`: exitoso.
- `maven:3.9.11-eclipse-temurin-21 mvn -q test`, con PostgreSQL 17: exitoso;
  Spring inicia, Liquibase registra cero changesets de negocio y MockMvc verifica
  health/OpenAPI públicos y denegación por defecto.
- Ejecución HTTP aislada en el puerto 18080: `/actuator/health` = 200,
  `/v3/api-docs` = 200 y `/not-configured` = 403.
- El host no dispone de `javac`; las validaciones anteriores usan el JDK 21
  reproducible de Docker. CI ejecutará la misma versión con Temurin 21.
- `docker compose up --build --wait`: construyó las imágenes. El puerto 3000
  local estaba ocupado por otro proyecto, por lo que `PMS_WEB_PORT=3001 docker
  compose up --wait` confirmó los tres servicios healthy; Web respondió por HTTP
  y alcanzó al health Backend mediante `http://backend:8080` dentro de Compose.

### Cierre de revisión

- Revisión local completada: `git diff --check`, configuración Compose, build de
  imágenes, healthchecks y conectividad privada Web → Backend.
- Backend CI y Docker Stack CI se ejecutarán automáticamente al crear el pull
  request o integrar cambios a `main`, de acuerdo con sus triggers.

### Siguiente tarea

La propuesta `08_AUTH_SESSION_CONTRACT_PROPOSAL.md` fue derivada de Web y
actualizada con la regla de producto: correo permite reserva puntual sin cuenta;
la cuenta Guest requiere Google y se implementa en BE-004. Staff solo se
provisiona por el hotel con username, contraseña, correo laboral y un rol;
`SUPER_ADMIN` es global. MFA Guest se delega a Google y MFA local Staff queda
diferido. C1 fue aprobado y BE-002 implementa exclusivamente el contexto Staff;
Guest Google continúa en BE-004.

## BE-002 — Inicio

- **Rama:** `feature/be-002-staff-auth`
- **Estado:** COMPLETADO
- **Contrato:** C1 aprobado en `08_AUTH_SESSION_CONTRACT_PROPOSAL.md`.
- **Alcance autorizado:** usuarios Staff provisionados por hotel, username,
  correo laboral, contraseña hasheada, un rol, SUPER_ADMIN, sesiones Staff, JWT,
  refresh rotativo y logout.
- **Fuera de alcance:** Google/Guest (BE-004), property scope efectivo
  (BE-003), UI de provisionamiento y gestión de roles.


### Validación BE-002

- `./mvnw test` se ejecutó en JDK 21 contra PostgreSQL local con el esquema
  validado por Liquibase.
- Smoke en contenedor: login Staff, JWT con audiencia/contexto Staff, refresh
  rotativo, rechazo 401 sin refresh y revocación persistente tras logout.
- El changeset aplicado es `003-staff-auth-001`; no se modifica ni se reutiliza.

### Próximo alcance

BE-003 implementará roles/permisos efectivos, memberships y property scope.
BE-004 incorporará Google OIDC, sesión Guest y los Route Handlers BFF; no debe
reutilizar cookies, tokens ni sesiones Staff.

## BE-003 — Cierre

- **Rama:** `feature/be-003-authorization-scope`
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-29
- **Contrato:** C2 aprobado en `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`.
- **Alcance:** Organization/Property iniciales, roles y permisos Staff,
  memberships activas y resolución `PROPERTY`/`ALL_PROPERTIES` en Backend.
- **Límite:** no publica CRUD de Staff ni conecta los mocks Web. Esas tareas
  requieren su contrato BFF/administrativo y mantienen la regla de revocar
  sesiones al cambiar acceso.


### Entregado

- `002ServiceManagement/001` crea Organization y Property iniciales mediante
  Liquibase; no hay creación manual de tablas.
- `003ServiceSecurityAuth/002` crea roles fijos, catálogo de permisos,
  memberships y propiedades por membership. `003` impone una sola membership y
  rol por usuario Staff en V1.
- La sesión Staff resuelve rol, permisos y propiedades activas desde PostgreSQL
  antes de emitir token, validar una sesión y responder `GET /session`.
- `PropertyScopeResolver` construye scopes explícitos `PROPERTY` o
  `ALL_PROPERTIES`; este último exige `MULTI_PROPERTY_READ` y solo contiene IDs
  autorizados.

### Evidencia de validación

- `./mvnw -B test` con Maven/Temurin 21 y PostgreSQL 17: 6 pruebas exitosas.
- PostgreSQL 17 vacía: Liquibase aplicó, en orden, `002-management-001`,
  `003-staff-auth-001`, `003-staff-auth-002` y `003-staff-auth-003`; después
  la suite completa pasó.
- Smoke Docker aislado: bootstrap temporal de `SUPER_ADMIN`, login Staff y
  `GET /api/v1/staff-auth/session` verificaron `SUPER_ADMIN`,
  `MULTI_PROPERTY_READ` y `HB-GT-001`. Los contenedores y token temporales se
  eliminaron al finalizar.
- `git diff --check`: exitoso.

### Siguiente tarea

BE-004 implementa Google OIDC, identidad Guest y BFF. BE-005 reemplazará la
fixture Web Private-09 por un DTO/Mapper BFF basado en C2. El CRUD auditado de
Staff y memberships queda como tarea administrativa posterior; deberá revocar
sesiones cuando cambie el acceso.

## BE-004 — Cierre

- **Rama:** `feature/be-004-guest-oidc-bff`
- **Estado:** COMPLETADO
- **Contrato:** C3 aprobado en `10_GUEST_AUTH_CONTRACT_C3.md`.
- **Alcance:** Google OIDC, GuestAccount/GuestIdentity, sesión Guest,
  refresh rotativo y Route Handlers BFF con cookies host-only.
- **Dependencia registrada:** el OTP de vinculación histórica se integra una
  vez que Reservations publique la consulta de referencia/correo; BE-004 no
  crea entidades de Reservation, Stay ni GuestProfile.


### Avance BE-004

- C3 está registrado y el Backend implementa la transacción Google OIDC con
  `state`, `nonce`, PKCE, validación de token y `email_verified`.
- GuestAccount, GuestIdentity, sesiones, refresh rotativo y JWT Guest son
  estructuras separadas de Staff. Las rutas BFF Guest manejan cookies host-only
  HttpOnly sin serializar tokens hacia JavaScript.
- Resend se implementa como adaptador de infraestructura. La consulta y OTP de
  reservas históricas esperan el puerto seguro del módulo Reservations.

### Validación realizada

- Maven/Temurin 21 y PostgreSQL 17: 7 pruebas exitosas.
- PostgreSQL vacía aplicó cinco changesets, incluido `003-guest-auth-004`.
- `npm run typecheck`, `npm run lint` y el build de imágenes Docker Backend/Web
  fueron exitosos.
- Prueba local real: Google OIDC con usuario externo de prueba creó sesión y
  `GET /api/auth/guest/session` devolvió el correo validado y `context=GUEST`.
  La redirección BFF usa `PMS_WEB_PUBLIC_URL`, por lo que no filtra la dirección
  interna del contenedor.
- Refresh real por BFF: `POST /api/auth/guest/refresh` devolvió `200` y
  `refreshed=true`; el token de refresh se rotó.
- Logout real por BFF: `DELETE /api/auth/guest/session` devolvió `204` y la
  consulta posterior de sesión devolvió `401`. Se corrigió la respuesta BFF para
  emitir `204 No Content` sin cuerpo.

### Seguimiento de despliegue e integración

- Registrar el callback y dominio definitivos en Google para producción.
- Configurar dominio/remitente y API key de Resend para el OTP futuro.
- Integrar el puerto de vínculo OTP cuando Reservations publique búsqueda segura
  por referencia y correo, sin revelar existencia de reservas.


## BE-005 — Inicio

- **Rama:** `feature/be-005-staff-bff-integration`
- **Estado:** EN_PROGRESO
- **Contrato:** C2 aprobado en `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`; C1 sigue siendo autoridad para cookies y sesiones Staff.
- **Alcance autorizado:** Route Handlers BFF Staff, DTO/Mapper C2 y sustitución de la rama no-mock del provider Private-09.
- **Límite:** no crea CRUD de Staff, roles, memberships ni migraciones; el fixture Private-09 permanece para el modo mock y sus pruebas.


## BE-005 — Cierre

- **Rama:** `feature/be-005-staff-bff-integration`
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-30
- **Contrato:** C1 para el ciclo de sesión Staff y C2 para la sesión/autorización
  efectiva, ambos registrados en los documentos de Backend.

### Entregado

- Route Handlers BFF Staff para login, consulta de sesión C2, refresh y logout,
  con cookies `HttpOnly` host-only separadas de Guest. Ninguna respuesta BFF
  serializa access ni refresh token hacia JavaScript.
- DTO, mapper estricto y servicio de sesión Staff para el flujo no-mock Web.
  El mapper rechaza roles, permisos, propiedades, zonas horarias o monedas
  inválidos y memberships duplicadas.
- Provider Staff que resuelve la sesión C2, intenta refresh ante un `401` y
  conserva la fixture Private-09 únicamente cuando el modo mock está activo.
- Navegación privada basada en el rol C2 y las propiedades/permisos efectivos;
  `SUPER_ADMIN` recibe todos los módulos definidos.
- La descripción OpenAPI de `GET /api/v1/staff-auth/session` y el contrato C2
  especifican que la autorización se recalcula y que los tokens quedan dentro
  del BFF. No se crearon migraciones ni CRUD administrativo.

### Evidencia de validación

- `npm run typecheck`, `npm run lint` y `npm run build`: exitosos.
- `npm run test -- --run`: 182 archivos y 768 pruebas Web exitosas.
- Maven/Temurin 21 contra PostgreSQL 17 en Docker: `./mvnw -B -q test` exitoso,
  con Liquibase actualizado y validación Hibernate activa.
- `docker compose up --build -d`: imágenes Backend/Web construidas y servicios
  healthy.
- Smoke BFF Staff sin exponer secretos: login `201` con acuse limitado, sesión
  C2 `200` con rol `SUPER_ADMIN`, refresh `200`, logout `204` y consulta
  posterior `401`.
- `git diff --check`: exitoso antes del cierre.

### Siguiente tarea

El siguiente módulo operativo puede consumir C2 desde el BFF y debe aplicar
`PROPERTY`/`ALL_PROPERTIES` mediante el scope Backend. El CRUD auditado de
usuarios, roles y memberships continúa fuera de BE-005 y deberá revocar
sesiones al modificar el acceso.
