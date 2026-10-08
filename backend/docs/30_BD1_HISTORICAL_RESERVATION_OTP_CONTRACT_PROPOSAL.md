# BE-013A-01 — Contrato aprobado para vincular reservas históricas

## AUTH-GUEST-REG-HISTORY-01 — decisión vigente (2026-10-07), EN_QA

**Regla anterior (superseded para coincidencias verificadas):** confirmationCode + OTP obligatorio para todo historical link.
**Regla nueva aprobada por Alan:** verified Guest email auto-links compatible reservations; reservation-specific OTP remains manual fallback. La coincidencia utiliza únicamente Reservation.bookingGuest → GuestProfile.email con trim/lowercase; sin filtro de fecha, estado o property ACTIVE. Nunca acompañantes ni IDs elegidos por cliente. Links propios se conservan; conflictos ajenos se omiten/auditan, sin transferencia/UPDATE/DELETE. Las consultas Guest siguen autorizadas exclusivamente por links persistidos.

Registro real exclusivamente Guest: email requerido/formato/max50 normalizado, password8..50 sin trim/normalización/composición, confirmación exacta solo Web. Sin nombre, marketing ni aceptación persistida de términos. Login conserva sus límites previos y no recibe mínimo8. Cuenta password/Google/DISABLED existente no se sobrescribe ni fusiona. `/acceso` único; Google nuevo usa el mismo auto-link tras OIDC verificado, sin OTP extra.

Pending registration separado, hash BCrypt(12), binding HttpOnly BFF y OTP8 con HMAC por propósito/generación. TTL OTP10min, contexto30min, cinco intentos compartidos contra reinicios, resend60s, 3 envíos/email/hora y 10/email/día. 202 genérico no acredita existencia ni envío. Verify atómico crea cuenta/credential/proof/links/sesión y consume pending; sin OTP/password/tokens en claro persistidos. Prueba de email separada respalda N links; evidencia OTP manual histórica y append-only preservados.

Backend: POST `/api/v1/guest-auth/registrations`, `/verify`, `/resend`; verify201 tokens exclusivamente al BFF, errores400/403/422/429/503 genéricos. Header secreto `X-Guest-Registration-Binding` server-to-server. Browser: `/api/auth/guest/registrations` y mismas acciones; tokens únicamente cookies Guest. F5 recupera contexto HttpOnly; Backend siempre revalida. Account Summary refleja count y próxima estadía tras commit; no implementa historial completo.

Guest auth real con ambos flags de datos mock. Logout Guest confirmado → `/acceso`; fallo conserva sesión. Bootstrap401 → un refresh Guest deduplicado → un retry; segundo401 signed-out; red/5xx/mapping error recuperable. Staff implementación/destino `/` preservados, caches separados.

**QA pendiente:** confirmación manual de Alan, entrega real Resend y configuración HMAC del entorno. Decisión posterior aprobada por Alan: registration8..50 caracteres y máximo72 bytes UTF-8 reales; login conserva máximo50 sin mínimo8 y rechaza >72 bytes con credenciales genéricas antes de BCrypt. Sin trim/lowercase/Unicode normalization/truncamiento. BCrypt(12) intacto; límite resuelto, sin cambios a sesiones Staff. OpenAPI/Postman, tests y resultados finales se registran en AlanHandoff. Ninguna entrada histórica inferior declara vigente una regla sustituida aquí.


