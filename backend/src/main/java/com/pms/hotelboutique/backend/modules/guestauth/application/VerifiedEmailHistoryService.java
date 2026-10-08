package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

@Service
public class VerifiedEmailHistoryService {
    private final JdbcClient jdbc;
    private final VerifiedEmailHistoryPort history;
    public VerifiedEmailHistoryService(JdbcClient jdbc, VerifiedEmailHistoryPort history) {
        this.jdbc = jdbc; this.history = history;
    }
    @Transactional(propagation = Propagation.MANDATORY)
    public void verifyAndLink(UUID accountId, UUID registrationId) {
        UUID proof = UUID.randomUUID();
        int inserted = jdbc.sql("""
            INSERT INTO guest_email_verifications(id,guest_account_id,normalized_email,source,registration_id,verified_at)
            SELECT :id,id,lower(btrim(email)),:source,:registrationId,email_verified_at
            FROM guest_accounts WHERE id=:accountId AND status='ACTIVE' AND email_verified_at IS NOT NULL
            """).param("id", proof).param("source", registrationId == null ? "GOOGLE" : "REGISTRATION")
            .param("registrationId", registrationId).param("accountId", accountId).update();
        if (inserted != 1) throw new GuestAuthenticationException();
        history.linkCompatibleReservations(accountId, proof);
    }
}
