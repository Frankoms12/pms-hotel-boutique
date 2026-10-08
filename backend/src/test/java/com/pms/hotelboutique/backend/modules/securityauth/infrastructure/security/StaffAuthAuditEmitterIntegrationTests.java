package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.domain.StaffUser;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.AuthAuditEventRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffAuthorizationRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffUserRepository;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;

@SpringBootTest
class StaffAuthAuditEmitterIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final String PASSWORD = "synthetic-audit-password";
    @Autowired StaffAuthService auth;
    @Autowired StaffJwtService jwt;
    @Autowired StaffUserRepository users;
    @Autowired StaffAuthorizationRepository authorization;
    @Autowired PasswordEncoder passwords;
    @Autowired StaffBootstrapConfiguration bootstrap;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean AuthAuditEventRepository events;

    @Test
    void successfulLoginRefreshAndLogoutAttributeOnlyVerifiedStaffActors() {
        var staff = staff();
        var login = auth.login(staff.username().substring(0, 37) + "@example.test", PASSWORD);
        var principal = jwt.parse(login.accessToken());
        var rotated = auth.refresh(login.refreshToken());
        auth.logout(jwt.parse(rotated.accessToken()));
        var rows = rows(staff.id());
        assertEquals(3, rows.size());
        assertEquals(java.util.Set.of("STAFF_LOGIN_SUCCEEDED", "STAFF_REFRESH_ROTATED", "STAFF_SESSION_REVOKED"),
                rows.stream().map(row -> row.get("event_type")).collect(java.util.stream.Collectors.toSet()));
        for (var row : rows) {
            assertEquals(staff.id(), row.get("staff_user_id"));
            assertEquals(principal.sessionId(), row.get("session_id"));
            assertEquals("STAFF", row.get("actor_context"));
            assertEquals(staff.id(), row.get("actor_id"));
            assertSessionScopeNull(row);
        }
        assertThrows(StaffAuthenticationException.class, () -> auth.getActivePrincipal(principal));
    }

    @Test
    void bootstrapAttributesSystemAndTheExplicitMembershipOrganizationOnce() {
        String username = "boot-audit-" + UUID.randomUUID();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            bootstrap.bootstrap(users, events, authorization, passwords, username, username.substring(0, 37) + "@example.test", PASSWORD);
            events.flush();
            UUID subject = jdbc.queryForObject("SELECT id FROM staff_users WHERE username=?", UUID.class, username);
            var row = rows(subject).getFirst();
            assertEquals("STAFF_BOOTSTRAP_CREATED", row.get("event_type"));
            assertEquals(subject, row.get("staff_user_id"));
            assertNull(row.get("session_id"));
            assertEquals("SYSTEM", row.get("actor_context"));
            assertNull(row.get("actor_id"));
            assertEquals(ORGANIZATION, row.get("organization_id"));
            assertEquals("ORGANIZATION", row.get("scope_kind"));
            assertNull(row.get("property_id"));
            assertNull(row.get("correlation_id"));
            assertEquals(ORGANIZATION, jdbc.queryForObject(
                    "SELECT organization_id FROM organization_memberships WHERE staff_user_id=?", UUID.class, subject));
            bootstrap.bootstrap(users, events, authorization, passwords, username, username.substring(0, 37) + "@example.test", PASSWORD);
            events.flush();
            assertEquals(1, rows(subject).size());
            status.setRollbackOnly();
        });
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM staff_users WHERE username=?", Integer.class, username));
    }

    @Test
    void actorAndSubjectAreIndependentAndLegacyConstructorStaysUnattributed() {
        UUID subject = UUID.randomUUID();
        UUID actor = UUID.randomUUID();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            events.saveAndFlush(AuthAuditEvent.staffAction("STAFF_LOGIN_SUCCEEDED", subject, null,
                    "synthetic separate identity", Instant.now(), actor));
            var attributed = rows(subject).getFirst();
            assertEquals(subject, attributed.get("staff_user_id"));
            assertEquals(actor, attributed.get("actor_id"));
            assertEquals("STAFF", attributed.get("actor_context"));
            assertSessionScopeNull(attributed);
            UUID legacySubject = UUID.randomUUID();
            events.saveAndFlush(new AuthAuditEvent("STAFF_LOGIN_SUCCEEDED", legacySubject, null,
                    "synthetic legacy", Instant.now()));
            var legacy = rows(legacySubject).getFirst();
            assertNull(legacy.get("actor_context"));
            assertNull(legacy.get("actor_id"));
            assertSessionScopeNull(legacy);
            status.setRollbackOnly();
        });
    }

    @Test
    void failedLoginAttemptStillUsesLegacyEventWithoutNewAttribution() {
        var staff = staff();
        clearInvocations(events);
        assertThrows(StaffAuthenticationException.class, () -> auth.login(staff.username().substring(0, 37) + "@example.test", "invalid-password"));
        var attempt = capturedEvent();
        assertEquals("STAFF_LOGIN_FAILED", ReflectionTestUtils.getField(attempt, "eventType"));
        assertEquals(staff.id(), ReflectionTestUtils.getField(attempt, "staffUserId"));
        assertNoAttribution(attempt);
        // C6-D06 is not fixed here: this attempted INSERT still rolls back with the 401 exception.
        assertTrue(rows(staff.id()).isEmpty());
    }

    @Test
    void rejectedRefreshAttemptDoesNotAcquireTheSessionActorAsAttribution() {
        var staff = staff();
        var login = auth.login(staff.username().substring(0, 37) + "@example.test", PASSWORD);
        auth.refresh(login.refreshToken());
        clearInvocations(events);
        assertThrows(StaffAuthenticationException.class, () -> auth.refresh(login.refreshToken()));
        var attempt = capturedEvent();
        assertEquals("STAFF_SESSION_REVOKED", ReflectionTestUtils.getField(attempt, "eventType"));
        assertEquals("refresh_rejected", ReflectionTestUtils.getField(attempt, "detail"));
        assertEquals(staff.id(), ReflectionTestUtils.getField(attempt, "staffUserId"));
        assertNoAttribution(attempt);
        assertEquals(2, rows(staff.id()).size());
    }

    @Test
    void logoutRejectsPrincipalThatDoesNotMatchTheAuthenticatedSession() {
        var staff = staff();
        var login = auth.login(staff.username().substring(0, 37) + "@example.test", PASSWORD);
        var principal = jwt.parse(login.accessToken());
        var forged = new StaffPrincipal(UUID.randomUUID(), principal.sessionId(), staff.username(), principal.roleCode());
        assertThrows(StaffAuthenticationException.class, () -> auth.logout(forged));
        assertEquals(staff.id(), auth.getActivePrincipal(principal).staffUserId());
        assertEquals(1, rows(staff.id()).size());
    }

    @Test
    void emittedAttributionRemainsAppendOnlyAndLegacyHistoryIsUnchanged() {
        UUID legacyId = UUID.randomUUID();
        jdbc.update("INSERT INTO auth_audit_events(id,event_type,occurred_at,detail) "
                + "VALUES (?,'STAFF_LOGIN_SUCCEEDED',now(),'synthetic preserved history')", legacyId);
        var legacy = jdbc.queryForMap("SELECT * FROM auth_audit_events WHERE id=?", legacyId);
        var staff = staff();
        auth.login(staff.username().substring(0, 37) + "@example.test", PASSWORD);
        var emitted = rows(staff.id()).getFirst();
        UUID id = (UUID) emitted.get("id");
        rejectMutation("UPDATE auth_audit_events SET actor_id=NULL WHERE id=?", id);
        rejectMutation("DELETE FROM auth_audit_events WHERE id=?", id);
        assertEquals(emitted, jdbc.queryForMap("SELECT * FROM auth_audit_events WHERE id=?", id));
        assertEquals(legacy, jdbc.queryForMap("SELECT * FROM auth_audit_events WHERE id=?", legacyId));
    }

    @Test
    void logoutAttributionAndRevocationRollbackWithTheExistingTransaction() {
        var staff = staff();
        var login = auth.login(staff.username().substring(0, 37) + "@example.test", PASSWORD);
        var principal = jwt.parse(login.accessToken());
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            auth.logout(principal);
            events.flush();
            assertEquals(2, rows(staff.id()).size());
            status.setRollbackOnly();
        });
        assertEquals(1, rows(staff.id()).size());
        assertEquals(staff.id(), auth.getActivePrincipal(principal).staffUserId());
    }

    private StaffFixture staff() {
        UUID id = UUID.randomUUID();
        String username = "emit-audit-" + id;
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            users.saveAndFlush(new StaffUser(id, username, username.substring(0, 37) + "@example.test",
                    passwords.encode(PASSWORD), "SUPER_ADMIN", Instant.now()));
            authorization.ensureSuperAdminMembership(id, ORGANIZATION);
        });
        return new StaffFixture(id, username);
    }

    private List<Map<String, Object>> rows(UUID subject) {
        return jdbc.queryForList("SELECT * FROM auth_audit_events WHERE staff_user_id=? ORDER BY occurred_at,id", subject);
    }

    private void assertSessionScopeNull(Map<String, Object> row) {
        for (String field : List.of("organization_id", "property_id", "scope_kind", "correlation_id")) assertNull(row.get(field), field);
    }

    private AuthAuditEvent capturedEvent() {
        var captured = ArgumentCaptor.forClass(AuthAuditEvent.class);
        verify(events).save(captured.capture());
        return captured.getValue();
    }

    private void assertNoAttribution(AuthAuditEvent event) {
        for (String field : List.of("organizationId", "propertyId", "scopeKind", "actorContext", "actorId", "correlationId")) {
            assertNull(ReflectionTestUtils.getField(event, field), field);
        }
    }

    private void rejectMutation(String sql, UUID id) {
        var failure = assertThrows(DataAccessException.class, () -> jdbc.update(sql, id));
        Throwable cause = failure;
        while (cause != null && !(cause instanceof SQLException)) cause = cause.getCause();
        assertInstanceOf(SQLException.class, cause);
        assertEquals("P0001", ((SQLException) cause).getSQLState());
    }

    private record StaffFixture(UUID id, String username) { }
}
