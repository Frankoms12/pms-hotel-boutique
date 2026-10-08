# BE-013B-BACKEND-01 — QA manual del vínculo OTP Backend

## AUTH-GUEST-REG-HISTORY-01 — decisión vigente (2026-10-07), EN_QA

**Regla anterior (superseded para coincidencias verificadas):** confirmationCode + OTP obligatorio para todo historical link.
**Regla nueva aprobada por Alan:** verified Guest email auto-links compatible reservations; reservation-specific OTP remains manual fallback. La coincidencia utiliza únicamente Reservation.bookingGuest → GuestProfile.email con trim/lowercase; sin filtro de fecha, estado o property ACTIVE. Nunca acompañantes ni IDs elegidos por cliente. Links propios se conservan; conflictos ajenos se omiten/auditan, sin transferencia/UPDATE/DELETE. Las consultas Guest siguen autorizadas exclusivamente por links persistidos.

Registro real exclusivamente Guest: email requerido/formato/max50 normalizado, password8..50 sin trim/normalización/composición, confirmación exacta solo Web. Sin nombre, marketing ni aceptación persistida de términos. Login conserva sus límites previos y no recibe mínimo8. Cuenta password/Google/DISABLED existente no se sobrescribe ni fusiona. `/acceso` único; Google nuevo usa el mismo auto-link tras OIDC verificado, sin OTP extra.

Pending registration separado, hash BCrypt(12), binding HttpOnly BFF y OTP8 con HMAC por propósito/generación. TTL OTP10min, contexto30min, cinco intentos compartidos contra reinicios, resend60s, 3 envíos/email/hora y 10/email/día. 202 genérico no acredita existencia ni envío. Verify atómico crea cuenta/credential/proof/links/sesión y consume pending; sin OTP/password/tokens en claro persistidos. Prueba de email separada respalda N links; evidencia OTP manual histórica y append-only preservados.

Backend: POST `/api/v1/guest-auth/registrations`, `/verify`, `/resend`; verify201 tokens exclusivamente al BFF, errores400/403/422/429/503 genéricos. Header secreto `X-Guest-Registration-Binding` server-to-server. Browser: `/api/auth/guest/registrations` y mismas acciones; tokens únicamente cookies Guest. F5 recupera contexto HttpOnly; Backend siempre revalida. Account Summary refleja count y próxima estadía tras commit; no implementa historial completo.

Guest auth real con ambos flags de datos mock. Logout Guest confirmado → `/acceso`; fallo conserva sesión. Bootstrap401 → un refresh Guest deduplicado → un retry; segundo401 signed-out; red/5xx/mapping error recuperable. Staff implementación/destino `/` preservados, caches separados.

**QA pendiente:** confirmación manual de Alan, entrega real Resend y configuración HMAC del entorno. Decisión posterior aprobada por Alan: registration8..50 caracteres y máximo72 bytes UTF-8 reales; login conserva máximo50 sin mínimo8 y rechaza >72 bytes con credenciales genéricas antes de BCrypt. Sin trim/lowercase/Unicode normalization/truncamiento. BCrypt(12) intacto; límite resuelto, sin cambios a sesiones Staff. OpenAPI/Postman, tests y resultados finales se registran en AlanHandoff. Ninguna entrada histórica inferior declara vigente una regla sustituida aquí.


Esta entrega publica dos rutas Guest BFF-only bajo
`/api/v1/guest-auth/reservation-links`: `POST /challenges` devuelve `202` con
`requestId` opaco; `POST /verify` devuelve `204` al vincular o `422` genérico
si el desafío no sirve. JWT Staff, Guest ausente o sesión revocada no autorizan
estas rutas. La propiedad y la identidad proceden de la reserva/cuenta, no del
request. El BFF Web y Resend real requieren integración separada.

Desde `backend/`, con Docker disponible:

```bash
docker compose -p pms_bd1_otp -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress \
  '-Dtest=ReservationLinkOtpIntegrationTests,ReservationLinkServiceIntegrationTests' test
docker compose -p pms_bd1_otp -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
docker compose -p pms_bd1_otp -f compose.bd2-test.yaml down -v
```

La primera ejecución debe pasar 13 pruebas: lookup silencioso, emisión y
verificación, replay, cuenta/sesión, correo, expiración, cinco intentos,
cooldown, límite por código, timeout de entrega, concurrencia, append-only y
autorización HTTP. La segunda debe pasar 321 pruebas y terminar con
`BUILD SUCCESS` y cero failures/errors/skipped. `down -v` elimina solo el
proyecto aislado de QA.

La prueba HTTP usa un `EmailSender` simulado y un JWT Guest de prueba. No
demuestra entrega real por Resend ni flujo de cookies/Network del BFF. Esa
comprobación corresponde a BE-016B y al consumidor Guest Web.

## Prueba manual en Postman

Importar [`BD1-Backend-APIs.postman_collection.json`](../postman/BD1-Backend-APIs.postman_collection.json)
en Postman. En las variables de la colección, establecer `baseUrl` al Backend
de pruebas y poner temporalmente un JWT Guest vigente en `guestAccessToken`.
Esta API es BFF-only: el JWT debe proceder de una sesión Guest autorizada;
no usar un JWT Staff. Escribir en `confirmationCode` una referencia histórica
que pertenezca al correo Google verificado de esa cuenta. No guardar tokens ni
OTP reales en el JSON del repositorio ni exportar la colección después de usarla.

1. Ejecutar **01 — Solicitar desafío OTP**. Debe responder `202` con un UUID
   `requestId`; la colección lo conserva para la siguiente solicitud. Incluso
   una referencia desconocida responde `202`, sin revelar si existe.
2. Esperar el correo OTP en el buzón autorizado, introducir sus ocho dígitos en
   la variable `otp` y ejecutar **02 — Verificar OTP y vincular reserva** antes
   de diez minutos. Debe responder `204` sin cuerpo.
3. Repetir la verificación con el mismo `requestId`: debe responder `422`
   genérico por uso único. La aserción de Postman espera `204` para el flujo
   exitoso, por lo que esta ejecución negativa marcará esa aserción como
   fallida de forma esperada.

La prueba manual en vivo exige Backend con Google Guest Auth, envío de correo y
`PMS_RESERVATION_LINK_OTP_HMAC_KEY` configurados. La colección permite probar
las rutas directas; el flujo completo de cookies y BFF Web sigue pendiente de
su integración. No usar `Run collection` para el flujo OTP, porque la segunda
solicitud necesita el código recibido por correo.
