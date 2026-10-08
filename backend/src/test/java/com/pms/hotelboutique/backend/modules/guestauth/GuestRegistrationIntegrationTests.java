package com.pms.hotelboutique.backend.modules.guestauth;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email.EmailSender;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc.GoogleOidcClient;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc.VerifiedGoogleIdentity;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"pms.security.reservation-link-otp-hmac-key=test-registration-key-at-least-32-bytes","pms.google.client-id=fixture","pms.google.redirect-uri=http://localhost/callback"})
@AutoConfigureMockMvc
class GuestRegistrationIntegrationTests {
    static final String BINDING="a".repeat(64),PASSWORD=" Test registration! ";
    static final UUID PROPERTY=UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired GuestRegistrationService registrations;
    @Autowired ReservationLinkOtpService manual;
    @Autowired GuestAuthService auth;
    @Autowired GuestJwtService jwt;
    @Autowired GuestAccountSummaryService summary;
    @Autowired GuestProfileService profiles;
    @Autowired ReservationService reservations;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    @Autowired VerifiedEmailHistoryService history;
    @Autowired org.springframework.transaction.PlatformTransactionManager manager;
    @MockitoBean EmailSender emailSender;
    @MockitoBean(name="otpDeliveryExecutor") Executor executor;
    @MockitoBean GoogleOidcClient google;
    List<UUID> fixtureReservations=new ArrayList<>();
    List<UUID> fixtureProfiles=new ArrayList<>();
    List<UUID> fixtureRoomTypes=new ArrayList<>();
    AtomicReference<String> otp=new AtomicReference<>();
    @BeforeEach void delivery(){
        fixtureReservations.clear();fixtureProfiles.clear();fixtureRoomTypes.clear();
        doAnswer(i->{((Runnable)i.getArgument(0)).run();return null;}).when(executor).execute(any());
        doAnswer(i->{otp.set(i.getArgument(1));return null;}).when(emailSender).sendGuestRegistrationOtp(anyString(),anyString());
    }
    @AfterEach void removeOwnedBusinessFixtures(){
        jdbc.execute("ALTER TABLE guest_reservation_links DISABLE TRIGGER trg_guest_reservation_links_append_only");
        try{for(UUID id:fixtureReservations)jdbc.update("DELETE FROM guest_reservation_links WHERE reservation_id=?",id);}
        finally{jdbc.execute("ALTER TABLE guest_reservation_links ENABLE TRIGGER trg_guest_reservation_links_append_only");}
        for(UUID id:fixtureReservations){jdbc.update("DELETE FROM reservation_guests WHERE reservation_stay_id IN (SELECT id FROM reservation_stays WHERE reservation_id=?)",id);jdbc.update("DELETE FROM reservation_stays WHERE reservation_id=?",id);jdbc.update("DELETE FROM reservation_link_challenges WHERE reservation_id=?",id);jdbc.update("DELETE FROM reservations WHERE id=?",id);}
        for(UUID id:fixtureProfiles)jdbc.update("DELETE FROM guest_profiles WHERE id=?",id);
        for(UUID id:fixtureRoomTypes)jdbc.update("DELETE FROM room_types WHERE id=?",id);
    }
    String email(){return "reg-"+UUID.randomUUID().toString().substring(0,16)+"@example.test";}
    UUID start(String email){return registrations.register(email,PASSWORD,BINDING);}
    UUID reserve(String email,UUID owner){
        var p=profiles.create(new CreateGuestProfileCommand(owner,PROPERTY,"Guest","Fixture",email,null,null,null,null));
        UUID id=reservations.create(new CreateReservationCommand(PROPERTY,p.id(),"GTQ","WEB_DIRECTA",null,null)).id();
        fixtureReservations.add(id);fixtureProfiles.add(p.id());return id;
    }
    UUID existing(String email,String state,boolean password){
        UUID id=UUID.randomUUID();jdbc.update("INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES(?,?,now(),?,now(),now())",id,email,state);
        if(password)jdbc.update("INSERT INTO guest_password_credentials(guest_account_id,password_hash,created_at,updated_at) VALUES(?,?,now(),now())",id,encoder.encode(PASSWORD));return id;
    }
    long accounts(String email){return jdbc.queryForObject("SELECT count(*) FROM guest_accounts WHERE lower(btrim(email))=lower(btrim(?))",Long.class,email);}
    long links(UUID account){return jdbc.queryForObject("SELECT count(*) FROM guest_reservation_links WHERE guest_account_id=?",Long.class,account);}
    GuestRegistrationException failure(Runnable r,int status){var e=assertThrows(GuestRegistrationException.class,r::run);assertEquals(status,e.status());return e;}
    @Test void zeroReservationsCreatesOnlyAfterVerificationAndPreservesPassword(){
        String email=email();UUID pending=registrations.register(" "+email.toUpperCase(Locale.ROOT)+" ",PASSWORD,BINDING);
        assertEquals(0,accounts(email));String code=otp.get();
        var tokens=registrations.verify(pending,code,BINDING);var principal=jwt.parse(tokens.accessToken());
        assertEquals(email,auth.getActivePrincipal(principal).email());assertEquals(0,summary.ownSummary(principal).linkedReservationsCount());
        assertTrue(auth.acceptsCredentials(email,PASSWORD));assertFalse(auth.acceptsCredentials(email,PASSWORD.trim()));
        assertNull(jdbc.queryForObject("SELECT password_hash FROM guest_pending_registrations WHERE id=?",String.class,pending));
        failure(()->registrations.verify(pending,code,BINDING),422);
    }
    @Test void oneAndManyHistoricalMatchesIgnoreStatusAndUseOneLinkPerReservation(){
        for(int n:List.of(1,3)){
            String email=email();List<UUID> ids=new ArrayList<>();for(int k=0;k<n;k++)ids.add(reserve(email.toUpperCase(Locale.ROOT),null));
            jdbc.update("UPDATE reservations SET status='CANCELLED' WHERE id=?",ids.getFirst());
            UUID pending=start(email);assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM guest_reservation_links WHERE reservation_id=?",Long.class,ids.getFirst()));
            var principal=jwt.parse(registrations.verify(pending,otp.get(),BINDING).accessToken());assertEquals(n,links(principal.guestAccountId()));
            new org.springframework.transaction.support.TransactionTemplate(manager).executeWithoutResult(s->history.verifyAndLink(principal.guestAccountId(),null));
            assertEquals(n,links(principal.guestAccountId()));assertEquals(n,summary.ownSummary(principal).linkedReservationsCount());
        }
    }
    @Test void anotherEmailAndProfileOwnerNeverGrantOwnership(){
        String email=email();UUID other=existing(email(),"ACTIVE",false);reserve(email(),null);reserve(email,other);
        UUID pending=start(email);UUID account=jwt.parse(registrations.verify(pending,otp.get(),BINDING).accessToken()).guestAccountId();assertEquals(0,links(account));
    }
    @Test void foreignLinkIsNeverTransferred(){
        String email=email();UUID reservation=reserve(email,null),other=existing(email(),"ACTIVE",false),proof=UUID.randomUUID();
        jdbc.update("INSERT INTO guest_email_verifications(id,guest_account_id,normalized_email,source,verified_at) SELECT ?,id,email,'GOOGLE',now() FROM guest_accounts WHERE id=?",proof,other);
        jdbc.update("INSERT INTO guest_reservation_links(reservation_id,guest_account_id,property_id,linked_at,link_source,email_verification_id) VALUES(?,?,?,now(),'VERIFIED_EMAIL',?)",reservation,other,PROPERTY,proof);
        UUID pending=start(email);UUID account=jwt.parse(registrations.verify(pending,otp.get(),BINDING).accessToken()).guestAccountId();assertEquals(0,links(account));assertEquals(other,jdbc.queryForObject("SELECT guest_account_id FROM guest_reservation_links WHERE reservation_id=?",UUID.class,reservation));
    }
    @Test void wrongExpiredBindingAndFiveAttempts(){
        UUID pending=start(email());String correct=otp.get();failure(()->registrations.verify(pending,correct,"b".repeat(64)),403);
        String wrong=correct.equals("00000000")?"00000001":"00000000";
        for(int n=0;n<5;n++)failure(()->registrations.verify(pending,wrong,BINDING),422);
        assertEquals(5,jdbc.queryForObject("SELECT attempts FROM guest_pending_registrations WHERE id=?",Integer.class,pending));
        failure(()->registrations.verify(pending,correct,BINDING),422);failure(()->registrations.resend(pending,BINDING),422);
        UUID expired=start(email());jdbc.update("UPDATE guest_pending_registrations SET otp_expires_at=now()-interval '1 second' WHERE id=?",expired);
        failure(()->registrations.verify(expired,otp.get(),BINDING),422);
    }
    @Test void resendPreservesAttemptsInvalidatesCodeAndEnforcesLimits(){
        String email=email();UUID id=start(email);String previous=otp.get();failure(()->registrations.resend(id,BINDING),429);
        jdbc.update("UPDATE guest_pending_registrations SET sent_at=now()-interval '61 seconds',attempts=1 WHERE id=?",id);
        registrations.resend(id,BINDING);assertEquals(1,jdbc.queryForObject("SELECT attempts FROM guest_pending_registrations WHERE id=?",Integer.class,id));
        assertNotEquals(previous,otp.get());failure(()->registrations.verify(id,previous,BINDING),422);
        jdbc.update("UPDATE guest_pending_registrations SET sent_at=now()-interval '61 seconds' WHERE id=?",id);registrations.resend(id,BINDING);
        jdbc.update("UPDATE guest_pending_registrations SET sent_at=now()-interval '61 seconds' WHERE id=?",id);failure(()->registrations.resend(id,BINDING),429);
        failure(()->start(email),429);
    }
    @Test void newRequestsCannotResetOtpAttemptBudget(){
        String email=email();UUID id=start(email);String correct=otp.get();String wrong=correct.equals("00000000")?"00000001":"00000000";
        for(int n=0;n<5;n++)failure(()->registrations.verify(id,wrong,BINDING),422);
        UUID next=start(email);failure(()->registrations.verify(next,otp.get(),BINDING),422);assertEquals(0,accounts(email));
    }
    @Test void existingPasswordGoogleDisabledHaveSameResponseAndNoOverwrite()throws Exception{
        for(String state:List.of("ACTIVE","DISABLED"))for(boolean password:List.of(true,false)){
            String email=email();UUID account=existing(email,state,password);
            clearInvocations(emailSender,executor);
            String initialHash=password?jdbc.queryForObject("SELECT password_hash FROM guest_password_credentials WHERE guest_account_id=?",String.class,account):null;
            UUID identity=UUID.randomUUID();if(!password)jdbc.update("INSERT INTO guest_identities(id,guest_account_id,provider,provider_subject,created_at) VALUES(?,?,'GOOGLE',?,now())",identity,account,"fixture-"+identity);
            mvc.perform(post("/api/v1/guest-auth/registrations").header("X-Guest-Registration-Binding",BINDING).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email.toUpperCase(Locale.ROOT),"password",PASSWORD))))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.requestId").isString()).andExpect(jsonPath("$.email").doesNotExist());
            assertEquals(1,accounts(email));assertEquals(password?1:0,jdbc.queryForObject("SELECT count(*) FROM guest_password_credentials WHERE guest_account_id=?",Integer.class,account));
            UUID pending=jdbc.queryForObject("SELECT id FROM guest_pending_registrations WHERE email=? ORDER BY created_at DESC LIMIT 1",UUID.class,email);
            assertNull(jdbc.queryForObject("SELECT otp_hash FROM guest_pending_registrations WHERE id=?",String.class,pending));
            assertNull(jdbc.queryForObject("SELECT password_hash FROM guest_pending_registrations WHERE id=?",String.class,pending));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM guest_registration_deliveries WHERE registration_id=?",Integer.class,pending));
            jdbc.update("UPDATE guest_pending_registrations SET sent_at=now()-interval '61 seconds' WHERE id=?",pending);
            registrations.resend(pending,BINDING);start(email);failure(()->start(email),429);
            verifyNoInteractions(emailSender,executor);
            if(password)assertEquals(initialHash,jdbc.queryForObject("SELECT password_hash FROM guest_password_credentials WHERE guest_account_id=?",String.class,account));
            else assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM guest_identities WHERE id=? AND guest_account_id=?",Integer.class,identity,account));
            assertEquals(state,jdbc.queryForObject("SELECT status FROM guest_accounts WHERE id=?",String.class,account));
            assertEquals(0,links(account));assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM guest_auth_sessions WHERE guest_account_id=?",Integer.class,account));
        }
    }
    @Test void inputBoundaryRejectsInvalidLimitsAndCandidateIds()throws Exception{
        for(var body:List.of(Map.of("email","bad","password",PASSWORD),Map.of("email","x".repeat(51)+"@e.test","password",PASSWORD),Map.of("email",email(),"password","short"),Map.of("email",email(),"password","x".repeat(51)),Map.of("email",email(),"password",PASSWORD,"reservationId",UUID.randomUUID().toString()))){
            mvc.perform(post("/api/v1/guest-auth/registrations").header("X-Guest-Registration-Binding",BINDING).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        }
    }
    @Test void deliveryFailureCannotVerify(){
        doThrow(new IllegalStateException("test provider failure")).when(emailSender).sendGuestRegistrationOtp(anyString(),anyString());UUID id=start(email());failure(()->registrations.verify(id,"12345678",BINDING),422);
    }
    @Test void concurrentVerifyCreatesExactlyOneAccountAndSession()throws Exception{
        String email=email();UUID id=start(email);String correct=otp.get();var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try{List<Future<Boolean>> results=new ArrayList<>();for(int i=0;i<2;i++)results.add(pool.submit(()->{gate.await();try{registrations.verify(id,correct,BINDING);return true;}catch(GuestRegistrationException ex){assertEquals(422,ex.status());return false;}}));gate.countDown();int success=0;for(var f:results)if(f.get(30,TimeUnit.SECONDS))success++;assertEquals(1,success);assertEquals(1,accounts(email));}finally{pool.shutdownNow();}
    }
    @Test void concurrentRegistrationDoesNotOverwriteAndUniqueEmailWins()throws Exception{
        String email=email();ThreadLocal<String> delivered=new ThreadLocal<>();
        doAnswer(i->{delivered.set(i.getArgument(1));return null;}).when(emailSender).sendGuestRegistrationOtp(anyString(),anyString());
        record Attempt(UUID id,String code,String binding,String password){}
        var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try{
            List<Future<Attempt>> futures=new ArrayList<>();
            for(int i=0;i<2;i++){final int n=i;futures.add(pool.submit(()->{gate.await();String binding=n==0?BINDING:"b".repeat(64);String password=n==0?PASSWORD:"another password";UUID id=registrations.register(email,password,binding);return new Attempt(id,delivered.get(),binding,password);}));}
            gate.countDown();Attempt first=futures.get(0).get(30,TimeUnit.SECONDS),second=futures.get(1).get(30,TimeUnit.SECONDS);
            registrations.verify(first.id(),first.code(),first.binding());failure(()->registrations.verify(second.id(),second.code(),second.binding()),422);
            assertEquals(1,accounts(email));assertTrue(auth.acceptsCredentials(email,first.password()));assertFalse(auth.acceptsCredentials(email,second.password()));
        }finally{pool.shutdownNow();}
    }
    @Test void linkFailureRollsBackAccountCredentialProofAndConsumption(){
        String email=email();reserve(email,null);UUID id=start(email);String code=otp.get();
        jdbc.execute("CREATE FUNCTION registration_test_failure() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'fixture'; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER registration_test_failure BEFORE INSERT ON guest_reservation_links FOR EACH ROW EXECUTE FUNCTION registration_test_failure()");
        try{assertThrows(RuntimeException.class,()->registrations.verify(id,code,BINDING));assertEquals(0,accounts(email));assertEquals("READY",jdbc.queryForObject("SELECT status FROM guest_pending_registrations WHERE id=?",String.class,id));}
        finally{jdbc.execute("DROP TRIGGER registration_test_failure ON guest_reservation_links");jdbc.execute("DROP FUNCTION registration_test_failure()");}
    }
    @Test void googleNewAccountUsesSameHistoryPortAndExistingPasswordCollisionIsSafe(){
        String email=email();reserve(email,null);when(google.exchange(anyString(),anyString(),anyString())).thenReturn(new VerifiedGoogleIdentity(UUID.randomUUID().toString(),email));
        String url=auth.startGoogleAuthorization();String state=java.net.URI.create(url).getQuery().lines().findFirst().orElseThrow();state=Arrays.stream(state.split("&")).filter(s->s.startsWith("state=")).findFirst().orElseThrow().substring(6);
        UUID account=jwt.parse(auth.exchangeGoogleAuthorization("fixture",state).accessToken()).guestAccountId();assertEquals(1,links(account));
        String collision=email();existing(collision,"ACTIVE",true);when(google.exchange(anyString(),anyString(),anyString())).thenReturn(new VerifiedGoogleIdentity(UUID.randomUUID().toString(),collision));
        String next=Arrays.stream(java.net.URI.create(auth.startGoogleAuthorization()).getQuery().split("&")).filter(s->s.startsWith("state=")).findFirst().orElseThrow().substring(6);
        assertThrows(GuestAuthenticationException.class,()->auth.exchangeGoogleAuthorization("fixture",next));assertEquals(1,accounts(collision));assertTrue(auth.acceptsCredentials(collision,PASSWORD));
    }
    @Test void dailyQuotaAppliesEvenOutsideHourlyWindow(){
        String email=email();UUID id=start(email);
        String fingerprint=jdbc.queryForObject("SELECT email_fingerprint FROM guest_pending_registrations WHERE id=?",String.class,id);
        jdbc.update("UPDATE guest_registration_request_events SET requested_at=now()-interval '2 hours' WHERE registration_id=?",id);
        for(int i=1;i<10;i++)jdbc.update("INSERT INTO guest_registration_request_events(id,registration_id,email_fingerprint,requested_at) VALUES(?,?,?,now()-interval '2 hours')",UUID.randomUUID(),id,fingerprint);
        failure(()->start(email),429);assertEquals(0,accounts(email));
    }
    @Test void credentialAndSessionFailuresRollBackEveryRegistrationWrite(){
        for(String table:List.of("guest_password_credentials","guest_auth_sessions")){
            String email=email();UUID id=start(email);String code=otp.get();
            jdbc.execute("CREATE FUNCTION registration_atomic_failure() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'fixture'; END; $$ LANGUAGE plpgsql");
            jdbc.execute("CREATE TRIGGER registration_atomic_failure BEFORE INSERT ON "+table+" FOR EACH ROW EXECUTE FUNCTION registration_atomic_failure()");
            try{assertThrows(RuntimeException.class,()->registrations.verify(id,code,BINDING));assertEquals(0,accounts(email));assertEquals("READY",jdbc.queryForObject("SELECT status FROM guest_pending_registrations WHERE id=?",String.class,id));}
            finally{jdbc.execute("DROP TRIGGER registration_atomic_failure ON "+table);jdbc.execute("DROP FUNCTION registration_atomic_failure()");}
            registrations.verify(id,code,BINDING);assertEquals(1,accounts(email));
        }
    }

    UUID stay(UUID reservation){
        UUID id=UUID.randomUUID(),type=UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES(?,?,?,?)",type,PROPERTY,"QA-"+type,"Guest registration test");fixtureRoomTypes.add(type);
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) VALUES(?,?,?,?,current_date,current_date+1,'RESERVED',now(),now())",id,reservation,PROPERTY,type);return id;
    }
    @Test void companionEmailDoesNotOwnReservationAndMultipleStaysDoNotDuplicateLinks(){
        String email=email();UUID foreign=reserve(email(),null),owned=reserve(email,null);
        UUID companion=profiles.create(new CreateGuestProfileCommand(null,PROPERTY,"Companion","Fixture",email,null,null,null,null)).id();fixtureProfiles.add(companion);
        jdbc.update("INSERT INTO reservation_guests(id,reservation_stay_id,guest_profile_id,is_primary,created_at) VALUES(?,?,?,false,now())",UUID.randomUUID(),stay(foreign),companion);
        stay(owned);stay(owned);UUID pending=start(email);UUID account=jwt.parse(registrations.verify(pending,otp.get(),BINDING).accessToken()).guestAccountId();
        assertEquals(1,links(account));assertEquals(owned,jdbc.queryForObject("SELECT reservation_id FROM guest_reservation_links WHERE guest_account_id=?",UUID.class,account));
    }
    @Test void manualOtpAndAutoLinkCanRaceWithoutDuplicatingOrTransferringOwnership()throws Exception{
        String email=email();UUID account=existing(email,"ACTIVE",false),reservation=reserve(email,null);
        var principal=jwt.parse(auth.createVerifiedSession(account).accessToken());AtomicReference<String> manualCode=new AtomicReference<>();
        doAnswer(i->{manualCode.set(i.getArgument(1));return null;}).when(emailSender).sendReservationLinkOtp(anyString(),anyString());
        String confirmation=jdbc.queryForObject("SELECT confirmation_code FROM reservations WHERE id=?",String.class,reservation);UUID challenge=manual.issue(principal,confirmation);
        var pool=Executors.newFixedThreadPool(2);var gate=new CountDownLatch(1);
        try{
            var auto=pool.submit(()->{gate.await();new org.springframework.transaction.support.TransactionTemplate(manager).executeWithoutResult(t->history.verifyAndLink(account,null));return true;});
            var explicit=pool.submit(()->{gate.await();return manual.verify(principal,challenge,manualCode.get());});
            gate.countDown();assertTrue(auto.get(30,TimeUnit.SECONDS));explicit.get(30,TimeUnit.SECONDS);assertEquals(1,links(account));
        }finally{pool.shutdownNow();}
    }
    @Test void profileEmailMutationWaitsForLinkingAndCannotCreateCrossEmailOwnership()throws Exception{
        String email=email();UUID reservation=reserve(email,null),profile=jdbc.queryForObject("SELECT booking_guest_id FROM reservations WHERE id=?",UUID.class,reservation);
        UUID pending=start(email);String code=otp.get();var held=new CountDownLatch(1);var release=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try{
            var mutation=pool.submit(()->{new org.springframework.transaction.support.TransactionTemplate(manager).executeWithoutResult(t->{jdbc.queryForObject("SELECT id FROM guest_profiles WHERE id=? FOR UPDATE",UUID.class,profile);held.countDown();try{release.await(10,TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException(e);}jdbc.update("UPDATE guest_profiles SET email=? WHERE id=?",email(),profile);});return true;});
            assertTrue(held.await(10,TimeUnit.SECONDS));var verification=pool.submit(()->registrations.verify(pending,code,BINDING));release.countDown();assertTrue(mutation.get(30,TimeUnit.SECONDS));UUID account=jwt.parse(verification.get(30,TimeUnit.SECONDS).accessToken()).guestAccountId();assertEquals(0,links(account));
        }finally{release.countDown();pool.shutdownNow();}
    }

    @Test void registrationAcceptsExact72Utf8BytesWithoutNormalizationAndRejectsOverflow()throws Exception{
        for(String password:List.of("界".repeat(24),"é".repeat(36),"e\u0301".repeat(24)," " + "é".repeat(35) + " ")){
            String email=email();UUID pending=registrations.register(email,password,BINDING);registrations.verify(pending,otp.get(),BINDING);
            assertTrue(auth.acceptsCredentials(email,password));
            if(!password.equals(password.trim()))assertFalse(auth.acceptsCredentials(email,password.trim()));
            if(!password.equals(java.text.Normalizer.normalize(password,java.text.Normalizer.Form.NFC)))assertFalse(auth.acceptsCredentials(email,java.text.Normalizer.normalize(password,java.text.Normalizer.Form.NFC)));
        }
        for(String password:List.of("界".repeat(25),"é".repeat(37),"😀".repeat(19))){
            mvc.perform(post("/api/v1/guest-auth/registrations").header("X-Guest-Registration-Binding",BINDING).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email(),"password",password))))
                .andExpect(status().isBadRequest());
        }
    }

    @Test void newRegistrationStillCreatesDeliveryAndSendsExactlyOneOtp(){
        String email=email();UUID id=start(email);
        assertEquals("READY",jdbc.queryForObject("SELECT status FROM guest_pending_registrations WHERE id=?",String.class,id));
        assertNotNull(jdbc.queryForObject("SELECT otp_hash FROM guest_pending_registrations WHERE id=?",String.class,id));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM guest_registration_deliveries WHERE registration_id=?",Integer.class,id));
        verify(emailSender,times(1)).sendGuestRegistrationOtp(eq(email),anyString());assertEquals(0,accounts(email));
    }
    @Test void noopAndRealRequestsHaveSameCooldownQuotasAndAttemptBudget(){
        for(boolean exists:List.of(false,true)){
            String email=email();if(exists)existing(email,"ACTIVE",false);UUID id=start(email);
            failure(()->registrations.resend(id,BINDING),429);
            for(int n=0;n<5;n++)failure(()->registrations.verify(id,"99999999".equals(otp.get())?"88888888":"99999999",BINDING),422);
            failure(()->registrations.resend(id,BINDING),422);
        }
    }

}
