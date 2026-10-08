package com.pms.hotelboutique.backend.modules.securityauth;

import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.AuthAuditEventRepository;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class StaffAuthAuditAttributionIntegrationTests {
    private static final String MASTER = "classpath:db/changelog/db.changelog-master.yaml";
    private static final String PREVIOUS_MASTER =
            "classpath:db/changelog/db.changelog-before-staff-auth-audit-attribution.yaml";
    private static final String ATTR_NULL = "organization_id IS NULL AND property_id IS NULL AND scope_kind IS NULL "
            + "AND actor_context IS NULL AND actor_id IS NULL AND correlation_id IS NULL";
    @Autowired com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService auth;
    @Autowired com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService jwt;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Autowired DataSource dataSource;
    @Autowired AuthAuditEventRepository events;
    @Autowired PlatformTransactionManager transactions;

    @Test
    void freshSchemaHasExactlySixNullableColumnsWithoutDefaults() throws Exception {
        String schema = isolatedSchema();
        try (var connection = publicConnection()) {
            execute(connection, "CREATE SCHEMA " + schema);
            try {
                migrate(schema, MASTER);
                assertColumns(connection, schema);
                assertEquals(5, scalar(connection, "SELECT count(*) FROM pg_constraint c JOIN pg_namespace n "
                        + "ON n.oid=c.connamespace WHERE n.nspname=? AND c.conname IN "
                        + "('ck_staff_auth_audit_scope_kind','ck_staff_auth_audit_actor_context','ck_staff_auth_audit_scope',"
                        + "'fk_staff_auth_audit_organization','fk_staff_auth_audit_property_organization')", schema));
                assertEquals(2, scalar(connection, "SELECT count(*) FROM information_schema.triggers "
                        + "WHERE trigger_schema=? AND trigger_name='trg_staff_auth_audit_append_only'", schema));
                assertEquals(2, scalar(connection, "SELECT count(*) FROM pg_constraint c JOIN pg_namespace n "
                        + "ON n.oid=c.connamespace WHERE n.nspname=? AND c.conname LIKE 'fk_staff_auth_audit_%' "
                        + "AND NOT c.condeferrable AND c.confupdtype='a' AND c.confdeltype='a' AND c.confmatchtype='s'", schema));
            } finally {
                execute(connection, "DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    @Test
    void upgradeKeepsLegacyRowsChecksumsAndTriggerAndReapplicationIsNoOp() throws Exception {
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
                var checksums = manifest(connection, schema);
                String trigger = triggerDefinition(connection, schema);
                migrate(schema, MASTER);
                var upgraded = manifest(connection, schema);
                assertEquals(checksums.size() + 5, upgraded.size());
                checksums.forEach((key, checksum) -> assertEquals(checksum, upgraded.get(key)));
                assertEquals(manifest(connection, "public"), upgraded);
                assertEquals(before, auditRows(connection, schema));
                assertEquals(trigger, triggerDefinition(connection, schema));
                assertColumns(connection, schema);
                assertEquals(before.size(), scalar(connection, "SELECT count(*) FROM " + schema
                        + ".auth_audit_events WHERE " + ATTR_NULL));
                assertRejected(connection, "UPDATE " + schema + ".auth_audit_events SET actor_context='UNKNOWN'");
                assertRejected(connection, "DELETE FROM " + schema + ".auth_audit_events");
                migrate(schema, MASTER);
                assertEquals(upgraded, manifest(connection, schema));
                assertEquals(before, auditRows(connection, schema));
                assertEquals(trigger, triggerDefinition(connection, schema));
            } finally {
                execute(connection, "DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    @Test
    void legacyJdbcInsertWithOrWithoutSubjectLeavesAttributionNull() throws Exception {
        try (var connection = publicConnection()) {
            connection.setAutoCommit(false);
            try {
                for (UUID subject : new UUID[]{null, UUID.randomUUID()}) {
                    var row = event("STAFF_LOGIN_SUCCEEDED", subject, UUID.randomUUID(), "legacy insert");
                    insert(connection, "public", row);
                    assertEquals(row, auditRows(connection, "public").get(row.id()));
                    assertEquals(1, scalar(connection, "SELECT count(*) FROM auth_audit_events WHERE id=? AND "
                            + ATTR_NULL, row.id()));
                }
            } finally { connection.rollback(); }
        }
    }

    @Test
    void legacyJpaConstructorPersistsWithoutAttributionOrActorInference() {
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            try {
                UUID subject = UUID.randomUUID();
                events.saveAndFlush(new AuthAuditEvent("STAFF_LOGIN_SUCCEEDED", subject, null, "legacy JPA", Instant.now()));
                events.saveAndFlush(new AuthAuditEvent("STAFF_SESSION_REVOKED", null, null, "legacy JPA", Instant.now()));
                try (var connection = org.springframework.jdbc.datasource.DataSourceUtils.getConnection(dataSource)
                        .prepareStatement("SELECT count(*) FROM auth_audit_events WHERE detail='legacy JPA' AND " + ATTR_NULL)) {
                    try (var rows = connection.executeQuery()) {
                        assertTrue(rows.next()); assertEquals(2, rows.getLong(1));
                    }
                }
            } catch (SQLException failure) { throw new RuntimeException(failure); }
            finally { status.setRollbackOnly(); }
        });
    }

    @Test
    void validScopesAndEveryActorContextAreAcceptedWithoutActorOrCorrelationForeignKeys() throws Exception {
        try (var connection = publicConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID organization = createOrganization(connection);
                UUID property = createProperty(connection, organization);
                for (String actor : new String[]{null, "STAFF", "GUEST", "SYSTEM", "UNKNOWN"}) {
                    attributedInsert(connection, organization, property, "PROPERTY", actor);
                    attributedInsert(connection, organization, null, "ORGANIZATION", actor);
                    attributedInsert(connection, null, null, null, actor);
                }
            } finally { connection.rollback(); }
        }
    }

    @Test
    void invalidScopesActorCodesAndPartialScopesFailChecks() throws Exception {
        try (var connection = publicConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID organization = createOrganization(connection);
                UUID property = createProperty(connection, organization);
                for (String invalid : new String[]{"", "property", " PROPERTY", "PROPERTY ", "ALL_PROPERTIES"}) {
                    rejectedInsert(connection, "23514", organization, property, invalid, null);
                }
                for (String invalid : new String[]{"", "staff", " STAFF", "STAFF ", "ADMIN"}) {
                    rejectedInsert(connection, "23514", null, null, null, invalid);
                }
                rejectedInsert(connection, "23514", null, property, "PROPERTY", null);
                rejectedInsert(connection, "23514", organization, null, "PROPERTY", null);
                rejectedInsert(connection, "23514", null, null, "PROPERTY", null);
                rejectedInsert(connection, "23514", null, null, "ORGANIZATION", null);
                rejectedInsert(connection, "23514", organization, property, "ORGANIZATION", null);
                rejectedInsert(connection, "23514", organization, null, null, null);
                rejectedInsert(connection, "23514", null, property, null, null);
                rejectedInsert(connection, "23514", organization, property, null, null);
            } finally { connection.rollback(); }
        }
    }

    @Test
    void invalidOrganizationOrPropertyReferencesFailWithoutCrossOrganizationAttribution() throws Exception {
        try (var connection = publicConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID organization = createOrganization(connection);
                UUID other = createOrganization(connection);
                UUID property = createProperty(connection, organization);
                rejectedInsert(connection, "23503", UUID.randomUUID(), null, "ORGANIZATION", null);
                rejectedInsert(connection, "23503", organization, UUID.randomUUID(), "PROPERTY", null);
                rejectedInsert(connection, "23503", other, property, "PROPERTY", null);
                attributedInsert(connection, organization, property, "PROPERTY", "SYSTEM");
                rejectSql(connection, "23503", "DELETE FROM properties WHERE id=?", property);
                rejectSql(connection, "23503", "UPDATE properties SET id=? WHERE id=?", UUID.randomUUID(), property);
                rejectSql(connection, "23503", "DELETE FROM organizations WHERE id=?", organization);
                rejectSql(connection, "23503", "UPDATE organizations SET id=? WHERE id=?", UUID.randomUUID(), organization);
            } finally { connection.rollback(); }
        }
    }

    @Test
    void attributedInsertCommitRollbackAndAppendOnlyProtectAllColumns() throws Exception {
        UUID committed;
        UUID pending;
        try (var writer = publicConnection()) {
            UUID organization = createOrganization(writer);
            UUID property = createProperty(writer, organization);
            committed = attributedInsert(writer, organization, property, "PROPERTY", "STAFF");
            writer.setAutoCommit(false);
            try {
                pending = attributedInsert(writer, organization, null, "ORGANIZATION", "SYSTEM");
                assertEquals(1, scalar(writer, "SELECT count(*) FROM auth_audit_events WHERE id=?", pending));
            } finally { writer.rollback(); }
        }
        try (var reader = publicConnection()) {
            assertEquals(0, scalar(reader, "SELECT count(*) FROM auth_audit_events WHERE id=?", pending));
            String before = rowJson(reader, committed);
            assertRejected(reader, "UPDATE auth_audit_events SET actor_context='UNKNOWN' WHERE id='" + committed + "'");
            assertRejected(reader, "UPDATE auth_audit_events SET correlation_id=NULL WHERE id='" + committed + "'");
            assertRejected(reader, "DELETE FROM auth_audit_events WHERE id='" + committed + "'");
            assertRejected(reader, "UPDATE auth_audit_events SET actor_id=NULL");
            assertRejected(reader, "DELETE FROM auth_audit_events");
            assertEquals(before, rowJson(reader, committed));
        }
    }

    private void assertColumns(Connection connection, String schema) throws SQLException {
        var expected = Map.of("organization_id", "uuid", "property_id", "uuid", "scope_kind", "character varying",
                "actor_context", "character varying", "actor_id", "uuid", "correlation_id", "uuid");
        assertEquals(12, scalar(connection, "SELECT count(*) FROM information_schema.columns "
                + "WHERE table_schema=? AND table_name='auth_audit_events'", schema));
        try (var statement = connection.prepareStatement("SELECT column_name,data_type,character_maximum_length,"
                + "is_nullable,column_default FROM information_schema.columns "
                + "WHERE table_schema=? AND table_name='auth_audit_events'")) {
            statement.setString(1, schema);
            int matched = 0;
            try (var rows = statement.executeQuery()) {
                while (rows.next()) {
                    String name = rows.getString(1);
                    assertFalse(name.equals("subject_id") || name.equals("subject_type"));
                    if (!expected.containsKey(name)) continue;
                    matched++;
                    assertEquals(expected.get(name), rows.getString(2));
                    if (name.equals("scope_kind") || name.equals("actor_context")) assertEquals(16, rows.getInt(3));
                    assertEquals("YES", rows.getString(4));
                    assertNull(rows.getString(5));
                }
            }
            assertEquals(6, matched);
        }
    }

    private String triggerDefinition(Connection connection, String schema) throws SQLException {
        try (var statement = connection.prepareStatement("SELECT pg_get_triggerdef(t.oid) || pg_get_functiondef(t.tgfoid) "
                + "FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace "
                + "WHERE n.nspname=? AND t.tgname='trg_staff_auth_audit_append_only'")) {
            statement.setString(1, schema);
            try (var rows = statement.executeQuery()) { assertTrue(rows.next()); return rows.getString(1); }
        }
    }

    private String rowJson(Connection connection, UUID id) throws SQLException {
        try (var statement = connection.prepareStatement("SELECT row_to_json(e)::text FROM auth_audit_events e WHERE id=?")) {
            statement.setObject(1, id);
            try (var rows = statement.executeQuery()) { assertTrue(rows.next()); return rows.getString(1); }
        }
    }

    private UUID createOrganization(Connection connection) throws SQLException {
        UUID id = UUID.randomUUID();
        execute(connection, "INSERT INTO organizations(id,name,code,status,created_at,updated_at) "
                + "VALUES (?,'Attribution test',?,'ACTIVE',now(),now())", id, id.toString());
        return id;
    }

    private UUID createProperty(Connection connection, UUID organization) throws SQLException {
        UUID id = UUID.randomUUID();
        execute(connection, "INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,'Attribution test',?,'America/Guatemala','GTQ','ACTIVE',now(),now())", id, organization, id.toString());
        return id;
    }

    private UUID attributedInsert(Connection connection, UUID organization, UUID property, String scope, String actor) throws SQLException {
        UUID id = UUID.randomUUID();
        execute(connection, "INSERT INTO auth_audit_events(id,event_type,occurred_at,detail,organization_id,property_id,"
                + "scope_kind,actor_context,actor_id,correlation_id) VALUES (?,'STAFF_LOGIN_SUCCEEDED',now(),'fixture',?,?,?,?,?,?)",
                id, organization, property, scope, actor, UUID.randomUUID(), UUID.randomUUID());
        return id;
    }

    private void rejectedInsert(Connection connection, String state, UUID organization, UUID property, String scope, String actor)
            throws SQLException {
        var savepoint = connection.setSavepoint();
        try {
            var failure = assertThrows(SQLException.class, () -> attributedInsert(connection, organization, property, scope, actor));
            assertEquals(state, failure.getSQLState());
        } finally { connection.rollback(savepoint); connection.releaseSavepoint(savepoint); }
    }

    private void rejectSql(Connection connection, String state, String sql, Object... args) throws SQLException {
        var savepoint = connection.setSavepoint();
        try {
            var failure = assertThrows(SQLException.class, () -> execute(connection, sql, args));
            assertEquals(state, failure.getSQLState());
        } finally { connection.rollback(savepoint); connection.releaseSavepoint(savepoint); }
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
        assertThrows(com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException.class, () -> auth.getActivePrincipal(refreshedPrincipal));

        try (var connection = publicConnection()) {
            var events = auditRows(connection, "public").values().stream()
                    .filter(row -> staff.equals(row.staffUserId())).toList();
            assertEquals(3, events.size());
            assertEquals(3, scalar(connection, "SELECT count(*) FROM auth_audit_events WHERE staff_user_id=? AND "
                    + "organization_id IS NULL AND property_id IS NULL AND scope_kind IS NULL AND correlation_id IS NULL "
                    + "AND actor_context='STAFF' AND actor_id=staff_user_id", staff));
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
        return "staff_attr_" + UUID.randomUUID().toString().replace("-", "");
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
