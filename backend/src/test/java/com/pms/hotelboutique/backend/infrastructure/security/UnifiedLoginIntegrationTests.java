package com.pms.hotelboutique.backend.infrastructure.security;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc(print=MockMvcPrint.NONE) @Transactional
class UnifiedLoginIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired jakarta.persistence.EntityManager em;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @Autowired StaffAuthService staffAuth;
    @Autowired GuestAuthService guestAuth;
    @Autowired StaffAuthorizationService authorization;
    @Autowired StaffJwtService staffJwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired UnifiedAuthService unifiedAuth;
    private static final String PASSWORD="SyntheticAuthFixture2026!";
    private static final UUID ORGANIZATION=UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    private UUID staff(String email) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES(?,?,?,?,'SUPER_ADMIN','ACTIVE',now(),now())",id,"fixture-"+id,email,passwords.encode(PASSWORD));
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES(?,?,'SUPER_ADMIN','ACTIVE',now(),now())",id,ORGANIZATION);
        return id;
    }
    private UUID guest(String email,boolean credential) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES(?,?,now(),'ACTIVE',now(),now())",id,email);
        if(credential)jdbc.update("INSERT INTO guest_password_credentials(guest_account_id,password_hash,created_at,updated_at) VALUES(?,?,now(),now())",id,passwords.encode(PASSWORD));
        return id;
    }
    private String email(){return UUID.randomUUID()+"@example.test";}
    private String body(String email,String password){return json.writeValueAsString(Map.of("email",email,"password",password));}
    private long sessions(String table){em.flush();return jdbc.queryForObject("SELECT count(*) FROM "+table,Long.class);}

    @Test void staffEmailNormalizesAndKeepsRolePermissionsMembershipRefreshLogout() throws Exception {
        String email=email(); UUID id=staff(email.toUpperCase(Locale.ROOT));
        String raw=mvc.perform(post("/api/v1/staff-auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body("  "+email+"  ",PASSWORD)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var pair=json.readTree(raw); var principal=staffJwt.parse(pair.path("accessToken").asText());
        assertEquals(id,principal.staffUserId()); assertEquals("SUPER_ADMIN",principal.roleCode());
        var snapshot=authorization.resolve(id); assertTrue(snapshot.permissions().contains("STAFF_MANAGE"));
        mvc.perform(get("/api/v1/staff-auth/me").header("Authorization","Bearer "+pair.path("accessToken").asText()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.roleCode").value("SUPER_ADMIN"));
        var rotated=staffAuth.refresh(pair.path("refreshToken").asText());
        assertNotEquals(pair.path("refreshToken").asText(),rotated.refreshToken());
        assertEquals(principal.sessionId(),staffJwt.parse(rotated.accessToken()).sessionId());
        staffAuth.logout(principal);assertThrows(StaffAuthenticationException.class,()->staffAuth.getActivePrincipal(principal));
    }
    @Test void guestEmailNormalizesReusesSessionAndRotatesRevokesRefresh() throws Exception {
        String email=email();UUID id=guest(email.toUpperCase(Locale.ROOT),true);
        String raw=mvc.perform(post("/api/v1/guest-auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body(" "+email+" ",PASSWORD)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var pair=json.readTree(raw);var principal=guestJwt.parse(pair.path("accessToken").asText());assertEquals(id,principal.guestAccountId());
        mvc.perform(get("/api/v1/guest-auth/me").header("Authorization","Bearer "+pair.path("accessToken").asText()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.context").value("GUEST"));
        var rotated=guestAuth.refresh(pair.path("refreshToken").asText());
        assertNotEquals(pair.path("refreshToken").asText(),rotated.refreshToken());
        assertEquals(principal.sessionId(),guestJwt.parse(rotated.accessToken()).sessionId());
        guestAuth.logout(principal);assertThrows(GuestAuthenticationException.class,()->guestAuth.getActivePrincipal(principal));
        assertThrows(GuestAuthenticationException.class,()->guestAuth.refresh(rotated.refreshToken()));
    }
    @Test void directLoginsHaveGenericFailuresForUnknownWrongInactiveAndGoogleOnly() throws Exception {
        for(String context:List.of("staff","guest")) {
            String known=email();UUID id=context.equals("staff")?staff(known):guest(known,true);
            String path="/api/v1/"+context+"-auth/sessions";
            var wrong=mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body(known,"incorrect"))).andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
            var unknown=mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body(email(),PASSWORD))).andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
            assertEquals(json.readTree(wrong).path("title"),json.readTree(unknown).path("title"));
            jdbc.update("UPDATE "+(context.equals("staff")?"staff_users":"guest_accounts")+" SET status='DISABLED' WHERE id=?",id); em.clear();
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body(known,PASSWORD))).andExpect(status().isUnauthorized());
        }
        String googleOnly=email();UUID id=guest(googleOnly,false);
        jdbc.update("INSERT INTO guest_identities(id,guest_account_id,provider,provider_subject,created_at) VALUES(?,?,'GOOGLE',?,now())",UUID.randomUUID(),id,"google-fixture-"+id);
        mvc.perform(post("/api/v1/guest-auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body(googleOnly,PASSWORD))).andExpect(status().isUnauthorized());
    }
    @Test void malformedEmailAndLegacyUsernameAreRejected() throws Exception {
        for(String path:List.of("/api/v1/staff-auth/sessions","/api/v1/guest-auth/sessions","/api/v1/auth/sessions")) {
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body("not-an-email",PASSWORD))).andExpect(status().isBadRequest());
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("username","legacy","password",PASSWORD)))).andExpect(status().isBadRequest());
        }
    }
    @Test void facadeDirectlyStartsOnlyTheValidContext() throws Exception {
        for(String context:List.of("STAFF","GUEST")) {
            String email=email();if(context.equals("STAFF"))staff(email);else guest(email,true);
            long staffBefore=sessions("auth_sessions"),guestBefore=sessions("guest_auth_sessions");
            mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body(email,PASSWORD)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.context").value(context));
            assertEquals(staffBefore+(context.equals("STAFF")?1:0),sessions("auth_sessions"));
            assertEquals(guestBefore+(context.equals("GUEST")?1:0),sessions("guest_auth_sessions"));
        }
    }
    @Test void bothValidPasswordsRequireSelectionAndNeverCreateSessionsDuringDiscovery() throws Exception {
        String email=email();staff(email);guest(email,true);
        long staffBefore=sessions("auth_sessions"),guestBefore=sessions("guest_auth_sessions");
        mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body(email,PASSWORD)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.contexts[0]").value("STAFF")).andExpect(jsonPath("$.contexts[1]").value("GUEST"))
            .andExpect(jsonPath("$.accessToken").doesNotExist()).andExpect(jsonPath("$.refreshToken").doesNotExist());
        assertEquals(staffBefore,sessions("auth_sessions"));assertEquals(guestBefore,sessions("guest_auth_sessions"));
        for(String context:List.of("STAFF","GUEST")) mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("email",email,"password",PASSWORD,"context",context))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.context").value(context));
    }
    @Test void sameEmailDifferentPasswordsRevealsOnlyContextsWhosePasswordWasValidated() throws Exception {
        String email=email();staff(email);UUID guest=guest(email,true);
        jdbc.update("UPDATE guest_password_credentials SET password_hash=? WHERE guest_account_id=?",passwords.encode("OtherFixturePassword!"),guest); em.clear();
        mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body(email,PASSWORD)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.context").value("STAFF"));
        mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("email",email,"password",PASSWORD,"context","GUEST"))))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.contexts").doesNotExist());
    }
    @Test void rejectedPasswordsNeverAppearInValidationResponses() throws Exception {
        String secret="sensitive-fixture-"+"x".repeat(50);
        for(String path:List.of("/api/v1/auth/sessions","/api/v1/staff-auth/sessions","/api/v1/guest-auth/sessions")) {
            String response=mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body(email(),secret)))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
            assertFalse(response.contains(secret)); assertFalse(response.contains("rejectedValue"));
        }
    }
    @Test void longIncorrectPasswordsFailGenericallyWithTheExistingEncoder() throws Exception {
        String email=email(); staff(email);guest(email,true);
        for(String wrong:List.of("x".repeat(1),"x".repeat(50),"á".repeat(50))) {
            mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body(email,wrong))).andExpect(status().isUnauthorized());
        }
    }
    @Test void exactFiftyEmailAndPasswordsAuthenticateAllTraditionalRoutesWithoutPasswordNormalization() throws Exception {
        for (String context : List.of("STAFF", "GUEST")) {
            for (String password : List.of("x", "x".repeat(50), "  SpAce!@#$  ")) {
                String email = UUID.randomUUID() + "a@example.test";
                assertEquals(50, email.length());
                UUID id = context.equals("STAFF") ? staff(email) : guest(email, true);
                if (context.equals("STAFF")) jdbc.update("UPDATE staff_users SET password_hash=? WHERE id=?", passwords.encode(password), id);
                else jdbc.update("UPDATE guest_password_credentials SET password_hash=? WHERE guest_account_id=?", passwords.encode(password), id);
                em.clear();
                for (String path : List.of("/api/v1/" + context.toLowerCase(Locale.ROOT) + "-auth/sessions", "/api/v1/auth/sessions")) {
                    mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body("  " + email.toUpperCase(Locale.ROOT) + "  ", password)))
                        .andExpect(status().isCreated());
                }
                if (password.startsWith(" ")) mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON)
                        .content(body(email, password.trim()))).andExpect(status().isUnauthorized());
                String table = context.equals("STAFF") ? "staff_users" : "guest_password_credentials";
                String key = context.equals("STAFF") ? "id" : "guest_account_id";
                assertEquals(60, jdbc.queryForObject("SELECT length(password_hash) FROM " + table + " WHERE " + key + "=?", Integer.class, id));
            }
        }
    }
    @Test void allHttpLoginBoundariesRejectOversizeMalformedAndEmptyInputs() throws Exception {
        String validEmail = "valid@example.test";
        String email51 = "a".repeat(38) + "@example.test";
        assertEquals(51, email51.length());
        for (String path : List.of("/api/v1/staff-auth/sessions", "/api/v1/staff-auth/login", "/api/v1/guest-auth/sessions", "/api/v1/auth/sessions")) {
            for (String invalidEmail : List.of(email51, "bad-email", "", "   ", "a..b@example.test", "a@-example.test", "a@example..test", "a@exa_mple.test"))
                mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body(invalidEmail, "x"))).andExpect(status().isBadRequest());
            for (String invalidPassword : List.of("x".repeat(51), "", "   "))
                mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body(validEmail, invalidPassword))).andExpect(status().isBadRequest());
        }
    }
    @Test void directApplicationCallsCannotBypassTheLoginContract() {
        String validEmail = "valid@example.test";
        for (String invalidEmail : Arrays.asList("a".repeat(38) + "@example.test", "bad-email", "", "   ", null)) {
            assertInvalidServiceInput(invalidEmail, "x");
        }
        for (String invalidPassword : Arrays.asList("x".repeat(51), "", "   ", null)) {
            assertInvalidServiceInput(validEmail, invalidPassword);
        }
    }
    private void assertInvalidServiceInput(String email, String password) {
        Class<com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator.InvalidInputException> error =
                com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator.InvalidInputException.class;
        assertThrows(error, () -> staffAuth.login(email, password));
        assertThrows(error, () -> staffAuth.acceptsCredentials(email, password));
        assertThrows(error, () -> guestAuth.login(email, password));
        assertThrows(error, () -> guestAuth.acceptsCredentials(email, password));
        assertThrows(error, () -> unifiedAuth.login(email, password, null));
    }
    @Test void discoveryNeverEnumeratesAccountsBeforeValidPassword() throws Exception {
        String email=email();staff(email);guest(email,true);
        for(String candidate:List.of(email,email())) mvc.perform(post("/api/v1/auth/sessions").contentType(MediaType.APPLICATION_JSON).content(body(candidate,"invalid")))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.title").value("Invalid credentials"))
            .andExpect(jsonPath("$.context").doesNotExist()).andExpect(jsonPath("$.contexts").doesNotExist());
    }
    @Test void excessiveUtf8PasswordIsGenericBeforeAnyAccountLookupOrBcrypt()throws Exception{
        String known=email();guest(known,true);staff(known);
        for(String path:List.of("/api/v1/auth/sessions","/api/v1/guest-auth/sessions","/api/v1/staff-auth/sessions"))for(String email:List.of(known,email())){
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body(email,"界".repeat(25))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.title").value("Invalid credentials"));
        }
        assertFalse(PasswordLoginValidator.exceedsPasswordByteLimit("界".repeat(24)));
        assertFalse(PasswordLoginValidator.exceedsPasswordByteLimit("é".repeat(36)));
        assertTrue(PasswordLoginValidator.exceedsPasswordByteLimit("é".repeat(37)));
        assertFalse(PasswordLoginValidator.exceedsPasswordByteLimit("😀".repeat(18)));
        assertTrue(PasswordLoginValidator.exceedsPasswordByteLimit("😀".repeat(19)));
    }

}
