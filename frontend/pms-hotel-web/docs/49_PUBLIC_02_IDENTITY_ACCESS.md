# Public 02 — Acceso y registro Guest

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


**Restauración visual autorizada por José (2026-10-07), coordinada con BD1:**
Se recupera la presentación diseñada para `/acceso`: pestañas Iniciar sesión/Crear
cuenta, Google con su icono, campos de registro, fuerza de contraseña, términos y
preferencias. El mismo componente se muestra con y sin mocks en el puerto **3001**.
El login conserva `useUnifiedLogin` y el BFF real de AUTH-UNIFIED-01, sus límites50,
selección posterior a validación y redirecciones Staff/Guest. Google conserva su
enlace al BFF, no una identidad simulada. Header limpio y checkout se mantienen.

BD1 implementará la creación de cuentas de clientes. Hasta confirmar su API,
el formulario de registro valida localmente y comunica indisponibilidad; no envía
datos, crea cuenta/sesión, guarda contraseñas o registra consentimientos. Los
límites/política visual del registro anterior son provisionales, no un contrato
Backend. Recuperación y documentos legales comunican su disponibilidad real.
Esta autorización sustituye la exclusión visual del registro descrita abajo;
no declara implementada su integración. La confirmación «Cuenta vinculada» se
retomará al contar con un registro real exitoso, sin emitir éxitos ficticios.

Validación de esta restauración: lint, TypeScript estricto y build PASS; 19
archivos/211 pruebas PASS de Auth, BFF, composición de `/acceso` y guard Staff.
Chrome en 3001: login/registro, validaciones y foco, documentos legales,
contraseña transitoria y registro sin requests PASS. Sin overflow a 320, 390,
540, 768, 1024 y 1440 px ni excepciones de ejecución. Esto valida la presentación
y las regresiones automatizadas; no certifica registro Backend ni Google real.
Punto de integración de BD1: `components/guest-registration-form.tsx`, después
de validar el formulario. Debe acordar DTO/service/mapper/hook, crear la cuenta
Guest real y devolver un resultado antes de mostrar confirmación. No usar el
endpoint de login como registro ni restaurar la creación ficticia anterior.

**Actualización aprobada AUTH-UNIFIED-01 (2026-10-06):**
[Contrato vigente](../../../backend/docs/44_UNIFIED_LOGIN_CONTRACT_QA.md): login tradicional universal correo electrónico + contraseña;
Guest/Staff separados, Google solo Guest e invitado público. Guest password solo
para cuentas con credential existente; sin registro/recuperación/cambio/MFA.
`/acceso` tiene un formulario único en http://localhost:3001. Las decisiones y
pruebas de simulación/registro anteriores se conservan como contexto histórico;
no representan el login vigente. UI/BFF nunca exponen JWT al JavaScript.


## Alcance autorizado

Refactorización frontend solicitada por José para WEB-2 / `IMP-WEB-0202`, ruta `/acceso`, en `feature/web2-public-identity-account`. Fuente visual: especificación del usuario; no se inventan Node IDs ni se declara comparación pixel-perfect con Figma sin una referencia visual.

El backlog conserva `IMP-WEB-0201` y `IMP-WEB-0202` PENDIENTE. El código de 0201 (GuestAccount/ExternalIdentity, service y mapper) ya existe y se reutiliza. La autorización del usuario cubre este incremento de presentación y prototipo local; no modifica el XLSX ni declara terminada la integración de autenticación real.

## Comportamiento del prototipo local (`NEXT_PUBLIC_USE_MOCK_API=true`)

- Encabezado exclusivo de `/acceso`: Hotel Boutique e inicio. Las otras rutas conservan navegación y acceso a cuenta de WEB-1.
- Tarjeta responsive con pestañas login/registro, operables con flechas, Home/End y teclado. Email se conserva al alternar; contraseñas se descartan.
- Login: correo y contraseña, mostrar/ocultar, Google, recuperación informativa y continuación como invitado.
- Registro: nombre, correo, contraseña y confirmación, indicador de fortaleza, aceptación explícita de términos/privacidad y marketing opcional. Ningún consentimiento viene marcado. La aceptación también se exige para el recorrido social de registro.
- Validación al salir del campo y enviar; después, errores se actualizan al editar. Primer campo inválido recibe foco. Indicador de fortaleza y mínimo de ocho caracteres son reglas de presentación, no una política de seguridad Backend confirmada.
- Envío bloqueado durante carga; errores de red/datos recuperables sin sesión falsa. Solo Crear cuenta muestra [Cuenta vinculada](50_PUBLIC_02_LINKED_ACCOUNT.md), con acciones explícitas para cuenta, reservas y checkout. Iniciar sesión con correo/Google redirige directamente al retorno autorizado o a `/cuenta`, sin confirmación intermedia ni demora artificial.
- Retornos mediante `guestAccessReturn`: solo `/mis-reservas`, `/cuenta/reservas/vincular` y `/reserva/checkout?...`. No se admite una URL externa ni se pone información del huésped en la URL.
- Se conserva el carrito y borrador de reserva mediante los providers existentes. La sesión Guest sigue separada de Staff; logout limpia exclusivamente caché Guest.

