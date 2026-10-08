# 13 — Auth and Sessions

## Ajuste QA posterior — respuesta neutral y CTA PMS

Guest existente no recibe correo informativo ni OTP; registration/resend mantienen202 genérico sujeto al mismo binding/cooldown/cuotas. Web no conoce existencia/método/status. Después de202: “Revisa tu correo”, código si puede continuarse y orientación a iniciar sesión si ya tiene cuenta. CTA “Ir a iniciar sesión” cambia de tab, conserva email solo en memoria si disponible y elimina password/OTP sin request Backend.

`Button`/`buttonClassName` compartidos para primary, outline, ghost y links Google/invitado; tokens de color/radius/font/spacing del PMS, targets48px (acciones auxiliares44px), loading/disabled/focus visibles. CSS de acceso conserva layout y elimina overrides independientes de CTA, spinner propio y estilos sin consumidores de strength/consents. Google mantiene icono de marca. No cambia Staff Auth ni las reglas password8..50/max72bytes de registro y login vigente.

## AUTH-GUEST-REG-HISTORY-01 — decisión vigente (2026-10-07), EN_QA

**Regla anterior (superseded para coincidencias verificadas):** confirmationCode + OTP obligatorio para todo historical link.
**Regla nueva aprobada por Alan:** verified Guest email auto-links compatible reservations; reservation-specific OTP remains manual fallback. La coincidencia utiliza únicamente Reservation.bookingGuest → GuestProfile.email con trim/lowercase; sin filtro de fecha, estado o property ACTIVE. Nunca acompañantes ni IDs elegidos por cliente. Links propios se conservan; conflictos ajenos se omiten/auditan, sin transferencia/UPDATE/DELETE. Las consultas Guest siguen autorizadas exclusivamente por links persistidos.

Registro real exclusivamente Guest: email requerido/formato/max50 normalizado, password8..50 sin trim/normalización/composición, confirmación exacta solo Web. Sin nombre, marketing ni aceptación persistida de términos. Login conserva sus límites previos y no recibe mínimo8. Cuenta password/Google/DISABLED existente no se sobrescribe ni fusiona. `/acceso` único; Google nuevo usa el mismo auto-link tras OIDC verificado, sin OTP extra.

Pending registration separado, hash BCrypt(12), binding HttpOnly BFF y OTP8 con HMAC por propósito/generación. TTL OTP10min, contexto30min, cinco intentos compartidos contra reinicios, resend60s, 3 envíos/email/hora y 10/email/día. 202 genérico no acredita existencia ni envío. Verify atómico crea cuenta/credential/proof/links/sesión y consume pending; sin OTP/password/tokens en claro persistidos. Prueba de email separada respalda N links; evidencia OTP manual histórica y append-only preservados.

Backend: POST `/api/v1/guest-auth/registrations`, `/verify`, `/resend`; verify201 tokens exclusivamente al BFF, errores400/403/422/429/503 genéricos. Header secreto `X-Guest-Registration-Binding` server-to-server. Browser: `/api/auth/guest/registrations` y mismas acciones; tokens únicamente cookies Guest. F5 recupera contexto HttpOnly; Backend siempre revalida. Account Summary refleja count y próxima estadía tras commit; no implementa historial completo.

Guest auth real con ambos flags de datos mock. Logout Guest confirmado → `/acceso`; fallo conserva sesión. Bootstrap401 → un refresh Guest deduplicado → un retry; segundo401 signed-out; red/5xx/mapping error recuperable. Staff implementación/destino `/` preservados, caches separados.

**QA pendiente:** confirmación manual de Alan, entrega real Resend y configuración HMAC del entorno. Decisión posterior aprobada por Alan: registration8..50 caracteres y máximo72 bytes UTF-8 reales; login conserva máximo50 sin mínimo8 y rechaza >72 bytes con credenciales genéricas antes de BCrypt. Sin trim/lowercase/Unicode normalization/truncamiento. BCrypt(12) intacto; límite resuelto, sin cambios a sesiones Staff. OpenAPI/Postman, tests y resultados finales se registran en AlanHandoff. Ninguna entrada histórica inferior declara vigente una regla sustituida aquí.


