package com.pms.hotelboutique.backend.modules.reservations.infrastructure.payment;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityService;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryAdmissionPort;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryDemand;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryExhaustedException;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.reservations.application.PaymentGatewayPort;
import com.pms.hotelboutique.backend.modules.reservations.application.PaymentRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PaymentResult;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** Exercises J2 in the unchanged inventory callback with local persistence fixtures only. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SimulatedPaymentGatewayIntegrationTests {
    private static final String SCHEMA = "public_j2_" + UUID.randomUUID().toString().replace("-", "");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final StayDateRange DATES = new StayDateRange(LocalDate.of(2035, 1, 1), LocalDate.of(2035, 1, 2));
    private static final PaymentRequest REQUEST = new PaymentRequest(65000, "GTQ");

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @Autowired PaymentGatewayPort gateway;
    @Autowired InventoryAdmissionPort admission;
    @Autowired AvailabilityService availability;
    @Autowired ApplicationContext context;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entities;
    @Autowired PlatformTransactionManager transactions;
    private UUID property;
    private UUID type;

    @BeforeEach
    void oneRealRoom() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = UUID.randomUUID();
        type = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?,'J2 integration','America/Guatemala','GTQ','ACTIVE',now(),now())", property, ORGANIZATION, "P-" + property);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','J2 real type')", type, property);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')", UUID.randomUUID(), property, type);
    }

    @AfterAll
    void removeOwnedSchema() { jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }

    @Test
    void springWiresExactlyTheApprovedLocalRuntimeAdapter() {
        assertEquals(1, context.getBeansOfType(PaymentGatewayPort.class).size());
        assertInstanceOf(SimulatedPaymentGatewayAdapter.class, gateway);
        assertEquals(PaymentResult.Status.APPROVED, gateway.pay(REQUEST).status());
    }

    @ParameterizedTest
    @EnumSource(PaymentResult.Status.class)
    void everySimulationLeavesBusinessTablesUntouched(PaymentResult.Status outcome) {
        var before = counts();
        var adapter = new SimulatedPaymentGatewayAdapter(outcome);
        var result = transaction().execute(status -> {
            long transaction = jdbc.queryForObject("SELECT txid_current()", Long.class);
            int connection = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
            var simulated = adapter.pay(REQUEST);
            assertEquals(transaction, jdbc.queryForObject("SELECT txid_current()", Long.class));
            assertEquals(connection, jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
            return simulated;
        });
        assertNotNull(result);
        assertEquals(outcome, result.status());
        assertEquals(before, counts());
        assertEquals(1, ats());
    }

    @Test
    void approvedSimulationCanRunInsideTheUnchangedAdmissionCallback() {
        var result = admission.admit(property, demand(), () -> {
            assertEquals("read committed", jdbc.queryForObject("SHOW transaction_isolation", String.class));
            assertEquals("off", jdbc.queryForObject("SHOW transaction_read_only", String.class));
            var simulated = gateway.pay(REQUEST);
            persistDemand();
            return simulated;
        });
        assertTrue(result.isApproved());
        assertEquals(0, ats());
        assertEquals(1, count("reservations"));
        assertEquals(1, count("reservation_stays"));
        assertEquals(0, count("public_booking_receipts"));
        assertEquals(0, count("folio_movements"));
    }

    @Test
    void rollbackAfterSimulationRestoresAllLocalWritesAndAvailability() {
        var before = counts();
        transaction().executeWithoutResult(status -> {
            var result = admission.admit(property, demand(), () -> {
                var simulated = gateway.pay(REQUEST);
                persistDemand();
                return simulated;
            });
            assertTrue(result.isApproved());
            assertEquals(0, ats());
            status.setRollbackOnly();
        });
        assertEquals(before, counts());
        assertEquals(1, ats());
        assertTrue(gateway.pay(REQUEST).isApproved());
        assertEquals(before, counts());
    }

    @ParameterizedTest
    @EnumSource(value = PaymentResult.Status.class, names = {"DECLINED", "ERROR"})
    void failureFixtureAllowsTheCallerToRollBackTheAdmissionCallback(PaymentResult.Status outcome) {
        var before = counts();
        var adapter = new SimulatedPaymentGatewayAdapter(outcome);
        var error = assertThrows(IllegalStateException.class, () -> admission.admit(property, demand(), () -> {
            persistDemand();
            var result = adapter.pay(REQUEST);
            assertFalse(result.isApproved());
            assertNull(result.reference());
            throw new IllegalStateException("fixture aborts local persistence after " + result.status());
        }));
        assertTrue(error.getMessage().endsWith(outcome.name()));
        assertEquals(before, counts());
        assertEquals(1, ats());
    }

    @Test
    void exhaustedInventoryNeverInvokesThePaymentCallback() {
        var called = new AtomicBoolean();
        var before = counts();
        assertThrows(InventoryExhaustedException.class, () -> admission.admit(property,
                List.of(new InventoryDemand(type, DATES, 2)), () -> {
                    called.set(true);
                    return gateway.pay(REQUEST);
                }));
        assertFalse(called.get());
        assertEquals(before, counts());
        assertEquals(1, ats());
    }

    private void persistDemand() {
        Instant now = Instant.now();
        var reservation = new Reservation(UUID.randomUUID(), property,
                "J2-" + UUID.randomUUID().toString().substring(0, 8), "GTQ", "J2_TEST", now);
        entities.persist(reservation);
        entities.persist(new ReservationStay(UUID.randomUUID(), reservation, property, type,
                DATES.arrival(), DATES.departure(), now));
        entities.flush();
    }

    private List<InventoryDemand> demand() { return List.of(new InventoryDemand(type, DATES, 1)); }
    private int ats() { return availability.calculateATS(property, type, DATES); }
    private int count(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class); }
    private Map<String, Integer> counts() {
        var counts = new LinkedHashMap<String, Integer>();
        for (String table : List.of("reservations", "reservation_stays", "guest_profiles", "reservation_audit_events",
                "public_booking_receipts", "folios", "folio_movements")) { counts.put(table, count(table)); }
        return counts;
    }
    private TransactionTemplate transaction() {
        var transaction = new TransactionTemplate(transactions);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        return transaction;
    }
}
