# BE-008B-AUTH-03 — QA de atribución desde emisores Staff

Login correcto, refresh válido y logout autenticado registran actor STAFF desde
la identidad validada; staff_user_id conserva el sujeto. Organización, propiedad,
scope y correlación quedan NULL en sesiones. Bootstrap registra SYSTEM con actor_id
NULL y ORGANIZATION con la organización explícita de su membership. No se atribuyen
login fallido ni refresh rechazado; la persistencia de esos intentos y su rollback
(C6-D06) siguen fuera. No hay backfill, cambios de esquema, API ni permisos nuevos.

## Pruebas automatizadas

Desde backend/, usar solo PostgreSQL QA aislado de compose.bd2-test.yaml:

```bash
docker compose -p pms_bd1_authemit -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_bd1_authemit -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress '-Dtest=StaffAuthAuditEmitterIntegrationTests,StaffAuthAuditAttributionIntegrationTests,StaffAuthAuditAppendOnlyIntegrationTests,ReservationsSchemaUpgradeTests,SecurityConfigurationIntegrationTests' test
docker compose -p pms_bd1_authemit -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
```

Los nuevos tests comprueban emisores reales, actor y sujeto por separado,
bootstrap idempotente, constructor legado sin atribución, rechazo de principal
ajeno a la sesión, append-only e historia intacta y rollback de logout/evento.
Capturan los objetos que los flujos rechazados intentan guardar para verificar
que no reciben metadatos nuevos: esos INSERT continúan revertidos por la
excepción, sin acreditar que C6-D06 esté resuelta. Las regresiones cubren
esquema vacío, upgrade/reaplicación, checksums y seguridad HTTP Staff.

Validación local del agente (2026-10-05): 26 focalizados y 355 en verify PASS,
cero fallos/errores/omitidas, PostgreSQL 17.11/Java 21.0.9. Flujo HTTP y bloque
SQL de esta guía comprobados: 201/200/204, cuatro eventos con expected=t,
bootstrap_count=1, P0001 y rollback limpio. Estado EN_QA: falta confirmación
de QA manual del usuario.

## QA manual del usuario

Usar el JAR generado por verify, dentro del mismo proyecto descartable. Este
comando levanta una aplicación QA en 127.0.0.1:18083, con credenciales sintéticas
solo para esta base. No ejecutarlo en la base habitual ni en una compartida.
Si el contenedor QA ya existe de una comprobación anterior, retirarlo primero
con docker stop pms_bd1_authemit_app. No se modifican archivos de configuración.

```bash
docker compose -p pms_bd1_authemit -f compose.bd2-test.yaml run --rm -d \
  --name pms_bd1_authemit_app -p 127.0.0.1:18083:8080 \
  -e PMS_BOOTSTRAP_ADMIN_USERNAME=qa_auth03 \
  -e PMS_BOOTSTRAP_ADMIN_EMAIL=qa-auth03@example.test \
  -e PMS_BOOTSTRAP_ADMIN_PASSWORD=QA-only-auth03-password \
  verify java -jar target/pms-hotel-backend-0.0.1-SNAPSHOT.jar
```

Esperar health UP. Ejecutar el siguiente flujo; solo imprime estados HTTP,
no credenciales ni tokens. Si falla alguna aserción, no es PASS.

```bash
python3 - <<'PY'
import json, time, urllib.request, urllib.error
base = 'http://127.0.0.1:18083'
for attempt in range(60):
    try:
        with urllib.request.urlopen(base + '/actuator/health') as response:
            if json.load(response)['status'] == 'UP':
                break
    except (OSError, urllib.error.URLError):
        time.sleep(1)
else:
    raise RuntimeError('QA backend no está saludable')

def request(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method,
        headers={'Content-Type':'application/json', **(headers or {})})
    with urllib.request.urlopen(req) as response:
        raw = response.read()
        return response.status, json.loads(raw) if raw else None

status, login = request('POST', '/api/v1/staff-auth/sessions',
    {'email':'qa-auth03@example.test', 'password':'QA-only-auth03-password'})
assert status == 201
print('login:', status)
status, rotated = request('POST', '/api/v1/staff-auth/refresh',
    headers={'Cookie':'pms_staff_refresh=' + login['refreshToken']})
assert status == 200
print('refresh:', status)
status, _ = request('DELETE', '/api/v1/staff-auth/session',
    headers={'Authorization':'Bearer ' + rotated['accessToken']})
assert status == 204
print('logout:', status)
PY
```