Herramienta local solicitada por José (2026-10-07): `npm run dev:staff` permite
revisar el frontend privado sin Backend, con una identidad ficticia y cache
separada. Solo development/localhost y un flag explícito; no es un login ni se
activa por habilitar mocks de datos. El acceso normal y production conservan
AUTH-UNIFIED-01. [Uso y límites](54_STAFF_FRONTEND_PREVIEW.md).

Actualización de presentación autorizada por José (2026-10-07), acordada con BD1:
se recuperan las pestañas de login/registro y el diseño Public 02 en `/acceso`.
Login real, Google BFF, sesiones, cookies, permisos y retornos permanecen intactos.
BD1 implementará el registro de clientes; su formulario aún no tiene transporte ni
crea identidades ficticias. Recuperación y registro pendientes se comunican al usuario.
[Alcance y punto de integración](49_PUBLIC_02_IDENTITY_ACCESS.md).

Decisión aprobada AUTH-UNIFIED-01 (2026-10-06): `/acceso` es la única pantalla de
login, con correo electrónico y contraseña universal, Google exclusivamente Guest
 y continuar como invitado. No selector de tipo de cuenta antes de validar password.

Browser POST /api/auth/login → Backend POST /api/v1/auth/sessions. Backend valida
ambos contextos; solo uno válido inicia sesión; ambos requieren elección explícita.
El selector mantiene password solo en memoria transitoria y reenvía en cuerpo para
revalidar; editar las credenciales elimina selector. El BFF devuelve solo
context/contexts/authenticated, conserva JWT/refresh en cookies HttpOnly existentes:
pms_staff_* y pms_guest_*; Secure y SameSite=Lax vigentes. No auth por rol elegido
por el cliente, ni JWT raw en JS/storage. Rutas sintéticas pms_session y su hook sin
consumidores se retiran para que no haya una segunda lógica de autenticación.

GuestAccount/GuestIdentity/password credential != GuestProfile. Staff mantiene
roles/permisos/membership/property scope y su sesión separada. Google OIDC sigue
start/callback/exchange con state/nonce/PKCE de servidor y cookies Guest.
Invitado navega sin crear cuenta/sesión y conserva carrito/search state.

Correo/password inválido o cuenta inactiva/sin credential → mismo error genérico;
backend indisponible → estado recuperable. Contraseña no persiste en localStorage,
sessionStorage, logs, URL ni caches de Query; se borra tras resultado definitivo.
Campos admiten password manager, autocomplete, paste y teclado.

Contrato final: email required/type=email/maxLength=50, trim antes de validar y
lowercase para lookup; password required/type=password/maxLength=50, sin trim,
lowercase ni normalización. NotBlank rechaza vacío/solo espacios, sin alterar
espacios de una contraseña no vacía. Browser y BFF comparten validación de entrada;
el servicio Web rechaza bypass programático antes de fetch. Formato email común
con Backend, incluyendo rechazo de puntos consecutivos y dominios con guion bajo.
Backend DTO y servicios
validan también; OpenAPI email/password maxLength=50, formats y writeOnly vigentes.
No complejidad nueva, cambios de hash BCrypt(12), reducción de columnas ni migration.

Puerto público canónico http://localhost:3001; Docker raíz publica solo Web,
Backend/PostgreSQL internos. dev/start usan 3001 y fallan ante conflicto.
Registro público/forgot/reset/change password/MFA pendientes; ninguna UI simula
que estén disponibles. QA integrado Docker raíz; AUTH-UNIFIED-01 COMPLETADA tras
QA manual PASS de Alan (2026-10-06) en http://localhost:3001: Staff demo/qa_staff,
Guest demo, dashboard, aislamiento, F5/restauración, logout/Atrás, límites50,
Google Guest completo, invitado y puerto canónico.
[Contrato/QA](../../../backend/docs/44_UNIFIED_LOGIN_CONTRACT_QA.md).

## Corrección de QA: guard y restauración Staff (2026-10-06)

Guest y Staff conservan providers, cookies y caches independientes. Guest usa
`["guest-session"]`; Staff usa `["auth", "staff", "session"]` tanto en `/acceso`
como en el guard privado. Guest 401 significa Guest signed-out; no altera Staff.
Los requests BFF con withAuth=false no emiten logout mediante el interceptor global.

