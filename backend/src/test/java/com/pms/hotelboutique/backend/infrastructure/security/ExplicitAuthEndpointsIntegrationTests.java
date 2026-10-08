package com.pms.hotelboutique.backend.infrastructure.security;

import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc.GoogleOidcClient;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc.VerifiedGoogleIdentity;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.domain.StaffUser;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffAuthorizationRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffUserRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.servlet.http.Cookie;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"pms.google.client-id=synthetic-client", "pms.google.redirect-uri=http://localhost/callback"})
@AutoConfigureMockMvc
class ExplicitAuthEndpointsIntegrationTests {
    private static final String STAFF = "/api/v1/staff-auth";
    private static final String GUEST = "/api/v1/guest-auth";
    private static final String PASSWORD = "synthetic-alias-password";
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired StaffUserRepository users;
    @Autowired StaffAuthorizationRepository authorization;
    @Autowired PasswordEncoder passwords;
    @Autowired PlatformTransactionManager transactions;
    @Autowired EntityManager entityManager;
    @Autowired StaffJwtService staffJwt;
    @Autowired GuestJwtService guestJwt;
    @MockitoBean GoogleOidcClient google;

    @Test
    void bothStaffLoginsCreateExactlyOneSessionAndReturnTheSameC2View() throws Exception {
        var user = staff();
        for (String route : List.of("/sessions", "/login")) {
            long before = count("auth_sessions", "staff_user_id", user.id());
            var tokens = login(user, route);
            var legacy = read(STAFF, "/session", tokens);
            var current = read(STAFF, "/me", tokens);
            assertEquals(legacy, current);
            assertEquals(Set.of("staffUserId", "sessionId", "username", "roleCode", "permissions", "memberships"), fields(current));
            assertEquals(user.id().toString(), current.path("staffUserId").asText());
            assertEquals(user.username(), current.path("username").asText());
            assertEquals("SUPER_ADMIN", current.path("roleCode").asText());
            var permissions = new TreeSet<String>();
            current.path("permissions").forEach(p -> permissions.add(p.asText()));
            assertEquals(new TreeSet<>(jdbc.queryForList("SELECT permission_code FROM role_permissions WHERE role_code='SUPER_ADMIN'", String.class)), permissions);
            var properties = new TreeSet<String>();
            current.path("memberships").forEach(p -> {
                properties.add(p.path("propertyId").asText());
                assertEquals(Set.of("propertyId", "propertyCode", "name", "timezone", "currency"), fields(p));
            });
            assertEquals(new TreeSet<>(jdbc.queryForList("SELECT id::text FROM properties WHERE organization_id=? AND status='ACTIVE'", String.class, ORGANIZATION)), properties);
            assertEquals(before + 1, count("auth_sessions", "staff_user_id", user.id()));
            assertEquals(1, count("refresh_tokens", "session_id", session(current)));
            assertAudit(session(current), user.id(), "STAFF_LOGIN_SUCCEEDED");
        }
    }

    @Test
    void mixedStaffRoutesRotateAndRevokeOnlyTheirOwnSessionWithoutDuplicateAudit() throws Exception {
        var user = staff();
        var unaffected = login(user, "/sessions");
        var guest = guestIdentity();
        var guestSession = guest(guest);
        for (String loginRoute : List.of("/sessions", "/login")) {
            for (boolean explicitLogout : List.of(false, true)) {
                var original = login(user, loginRoute);
                UUID id = session(read(STAFF, "/me", original));
                var rotated = refresh(STAFF, original);
                assertNotEquals(original.refreshToken(), rotated.refreshToken());
                assertEquals(id, session(read(STAFF, "/session", rotated)));
                assertEquals(2, count("refresh_tokens", "session_id", id));
                logout(STAFF, rotated, explicitLogout);
                assertRevoked(STAFF, rotated);
                assertEquals("REVOKED", jdbc.queryForObject("SELECT status FROM auth_sessions WHERE id=?", String.class, id));
                assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE session_id=? AND revoked_at IS NULL", Long.class, id));
                assertAudit(id, user.id(), "STAFF_LOGIN_SUCCEEDED", "STAFF_REFRESH_ROTATED", "STAFF_SESSION_REVOKED");
                assertEquals("logout", jdbc.queryForObject("SELECT detail FROM auth_audit_events WHERE session_id=? AND event_type='STAFF_SESSION_REVOKED'", String.class, id));
                read(STAFF, "/me", unaffected);
                read(GUEST, "/me", guestSession);
            }
        }
    }

