# 11 — Architectural Decisions

## Globales

### DEC-G-001 — Monorepo
Un solo repositorio Git en la raíz.

### DEC-G-002 — Frontend/Backend
Separación por carpetas raíz.

### DEC-G-003 — Web/Android
Aplicaciones separadas dentro de `frontend/`.

### DEC-G-004 — Figma V3
Fuente visual/funcional.

### DEC-G-005 — Domain semantics
Compartidas conceptualmente cross-app.

### DEC-G-006 — Property scope
Explícito.

### DEC-G-007 — Guest/Staff
Sesiones separadas.

### DEC-G-008 — Reservation/Stay
Entidades distintas.

### DEC-G-009 — Availability
Separada de physical inventory.

### DEC-G-010 — Payments
No PAN/CVV.

### DEC-G-011 — Financial/Audit history
Append-only/compensatory.

### DEC-G-012 — Integrations
Idempotentes y trazables.

### DEC-G-013 — Contratos frontend-first para features sin Backend

**Fecha:** 2026-09-10
**Status:** APPROVED — aceptada mediante Change Control.
**Responsable de aprobación:** Equipo PMS Hotel Boutique.

**Contexto:** Web y Android se implementarán antes de diseñar e implementar Backend. Algunas features frontend necesitan datos estables para construir UI, dominio frontend, mapper, estados y pruebas durante esa fase.

**Problema:** Exigir una API Backend inexistente bloquea el trabajo frontend; tratar mocks como API obligaría prematuramente decisiones de transporte, seguridad, persistencia y negocio que corresponden a Backend.

**Decisión propuesta:** Durante la fase frontend-first, una feature Web o Android podrá basarse en un contrato explícito de datos/mocks frontend, aprobado para su tarea. El contrato fija solo los datos, escenarios y boundaries necesarios para la UI, el dominio frontend, mapper y pruebas. No constituye contrato API Backend ni define endpoints, HTTP, auth, permisos, persistencia, tablas o reglas Backend.

**Consecuencias propuestas:**
- Backend será la autoridad de la API real cuando inicie su fase.
- DTO/Mapper absorberán la futura API sin permitir DTOs en UI.
- El contrato frontend no puede inventar reglas de negocio no confirmadas por producto, Figma, reglas de dominio o backlog.
- El DoR de una tarea afectada solo puede cambiarse mediante el workflow de Change Control y aprobación correspondiente.

**Alternativas consideradas:** Mantener el bloqueo hasta diseñar Backend completo; o declarar los mocks como API anticipada. Ambas alternativas se rechazan provisionalmente porque contradicen la estrategia frontend-first o congelan decisiones Backend sin su fase de diseño.

#### Clarificación aprobada — Android con datos dummy/locales

Durante la fase frontend-first, la ausencia de Backend no bloquea por sí sola una feature Android. Android puede ejecutarse completamente con datos dummy/locales cuando la tarea cuenta con autoridad visual/funcional suficiente y un contrato frontend/mock aprobado para su módulo.

Ese contrato determina solo los campos, escenarios de UI y boundaries que necesita Android. Los datos se sirven desde fixtures locales detrás de una implementación mock sustituible; la UI no importa fixtures ni DTOs. Cuando corresponde server-like state, TanStack Query/Mutation conserva esa autoridad. La integración futura reemplazará la implementación mock por una API real mediante DTO/Mapper, manteniendo Domain, UI, hooks públicos y query keys cuando sea razonable.

Los contratos frontend/mock no son API Backend: no definen endpoints, HTTP, persistencia, entidades, IDs Backend, base de datos, auth ni permisos. Backend será autoridad únicamente al iniciar su integración. Cada feature continúa bloqueada si faltan Figma, campos, comportamiento, semántica de dominio, navegación, pruebas o la aprobación de su propio contrato frontend/mock.

## Web — Sprint 0 aprobadas

### DEC-W-001 — Framework
Next.js con App Router y TypeScript strict.

### DEC-W-002 — Package manager
`npm` con `package-lock.json`. No pnpm, Yarn ni Node workspace por ahora.

