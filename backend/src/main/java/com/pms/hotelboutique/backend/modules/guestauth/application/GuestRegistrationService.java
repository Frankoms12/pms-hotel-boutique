package com.pms.hotelboutique.backend.modules.guestauth.application;

import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAccount;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email.EmailSender;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence.GuestAccountRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.Executor;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Pending registrations are neither identities nor sessions. Delivery is outside the final transaction. */
@Service
public class GuestRegistrationService {
    private final JdbcClient jdbc;
    private final PasswordLoginValidator input;
    private final PasswordEncoder passwords;
    private final GuestAccountRepository accounts;
    private final VerifiedEmailHistoryService history;
    private final GuestAuthService auth;
    private final EmailSender sender;
    private final Executor executor;
    private final TransactionTemplate tx;
    private final byte[] key;
    private final SecureRandom random=new SecureRandom();
    public GuestRegistrationService(JdbcClient jdbc,PasswordLoginValidator input,PasswordEncoder passwords,
            GuestAccountRepository accounts,
            VerifiedEmailHistoryService history,GuestAuthService auth,EmailSender sender,
            @Qualifier("otpDeliveryExecutor") Executor executor,PlatformTransactionManager manager,
            @Value("${pms.security.reservation-link-otp-hmac-key:}") String key) {
        this.jdbc=jdbc;this.input=input;this.passwords=passwords;this.accounts=accounts;
        this.history=history;this.auth=auth;this.sender=sender;this.executor=executor;
        this.tx=new TransactionTemplate(manager);this.key=key.getBytes(StandardCharsets.UTF_8);
    }
    public UUID register(String email,String password,String binding) {
        checkBinding(binding);
        if(PasswordLoginValidator.exceedsPasswordByteLimit(password)) throw new GuestRegistrationException(400);
        configured();
        String normalized=input.normalizedEmail(email,password);
        if(password.length()<8) throw new GuestRegistrationException(400);
        final String encoded;
        try { encoded=passwords.encode(password); } catch(IllegalArgumentException invalid) { throw new GuestRegistrationException(400); }
        UUID id=UUID.randomUUID();String[] code={null};
        boolean existing=Boolean.TRUE.equals(tx.execute(status->{
            emailLock(normalized);quota(normalized);
            boolean exists=accounts.findByNormalizedEmail(normalized).isPresent();
            if(!exists) code[0]=otp();
            jdbc.sql("""
                INSERT INTO guest_pending_registrations(id,email,email_fingerprint,password_hash,binding_hash,otp_hash,status,created_at,expires_at,otp_expires_at,sent_at)
                VALUES(:id,:email,:fingerprint,:password,:binding,:otp,:state,now(),now()+interval '30 minutes',now()+interval '10 minutes',now())
                """).param("id",id).param("email",normalized).param("fingerprint",hmac("email:"+normalized))
                .param("password",exists?null:encoded).param("binding",hmac("binding:"+binding))
                .param("otp",exists?null:verifier(id,0,code[0])).param("state",exists?"INVALID":"PENDING_SEND").update();
            requested(id,normalized);if(!exists)sent(id,normalized);
            audit("GUEST_REGISTRATION_REQUESTED",null);return exists;
        }));
        if(!existing)deliver(id,normalized,code[0],0);return id;
    }
    public void resend(UUID id,String binding) {
        checkBinding(binding);configured();String[] code={null};
        Pending p=tx.execute(status->{
            String email=emailFor(id);emailLock(email);Pending pending=locked(id,binding);
            if(pending.state().equals("CONSUMED") || !pending.expires().isAfter(Instant.now())) throw new GuestRegistrationException(422);
            if(pending.attempts()>=5) throw new GuestRegistrationException(422);
            if(pending.sent()!=null && pending.sent().isAfter(Instant.now().minusSeconds(60))) throw new GuestRegistrationException(429);
            quota(email);int generation=pending.generation()+1;
            boolean noop=pending.password()==null || accounts.findByNormalizedEmail(email).isPresent();
            if(!noop){
                code[0]=otp();
                while(pending.otpHash()!=null && MessageDigest.isEqual(pending.otpHash().getBytes(StandardCharsets.US_ASCII),verifier(id,pending.generation(),code[0]).getBytes(StandardCharsets.US_ASCII))) code[0]=otp();
            }
            jdbc.sql("""
                UPDATE guest_pending_registrations SET generation=:generation,password_hash=:password,otp_hash=:otp,status=:state,
                    sent_at=now(),otp_expires_at=now()+interval '10 minutes'
                WHERE id=:id
                """).param("generation",generation).param("password",noop?null:pending.password()).param("otp",noop?null:verifier(id,generation,code[0]))
                .param("state",noop?"INVALID":"PENDING_SEND").param("id",id).update();
            requested(id,email);if(!noop)sent(id,email);
            return new Pending(email,noop?null:pending.password(),noop?"INVALID":"PENDING_SEND",pending.attempts(),generation,pending.expires(),null,Instant.now(),null);
        });
        if(p.password()!=null)deliver(id,p.email(),code[0],p.generation());
    }
    public GuestTokenPair verify(UUID id,String otp,String binding) {
        checkBinding(binding);configured();
        if(otp==null || !otp.matches("[0-9]{8}")) throw new GuestRegistrationException(422);
        GuestTokenPair result=tx.execute(status->{
            String email=emailFor(id);emailLock(email);Pending p=locked(id,binding);
            if((!p.state().equals("READY") && !p.state().equals("INVALID")) || p.attempts()>=5) return null;
            if(!p.expires().isAfter(Instant.now()) || !p.otpExpires().isAfter(Instant.now())) {
                invalidate(id,"EXPIRED");return null;
            }
            long failures=jdbc.sql("SELECT coalesce(sum(attempts),0) FROM guest_pending_registrations WHERE email_fingerprint=:email AND created_at>now()-interval '30 minutes'")
                .param("email",hmac("email:"+email)).query(Long.class).single();
            if(failures>=5) {invalidate(id,"LOCKED");return null;}
            if(p.otpHash()==null || !MessageDigest.isEqual(p.otpHash().getBytes(StandardCharsets.US_ASCII),verifier(id,p.generation(),otp).getBytes(StandardCharsets.US_ASCII))) {
                jdbc.sql("UPDATE guest_pending_registrations SET attempts=attempts+1,status=CASE WHEN attempts+1>=5 THEN 'LOCKED' ELSE status END WHERE id=:id")
                    .param("id",id).update();audit("GUEST_REGISTRATION_OTP_DENIED",null);return null;
            }
            if(accounts.findByNormalizedEmail(email).isPresent()) {invalidate(id,"INVALID");return null;}
            Instant now=Instant.now();GuestAccount account=accounts.saveAndFlush(new GuestAccount(UUID.randomUUID(),email,now));
            jdbc.sql("INSERT INTO guest_password_credentials(guest_account_id,password_hash,created_at,updated_at) VALUES(:account,:hash,now(),now())")
                .param("account",account.getId()).param("hash",p.password()).update();
            history.verifyAndLink(account.getId(),id);
            GuestTokenPair pair=auth.createVerifiedSession(account.getId());
            jdbc.sql("UPDATE guest_pending_registrations SET status='CONSUMED',consumed_at=now(),password_hash=NULL,otp_hash=NULL WHERE id=:id")
                .param("id",id).update();audit("GUEST_EMAIL_VERIFIED",account.getId());return pair;
        });
        // Expected OTP failures must commit their counters; unexpected persistence failures roll everything back.
        if(result==null) throw new GuestRegistrationException(422);
        return result;
    }
    private Pending locked(UUID id,String binding) {
        Pending p=jdbc.sql("SELECT * FROM guest_pending_registrations WHERE id=:id FOR UPDATE").param("id",id)
            .query((rs,n)->new Pending(rs.getString("email"),rs.getString("password_hash"),rs.getString("status"),rs.getInt("attempts"),rs.getInt("generation"),
                rs.getTimestamp("expires_at").toInstant(),rs.getTimestamp("otp_expires_at").toInstant(),
                rs.getTimestamp("sent_at")==null?null:rs.getTimestamp("sent_at").toInstant(),rs.getString("otp_hash"))).optional().orElseThrow(()->new GuestRegistrationException(403));
        String stored=jdbc.sql("SELECT binding_hash FROM guest_pending_registrations WHERE id=:id").param("id",id).query(String.class).single();
        if(!MessageDigest.isEqual(stored.getBytes(StandardCharsets.US_ASCII),hmac("binding:"+binding).getBytes(StandardCharsets.US_ASCII))) throw new GuestRegistrationException(403);
        return p;
    }
    private String emailFor(UUID id) {return jdbc.sql("SELECT email FROM guest_pending_registrations WHERE id=:id").param("id",id).query(String.class).optional().orElseThrow(()->new GuestRegistrationException(403));}
    private void emailLock(String email) {jdbc.sql("SELECT pg_advisory_xact_lock(73101,hashtext(:email))").param("email",email).query(rs->{rs.next();return true;});}
    private void quota(String email) {
        long hour=requests(email,"1 hour"),day=requests(email,"1 day");
        if(hour>=3 || day>=10) throw new GuestRegistrationException(429);
    }
    private long requests(String email,String interval) {
        return jdbc.sql("SELECT count(*) FROM guest_registration_request_events WHERE email_fingerprint=:email AND requested_at>now()-CAST(:window AS interval)")
            .param("email",hmac("email:"+email)).param("window",interval).query(Long.class).single();
    }
    private void requested(UUID id,String email) {
        jdbc.sql("INSERT INTO guest_registration_request_events(id,registration_id,email_fingerprint,requested_at) VALUES(:id,:registration,:email,now())")
            .param("id",UUID.randomUUID()).param("registration",id).param("email",hmac("email:"+email)).update();
    }
    private void sent(UUID id,String email) {jdbc.sql("INSERT INTO guest_registration_deliveries(id,registration_id,email_fingerprint,sent_at) VALUES(:id,:registration,:email,now())")
        .param("id",UUID.randomUUID()).param("registration",id).param("email",hmac("email:"+email)).update();}
    private void deliver(UUID id,String email,String otp,int generation) {
        try {executor.execute(()->{
            String state="READY";
            try {sender.sendGuestRegistrationOtp(email,otp);}
            catch(RuntimeException failure){state="UNKNOWN";}
            String completed=state;
            tx.executeWithoutResult(status->{jdbc.sql("UPDATE guest_pending_registrations SET status=:state WHERE id=:id AND generation=:generation AND status='PENDING_SEND'")
                .param("state",completed).param("id",id).param("generation",generation).update();});
        });} catch(RuntimeException rejected) {tx.executeWithoutResult(status->{jdbc.sql("UPDATE guest_pending_registrations SET status='UNKNOWN' WHERE id=:id AND status='PENDING_SEND'").param("id",id).update();});}
    }
    private void invalidate(UUID id,String state) {jdbc.sql("UPDATE guest_pending_registrations SET status=:state,password_hash=CASE WHEN :state='EXPIRED' AND expires_at>now() THEN password_hash ELSE NULL END,otp_hash=NULL WHERE id=:id").param("state",state).param("id",id).update();}
    private void audit(String event,UUID account) {jdbc.sql("INSERT INTO guest_auth_audit_events(id,event_type,guest_account_id,occurred_at,detail) VALUES(:id,:event,:account,now(),'Guest registration verification')")
        .param("id",UUID.randomUUID()).param("event",event).param("account",account).update();}
    private void configured(){if(key.length<32)throw new GuestRegistrationException(503);}
    private void checkBinding(String binding){if(binding==null || !binding.matches("[a-f0-9]{64}"))throw new GuestRegistrationException(403);}
    private String otp(){return String.format("%08d",random.nextInt(100_000_000));}
    private String verifier(UUID id,int generation,String otp){return hmac("otp:"+id+":"+generation+":"+otp);}
    private String hmac(String value){try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key,"HmacSHA256"));return HexFormat.of().formatHex(mac.doFinal(("guest-registration:"+value).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new GuestRegistrationException(503);}}
    private record Pending(String email,String password,String state,int attempts,int generation,Instant expires,Instant otpExpires,Instant sent,String otpHash) {
        @Override public String toString(){return "PendingRegistration[redacted]";}
    }
}