    @Test
    void googleGuestSessionAndMeAreIdenticalAndBothLogoutRoutesKeepTheirSemantics() throws Exception {
        var identity = guestIdentity();
        var unaffected = guest(identity);
        var staff = login(staff(), "/login");
        for (boolean explicitLogout : List.of(false, true)) {
            var tokens = guest(identity);
            var legacy = read(GUEST, "/session", tokens);
            assertEquals(legacy, read(GUEST, "/me", tokens));
            assertEquals(Set.of("guestAccountId", "sessionId", "email", "context"), fields(legacy));
            assertEquals(identity.email(), legacy.path("email").asText());
            assertEquals("GUEST", legacy.path("context").asText());
            UUID id = session(legacy);
            assertEquals(1, count("guest_refresh_tokens", "session_id", id));
            var rotated = refresh(GUEST, tokens);
            assertEquals(id, session(read(GUEST, "/me", rotated)));
            assertNotEquals(tokens.refreshToken(), rotated.refreshToken());
            logout(GUEST, rotated, explicitLogout);
            assertRevoked(GUEST, rotated);
            assertEquals("REVOKED", jdbc.queryForObject("SELECT status FROM guest_auth_sessions WHERE id=?", String.class, id));
            assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM guest_refresh_tokens WHERE session_id=? AND revoked_at IS NULL", Long.class, id));
            // Guest login/refresh/logout currently emits no auth audit: aliases must preserve it.
            assertEquals(0, count("guest_auth_audit_events", "session_id", id));
            read(GUEST, "/session", unaffected);
            read(STAFF, "/session", staff);
        }
    }

    @Test
    void newAndLegacyRoutesRejectAbsentMalformedExpiredAndCrossContextAccess() throws Exception {
        var staff = login(staff(), "/login");
        var guest = guest(guestIdentity());
        var expiredStaff = staffJwt.issue(staffJwt.parse(staff.accessToken()), Instant.now().minusSeconds(3600));
        var expiredGuest = guestJwt.issue(guestJwt.parse(guest.accessToken()), Instant.now().minusSeconds(3600));
        for (String prefix : List.of(STAFF, GUEST)) {
            for (String token : List.of("", "invalid-jwt", prefix.equals(STAFF) ? expiredStaff : expiredGuest,
                    prefix.equals(STAFF) ? guest.accessToken() : staff.accessToken())) {
                for (var request : List.of(get(prefix + "/session"), get(prefix + "/me"),
                        delete(prefix + "/session"), post(prefix + "/logout"))) {
                    if (!token.isEmpty()) request.header("Authorization", "Bearer " + token);
                    mvc.perform(request).andExpect(status().isUnauthorized());
                }
            }
        }
        read(STAFF, "/me", staff);
        read(GUEST, "/me", guest);
    }