### DEC-W-003 — Route Groups
`src/app/(public)` y `src/app/(private)` son obligatorios. `(public)/page.tsx` resuelve `/`; el inicio privado será `/dashboard` para evitar colisión de pathname.

### DEC-W-004 — Arquitectura de datos
`Service -> DTO -> Mapper -> Domain Model -> Hook/State -> UI`.

### DEC-W-005 — HTTP
`fetch` nativo mediante cliente técnico común en `src/lib/http`.

### DEC-W-006 — Server state
TanStack Query aprobado.

### DEC-W-007 — Mocking
MSW aprobado como mock HTTP. UI no importa mocks directamente.

### DEC-W-008 — Testing Sprint 0
Vitest + Testing Library + jsdom. Playwright se difiere hasta `IMP-WEB-1001`.

### DEC-W-009 — Boundaries
ESLint flat config debe aplicar `frontend/pms-hotel-web/docs/04_MODULE_BOUNDARIES.md`.

### DEC-W-010 — Design tokens
CSS Custom Properties basadas exclusivamente en `frontend/pms-hotel-web/docs/31_DESIGN_TOKEN_FOUNDATION.md`. No inventar dark mode.

### DEC-W-011 — Mapping errors
Campo DTO obligatorio inválido produce `DomainMappingError`; no se inventan defaults de negocio.

### DEC-W-012 — Auth Sprint 0
Autenticación real diferida. No usar `localStorage` como estrategia predeterminada de tokens.

### DEC-W-013 — Backlog operativo
Fuente canónica: `docs/Backlog_Implementacion_PMS_V1.xlsx`.

### DEC-W-014 — Figma Node IDs
Node IDs son solo trazabilidad. Solo registrar IDs verificados; celda vacía significa usar nombre de sección/pantalla, no inventar un ID.

### DEC-W-015 — Sprint 0 baseline
La infraestructura aprobada se materializa con tokens CSS, fonts mediante `next/font`, transporte fetch técnico, `DomainMappingError`, TanStack Query, MSW, Vitest/Testing Library, ESLint flat boundaries y CI Web. No implementa endpoints ni features de negocio. Los module shells del Structure Freeze permanecen sin capas internas hasta una tarea READY.

## Android — Sprint 0 aprobada

### DEC-A-001 — Stack técnico Android

**Fecha:** 2026-09-09
**Status:** APPROVED
**Responsable:** Equipo PMS Hotel Boutique / ANDROID-1

**Contexto:** La aplicación Android inicia su Sprint 0 sin proyecto ejecutable y requiere una base coherente con los contratos, el modelo de dominio y el Figma canónico.

**Decisión:** Android se implementará con React Native, Expo, TypeScript y Expo Router. Usará TanStack Query para server state, `fetch` nativo como transporte HTTP, Jest con React Native Testing Library para pruebas y `StyleSheet` con design tokens para estilos. Android Studio se limita a emulación y depuración.

**Seguridad y conectividad:** Expo SecureStore se incorporará solamente junto con autenticación real. NetInfo se incorporará solamente al implementar offline/recovery. Guest y Staff continúan siendo contextos separados.

**Decisiones negativas:** No se incorporan Redux, Zustand, framework de DI, Compose, XML ni una arquitectura UI Android nativa paralela en Sprint 0.

**Consecuencias:** Los datos siguen `Remote/API -> DTO -> Mapper -> Domain -> State Holder/ViewModel -> UI`; la UI no hace red directa ni consume DTOs. La versión de Expo elegida en `IMP-AND-0002` determinará las versiones compatibles de Gradle y mínimo SDK.

### DEC-A-002 — Fuente Figma Android

**Fecha:** 2026-09-09
**Status:** APPROVED
**Responsable:** Equipo PMS Hotel Boutique / ANDROID-1

La fuente visual y funcional canónica para Android es `238:132 — Implementation Ready — Android V2 + V3`. `31:132 — Reference — Android Early Journey` es referencia histórica y no autoriza pantallas ni rutas nuevas. Los Node IDs se usan solo para trazabilidad, nunca como IDs runtime.

### DEC-A-003 — Expo Continuous Native Generation

