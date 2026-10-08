# BE-016A — Preparación de Google y Resend para presentación

**Estado de esta guía:** preparación verificable. La autenticación Google y la
entrega real por Resend en el entorno de presentación pertenecen a BE-016B y
siguen sin evidencia en vivo.

## Datos que debe proporcionar el entorno

Usar el [Compose habitual](../../compose.yaml) o un despliegue equivalente; el
`compose.demo.yaml` aísla la demo Staff y deja Google/Resend vacíos. Mantener
los valores secretos en el gestor del despliegue o en un `.env` local ignorado
por Git. No copiarlos a esta guía, capturas, logs, Postman exportado ni PR.

| Variable | Destino | Verificación |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Backend | Cliente OAuth Web del proyecto de presentación. |
| `GOOGLE_CLIENT_SECRET` | Backend | Secreto del mismo cliente; presencia sin mostrar valor. |
| `GOOGLE_REDIRECT_URI` | Backend | URL exacta `https://<host-web>/api/auth/guest/google/callback`, registrada como Authorized redirect URI en Google. En localhost puede usarse HTTP con host y puerto exactos. |
| `PMS_WEB_PUBLIC_URL` | Web | Origen público `https://<host-web>`; debe coincidir con el origen del callback. |
| `PMS_BACKEND_INTERNAL_URL` | Web | URL privada alcanzable del Backend; en Compose es `http://backend:8080`. |
| `RESEND_API_KEY` | Backend | Clave activa del entorno; presencia sin mostrar valor. |
| `RESEND_FROM_EMAIL` | Backend | Remitente autorizado en el dominio verificado de Resend. |
| `PMS_RESERVATION_LINK_OTP_HMAC_KEY` | Backend | Clave de al menos 32 bytes UTF-8, persistente entre reinicios; no usar la clave JWT ni incluirla en el repositorio. |
| `PMS_JWT_SECRET` | Backend | Secreto del entorno, separado de la clave OTP. |

El cliente OAuth debe permitir al usuario Google de prueba. El buzón de prueba
debe coincidir con el correo Google verificado y con el correo registrado en
una reserva histórica de prueba; registrar solo quién autorizó la cuenta y el
identificador no sensible del escenario. No se necesita una cuenta Staff para
el flujo Guest.

## Comprobaciones sin revelar secretos

1. Confirmar el commit desplegado, el host HTTPS público y el callback exacto
   en la configuración de Google. Anotar fecha, entorno y commit sin capturar
   client secret, API key, JWT ni OTP. Un proxy TLS debe preservar el host
   público hacia Next.js.
2. Validar la sintaxis de Compose desde el directorio actual:

   ```bash
   # Si estás en pms-hotel-boutique/backend/:
   docker compose --env-file ../.env -f ../compose.yaml config --quiet

   # Si estás en pms-hotel-boutique/:
   docker compose --env-file .env -f compose.yaml config --quiet
   ```

   `compose.yaml` está en la raíz del monorepo, no en `backend/`. El comando
   no imprime la configuración expandida. Arrancar con `docker compose --env-file .env up
   -d --build` únicamente desde la raíz y en el entorno de pruebas autorizado.
3. Comprobar presencia dentro de cada contenedor, sin imprimir valores:

   ```bash
   docker compose exec -T backend sh -c 'for name in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URI RESEND_API_KEY RESEND_FROM_EMAIL PMS_RESERVATION_LINK_OTP_HMAC_KEY PMS_JWT_SECRET; do value=$(printenv "$name"); if [ -n "$value" ]; then echo "$name: PRESENTE"; else echo "$name: FALTA"; fi; done'
   docker compose exec -T web sh -c 'for name in PMS_BACKEND_INTERNAL_URL PMS_WEB_PUBLIC_URL; do value=$(printenv "$name"); if [ -n "$value" ]; then echo "$name: PRESENTE"; else echo "$name: FALTA"; fi; done'
   ```

   La presencia no demuestra validez de credenciales, dominio ni entrega.
   Comprobar la longitud de la clave OTP sin imprimirla:

   ```bash
   docker compose exec -T backend sh -c 'bytes=$(printf %s "$PMS_RESERVATION_LINK_OTP_HMAC_KEY" | wc -c); if [ "$bytes" -ge 32 ]; then echo "Clave OTP: longitud válida"; else echo "Clave OTP: faltante o menor de 32 bytes"; exit 1; fi'
   ```

   Comparar el callback público literalmente con la URI autorizada en Google.
