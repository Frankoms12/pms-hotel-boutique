# QA local integrado canónico

El stack es Compose raíz: Web → BFF → backend:8080 → postgres:5432.
Web es el único servicio publicado: **127.0.0.1:3001:3000**.
Origen Web fijo http://localhost:3001 y Google redirect fijo
http://localhost:3001/api/auth/guest/google/callback. El puerto 3000 del proceso
Next es interno. No hay variables de puerto host Web/Backend en Compose normal.

```bash
git switch main
git pull --ff-only origin main
test -f .env || cp .env.example .env
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

Abrir http://localhost:3001/acceso. Esperar postgres/backend/web healthy.
No imprimir `docker compose config` con valores de secretos; `--quiet` valida igual.
No publicar/modificar `.env` desde este incremento. JWT/OTP/proveedores se configuran
solo localmente. Google requiere client/secret dev y callback registrado exacto;
no copiar code/state/tokens/cookies desde Network ni exportarlos.

## Login y demo

- Correo electrónico + contraseña común para Staff/Guest; Backend normaliza email.
- Staff → /dashboard con permisos/memberships/scope reales.
- Guest con credential → returnTo permitido o /cuenta.
- Ambos passwords válidos → selector Personal del hotel / Huésped después de validarlos.
- Google → solo Guest; cuenta Google-only sin credential falla genéricamente por password.
- Invitado → journey público sin sesión, preservando carrito y parámetros de búsqueda.

[Credenciales demo locales y condiciones](LOCAL_DEMO_DATASET.md).
No registro/forgot/reset/change password/MFA en este incremento.
[Contrato/QA Auth](../backend/docs/44_UNIFIED_LOGIN_CONTRACT_QA.md).

## Conflicto de puerto y tooling explícito

```bash
docker ps --filter publish=3001
ss -ltnp 'sport = :3001'
```

Identificar y liberar el proceso/contenedor antes de repetir. Docker y
`npm run dev` fallan si 3001 está ocupado; nunca cambian a otro puerto.
Para Swagger/debug únicamente:

```bash
docker compose --env-file .env -f compose.yaml -f compose.debug.yaml up -d --build
```

Swagger http://localhost:8081/swagger-ui/index.html; override solo tooling,
PostgreSQL sigue interno. Volver al Compose raíz elimina publicación Backend.
Para desarrollo standalone: iniciar solamente postgres/backend con el override,
configurar PMS_BACKEND_INTERNAL_URL=http://localhost:8081 server-side y ejecutar
`npm run dev` en frontend/pms-hotel-web. No iniciar dos Web simultáneos.
El QA integrado oficial sigue siendo Docker Compose raíz.

## Smoke y límites

Probar en 3001: Guest email/password → /cuenta → refresh/logout; Google real →
callback → /cuenta; invitado con carrito; Staff email/password → dashboard →
refresh/logout; email incorrecto/password incorrecto sin revelar contexto.
Inspeccionar ports: Web 127.0.0.1:3001, Backend/PostgreSQL internos en stack PMS.
Otros proyectos ajenos pueden publicar sus propios puertos; no son PMS.

`docker compose --env-file .env down` conserva el volumen. No usar `down -v`
para la base local compartida. Tests Backend usan PostgreSQL efímero aislado:
backend/compose.bd2-test.yaml. QA manual Alan es requisito para COMPLETADA.
