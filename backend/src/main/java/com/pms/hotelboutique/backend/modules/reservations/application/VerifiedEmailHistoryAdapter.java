package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.VerifiedEmailHistoryPort;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

@Service
public class VerifiedEmailHistoryAdapter implements VerifiedEmailHistoryPort {
    private final JdbcClient jdbc;
    private final AuditService audit;
    public VerifiedEmailHistoryAdapter(JdbcClient jdbc, AuditService audit) { this.jdbc=jdbc; this.audit=audit; }
    @Override @Transactional(propagation = Propagation.MANDATORY)
    public void linkCompatibleReservations(UUID accountId, UUID verificationId) {
        // Lock in stable order; contact edits and manual OTP inserts cannot transfer ownership.
        var candidates = jdbc.sql("""
            SELECT r.id,r.property_id,g.guest_account_id AS profile_owner
            FROM guest_email_verifications v JOIN guest_accounts a ON a.id=v.guest_account_id
            JOIN guest_profiles g ON lower(btrim(g.email))=v.normalized_email
            JOIN reservations r ON r.booking_guest_id=g.id
            WHERE v.id=:proof AND a.id=:account AND a.status='ACTIVE' AND a.email_verified_at IS NOT NULL
              AND lower(btrim(a.email))=v.normalized_email
            ORDER BY r.id FOR UPDATE OF r,g
            """).param("proof", verificationId).param("account", accountId)
            .query((rs,n)->new Candidate(rs.getObject("id",UUID.class),rs.getObject("property_id",UUID.class),rs.getObject("profile_owner",UUID.class))).list();
        for (var c : candidates) {
            if (c.owner()!=null && !accountId.equals(c.owner())) { conflict(accountId,c,verificationId); continue; }
            int inserted=jdbc.sql("""
                INSERT INTO guest_reservation_links(reservation_id,guest_account_id,property_id,challenge_id,linked_at,link_source,email_verification_id)
                VALUES(:reservation,:account,:property,NULL,now(),'VERIFIED_EMAIL',:proof)
                ON CONFLICT(reservation_id) DO NOTHING
                """).param("reservation",c.id()).param("account",accountId).param("property",c.property()).param("proof",verificationId).update();
            UUID owner=jdbc.sql("SELECT guest_account_id FROM guest_reservation_links WHERE reservation_id=:id")
                .param("id",c.id()).query(UUID.class).single();
            if(!accountId.equals(owner)) conflict(accountId,c,verificationId);
            else if(inserted==1) audit.record(new AuditService.RecordAuditCommand(ActorType.GUEST,accountId,
                "GUEST_RESERVATION_LINKED","RESERVATION",c.id(),c.property(),null,null,null,verificationId));
        }
    }
    private void conflict(UUID account,Candidate c,UUID proof) {
        // Internal correlation only: never return another account or candidate data to HTTP.
        audit.record(new AuditService.RecordAuditCommand(ActorType.GUEST,account,"GUEST_HISTORY_LINK_SKIPPED",
            "RESERVATION",c.id(),c.property(),null,null,null,proof));
    }
    private record Candidate(UUID id,UUID property,UUID owner) { }
}