## Límite de autenticación y contrato local

La decisión `DEC-B-004` continúa rigiendo la autenticación **real**: cuenta Guest mediante Google OIDC. La especificación del usuario añade credenciales al **frontend**; Apple queda excluido por la corrección solicitada el 2026-10-06. Este incremento prepara sus interacciones locales; no cambia el backend, proveedores externos aprobados, permisos, BFF, cookies o JWT. BD1 debe acordar esos métodos antes de conectarlos.

El transporte del prototipo local sigue siendo exclusivamente MSW: `POST http://pms.test/__mock/guest-access`. No es un endpoint Backend confirmado. Entradas del prototipo:

```ts
type GuestAccessInput =
  | { method: 'EMAIL'; email: string; registration?: { fullName: string } }
  | { method: 'GOOGLE' };
```

Las contraseñas y su confirmación permanecen únicamente en los inputs transitorios. Nunca se envían a este transporte, guardan en query cache, sesión, storage, logs o fixtures. El prototipo **no verifica credenciales reales**. No implementa unicidad de correo, verificación de email ni recuperación por correo.

`GuestAccountDTO`, su mapper y los proveedores externos canónicos permanecen intactos. `accessMethod` es metadato de presentación en memoria. El acceso social usa únicamente Google y conserva su fixture y sus reglas de vinculación.

El registro local usa `guest-demo-register`, empieza sin reservas y aplica el nombre a su fixture **GuestProfile**, nunca a GuestAccount. Nombre y apellido son obligatorios en el mapper GuestProfile existente; el formulario solicita ambos dentro de Nombre completo para no producir un perfil inválido. El acceso posterior con el mismo correo conserva ese perfil mientras la aplicación siga abierta. El checkbox de marketing es presentación local: no afirma registrar un consentimiento real o suscribir un correo. Las políticas del hotel siguen pendientes de publicación y se muestran como tales en sus diálogos.

Tras la integración de BD1 en `main` el 2026-10-06, `NEXT_PUBLIC_USE_MOCK_API=false` utiliza la sesión Guest y el acceso Google reales mediante el BFF existente. No ofrece formularios locales de correo/registro ni Apple. Se conserva la comprobación de sesión, el logout real y el resumen de cuenta integrado, sin modificar sus contratos. El servicio de acceso simulado mantiene su guard independiente. La recarga completa termina únicamente la sesión local del prototipo en memoria. Véase [integración de cuenta](33_PUBLIC_ACCOUNT_FRONTEND.md).

## Verificación manual en puerto 3000

1. Abrir `/acceso`: encabezado limpio, pestaña Iniciar sesión activa y posibilidad de continuar como invitado.
2. Enviar vacío y corregir email/contraseña: errores contextualizados y foco; mostrar/ocultar contraseña.
3. Abrir Crear cuenta: verificar fuerza, coincidencia y términos obligatorios; marketing desmarcado y opcional.
4. Enviar los campos válidos: carga, check y retorno a Mis reservas. El nuevo registro no contiene reservas ajenas.
5. Google: estado de sesión local, sin requests a Backend. Vinculación local por sesión Guest, referencia y código según [entrega 51](51_PUBLIC_02_EXISTING_RESERVATION_LINK.md); la política Backend real se conserva. Apple no aparece en login ni registro.
6. `error@example.com` / `offline@example.com`: error recuperable sin redirección ni sesión; corregir email y reintentar.
7. Desde datos del huésped, acceder y regresar: mismos parámetros de búsqueda y borrador conservado.
8. Recuperación y enlaces legales: diálogos con Escape, foco devuelto y sin afirmar envío de correos.
9. Revisar teclado, tamaños 320–1440 px, contraste, cierre de sesión y ausencia de overflow.

La revisión WEB-1 y comparación con Figma siguen siendo requisitos de cierre formal. La conexión real de Google y los acuerdos con BD1 para los nuevos métodos quedan fuera de este incremento.

## Evidencia de validación — 2026-10-05