4. Abrir el host Web, `GET /api/auth/guest/session` sin cookies debe devolver
   `401`. El cliente de la aplicación usa Web/BFF; Backend/PostgreSQL permanecen
   internos. Swagger/debug requiere compose.debug.yaml explícito, 127.0.0.1:8081;
   el destino interno sigue backend:8080. Web canónico fijo localhost:3001. [Guía integrada](../../docs/13_LOCAL_INTEGRATED_STACK.md).

## Secuencia de aceptación BE-016B (pendiente de ejecución real)

1. En una ventana limpia, abrir `GET /api/auth/guest/google`; observar
   redirección a Google y retorno a
   `/api/auth/guest/google/callback?code=…&state=…` seguido de `/cuenta`.
   Network del navegador mostrará la navegación a Google y las llamadas de
   la aplicación al BFF Web; no debe mostrar una llamada directa a la API
   interna ni una respuesta al navegador con access/refresh tokens.
2. En DevTools, comprobar que `pms_guest_access` y `pms_guest_refresh` son
   `HttpOnly`, host-only, `SameSite=Lax` y `Secure` bajo HTTPS. La primera dura
   aproximadamente 15 minutos; la segunda tiene path
   `/api/auth/guest/refresh`. No copiar sus valores a la evidencia.
3. `GET /api/auth/guest/session` debe devolver sesión `GUEST`; luego
   `POST /api/auth/guest/refresh` debe devolver `200` con `{ "refreshed": true }`
   y rotar cookies. `DELETE /api/auth/guest/session` debe devolver `204`; una
   nueva consulta de sesión debe devolver `401`. Verificar que logout Guest no
   modifica una sesión Staff separada, si existe.
4. Para OTP histórico, el BFF Web aún debe integrar las rutas aprobadas en
   [BE-013B](31_BD1_HISTORICAL_RESERVATION_OTP_BACKEND_QA.md). En un entorno
   interno autorizado se pueden probar directamente con la
   [colección Postman BD1](../postman/BD1-Backend-APIs.postman_collection.json):
   `POST /api/v1/guest-auth/reservation-links/challenges` responde `202` y
   `POST /api/v1/guest-auth/reservation-links/verify` responde `204` con el
   OTP recibido. Guardar evidencia de recepción en el buzón autorizado sin
   mostrar el código ni la dirección completa. Un `202` o un `200` del
   proveedor por sí solos no prueban entrega.
5. Registrar fallos de credenciales, callback, remitente o envío con estado
   observable y hora; no registrar tokens, OTP, correos completos, payloads
   sensibles ni secretos. No reintentar manualmente con el mismo código si el
   envío quedó en estado incierto; seguir la recuperación del contrato OTP.

## Registro de evidencia para la ejecución

| Campo | Resultado |
| --- | --- |
| Fecha/hora y entorno | PENDIENTE |
| Commit Backend y Web | PENDIENTE |
| Host público HTTPS / callback coincidente | PENDIENTE |
| Variables presentes y dominio remitente verificado | PENDIENTE |
| Google login, sesión, refresh y logout | SIN VERIFICAR |
| Cookies y Network BFF | SIN VERIFICAR |
| Resend: correo recibido en buzón autorizado | SIN VERIFICAR |
| OTP verificado y reserva vinculada | SIN VERIFICAR |
| Responsable/reviewer de la evidencia sanitizada | PENDIENTE |

No rellenar las celdas con afirmaciones inferidas de código, tests con mocks o
respuestas del proveedor. BE-016B se cierra únicamente con observación real.