Inspeccionar las filas producidas; cada expected debe ser t. Primer arranque
crea un solo bootstrap. Repetir login/refresh/logout agrega eventos nuevos; no
exigir cantidad global fija ni borrar historia para limpiar las pruebas.

```bash
docker compose -p pms_bd1_authemit -f compose.bd2-test.yaml exec -T postgres \
  psql -U pms_test -d pms_bd2_test -v ON_ERROR_STOP=1 <<'SQL'
\set VERBOSITY verbose
SELECT e.event_type,e.staff_user_id,e.actor_context,e.actor_id,
       e.organization_id,e.property_id,e.scope_kind,e.correlation_id,
       CASE WHEN e.event_type='STAFF_BOOTSTRAP_CREATED' THEN
         e.actor_context='SYSTEM' AND e.actor_id IS NULL
         AND e.organization_id='4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1'::uuid
         AND e.scope_kind='ORGANIZATION' AND e.property_id IS NULL
         AND e.session_id IS NULL AND e.correlation_id IS NULL
       ELSE
         e.actor_context='STAFF' AND e.actor_id=e.staff_user_id
         AND e.organization_id IS NULL AND e.property_id IS NULL
         AND e.scope_kind IS NULL AND e.correlation_id IS NULL
         AND e.session_id IS NOT NULL
       END AS expected
FROM auth_audit_events e JOIN staff_users u ON u.id=e.staff_user_id
WHERE u.username='qa_auth03'
ORDER BY e.occurred_at,e.id;
SELECT count(*) AS bootstrap_count FROM auth_audit_events e
JOIN staff_users u ON u.id=e.staff_user_id
WHERE u.username='qa_auth03' AND e.event_type='STAFF_BOOTSTRAP_CREATED';

-- Elegir un evento real y comprobar que su atribución no se puede modificar.
SELECT e.id FROM auth_audit_events e JOIN staff_users u ON u.id=e.staff_user_id
WHERE u.username='qa_auth03' AND e.event_type='STAFF_LOGIN_SUCCEEDED'
ORDER BY e.occurred_at DESC,e.id DESC LIMIT 1 \gset emitted_
SELECT row_to_json(e)::text AS original FROM auth_audit_events e
WHERE e.id=:'emitted_id' \gset snapshot_
BEGIN;
SAVEPOINT immutable_update;
\set ON_ERROR_STOP off
UPDATE auth_audit_events SET actor_id=NULL WHERE id=:'emitted_id';
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT immutable_update;
SAVEPOINT immutable_delete;
\set ON_ERROR_STOP off
DELETE FROM auth_audit_events WHERE id=:'emitted_id';
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT immutable_delete;
ROLLBACK;
SELECT row_to_json(e)::text = :'snapshot_original' AS all_fields_preserved
FROM auth_audit_events e WHERE id=:'emitted_id';

-- Constructor/INSERT legado sigue permitido, sin atribución automática.
BEGIN;
INSERT INTO auth_audit_events(id,event_type,staff_user_id,occurred_at,detail)
VALUES (gen_random_uuid(),'STAFF_LOGIN_SUCCEEDED',gen_random_uuid(),now(),'QA AUTH-03 legacy')
RETURNING id \gset pending_
SELECT actor_context IS NULL AND actor_id IS NULL AND organization_id IS NULL
       AND property_id IS NULL AND scope_kind IS NULL AND correlation_id IS NULL
       AS legacy_unattributed FROM auth_audit_events WHERE id=:'pending_id';
ROLLBACK;
SELECT count(*) AS after_rollback FROM auth_audit_events WHERE id=:'pending_id';
SQL
```

Esperado: login 201, refresh 200, logout 204; cuatro familias de eventos con
expected=t; bootstrap_count=1; UPDATE/DELETE rechazados con P0001;
all_fields_preserved=t, legacy_unattributed=t y after_rollback=0.
Conservar evidencia sanitizada y confirmar QA manual PASS. AUTH-03 permanece
EN_QA hasta esa confirmación. Commit, push y merge requieren autorización.

Cuando termine el QA, retirar únicamente este entorno descartable:

```bash
docker stop pms_bd1_authemit_app
docker compose -p pms_bd1_authemit -f compose.bd2-test.yaml down -v
```