**Fecha:** 2026-09-09
**Status:** APPROVED
**Responsable:** Equipo PMS Hotel Boutique / ANDROID-1

**Decisión:** Android utiliza Expo con Continuous Native Generation (CNG), equivalente al workflow gestionado de Expo. Los directorios generados `android/` e `ios/` no se versionan ni son fuente de verdad.

**Validación de Foundation:** `npm ci`, `npx expo-doctor`, `npx tsc --noEmit`, `npx expo export` y un smoke de navegación/app técnica. La exigencia anterior de `Gradle build/assemble` queda sustituida.

**Uso nativo local:** Android Studio se puede usar para emulador, debugging y compilación local. Cuando sea necesario, `npx expo prebuild` o `npx expo run:android` generan el proyecto nativo efímero sin autorizar su versionado.

### DEC-A-004 — Android Guest Navigation Shell V3

**Fecha:** 2026-09-10
**Status:** APPROVED
**Owner:** ANDROID-1
**Reviewer principal:** WEB-3. WEB-2 participa como consulta adicional cuando la navegación futura de Cuenta requiera validar su semántica.

**Decisión:** `IMP-AND-0100` implementará un único shell Guest V3 reutilizable para `Servicios · Chat · Valet · Cuenta`, conforme a `238:132 — Implementation Ready — Android V2 + V3`. Sus rutas objetivo conceptuales son `/services`, `/chat`, `/valet` y `/account`. Una ruta objetivo no autoriza crear su archivo ni su feature.

**Destinos no implementados:** Las cuatro tabs permanecen visibles, pero están disabled hasta que su feature real esté autorizada e implementada. No navegan a rutas ficticias ni a placeholders. El handoff técnico `/services` de `IMP-AND-0102` no convierte Servicios en una feature V3 disponible.

**Selección, accesibilidad y navegación:** `usePathname()` es la única fuente de verdad para la tab activa. Una tab está activa en su `basePath` y sus hijas. No existe store global para selección. El shell usa la semántica accesible soportada por React Native; cada tab declara su label visible, `accessibilityRole="tab"`, estado `selected` cuando aplica y estado `disabled` sin handler ejecutable cuando no está disponible. El objetivo táctil mínimo es 44 × 44 dp. Un cambio entre tabs disponibles usa `router.replace(basePath)`; las rutas hijas usan `router.push(childPath)` y Android Back conserva el stack estándar, sin ciclos artificiales ni stacks independientes por tab. Tocar la tab activa es un no-op.

**Montaje y límites:** Se autoriza crear `frontend/pms-hotel-android/src/modules/navigation` como módulo transversal durante `IMP-AND-0100`. Aloja configuración declarativa, shell/footbar compartido, resolución pura de tab activa, integración Expo Router, estados enabled/disabled y accesibilidad. No contiene lógica de Stay, Services, Chat, Valet ni Account. El shell no envuelve globalmente `(guest)`, no monta sobre Home V2 y no modifica `IMP-AND-0102` ni el handoff `/services`. Su primer consumidor productivo será una feature V3 autorizada.

**Coexistencia V2/V3:** Home V2 conserva temporalmente `Inicio · Solicitudes · Explorar · Hotel`. No se agrega Inicio al shell V3. Su futura migración exige una tarea y Change Control independientes.

## Nueva decisión futura
Registrar ID, fecha, status, contexto, problema, decisión, alternativas, consecuencias y responsables. No borrar historia; usar `SUPERSEDED`.

## Backend — Foundation aprobada

### DEC-B-010 — Traspaso de implementación Backend BD2

**Fecha:** 2026-10-03. **Status:** APPROVED por decisión explícita del usuario.
**Responsables receptores:** Alan / BD1 y Juan / BD3.

