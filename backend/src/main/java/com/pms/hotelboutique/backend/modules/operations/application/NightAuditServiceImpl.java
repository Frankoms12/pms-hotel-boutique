package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.BusinessDay;
import com.pms.hotelboutique.backend.modules.operations.domain.NightAuditRun;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.BusinessDayRepository;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.NightAuditRunRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class NightAuditServiceImpl implements NightAuditService {

    private final BusinessDayRepository days;
    private final NightAuditRunRepository runs;
    private final List<NightAuditBlocker> blockers;
    private final NightAuditBlockedRunRecorder blockedRuns;
    private final AuditService audit;

    public NightAuditServiceImpl(BusinessDayRepository days, NightAuditRunRepository runs,
            List<NightAuditBlocker> blockers, NightAuditBlockedRunRecorder blockedRuns,
            AuditService audit) {
        this.days = days;
        this.runs = runs;
        this.blockers = blockers;
        this.blockedRuns = blockedRuns;
        this.audit = audit;
    }

    @Override
    public BusinessDayView openDay(@Valid OpenDayCommand command, UUID actorId) {
        if (days.findByPropertyIdAndStatus(command.propertyId(), BusinessDay.Status.OPEN)
                .isPresent()) {
            throw new NightAuditException("property already has an open business day");
        }
        Instant now = Instant.now();
        BusinessDay day = new BusinessDay(UUID.randomUUID(), command.propertyId(),
                command.businessDate(), now);
        // Property existence rides on the foreign key; no parallel lookup.
        BusinessDayView opened;
        try {
            opened = BusinessDayView.from(days.save(day));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new NightAuditException("property already has an open business day", e);
        }
        record(day.getId(), day.getPropertyId(), "BUSINESS_DAY_OPENED", null,
                "{\"date\":\"" + day.getBusinessDate() + "\"}", actorId, null);
        return opened;
    }

    @Override
    @Transactional(readOnly = true)
    public BusinessDayView currentDay(UUID propertyId) {
        return BusinessDayView.from(openDayOf(propertyId));
    }

    @Override
    public CloseDayResult closeDay(UUID propertyId, UUID actorId) {
        BusinessDay open = openDayOf(propertyId);
        Instant now = Instant.now();

        List<String> found = new ArrayList<>();
        for (NightAuditBlocker blocker : blockers) {
            try {
                found.addAll(blocker.blockers(propertyId, open.getBusinessDate()));
            } catch (RuntimeException e) {
                throw new NightAuditException(
                        "blocker '" + blocker.name() + "' failed: " + e.getMessage(), e);
            }
        }
        if (!found.isEmpty()) {
            String reason = String.join(" | ", found);
            blockedRuns.record(propertyId, open.getId(), open.getBusinessDate(), actorId,
                    reason, now);
            throw new NightAuditException("close blocked: " + String.join("; ", found));
        }
        NightAuditRun run =
                runs.save(new NightAuditRun(UUID.randomUUID(), propertyId, open.getId(), actorId, now));
        open.close(actorId, now);
        // Flush the close first: the partial unique index on OPEN days would
        // otherwise see the old and the successor rows as duplicates.
        days.saveAndFlush(open);
        BusinessDay next = days.save(new BusinessDay(UUID.randomUUID(), propertyId,
                open.getBusinessDate().plusDays(1), now));
        run.complete(now);
        record(open.getId(), propertyId, "NIGHT_AUDIT_COMPLETED",
                "{\"date\":\"" + open.getBusinessDate() + "\"}",
                "{\"date\":\"" + next.getBusinessDate() + "\"}", actorId, null);
        return new CloseDayResult(BusinessDayView.from(open), BusinessDayView.from(next),
                RunView.from(run));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BusinessDayView> listDays(AuthorizedPropertyScope scope) {
        return days.findByPropertyIdIn(authorizedIds(scope)).stream()
                .map(BusinessDayView::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RunView> listRuns(AuthorizedPropertyScope scope) {
        return runs.findByPropertyIdIn(authorizedIds(scope)).stream().map(RunView::from).toList();
    }

    private BusinessDay openDayOf(UUID propertyId) {
        if (propertyId == null) {
            throw new NightAuditException("property id is required");
        }
        return days.findByPropertyIdAndStatus(propertyId, BusinessDay.Status.OPEN)
                .orElseThrow(() -> new NightAuditException("no open business day for property"));
    }

    private void record(UUID dayId, UUID propertyId, String action, String before, String after,
            UUID actorId, UUID correlation) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "BUSINESS_DAY",
                dayId, propertyId, before, after, null, correlation));
    }

    private static java.util.Set<UUID> authorizedIds(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new NightAuditException("an explicit property scope is required");
        }
        return scope.propertyIds();
    }
}
