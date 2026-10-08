package com.pms.hotelboutique.backend.modules.securityauth;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import javax.sql.DataSource;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class StaffAuthAuditAppendOnlyIntegrationTests {
    private static final String MASTER = "classpath:db/changelog/db.changelog-master.yaml";
    private static final String PREVIOUS_MASTER =
            "classpath:db/changelog/db.changelog-before-staff-auth-audit-append-only.yaml";

    @Autowired DataSource dataSource;
    @Autowired StaffAuthService auth;
    @Autowired StaffJwtService jwt;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    void freshInstallationProtectsStaffAndPreservesExistingAuditProtections() throws Exception {
        String schema = isolatedSchema();
        try (var connection = publicConnection()) {
            execute(connection, "CREATE SCHEMA " + schema);
            try {
                migrate(schema, MASTER);
                var event = event("STAFF_LOGIN_SUCCEEDED", UUID.randomUUID(), UUID.randomUUID(), "password");
                insert(connection, schema, event);
                var before = auditRows(connection, schema);
                assertRejected(connection, "UPDATE " + schema + ".auth_audit_events SET detail='changed'");
                assertRejected(connection, "DELETE FROM " + schema + ".auth_audit_events");
                assertEquals(before, auditRows(connection, schema));
                assertEquals(event, before.get(event.id()));

                execute(connection, "INSERT INTO " + schema + ".reservation_audit_events "
                        + "(id,occurred_at,actor_type,action,entity_type,entity_id,created_at) "
                        + "VALUES (?,now(),'SYSTEM','TEST_EXISTING_PROTECTION','RESERVATION',?,now())",
                        UUID.randomUUID(), UUID.randomUUID());
                execute(connection, "INSERT INTO " + schema + ".guest_auth_audit_events "
                        + "(id,event_type,occurred_at,detail) VALUES (?,'TEST_EXISTING_PROTECTION',now(),'test')",
                        UUID.randomUUID());
                assertRejected(connection, "UPDATE " + schema + ".reservation_audit_events SET reason='changed'");
                assertRejected(connection, "DELETE FROM " + schema + ".reservation_audit_events");
                assertRejected(connection, "UPDATE " + schema + ".guest_auth_audit_events SET detail='changed'");
                assertRejected(connection, "DELETE FROM " + schema + ".guest_auth_audit_events");
            } finally {
                execute(connection, "DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    @Test
    void rejectsSingleRowAndBulkMutationsWithoutChangingAnyFields() throws Exception {
        try (var connection = publicConnection()) {
            connection.setAutoCommit(false);
            try {
                var first = event("STAFF_LOGIN_SUCCEEDED", UUID.randomUUID(), UUID.randomUUID(), "original");
                var second = event("STAFF_SESSION_REVOKED", null, null, null);
                insert(connection, "public", first);
                insert(connection, "public", second);
                var before = auditRows(connection, "public");
                assertRejected(connection, "UPDATE auth_audit_events SET event_type='changed' WHERE id='" + first.id() + "'");
                assertRejected(connection, "DELETE FROM auth_audit_events WHERE id='" + first.id() + "'");
                String ids = " WHERE id IN ('" + first.id() + "','" + second.id() + "')";
                assertRejected(connection, "UPDATE auth_audit_events SET detail='changed'" + ids);
                assertRejected(connection, "DELETE FROM auth_audit_events" + ids);
                assertEquals(before, auditRows(connection, "public"));
            } finally {
                connection.rollback();
            }
        }
    }

    @Test
    void insertCommitsAndIsVisibleFromAnotherConnection() throws Exception {
        var event = event("STAFF_LOGIN_SUCCEEDED", UUID.randomUUID(), UUID.randomUUID(), "password");
        try (var writer = publicConnection()) {
            writer.setAutoCommit(false);
            insert(writer, "public", event);
            writer.commit();
        }
        // Confirmed audit fixtures stay in this disposable database; never DELETE history for cleanup.
        try (var reader = publicConnection()) {
            assertEquals(event, auditRows(reader, "public").get(event.id()));
            assertRejected(reader, "UPDATE auth_audit_events SET detail='changed' WHERE id='" + event.id() + "'");
            assertRejected(reader, "DELETE FROM auth_audit_events WHERE id='" + event.id() + "'");
            assertEquals(event, auditRows(reader, "public").get(event.id()));
        }
    }

    @Test
    void rollbackDiscardsNewInsertAndPreservesCommittedHistory() throws Exception {
        var committed = event("STAFF_SESSION_REVOKED", null, null, "logout");
        var pending = event("STAFF_LOGIN_SUCCEEDED", null, null, "password");
        try (var writer = publicConnection(); var reader = publicConnection()) {
            insert(writer, "public", committed);
            writer.setAutoCommit(false);
            try {
                insert(writer, "public", pending);
                assertTrue(auditRows(writer, "public").containsKey(pending.id()));
                assertFalse(auditRows(reader, "public").containsKey(pending.id()));
            } finally {
                writer.rollback();
            }
            assertFalse(auditRows(reader, "public").containsKey(pending.id()));
            assertEquals(committed, auditRows(reader, "public").get(committed.id()));
        }
    }

    @Test
    void rejectedMutationRollsBackTheEntireTransactionIncludingNewInsert() throws Exception {
        var committed = event("STAFF_SESSION_REVOKED", null, null, "logout");
        var pending = event("STAFF_LOGIN_SUCCEEDED", null, null, "password");
        try (var connection = publicConnection()) {
            insert(connection, "public", committed);
            connection.setAutoCommit(false);
            try {
                insert(connection, "public", pending);
                var failure = assertThrows(SQLException.class, () -> execute(connection,
                        "DELETE FROM auth_audit_events WHERE id=?", committed.id()));
                assertEquals("P0001", failure.getSQLState());
            } finally {
                connection.rollback();
            }
            assertFalse(auditRows(connection, "public").containsKey(pending.id()));
            assertEquals(committed, auditRows(connection, "public").get(committed.id()));
        }
    }

    @Test
    void upgradePreservesLegacyDataAndChecksumsAndReapplicationIsNoOp() throws Exception {
        String schema = isolatedSchema();
        try (var connection = publicConnection()) {
            execute(connection, "CREATE SCHEMA " + schema);
            try {
                migrate(schema, PREVIOUS_MASTER);
                var first = event("STAFF_LOGIN_SUCCEEDED", UUID.randomUUID(), UUID.randomUUID(), "legacy áudit\n");
                var second = event("STAFF_SESSION_REVOKED", null, null, null);
                insert(connection, schema, first);
                insert(connection, schema, second);
                var before = auditRows(connection, schema);
                var previousManifest = manifest(connection, schema);
                assertEquals(0L, scalar(connection, "SELECT count(*) FROM information_schema.triggers "
                        + "WHERE trigger_schema=? AND trigger_name='trg_staff_auth_audit_append_only'", schema));

                migrate(schema, MASTER);
                var upgradedManifest = manifest(connection, schema);
                // Upgrade includes AUTH-01 append-only and AUTH-02 attribution columns.
                assertEquals(previousManifest.size() + 6, upgradedManifest.size());
                previousManifest.forEach((key, checksum) -> assertEquals(checksum, upgradedManifest.get(key)));
                assertEquals(manifest(connection, "public"), upgradedManifest);
                assertEquals(before, auditRows(connection, schema));
                assertRejected(connection, "UPDATE " + schema + ".auth_audit_events SET detail='changed'");
                assertRejected(connection, "DELETE FROM " + schema + ".auth_audit_events");

                migrate(schema, MASTER);
                assertEquals(upgradedManifest, manifest(connection, schema));
                assertEquals(before, auditRows(connection, schema));
                assertRejected(connection, "UPDATE " + schema + ".auth_audit_events SET detail='changed'");
                assertRejected(connection, "DELETE FROM " + schema + ".auth_audit_events");
                var added = event("STAFF_LOGIN_SUCCEEDED", null, null, "after upgrade");
                insert(connection, schema, added);
                assertEquals(added, auditRows(connection, schema).get(added.id()));
            } finally {
                execute(connection, "DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    @Test
    void realStaffLoginRefreshAndLogoutKeepInsertingTheirAuditEvents() throws Exception {
        UUID organization = UUID.randomUUID();
        UUID property = UUID.randomUUID();
        UUID staff = UUID.randomUUID();
        String username = "audit-" + staff;
        String password = "test-staff-audit-password";
        try (var connection = publicConnection()) {
            connection.setAutoCommit(false);
            try {
                execute(connection, "INSERT INTO organizations(id,name,code,status,created_at,updated_at) "
                        + "VALUES (?,'Audit test',?,'ACTIVE',now(),now())", organization, organization.toString());
                execute(connection, "INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                        + "VALUES (?,?,'Audit test',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                        property, organization, property.toString());
                execute(connection, "INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                        + "VALUES (?,?,?,?,'GERENCIA','ACTIVE',now(),now())", staff, username,
                        username.substring(0, 37) + "@example.test", passwordEncoder.encode(password));
                execute(connection, "INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) "
                        + "VALUES (?,?,'GERENCIA','ACTIVE',now(),now())", staff, organization);
                execute(connection, "INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) "
                        + "VALUES (?,?,?,'ACTIVE',now(),now())", staff, organization, property);
                connection.commit();
            } finally {
                connection.rollback();
            }
        }
        var login = auth.login(username.substring(0, 37) + "@example.test", password);
        var principal = jwt.parse(login.accessToken());
        assertEquals(staff, auth.getActivePrincipal(principal).staffUserId());
        var rotated = auth.refresh(login.refreshToken());
        var refreshedPrincipal = jwt.parse(rotated.accessToken());
        assertEquals(principal.sessionId(), auth.getActivePrincipal(refreshedPrincipal).sessionId());
        auth.logout(refreshedPrincipal);
        assertThrows(StaffAuthenticationException.class, () -> auth.getActivePrincipal(refreshedPrincipal));

        try (var connection = publicConnection()) {
            var events = auditRows(connection, "public").values().stream()
                    .filter(row -> staff.equals(row.staffUserId())).toList();
            assertEquals(3, events.size());
            assertEquals(java.util.Set.of("STAFF_LOGIN_SUCCEEDED", "STAFF_REFRESH_ROTATED", "STAFF_SESSION_REVOKED"),
                    events.stream().map(AuditRow::eventType).collect(java.util.stream.Collectors.toSet()));
            assertTrue(events.stream().allMatch(row -> principal.sessionId().equals(row.sessionId())));
            assertEquals(0L, scalar(connection,
                    "SELECT count(*) FROM refresh_tokens WHERE session_id=? AND revoked_at IS NULL", principal.sessionId()));
        }
    }

    private Connection publicConnection() throws SQLException {
        var connection = dataSource.getConnection();
        connection.setSchema("public");
        connection.setAutoCommit(true);
        return connection;
    }

    private String isolatedSchema() {
        return "staff_audit_" + UUID.randomUUID().toString().replace("-", "");
    }

    private void migrate(String schema, String changelog) throws Exception {
        try (var connection = publicConnection()) {
            connection.setSchema(schema);
            try {
                var liquibase = new SpringLiquibase();
                // Suppress close during Liquibase so schema reset happens before returning to Hikari.
                liquibase.setDataSource(new SingleConnectionDataSource(connection, true));
                liquibase.setDefaultSchema(schema);
                liquibase.setLiquibaseSchema(schema);
                liquibase.setChangeLog(changelog);
                liquibase.afterPropertiesSet();
            } finally {
                connection.setSchema("public");
            }
        }
    }

    private AuditRow event(String type, UUID staff, UUID session, String detail) {
        return new AuditRow(UUID.randomUUID(), type, staff, session,
                Instant.parse("2035-01-01T12:34:56.123456Z"), detail);
    }

    private void insert(Connection connection, String schema, AuditRow event) throws SQLException {
        execute(connection, "INSERT INTO " + schema + ".auth_audit_events "
                        + "(id,event_type,staff_user_id,session_id,occurred_at,detail) VALUES (?,?,?,?,?,?)",
                event.id(), event.eventType(), event.staffUserId(), event.sessionId(),
                Timestamp.from(event.occurredAt()), event.detail());
    }

    private Map<UUID, AuditRow> auditRows(Connection connection, String schema) throws SQLException {
        var result = new TreeMap<UUID, AuditRow>();
        try (var statement = connection.createStatement();
                var rows = statement.executeQuery("SELECT id,event_type,staff_user_id,session_id,occurred_at,detail FROM "
                        + schema + ".auth_audit_events")) {
            while (rows.next()) {
                var row = new AuditRow((UUID) rows.getObject("id"), rows.getString("event_type"),
                        (UUID) rows.getObject("staff_user_id"), (UUID) rows.getObject("session_id"),
                        rows.getTimestamp("occurred_at").toInstant(), rows.getString("detail"));
                result.put(row.id(), row);
            }
        }
        return result;
    }

    private Map<String, String> manifest(Connection connection, String schema) throws SQLException {
        var result = new TreeMap<String, String>();
        try (var statement = connection.createStatement();
                var rows = statement.executeQuery("SELECT id,author,filename,md5sum FROM " + schema + ".databasechangelog")) {
            while (rows.next()) {
                result.put(rows.getString(1) + "\n" + rows.getString(2) + "\n" + rows.getString(3), rows.getString(4));
            }
        }
        return result;
    }

    private void assertRejected(Connection connection, String sql) throws SQLException {
        var savepoint = connection.getAutoCommit() ? null : connection.setSavepoint();
        var failure = assertThrows(SQLException.class, () -> execute(connection, sql));
        assertEquals("P0001", failure.getSQLState());
        assertTrue(failure.getMessage().contains("is append-only"));
        if (savepoint != null) {
            connection.rollback(savepoint);
            connection.releaseSavepoint(savepoint);
        }
    }

    private long scalar(Connection connection, String sql, Object... values) throws SQLException {
        try (var statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            try (var rows = statement.executeQuery()) {
                assertTrue(rows.next());
                return rows.getLong(1);
            }
        }
    }

    private void execute(Connection connection, String sql, Object... values) throws SQLException {
        try (var statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            statement.executeUpdate();
        }
    }

    private record AuditRow(UUID id, String eventType, UUID staffUserId, UUID sessionId,
            Instant occurredAt, String detail) { }
}