**Estado:** APPROVED; el usuario aprobó L-01 a L-07 el 2026-10-04.
Revisión de integración BD3/Guest Web pendiente. **Base:** `main` `eb088d7` (PR #101),
2026-10-04. **Rama:** `feature/bd1-historical-reservation-otp-contract`.

Esta entrega no crea endpoints, tablas, OTP ni asociación. Define el contrato
para BE-013B. La regla aprobada en [C3](10_GUEST_AUTH_CONTRACT_C3.md)
es `confirmationCode` + correo Google verificado + OTP hasheado enviado al
correo de la reserva, con expiración a 10 minutos, máximo cinco intentos, reenvío
separado al menos 60 segundos, un solo uso y respuestas externas genéricas.
Las decisiones adicionales L-01 a L-07 fueron aprobadas por el usuario; la
revisión de integración de los owners sigue pendiente antes de BE-013B.

## Evidencia y límite de los modelos actuales

- `ReservationLinkVerificationPort` es una interfaz vacía; la clase BD3
  `ReservationLinkService.verifyLink(code,email)` devuelve solo
  `reservationId` y `guestProfileId`, con `Optional.empty()` para código/correo
  ausente o distinto. `Reservation.confirmationCode` es único y su
  `bookingGuest` puede ser nulo. El correo vive en `GuestProfile`.
- `GuestAuthService.getActivePrincipal` revalida sesión/cuenta desde BD. El
  correo de `GuestAccount` se obtuvo de Google con `email_verified=true` al
  crear la cuenta; `GuestPrincipal.email` no viene del JWT. La cuenta no actualiza
  hoy ese correo al cambiar el dato en Google. El contrato debe usar identidad
  vigente de BD y no aceptar un correo suministrado por el request.
- `GuestProfile.guest_account_id` es opcional y puede participar en múltiples
  reservas. Vincular una cuenta al perfil como atajo podría otorgar acceso a
  otras reservas del mismo perfil sin OTP propio. Hoy no hay tabla por
  reserva/cuenta ni desafío OTP. `EmailSender`/`ResendEmailSender` existen,
  pero no hay entrega externa verificada en el entorno de presentación.

## Flujo propuesto

1. El BFF envía el JWT Guest de su cookie HttpOnly al Backend. Guest Auth
   revalida sesión/cuenta activa y obtiene el correo verificado persistido.
   Nunca acepta `guestAccountId`, email destino, propertyId ni actor del body.
2. Reservations resuelve código + correo mediante una consulta interna. Solo
   devuelve un candidato al Backend, nunca a HTTP/BFF. Si no hay reserva,
   booking guest o coincidencia de correo, la respuesta externa es igual.
3. Guest Auth persiste un desafío ligado a cuenta, sesión, reserva y property;
   genera un código aleatorio con CSPRNG y guarda solo un verificador con clave
   de servidor (por ejemplo HMAC del challenge ID y OTP). El OTP en claro existe
   solo para `EmailSender` y no entra en logs, audit ni respuestas.
4. La emisión confirma el envío antes de habilitar verificación. Un fallo o
   timeout de Resend deja el desafío no verificable; un timeout incierto no se
   considera entrega confirmada. Reintento/reemisión respeta límites y puede
   enviar otro código, pero no habilita dos desafíos simultáneos para la misma
   cuenta/reserva. No se promete exactly-once con el proveedor actual.
5. Al verificar, una transacción bloquea el desafío y la reserva/vínculo,
   comprueba sesión/cuenta originales, OTP, expiración e intentos y consume el
   desafío en la misma transacción que inserta el vínculo. Dos verificaciones
   concurrentes no crean dos vínculos. Un código usado no se vuelve a aceptar.
6. Las futuras consultas Guest de una reserva usan el vínculo específico a
   `reservationId` y su `propertyId`; no infieren titularidad de la coincidencia
   de correo, de un `GuestProfile` compartido ni de otras reservas del perfil.

## Puerto interno propuesto para revisión BD3

```text
ReservationLinkVerificationPort.findCandidate(
    confirmationCode, verifiedAccountEmail
) -> Optional<LinkCandidate(reservationId, propertyId,
                            bookingGuestProfileId, recipientEmail)>
```

El adaptador Reservations consulta por código y booking guest/correo en un
predicado acotado, sin cargar una reserva ajena para responder a la solicitud.
`recipientEmail` procede de la reserva, jamás del cliente, y solo lo usa la
entrega de OTP. El puerto no vincula cuentas ni expone datos financieros/stays.
Un código desconocido, booking guest ausente o correo no coincidente devuelve
`Optional.empty()`; el servicio Guest hace indistinguibles esos casos. El
resultado y la firma exacta requieren revisión BD3 antes de código.

## API propuesta, solo BFF → Backend

| Operación propuesta | Entrada | Resultado observable |
| --- | --- | --- |
| `POST /api/v1/guest-auth/reservation-links/challenges` | `{confirmationCode}`; JWT Guest | `202 {requestId}` opaco y nuevo tanto para candidato válido como inválido. No devuelve correo, property, reservationId ni existencia. |
| `POST /api/v1/guest-auth/reservation-links/verify` | `{requestId, otp}`; JWT Guest | `204` tras vínculo confirmado; `422` genérico para desafío/OTP inválido, expirado o agotado. `401` para sesión Guest inválida. |

El BFF expone un flujo Guest propio, guarda tokens solo en cookies HttpOnly y
propaga `requestId` sin convertirlo en prueba de titularidad. La chain Guest
debe cubrir estas rutas expresamente; la chain Staff no participa. La
semántica de `202` no garantiza entrega de correo. El error de proveedor y
la inexistencia no deben producir un mensaje que enumere reservas. OpenAPI,
DTOs y handlers se publicarán con BE-013B solo tras aprobar este contrato.

## Persistencia, concurrencia y límites propuestos

- En Security/Auth, `reservation_link_challenges` registra ID opaco, cuenta,
  sesión emisora, reservation/property candidato cuando exista, hash de OTP,
  estado `PENDING_SEND|READY|UNKNOWN|CONSUMED|EXPIRED|LOCKED`, intentos,
  issued/expires/lastSent/consumed timestamps y correlación. Una petición sin
  candidato conserva solo metadatos mínimos de rate limit; no crea vínculo ni
  código útil. Índices por cuenta/estado y unicidad del desafío READY por
  cuenta/reserva; no almacenar OTP ni correo en claro en esta tabla.
- `guest_reservation_links` contiene `guestAccountId`, `reservationId`,
  `propertyId`, desafío consumido, `linkedAt` y auditoría. `reservationId` es
  único para impedir apropiación por otra cuenta; la misma cuenta/reserva
  repetida se trata idempotentemente. No cambiar `guest_profiles.guest_account_id`.
  Si la reserva ya pertenece a otra cuenta, no transferirla automáticamente.
- Cinco intentos máximos por desafío, comparación constante, expiración a los
  10 minutos, invalidación del desafío anterior al reenviar y al menos 60 s
  entre envíos. Para evitar reiniciar indefinidamente esos cinco intentos se
  propone además **3 envíos por cuenta/código en 1 hora y 10 por cuenta en 24
  horas**; el límite por IP/infraestructura se configura fuera del contrato
  persistente. Bloqueos responden genéricamente. Estos dos límites numéricos
  adicionales quedaron aprobados en L-05.
- No mostrar `requestId` de otro usuario como válido. El desafío solo se
  verifica con la cuenta y sesión que lo emitieron. Una sesión revocada o
  distinta debe iniciar otro desafío. El vínculo ya confirmado permanece
  asociado a la cuenta hasta que exista una política de desvinculación propia.
- Emisión/consumo/vínculo/denegación sensible registran eventos seguros sin
  OTP, correo completo ni payload libre; el evento de vínculo acompaña el
  commit local. El envío externo requiere hechos separados de intento,
  confirmado e incierto conforme a C6/C5; no se afirma atomicidad remota.

## Decisiones aprobadas para BE-013B

| ID | Propuesta | Revisión necesaria |
| --- | --- | --- |
| L-01 | Puerto `findCandidate` con resultado mínimo y lookup silencioso; correo solo desde cuenta Google verificada y reserva. | BD3/BD1, Guest Web. |
| L-02 | Vínculo por reserva/cuenta en tabla separada, reservationId único; no enlazar GuestProfile entero ni transferir vínculo de otra cuenta. | BD3/BD1, producto. |
| L-03 | Dos operaciones BFF-only con `202 requestId` genérico y `204/422` al verificar; JWT Guest vigente. | BD1/Guest Web/Android. |
| L-04 | Desafío ligado a cuenta y sesión, estados de entrega y bloqueo transaccional; fallo/timeout no habilita OTP. | BD1/BD3, integraciones. |
| L-05 | Además de C3, máximo 3 envíos por cuenta/código/hora y 10 por cuenta/día; rate limit de IP en infraestructura. | Producto/seguridad. |
| L-06 | Correo de cuenta guardado y verificado al alta: si cambió en Google, exigir nueva decisión de resincronización/reautenticación antes de usarlo para vínculo. No aceptar correo libre del request. | BD1/Guest Web. |
| L-07 | Eventos mínimos C6 de desafío/vínculo y vínculo específico como única prueba de titularidad para futuras consultas Guest. | BD1/BD3, Audit/privacidad. |

BE-013B necesita estas decisiones aprobadas y la revisión del owner de
Reservations. Su DoD incluirá migraciones vacío/upgrade, concurrencia en
PostgreSQL, OTP hash/no logs, prueba con `EmailSender` simulado, casos de
enumeración/replay/revocación y contrato HTTP/OpenAPI/BFF. Google y Resend en
vivo siguen siendo BE-016B; la prueba local de un fake no los verifica.

## Implementación Backend BE-013B-BACKEND-01

En `feature/bd1-historical-reservation-otp`, el Backend incorpora el puerto
`findCandidate`, lookup SQL por código y correo de cuenta verificado, los dos
endpoints Guest BFF-only acordados y un vínculo por reserva. El OTP generado
es numérico de ocho dígitos, se verifica con HMAC-SHA256 y requiere
`PMS_RESERVATION_LINK_OTP_HMAC_KEY` (secreto de al menos 32 bytes). El código en
claro se entrega solo al `EmailSender` y no se persiste.

La emisión persiste `PENDING_SEND` y responde `202` sin esperar al proveedor.
Un ejecutor acotado marca `READY` solo después de que el proveedor acepta el
envío; esa aceptación no prueba recepción en el buzón. Rechazo,
fallo o timeout deja `UNKNOWN`, no verificable. No hay retry automático de un
envío incierto. Un proceso caído antes del envío puede dejar `PENDING_SEND`;
el usuario puede solicitar un código nuevo tras el cooldown, que expira el
anterior. BE-016B debe comprobar Resend real, y Guest Web debe implementar el
BFF consumidor. Las pruebas Backend sustituyen `EmailSender` por un fake.

## QA manual de esta entrega documental

Desde `backend/`:

```bash
git branch --show-current
git diff --check
git status --short
```

Esperado: rama `feature/bd1-historical-reservation-otp-contract`,
`git diff --check` sin salida ni error, y solo los cuatro documentos de esta entrega
modificados/creados. El usuario aprobó L-01 a L-07 el 2026-10-04.
No hay endpoint ni OTP funcional que probar con Postman; Maven no valida un
contrato Markdown sin cambios Java/SQL.