**Contexto/problema:** tras la primera revisión, falta completar Frontend y Backend.
El usuario decide concentrar a José en Frontend y continuar Backend con Alan/Juan.
**Decisión:** ambos asumen conjuntamente los pendientes de BD2, conservando su
código, pruebas, contratos, autoría y estados reales de publicación/integración.
El reparto detallado del documento 23 es PROPOSED hasta acuerdo entre ellos.
**Alternativas:** mantener a José en ambos frentes conserva la carga que el
usuario decidió redistribuir; rehacer servicios existentes perdería lo entregado.
**Consecuencias:** supersede el ownership de trabajos pendientes en DEC-B-008;
no borra la decisión previa ni modifica reglas, módulos, APIs, DoR/DoD o permisos.
José continúa Frontend; alcance puntual se organiza con las fuentes de esa área.
Entrega documental BE-HANDOFF-001; revisiones de código/CI aún pendientes no se
declaran completadas por este traspaso. Receptores revisan ramas y acuerdan tareas.

### DEC-B-009 — Compose de presentación Backend aislado

**Fecha:** 2026-10-02. **Status:** APPROVED por petición explícita del usuario.
**Owner:** José / BD2. **Reviewer:** Alan / BD1 (runtime compartido).

**Problema:** presentar la API exigía overrides, variables y cinco colecciones.
**Decisión:** compose.demo.yaml reutiliza backend/PostgreSQL existentes con
proyecto/volumen propios, puerto backend limitado a loopback y bootstrap Staff
existente. Usuario/contraseña son valores públicos sintéticos solo de muestra;
no credenciales reales. Una colección Postman propaga tokens/IDs sin environment.
**Alternativas:** mantener configuración manual dificulta la revisión; modificar
la pila habitual mezclaría credenciales/datos de demo con el desarrollo normal.
**Consecuencias:** excepción explícita de presentación local a DEC-B-003/004,
sin cambiar la pila habitual, APIs, permisos, módulos ni secretos de despliegue.
Google/Resend no se configuran. La demo no se usa en nube; backend/BFF de la
pila habitual conserva su perímetro. Booking e idempotencia interna se muestran
con tests reales, sin inventar endpoints. Tracking BE-DEMO-001; PR requiere revisión BD1.

### DEC-B-008 — Reparto de la siguiente etapa Backend

**Fecha:** 2026-10-02
**Status:** APPROVED — reparto y plan modular autorizados por el usuario.
**Responsables:** Alan / BD1, José / BD2 y Juan / BD3.

**Contexto:** inventario/ATS/admisión y catálogos BD2 entregados; PR #72 revisado,
checks exitosos según confirmación del usuario e integrado en main `9eb2380`.

**Decisión:** BD2 asume Folio/Payments e invoices y lifecycle de reservas;
BD3, Operaciones y Comercial/B2B; BD1, Integraciones/Analítica y Administración/
Cumplimiento. Reutilizar modelos/servicios existentes y coordinar interfaces
de pagos, master folio, housekeeping, night audit y cotización.

**Alternativas:** mantener toda la ampliación de reservas/folios en BD3 concentra
las dependencias; duplicar sus servicios genera dos autoridades financieras.
El nuevo reparto distribuye la entrega conservando el motor único existente.

**Consecuencias:** seguimiento en AlanPlan/AlanHandoff. La fase 0 BD2 publica
inventario, brechas y propuestas; proveedor, garantía pública, políticas,
contratos API y SPIs pendientes requieren confirmación antes de su implementación.
No introduce nuevos módulos, roles, permisos ni cambios de scope. C1/C2/C3 y
los modelos vigentes se conservan; cambios futuros se tramitan por Change Control.
La ampliación del alcance administrativo (incluido MFA/roles) no modifica por
sí sola las restricciones de los contratos de seguridad vigentes.

### DEC-B-007 — BD2 Fase 1: inventario y contrato interno

**Fecha:** 2026-09-30
**Status:** APPROVED — alcance autorizado por el usuario en conversación.
**Responsable:** BD2.

