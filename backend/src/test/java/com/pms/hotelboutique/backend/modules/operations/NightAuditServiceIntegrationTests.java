package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.DiscrepancyService;
import com.pms.hotelboutique.backend.modules.operations.application.MaintenanceService;
import com.pms.hotelboutique.backend.modules.operations.application.NightAuditException;
import com.pms.hotelboutique.backend.modules.operations.application.NightAuditService;
import com.pms.hotelboutique.backend.modules.operations.domain.BusinessDay;
import com.pms.hotelboutique.backend.modules.operations.domain.HkDiscrepancy;
import com.pms.hotelboutique.backend.modules.operations.domain.MaintenanceOrder;
import com.pms.hotelboutique.backend.modules.operations.domain.NightAuditRun;
import com.pms.hotelboutique.backend.modules.operations.support.OperationsFixtures;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class NightAuditServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    NightAuditService nightAudit;

    @Autowired
    DiscrepancyService discrepancies;

    @Autowired
    MaintenanceService maintenance;

    @Autowired
    AuditService audit;

    @Autowired
    JdbcTemplate jdbc;

    private UUID room;
    private UUID actor;
    private UUID testProperty;

    private static AuthorizedPropertyScope scope(UUID... properties) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(properties));
    }

    @BeforeEach
    void fixtures() {
        room = OperationsFixtures.room(jdbc, SEED_PROPERTY, "KING-" + UUID.randomUUID());
        actor = OperationsFixtures.staff(jdbc);
    }

    private void openToday() {
        openOn(SEED_PROPERTY, LocalDate.parse("2026-11-01"));
    }

    private void openOn(UUID propertyId, LocalDate date) {
        nightAudit.openDay(new NightAuditService.OpenDayCommand(propertyId, date), actor);
    }

    private LocalDate uniqueBusinessDate() {
        return LocalDate.now().plusDays(10_000L + Math.floorMod(UUID.randomUUID().hashCode(), 1_000_000));
    }

    private void closePersistedTestDay(UUID propertyId, LocalDate date) {
        jdbc.update("UPDATE business_days SET status = 'CLOSED', closed_by = ?, closed_at = now(), "
                        + "updated_at = now() WHERE property_id = ? AND status = 'OPEN' "
                        + "AND business_date IN (?, ?)",
                actor, propertyId, date, date.plusDays(1));
    }

    private void committedFixtures() {
        testProperty = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,"
                        + "created_at,updated_at) VALUES (?,?,'Night Audit Test',?,'America/Guatemala',"
                        + "'GTQ','ACTIVE',now(),now())",
                testProperty, ORGANIZATION, "NA-" + testProperty);
        room = OperationsFixtures.room(jdbc, testProperty, "KING-" + UUID.randomUUID());
        actor = OperationsFixtures.staff(jdbc);
    }

    @Test
    void opensOnceAndClosesCleanly() {
        openToday();
        assertThrows(NightAuditException.class, () -> nightAudit.openDay(
                new NightAuditService.OpenDayCommand(SEED_PROPERTY, LocalDate.parse("2026-11-01")),
                actor));
        assertThrows(ConstraintViolationException.class, () -> nightAudit.openDay(
                new NightAuditService.OpenDayCommand(SEED_PROPERTY, null), actor));

        var result = nightAudit.closeDay(SEED_PROPERTY, actor);
        assertEquals(BusinessDay.Status.CLOSED, result.closed().status());
        assertEquals(LocalDate.parse("2026-11-02"), result.next().businessDate());
        assertEquals(BusinessDay.Status.OPEN, result.next().status());
        assertEquals(NightAuditRun.Status.COMPLETED, result.run().status());

        var events = audit.findByEntity("BUSINESS_DAY", result.closed().id());
        assertEquals(2, events.size());
        assertEquals("NIGHT_AUDIT_COMPLETED", events.get(1).action());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void blocksOnOpenDiscrepancyUntilReconciled() {
        committedFixtures();
        LocalDate businessDate = uniqueBusinessDate();
        openOn(testProperty, businessDate);
        var reported = discrepancies.report(new DiscrepancyService.ReportDiscrepancyCommand(
                testProperty, room, HkDiscrepancy.FoStatus.OCCUPIED,
                HkDiscrepancy.HkStatus.CLEAN, actor));
        UUID businessDayId = nightAudit.currentDay(testProperty).id();

        var blocked = org.junit.jupiter.api.Assertions.assertThrows(NightAuditException.class,
                () -> nightAudit.closeDay(testProperty, actor));
        assertTrue(blocked.getMessage().contains("unreconciled housekeeping discrepancies"));
        // These reads happen after closeDay's failed transaction has ended.
        assertEquals(businessDate, nightAudit.currentDay(testProperty).businessDate());
        var persistedRuns = nightAudit.listRuns(scope(testProperty)).stream()
                .filter(run -> run.businessDayId().equals(businessDayId)).toList();
        assertEquals(1, persistedRuns.size());
        assertEquals(NightAuditRun.Status.BLOCKED, persistedRuns.get(0).status());
        assertTrue(audit.findByEntity("BUSINESS_DAY", businessDayId).stream()
                .anyMatch(event -> event.action().equals("NIGHT_AUDIT_BLOCKED")));

        try {
            discrepancies.investigate(reported.id(), actor);
            discrepancies.reconcile(reported.id(),
                    new DiscrepancyService.ReconcileCommand("Late checkout"), actor);
            var result = nightAudit.closeDay(testProperty, actor);
            assertEquals(NightAuditRun.Status.COMPLETED, result.run().status());
        } finally {
            closePersistedTestDay(testProperty, businessDate);
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void blocksOnlyOnUrgentMaintenance() {
        committedFixtures();
        LocalDate businessDate = uniqueBusinessDate();
        openOn(testProperty, businessDate);
        maintenance.openOrder(new MaintenanceService.OpenOrderCommand(testProperty, "Touch up paint",
                null, MaintenanceOrder.Priority.LOW, room, actor));
        try {
            // Routine carry-over never blocks the close: the next day opens.
            nightAudit.closeDay(testProperty, actor);

            maintenance.openOrder(new MaintenanceService.OpenOrderCommand(testProperty, "Gas leak",
                    null, MaintenanceOrder.Priority.URGENT, room, actor));
            assertThrows(NightAuditException.class, () -> nightAudit.closeDay(testProperty, actor));
        } finally {
            closePersistedTestDay(testProperty, businessDate);
            jdbc.update("UPDATE maintenance_orders SET status = 'CANCELLED' WHERE room_id = ?", room);
        }
    }

    @Test
    void rejectsCloseWithoutOpenDayAndMissingScope() {
        assertThrows(NightAuditException.class, () -> nightAudit.closeDay(SEED_PROPERTY, actor));
        assertThrows(NightAuditException.class, () -> nightAudit.currentDay(null));
        openToday();
        assertThrows(NightAuditException.class, () -> nightAudit.listDays(null));
        assertEquals(1, nightAudit.listDays(scope(SEED_PROPERTY)).stream()
                .filter(day -> day.businessDate().equals(LocalDate.parse("2026-11-01"))).count());
        assertTrue(nightAudit.listDays(scope(UUID.randomUUID())).isEmpty());
    }
}
