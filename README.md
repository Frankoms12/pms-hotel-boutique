# PMS Hotel Boutique

Monorepo oficial del PMS Hotel Boutique.

## Aplicaciones

```text
frontend/
├── pms-hotel-web/
└── pms-hotel-android/

backend/
```

## Stack local integrado con Docker

PostgreSQL + Backend + Web se levantan desde compose.yaml en la raíz.
Preparar `.env` a partir de [`.env.example`](.env.example), sin sobrescribir uno
existente ni publicar secretos. Google requiere configuración de desarrollo propia.
El bootstrap local provee cuentas Staff/Guest email/password para probar `/acceso`;
ver [dataset y credenciales demo](docs/LOCAL_DEMO_DATASET.md).

QA integrado canónico desde el mismo commit:

```bash
git switch main
git pull --ff-only origin main
test -f .env || cp .env.example .env
docker compose --env-file .env up -d --build
```

Abrir únicamente **http://localhost:3001/acceso**. Compose fija Web en
`127.0.0.1:3001:3000`, origen y callback Google en 3001. `3000` es exclusivamente
el puerto interno de Next. Backend/PostgreSQL no publican puertos al host;
Web BFF usa `http://backend:8080`, Backend `postgres:5432`.

`/acceso` usa correo electrónico y contraseña para Guest/Staff. Google autentica
solo Guest; continuar como invitado conserva el journey público sin autenticación.
Una contraseña válida en ambos contextos exige selector explícito. Tokens quedan
en cookies HttpOnly separadas; el navegador recibe solo el contexto autenticado.
Registro y recuperación/cambio de contraseña/MFA quedan pendientes.

Para Swagger/debug Backend activar deliberadamente el override:

```bash
docker compose --env-file .env -f compose.yaml -f compose.debug.yaml up -d --build
```

Swagger de tooling: `http://localhost:8081/swagger-ui/index.html`. Para volver al
entorno normal ejecutar el Compose raíz sin override. El QA integrado habitual
siempre usa el Compose raíz. Los scripts Web `dev`/`start` fijan también 3001.
Si el puerto está ocupado, Docker/Next fallan y no prueban otro puerto:

```bash
docker ps --filter publish=3001
ss -ltnp 'sport = :3001'
```

Liberar el proceso/contenedor identificado y repetir; no cambiar el puerto.
El mismo commit y Compose producen el mismo formulario canónico. Registrar en
Google `http://localhost:3001/api/auth/guest/google/callback` exactamente.

[Guía completa: preparación, Staff, Google Guest y comprobaciones](docs/13_LOCAL_INTEGRATED_STACK.md).
[QA de login/me/logout y Swagger](backend/docs/41_EXPLICIT_AUTH_ENDPOINTS_QA.md).

```bash
docker compose --env-file .env config --quiet
docker compose --env-file .env ps
docker compose --env-file .env down
```

`down` conserva el volumen local. El reset `down -v` elimina sus datos y se usa
solo cuando se decide descartar esa BD. Android se ejecuta fuera de Compose
mediante Expo. backend/compose.bd2-test.yaml se usa exclusivamente para verify
con PostgreSQL efímero, independiente del stack raíz. Los puertos 18085/18086
pertenecen a evidencia/QA aislada y no son necesarios para Staff/Guest integrados.

## Presentación del Backend con Postman

Desde la raíz, con Docker Desktop abierto:

```powershell
docker compose -f compose.demo.yaml up -d --build --wait --wait-timeout 300
```

Backend real y PostgreSQL con base independiente y usuario local `demo.profesor`,
contraseña de muestra `DemoHotel2026!SoloLocal`. Swagger en
http://127.0.0.1:18080/swagger-ui/index.html. Importar en Postman
`backend/postman/Backend-Demo.postman_collection.json`, seleccionar **No environment**
y ejecutar la colección en orden. No requiere configurar .env ni copiar tokens/IDs.
No incluye Web/Android; valores públicos solo para presentación local.
Pasos y límites: [guía de demostración](backend/docs/22_BACKEND_DEMO.md).

## Estado

- Figma V3 finalizado.
- Backlog de diseño cerrado hasta V3-0201.
- Backlog de implementación activo: `docs/Backlog_Implementacion_PMS_V1.xlsx`.
- Siguiente etapa: Sprint 0 técnico Web y Sprint 0 Android según backlog.

## Antes de desarrollar
Leer `AGENTS.md`, `docs/`, el backlog y el `AGENTS.md` del subproyecto.

## Git
Un único `.git` en la raíz. No inicializar repositorios dentro de subcarpetas.