**Contexto:** BD3 necesita un puerto estable mientras se construye el motor ATS.
**Decisión:** reutilizar Property y Liquibase de BD1; agregar el esquema mínimo
de Rooms, RoomTypes, OOO/OOS y RatePlans. Dinero exacto con unidades menores BIGINT
y moneda explícita mediante clases propias y converters JPA. Puerto interno ATS
por rango de noches, con stub de cinco unidades exclusivamente en pruebas.
**Alternativas:** recrear properties o incorporar otra herramienta de migración
duplicaría la base existente; una librería monetaria no es necesaria para este
valor mínimo. Un stub activo en producción permitiría vender stock ficticio.
**Consecuencias:** no hay motor ATS real ni CRUD en Fase 1. Overbooking=0; OOS
no descuenta ATS, OOO sí. Los instantes se conservan en UTC y las noches como
fechas locales. La reserva atómica exige integración posterior con BD3.
El detalle técnico y los límites están en
`backend/docs/11_BD2_CORE_FOUNDATION_CONTRACT.md`.

### DEC-B-001 — Arquitectura y persistencia Backend

**Fecha:** 2026-09-28
**Status:** APPROVED
**Responsable:** Alan / BD1

**Decisión:** Backend se implementa como monolito modular con Spring Boot y
capas Controller, Service interface/implementation, Repository/Entity y
DTO/Mapper. PostgreSQL es la base de datos y Liquibase es el único mecanismo de
migraciones. Hibernate usa `ddl-auto=validate`.

**Consecuencias:** Los changesets se organizan por módulo bajo
`backend/src/main/resources/db/changelog/<nnn>Service<Modulo>/`. Los módulos
pueden usar changelogs de entrada para desarrollo local con sus dependencias;
integración y CI aplican el changelog completo. No se crean tablas manualmente
ni se editan changesets ya aplicados.

### DEC-B-002 — Seguridad, BFF y seguimiento Backend

**Fecha:** 2026-09-28
**Status:** APPROVED
**Responsable:** Alan / BD1

**Decisión:** Spring Security usa `SecurityFilterChain`, JWT internos,
OAuth2/OIDC y refresh tokens. Guest y Staff son contextos separados. Web usa
Next.js como BFF y conserva tokens en cookies seguras no accesibles a JavaScript.
El control de tareas Backend se mantiene en `backend/docs/AlanPlan.md` y
`backend/docs/AlanHandoff.md`, sin usar el XLSX.

**Consecuencias:** El Backend sigue siendo la autoridad de contratos y
autorización. Antes de cualquier query property-scoped se validan sesión,
permiso, membership y scope. Los DTOs mock frontend no definen endpoints ni
persistencia.

### DEC-B-003 — Pila Docker local reproducible

**Fecha:** 2026-09-29
**Status:** APPROVED
**Responsable:** Alan / BD1

**Decisión:** La ejecución local de la pila Web, Backend y PostgreSQL se
centraliza en el `compose.yaml` de la raíz y se inicia con `docker compose up
--build`. Web es el único servicio publicado al host. Backend y PostgreSQL
solo se comunican por la red interna de Compose; Web reserva
`PMS_BACKEND_INTERNAL_URL` para los futuros Route Handlers BFF. Android queda
fuera de Compose porque se ejecuta mediante Expo con emulador o dispositivo del
host.

**Consecuencias:** Cada servicio posee una imagen reproducible y healthcheck.
La CI de la pila construye, inicia y espera los tres servicios. Los valores
predeterminados de PostgreSQL son exclusivamente locales; producción deberá
injectar secretos y configuración propios.

**Addendum local aprobado por el usuario (2026-10-05):** compose.yaml sigue
siendo el stack canónico PostgreSQL + Backend + Web. Comando reproducible:
`docker compose --env-file .env up -d --build`. Backend también se publica al
host, solo 127.0.0.1, mediante PMS_BACKEND_PORT (default 8081) para Swagger y QA
local. Esta instrucción actualiza la restricción histórica de publicar únicamente
Web; PostgreSQL permanece interno, Web BFF conserva http://backend:8080 y los
contratos C1/C2/C3 no cambian. Puertos/origen Web y Google provienen del entorno.
Staff local usa bootstrap existente con valores opt-in sintéticos, nunca defaults
productivos. El Compose de tests queda exclusivamente para verify aislado; QA
manual histórico se conserva aparte. [Guía](13_LOCAL_INTEGRATED_STACK.md).

### DEC-B-004 — Contrato C1 de identidad Staff y cuenta Guest

**Fecha:** 2026-09-29
**Status:** APPROVED
**Responsable:** Alan / BD1