    @Test
    void staffLoginAliasesHaveEquivalentValidationAndAuthenticationFailures() throws Exception {
        var user = staff();
        for (String body : List.of("{}", "{", json.writeValueAsString(Map.of("email", "", "password", "")),
                json.writeValueAsString(Map.of("email", "x".repeat(321), "password", PASSWORD)))) {
            for (String route : List.of("/sessions", "/login")) {
                mvc.perform(post(STAFF + route).contentType(MediaType.APPLICATION_JSON).content(body))
                        .andExpect(status().isBadRequest());
            }
        }
        for (String username : List.of(user.username() + "@example.test", "a" + UUID.randomUUID() + "@example.test")) {
            JsonNode legacy = null;
            for (String route : List.of("/sessions", "/login")) {
                var problem = json.readTree(mvc.perform(post(STAFF + route).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", username, "password", "wrong"))))
                        .andExpect(status().isUnauthorized()).andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                        .andReturn().getResponse().getContentAsString());
                assertEquals(401, problem.path("status").asInt());
                assertFalse(problem.has("code"));
                if (legacy != null) assertEquals(legacy.path("title"), problem.path("title"));
                legacy = problem;
            }
        }
        for (String route : List.of("/sessions", "/login")) {
            mvc.perform(post(STAFF + route).header("Authorization", "Bearer invalid-jwt")
                    .contentType(MediaType.APPLICATION_JSON).content(credentials(user))).andExpect(status().isUnauthorized());
        }
        assertEquals(0, count("auth_sessions", "staff_user_id", user.id()));
    }

    @Test
    void staffAliasesCannotBypassCurrentMembershipOrIdentityState() throws Exception {
        var user = staff();
        var tokens = login(user, "/login");
        jdbc.update("UPDATE organization_memberships SET status='INACTIVE' WHERE staff_user_id=?", user.id());
        assertStaffDisabled(user, tokens);
        var suspended = staff();
        var suspendedTokens = login(suspended, "/sessions");
        jdbc.update("UPDATE staff_users SET status='SUSPENDED' WHERE id=?", suspended.id());
        assertStaffDisabled(suspended, suspendedTokens);
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    void meAndSessionRecalculateC2MembershipsForTheSameAccessToken() throws Exception {
        var user = staff();
        jdbc.update("UPDATE staff_users SET role_code='RECEPCION' WHERE id=?", user.id());
        jdbc.update("UPDATE organization_memberships SET role_code='RECEPCION' WHERE staff_user_id=?", user.id());
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) VALUES (?,?,'Alias test',?,'America/Guatemala','GTQ','ACTIVE',now(),now())", UUID.randomUUID(), ORGANIZATION, "alias-" + UUID.randomUUID());
        List<UUID> properties = jdbc.queryForList("SELECT id FROM properties WHERE organization_id=? AND status='ACTIVE' ORDER BY id LIMIT 2", UUID.class, ORGANIZATION);
        assertEquals(2, properties.size());
        for (UUID property : properties) jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", user.id(), ORGANIZATION, property);
        var tokens = login(user, "/login");
        var before = read(STAFF, "/me", tokens);
        assertEquals(properties.size(), before.path("memberships").size());
        // Change the authorized subset without touching JWT, permission catalog or other fixtures.
        jdbc.update("UPDATE membership_properties SET status='INACTIVE' WHERE staff_user_id=? AND property_id=?", user.id(), properties.get(1));
        var current = read(STAFF, "/me", tokens);
        assertEquals(read(STAFF, "/session", tokens), current);
        assertEquals(1, current.path("memberships").size());
        assertEquals(properties.getFirst().toString(), current.path("memberships").get(0).path("propertyId").asText());
        entityManager.flush();
        assertAudit(session(current), user.id(), "STAFF_LOGIN_SUCCEEDED");
    }

    @Test
    void refreshStillAcceptsOnlyItsOwnCookieAndRejectsReusedValues() throws Exception {
        var staff = login(staff(), "/login");
        var guest = guest(guestIdentity());
        for (String prefix : List.of(STAFF, GUEST)) {
            var own = prefix.equals(STAFF) ? staff : guest;
            var foreign = prefix.equals(STAFF) ? guest : staff;
            String cookie = cookie(prefix);
            mvc.perform(post(prefix + "/refresh")).andExpect(status().isUnauthorized());
            mvc.perform(post(prefix + "/refresh").cookie(new Cookie(cookie, foreign.refreshToken())))
                    .andExpect(status().isUnauthorized());
            mvc.perform(post(prefix + "/refresh").cookie(new Cookie(cookie(prefix.equals(STAFF) ? GUEST : STAFF), own.refreshToken())))
                    .andExpect(status().isUnauthorized());
            mvc.perform(post(prefix + "/refresh").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("refreshToken", own.refreshToken())))).andExpect(status().isUnauthorized());
            refresh(prefix, own);
            mvc.perform(post(prefix + "/refresh").cookie(new Cookie(cookie, own.refreshToken())))
                    .andExpect(status().isUnauthorized());
        }
    }

    private void assertStaffDisabled(StaffFixture user, Tokens tokens) throws Exception {
        for (String route : List.of("/sessions", "/login")) mvc.perform(post(STAFF + route)
                .contentType(MediaType.APPLICATION_JSON).content(credentials(user))).andExpect(status().isUnauthorized());
        for (var request : List.of(get(STAFF + "/session"), get(STAFF + "/me"), delete(STAFF + "/session"), post(STAFF + "/logout"))) {
            mvc.perform(bearer(request, tokens)).andExpect(status().isUnauthorized());
        }
    }

    private StaffFixture staff() {
        var id = UUID.randomUUID();
        var username = "a" + id;
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            users.saveAndFlush(new StaffUser(id, username, username + "@example.test", passwords.encode(PASSWORD), "SUPER_ADMIN", Instant.now()));
            authorization.ensureSuperAdminMembership(id, ORGANIZATION);
        });
        return new StaffFixture(id, username);
    }

    private Tokens login(StaffFixture user, String route) throws Exception {
        return tokenResponse(post(STAFF + route).contentType(MediaType.APPLICATION_JSON).content(credentials(user)), 201);
    }

    private String credentials(StaffFixture user) { return json.writeValueAsString(Map.of("email", user.username() + "@example.test", "password", PASSWORD)); }

    private VerifiedGoogleIdentity guestIdentity() {
        String id = UUID.randomUUID().toString();
        return new VerifiedGoogleIdentity(id, id + "@example.test");
    }

    private Tokens guest(VerifiedGoogleIdentity identity) throws Exception {
        when(google.exchange(anyString(), anyString(), anyString())).thenReturn(identity);
        var start = json.readTree(mvc.perform(post(GUEST + "/google/start")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String state = UriComponentsBuilder.fromUriString(start.path("authorizationUrl").asText()).build().getQueryParams().getFirst("state");
        return tokenResponse(post(GUEST + "/google/exchange").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("code", "synthetic-code", "state", state))), 201);
    }

    private Tokens refresh(String prefix, Tokens tokens) throws Exception {
        return tokenResponse(post(prefix + "/refresh").cookie(new Cookie(cookie(prefix), tokens.refreshToken())), 200);
    }

    private Tokens tokenResponse(MockHttpServletRequestBuilder request, int statusCode) throws Exception {
        var response = mvc.perform(request).andExpect(status().is(statusCode)).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist("Set-Cookie")).andExpect(header().doesNotExist("Location"))
                .andReturn().getResponse();
        var body = json.readTree(response.getContentAsString());
        assertEquals(Set.of("accessToken", "refreshToken", "accessTokenExpiresInSeconds"), fields(body));
        assertEquals(900, body.path("accessTokenExpiresInSeconds").asInt());
        assertFalse(body.path("accessToken").asText().isBlank());
        assertFalse(body.path("refreshToken").asText().isBlank());
        return new Tokens(body.path("accessToken").asText(), body.path("refreshToken").asText());
    }

    private JsonNode read(String prefix, String route, Tokens tokens) throws Exception {
        return json.readTree(mvc.perform(bearer(get(prefix + route), tokens)).andExpect(status().isOk())
                .andExpect(header().doesNotExist("Set-Cookie")).andReturn().getResponse().getContentAsString());
    }

    private void logout(String prefix, Tokens tokens, boolean explicit) throws Exception {
        mvc.perform(bearer(explicit ? post(prefix + "/logout") : delete(prefix + "/session"), tokens))
                .andExpect(status().isNoContent()).andExpect(content().string(""))
                .andExpect(header().doesNotExist("Set-Cookie")).andExpect(header().doesNotExist("Location"));
    }

    private void assertRevoked(String prefix, Tokens tokens) throws Exception {
        for (var request : List.of(get(prefix + "/session"), get(prefix + "/me"), delete(prefix + "/session"), post(prefix + "/logout"))) {
            mvc.perform(bearer(request, tokens)).andExpect(status().isUnauthorized());
        }
        mvc.perform(post(prefix + "/refresh").cookie(new Cookie(cookie(prefix), tokens.refreshToken())))
                .andExpect(status().isUnauthorized());
    }

    private void assertAudit(UUID session, UUID actor, String... events) {
        var rows = jdbc.queryForList("SELECT * FROM auth_audit_events WHERE session_id=?", session);
        assertEquals(events.length, rows.size());
        assertEquals(Set.of(events), rows.stream().map(r -> (String) r.get("event_type")).collect(java.util.stream.Collectors.toSet()));
        for (var row : rows) {
            assertEquals(actor, row.get("staff_user_id"));
            assertEquals(actor, row.get("actor_id"));
            assertEquals("STAFF", row.get("actor_context"));
            for (String field : List.of("property_id", "organization_id", "scope_kind", "correlation_id")) assertNull(row.get(field));
        }
    }

    private long count(String table, String field, UUID id) { return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE " + field + "=?", Long.class, id); }
    private UUID session(JsonNode node) { return UUID.fromString(node.path("sessionId").asText()); }
    private String cookie(String prefix) { return prefix.equals(STAFF) ? "pms_staff_refresh" : "pms_guest_refresh"; }
    private MockHttpServletRequestBuilder bearer(MockHttpServletRequestBuilder request, Tokens tokens) { return request.header("Authorization", "Bearer " + tokens.accessToken()); }
    private Set<String> fields(JsonNode node) { var fields = new TreeSet<String>(); node.properties().forEach(e -> fields.add(e.getKey())); return fields; }
    private record StaffFixture(UUID id, String username) { }
    private record Tokens(String accessToken, String refreshToken) { }
}