El contrato Staff sigue devolviendo username como identidad interna; email solo
cambió el input de login. El mapper acepta el permiso contractual
SERVICE_REQUEST_INTAKE (changeset aplicado 003/006). Su ausencia en la lista Web
provocaba DomainMappingError incluso con HTTP200, presentado antes como sesión
ausente. Un DTO inválido ahora falla cerrado con error de carga recuperable.

Bootstrap Staff: GET session; solo ante 401, un POST refresh y un retry GET.
Un segundo 401 o refresh 401 termina en signed-out; transporte/503 es error de
carga, no sesión ausente. La rotación concurrente se comparte solo dentro de Staff.
No refresh loop ni dependencia de focus; la revalidación 200 actualiza la UI.
Session/refresh Staff llevan Cache-Control: no-store y no convierten Backend 5xx
en 401. Cookies HttpOnly/Secure/SameSite y contratos Backend quedan preservados.

El guard muestra loading inicial, conserva la última identidad válida durante
background refetch/transporte, y bloquea tras 401 definitivo. Logout confirmado
cancela lecturas Staff y publica null únicamente en su cache. Focus sigue activo
para Staff; no se cambiaron las opciones globales ni las opciones Guest.

QA automático: 24 regresiones añadidas, incluyendo dashboard/PrivateLayout reales,
orden Guest/Staff, 401→200, no flicker, refresh/retry acotado, logout aislado y
contraseña con espacios intacta. Firefox aislado contra Docker 3001 verifica login,
Guest401, F5, focus, restauración conservando refresh y logout. Alan confirmó QA
manual PASS de dashboard, aislamiento y F5/restauración; COMPLETADA.

## Logout explícito Staff — salida pública (2026-10-06)

Después de DELETE BFF exitoso: mostrar transición de salida, cancelar la consulta
Staff, publicar null en auth/staff/session, cancelar/eliminar caches Staff de
private-09/reservations/rooms y router.replace("/"). Guest session/datos y queries
públicas permanecen intactos. No QueryClient.clear, push, window.location ni delays.
El fallo conserva sesión/cache/ruta y muestra error para reintentar.

La transición solo aplica a logout explícito confirmado, para no mostrar el guard
mientras Next cambia a Home. Acceso directo sin Staff sigue bloqueado por el guard.
No router.refresh: los layouts no autorizan mediante datos SSR cacheados; el guard
consume la consulta Staff actual. Firefox real confirma que Atrás hacia dashboard/
calendario sigue bloqueado y Staffsession401, con Guest coexistente200 conservado.
Se verifica replace manteniendo history.length, URL exacta http://localhost:3001/
y ausencia de «Sesión Staff requerida» en Home. Alan confirmó logout desde ambas
rutas y Atrás sin recuperar sesión Staff PASS; COMPLETADA.


## Ajuste QA posterior — salida privada Staff y copy neutral (EN_QA)

Decisión aprobada de Alan: el bloqueo estático «Sesión Staff requerida» de las
secciones históricas anteriores queda sustituido por `router.replace("/")`
cuando session/refresh/retry termina definitivamente en401, incluido acceso
directo. El guard muestra transición, retira contenido y limpia solo caches
Staff. Logout confirmado conserva la misma salida; fallos5xx/network/DTO siguen
recuperables y no se reinterpretan como ausencia de sesión.

Las ventanas normales comparten cookies. Se conserva revalidación de visibilidad
TanStack y se añade revalidación de la misma consulta al recuperar foco de ventana,
coalesciendo requests en curso. Al regresar a la otra ventana después de logout,
BFF confirma el401 y esa ventana abandona la ruta privada. No auth por ventana,
localStorage, polling ni cambio de tokens/BFF/Backend.

Se retira el párrafo «Crea tu cuenta Guest...» de Crear cuenta. Tras202: «Si podemos
continuar con este correo, recibirás instrucciones para verificarlo. Si ya tienes
una cuenta, inicia sesión con tu método habitual.» No se afirma envío realizado.
La regla validada existentes→202→0 Resend no cambia. Limitación del proveedor
resend.dev registrada como bloqueo externo para QA de correo real.
