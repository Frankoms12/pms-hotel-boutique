-- PROPUESTA EXCLUSIVAMENTE LOCAL. NO ejecutada como parte del fix UI.
-- Nunca usar en staging/producción. No cambia límites ni configuración.
-- 1. Sustituir <QA_EMAIL> localmente y revisar los SELECTs.
-- 2. Confirmar que cada requestId elegido pertenece a pruebas QA propias.
-- 3. Detener únicamente el Backend local antes del reset para evitar delivery
--    concurrente: docker compose --env-file .env stop backend
-- 4. Ejecutar con psql en el postgres del proyecto LOCAL, nunca en una URL remota.
-- 5. La lista de UUID está VACÍA y termina en ROLLBACK deliberadamente.
--    Para aplicar: completar solo UUID revisados y cambiar ROLLBACK por COMMIT.
-- 6. Reiniciar Backend: docker compose --env-file .env start backend
--    En el navegador local, borrar SOLO la cookie pms_guest_registration y
--    recargar /acceso. No borrar cookies Guest/Staff ni compartir valores.
-- Los pending CONSUMED o respaldados por verification quedan intactos.
-- Sus eventos también quedan intactos: si aún consumen cuota, esperar ventana
-- correspondiente (hora/día; 30 min para presupuesto de intentos).

-- REVISIÓN: no devuelve email, hashes, bindings, OTP, passwords ni tokens.
SELECT current_database() AS database_name;
SELECT p.id AS request_id, p.status, p.attempts, p.generation,
       p.created_at, p.sent_at, p.otp_expires_at, p.expires_at, p.consumed_at,
       EXISTS (SELECT 1 FROM guest_email_verifications v
               WHERE v.registration_id=p.id) AS protected_verification,
       (SELECT count(*) FROM guest_registration_request_events e
         WHERE e.registration_id=p.id) AS request_events,
       (SELECT count(*) FROM guest_registration_deliveries d
         WHERE d.registration_id=p.id) AS delivery_records
FROM guest_pending_registrations p
WHERE lower(btrim(p.email))=lower(btrim('<QA_EMAIL>'))
ORDER BY p.created_at;

SELECT 'guest_registration_request_events' AS table_name,
       e.registration_id AS request_id, e.requested_at AS event_at
FROM guest_registration_request_events e
JOIN guest_pending_registrations p ON p.id=e.registration_id
WHERE lower(btrim(p.email))=lower(btrim('<QA_EMAIL>'))
UNION ALL
SELECT 'guest_registration_deliveries', d.registration_id, d.sent_at
FROM guest_registration_deliveries d
JOIN guest_pending_registrations p ON p.id=d.registration_id
WHERE lower(btrim(p.email))=lower(btrim('<QA_EMAIL>'))
ORDER BY event_at;

-- RESET REVISABLE: selección simultánea por email + UUID explícitos.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
SELECT pg_advisory_xact_lock(73101,hashtext(lower(btrim('<QA_EMAIL>'))));
CREATE TEMP TABLE qa_registration_targets(id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO qa_registration_targets(id)
SELECT p.id FROM guest_pending_registrations p
WHERE lower(btrim(p.email))=lower(btrim('<QA_EMAIL>'))
  -- Sustituir ARRAY[] por ARRAY['<QA_REQUEST_ID>'::uuid, ...] tras revisión.
  AND p.id=ANY(ARRAY[]::uuid[])
  AND p.status<>'CONSUMED'
  AND NOT EXISTS (SELECT 1 FROM guest_email_verifications v
                  WHERE v.registration_id=p.id)
FOR UPDATE OF p;
SELECT p.id AS selected_request_id, p.status, p.created_at, p.sent_at
FROM guest_pending_registrations p JOIN qa_registration_targets t ON t.id=p.id;

-- Orden FK: eventos -> registros de delivery -> pending no verificado.
DELETE FROM guest_registration_request_events e
USING qa_registration_targets t WHERE e.registration_id=t.id
RETURNING e.registration_id AS cleared_request_budget;
DELETE FROM guest_registration_deliveries d
USING qa_registration_targets t WHERE d.registration_id=t.id
RETURNING d.registration_id AS cleared_delivery_record;
DELETE FROM guest_pending_registrations p
USING qa_registration_targets t WHERE p.id=t.id
  AND p.status<>'CONSUMED'
  AND NOT EXISTS (SELECT 1 FROM guest_email_verifications v
                  WHERE v.registration_id=p.id)
RETURNING p.id AS cleared_pending;
ROLLBACK;
-- No UPDATE/DELETE de GuestAccount, Identity, Credential, Session, verification,
-- reservation links, GuestProfile, Reservation, Stay, Property ni Staff.