- Node 24 en Windows; CI Web utiliza Node 24 en Ubuntu. No se modifica su workflow.
- `npm run lint`: PASS, cero warnings.
- `npm run typecheck`: PASS, ejecutado después del build para evitar concurrencia sobre los tipos generados por Next. No se depende del `ignoreBuildErrors` existente.
- `NEXT_PUBLIC_USE_MOCK_API=true npm run build`: PASS, 70 rutas. Las modificaciones generadas de `next-env.d.ts` se retiran del diff.
- `npm run test -- --pool=threads --maxWorkers=1 --reporter=dot`: PASS, 213 archivos / 1,009 pruebas; ninguna exclusión ni prueba deshabilitada.
- Pruebas finales del componente de acceso: PASS, 20 casos, incluida la validación de nombre/apellido y el acceso posterior al registro. La ejecución con un solo worker evita la saturación local; no cambia los tests ni el workflow.
- Chrome en el entorno de desarrollo histórico anterior al puerto canónico 3001: PASS para login, registro, Google/Apple locales, recuperación de error y retorno seguro al checkout; sin excepciones ni errores de consola. Sin requests al BFF de autenticación/Backend ni envío de contraseñas.
- Responsive: PASS a 320, 390, 540, 768, 1024 y 1440 px, incluido correo largo en el estado de éxito móvil.
- `git diff --check` y revisión del diff staged: PASS. Sin logs, parches, archivos de entorno ni capturas en el commit.

## Corrección — 2026-10-06

- Se retira Apple de login, registro, recuperación y fixtures locales. Google, correo y checkout como invitado se conservan.
- La prueba de Apple se reemplaza por la comprobación de su ausencia en ambas pestañas y la presencia de Google.
- `npm run test -- src/modules/auth/components/guest-access-page.test.tsx src/modules/auth/service/guest-access.service.test.ts src/modules/account --pool=threads --maxWorkers=1 --reporter=dot`: PASS, 8 archivos / 53 pruebas. La primera ejecución concurrente con build/lint agotó el límite de 5 segundos de una prueba de vinculación; la repetición sin otras validaciones en paralelo pasó, sin alterar límites ni assertions.
- `npm run lint`, `npm run build`, `npm run typecheck` (tras build) y `git diff --check`: PASS. Se descarta el cambio generado de `next-env.d.ts`.
- Chrome sobre el servidor de desarrollo en el entorno de desarrollo histórico anterior al puerto canónico 3001: PASS para ausencia de Apple en login/registro, Google, formularios, errores recuperables y retorno al checkout. Responsive sin overflow a 320–1440 px; sin errores de consola, requests de autenticación al Backend ni transporte de contraseñas. Servidor iniciado con `NEXT_PUBLIC_USE_MOCK_API=true`; no se valida autenticación real.

## Resolución preparada frente a `origin/main` — 2026-10-06

Validación temporal frente a `ea3ac86`, sin modificar la rama publicada. Se combinan los cambios de BD1 en cuenta/sesión real con la eliminación de Apple; se conserva el correo único en la cuenta y el guard de identidades opcionales. Los dos conflictos corresponden a `account-dashboard-page.tsx` y `guest-access-page.test.tsx`.

- `npm run test -- src/modules/auth src/modules/account src/app/api/auth --pool=threads --maxWorkers=1 --reporter=dot`: PASS, 19 archivos / 166 pruebas, incluidos sesión real y BFF.
- `npm run lint`, `NEXT_PUBLIC_USE_MOCK_API=true npm run build`, `npm run typecheck` tras build: PASS.
- Sin marcadores de conflicto; diff contra `origin/main` limitado a los ocho archivos de la eliminación de Apple. No se modifican contratos ni código Backend.


## Ajuste QA — estado inicial de registro (AUTH-GUEST-REG-HISTORY-01, EN_QA)

- Login y registro conservan estados independientes. Cambio manual Login →
  Crear cuenta: campos vacíos, untouched, sin errores previos. Cambio manual
  inverso descarta el formulario de registro; no transfiere su email.
- Un submit válido limpia submitted/touched al vaciar las contraseñas, incluso
  si el request falla con429. El mensaje429 solo corresponde al request actual;
  entrar de nuevo mediante tabs no lo conserva. Los límites Backend no cambian.
- Volver desde OTP conserva solo el email en memoria y limpia contraseñas,
  OTP, validación, errores y cooldown UI; no crea otro registro. Ir a iniciar
  sesión transfiere únicamente el email en memoria y no hace request.
- El requestId inicial recibido por restore se descarta en cambios manuales de
  pestaña. F5 conserva el comportamiento vigente del contexto HttpOnly mientras
  exista: abandonar la vista no borra esa cookie ni el registro Backend.
- autocomplete: email / current-password en login; email / new-password en
  registro y confirmación; one-time-code en OTP. El navegador puede completar
  correo según su perfil; la aplicación no copia campos Login → Registro.
- Reset QA local propuesto en
  `backend/docs/qa/AUTH-GUEST-REG-HISTORY-01_LOCAL_RESET.sql`: SELECTs primero,
  selección por email + UUID revisados, ROLLBACK por defecto; no ejecutado.