**Decisión:** Una reserva pública puntual usa correo sin crear cuenta ni sesión.
Una `GuestAccount` se crea o recupera exclusivamente después de validar Google
OIDC en BE-004. Staff no se autorregistra: el hotel provisiona username, correo
laboral, contraseña hasheada y un único rol. `SUPER_ADMIN` posee todas las
funciones y las propiedades activas mediante scope explícito.

**Sesiones:** Next.js BFF mantiene access y refresh en cookies `HttpOnly`; BE-002
implementa solo Staff. MFA Guest se delega a Google y no hay MFA local Staff en
esta versión. Una reserva pasada exige Google, referencia de reserva y desafío
al correo registrado antes de vincularse.

**Consecuencias:** Los cambios de rol, estado o contraseña revocan sesiones
Staff. El primer SUPER_ADMIN se provisiona con secretos de despliegue sin
credenciales en el repositorio.

### DEC-B-005 — C2: autorización Staff y scope por propiedad

**Fecha:** 2026-09-29
**Status:** APPROVED
**Responsable:** Alan / BD1

**Decisión:** El V1 usa los roles fijos `SUPER_ADMIN`, `GERENCIA`,
`RECEPCION`, `OPERACIONES` y `AUDITOR`. Cada Staff mantiene una sola membership
de organización y un solo rol. La membership activa define las propiedades
accesibles; `SUPER_ADMIN` recibe todas las propiedades activas de su
organización. `ALL_PROPERTIES` requiere `MULTI_PROPERTY_READ` y siempre se
materializa como el conjunto explícito y autorizado de IDs.

**Consecuencias:** La autorización se recalcula desde PostgreSQL en cada
petición; no se copia el catálogo ni memberships mutables al JWT. Los módulos
operativos deben pasar el scope autorizado al repositorio antes de consultar.
Los roles son gestionados por el sistema en V1. La administración posterior de
Staff deberá revocar sesiones ante cambios de credencial, estado, rol o
membership.

### DEC-B-006 — C3: Guest Google OIDC mediante BFF

**Fecha:** 2026-09-29
**Status:** APPROVED
**Responsable:** Alan / BD1

**Decisión:** Guest usa Google OIDC con Authorization Code, `state`, `nonce` y
PKCE. Next.js posee el callback y las cookies; Spring Boot conserva la
autoridad de validar OIDC, resolver la cuenta y emitir sesiones. Las cuentas
Guest se separan de Staff y modelan identidades externas por proveedor y `sub`.

**Consecuencias:** Los tokens Guest no llegan a JavaScript. La vinculación
histórica exige OTP y una consulta de Reservations; no se inventa persistencia
de reservas antes de que su módulo exista.

### DEC-B-004 / entorno local — Addendum AUTH-UNIFIED-01

**Fecha:** 2026-10-06. **Status:** APPROVED por solicitud explícita de Alan.

Login tradicional universal = correo electrónico + contraseña en `/acceso`.
Google = Guest exclusivamente. Invitado = journey público sin autenticar.
Guest Auth != Staff Auth: no identidad central ni fusión de tablas. Fachada
BFF/Backend valida ambos contextos antes de revelar opciones; dos credenciales
válidas requieren selector y revalidación. Staff username permanece interno;
Guest credential separado de GuestProfile, reutiliza GuestAccount y sus sesiones.
Guest provisionado con credential puede acceder por password; registro público,
recuperación/cambio de contraseña y MFA no se implementan en este incremento.
Esta decisión sustituye la exclusividad Google del login Guest anterior.

Puerto canónico versionado http://localhost:3001. Compose raíz publica únicamente
127.0.0.1:3001:3000; Backend/PostgreSQL internos. Override debug explícito para
Swagger 8081. Esta decisión sustituye el addendum 2026-10-05 de publicación
Backend normal y puertos variables. dev/start también fijan 3001 sin fallback.
QA integrado = Docker Compose raíz, mismo commit; conflicto de puerto falla.
[Contrato y QA](../backend/docs/44_UNIFIED_LOGIN_CONTRACT_QA.md).
