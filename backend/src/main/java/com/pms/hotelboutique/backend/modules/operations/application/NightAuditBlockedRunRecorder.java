package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.NightAuditRun;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.NightAuditRunRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Commits a rejected close attempt independently from the transaction being rolled back. */
@Service
public class NightAuditBlockedRunRecorder {

    private final NightAuditRunRepository runs;
    private final AuditService audit;

    public NightAuditBlockedRunRecorder(NightAuditRunRepository runs, AuditService audit) {
        this.runs = runs;
        this.audit = audit;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID propertyId, UUID businessDayId, LocalDate businessDate,
            UUID actorId, String reason, Instant now) {
        NightAuditRun run = new NightAuditRun(UUID.randomUUID(), propertyId, businessDayId,
                actorId, now);
        run.block(reason, now);
        runs.save(run);

        ReservationAuditEvent.ActorType actorType = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(actorType, actorId,
                "NIGHT_AUDIT_BLOCKED", "BUSINESS_DAY", businessDayId, propertyId,
                "{\"date\":\"" + businessDate + "\"}", null, null, null));
    }
}
