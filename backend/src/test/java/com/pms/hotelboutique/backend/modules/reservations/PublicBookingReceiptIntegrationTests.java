package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.domain.PublicBookingReceipt;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingReceiptRepository;
import jakarta.persistence.EntityManager;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

/** Committed effects and two real connections in a generated, exclusively test-owned schema. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PublicBookingReceiptIntegrationTests {
    private static final String SCHEMA = "public_j1_" + UUID.randomUUID().toString().replace("-", "");
    private static final String HASH = "1".repeat(64);

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @Autowired PublicBookingReceiptService receipts;
    @Autowired PublicBookingReceiptRepository repository;
    @Autowired PublicBookingValidationService validation;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired EntityManager entities;
    @Autowired PlatformTransactionManager transactions;
    @Autowired ObjectMapper json;
    private UUID property;
    private UUID roomType;

    @BeforeEach
    void fixture() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = property();
        roomType = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','J1 real type')", roomType, property);
    }

    @AfterAll
    void removeOwnedSchema() { jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }

    @Test
    void replayReturnsPersistentOriginalWithoutRepeatingLocalWrites() {
        var request = request();
        var calls = new AtomicInteger();
        var original = receipts.execute(request, () -> { calls.incrementAndGet(); return persistBooking(); });
        var replay = receipts.execute(request, () -> { fail("replay must not run the callback"); return null; });
        assertEquals(original, replay);
        assertEquals(original, repository.find(request.idempotencyKey()).orElseThrow());
        assertEquals(PublicBookingReceipt.Status.COMPLETED, original.status());
        assertEquals(original.createdAt(), original.updatedAt());
        assertEquals(1, calls.get());
        assertEquals(1, receiptCount());
        assertEquals(1, reservationCount());
        assertEquals(1, stayCount());
        assertEquals(original.reservationId().toString(), json.readTree(original.responseSnapshot()).get("reservationId").asText());
    }

    @Test
    void replayUsesTheSnapshotAfterReservationLifecycleChanges() {
        var request = request();
        var original = receipts.execute(request, this::persistBooking);
        jdbc.update("UPDATE reservations SET status='CANCELLED',updated_at=now() WHERE id=?", original.reservationId());
        var replay = receipts.execute(request, () -> { fail("replay must not recreate or reconfirm"); return null; });
        assertEquals(original, replay);
        assertEquals("CONFIRMED", json.readTree(replay.responseSnapshot()).get("status").asText());
        assertEquals("CANCELLED", jdbc.queryForObject("SELECT status FROM reservations WHERE id=?", String.class, original.reservationId()));
    }

    @Test
    void differentPayloadConflictsWithoutCallingPersistence() {
        var request = request();
        var original = receipts.execute(request, this::persistBooking);
        var changed = new PublicBookingReceiptRequest(request.idempotencyKey(), "2".repeat(64));
        var error = assertThrows(PublicBookingIdempotencyConflictException.class,
                () -> receipts.execute(changed, () -> { fail("conflict must not run the callback"); return null; }));
        assertEquals("IDEMPOTENCY_KEY_REUSED", error.getMessage());
        assertEquals(original, repository.find(request.idempotencyKey()).orElseThrow());
        assertEquals(1, reservationCount());
        assertEquals(1, receiptCount());
    }

    @Test
    void globalKeyConflictsWhenPropertyChangesAndJ3ProducesAnotherHash() {
        String key = key();
        var publicRequest = publicRequest(property);
        var first = new PublicBookingReceiptRequest(key, validation.validateAndHash(key, publicRequest));
        receipts.execute(first, this::persistBooking);
        UUID other = property();
        var second = new PublicBookingReceiptRequest(key, validation.validateAndHash(key, publicRequest(other)));
        assertThrows(PublicBookingIdempotencyConflictException.class,
                () -> receipts.execute(second, () -> { fail("global key must not acquire another identity"); return null; }));
        assertEquals(1, receiptCount());
    }

    @Test
    void exactOpaqueKeysAreNeitherTrimmedNorCaseFolded() {
        String key = "Key-" + UUID.randomUUID();
        var plain = new PublicBookingReceiptRequest(key, HASH);
        var spaced = new PublicBookingReceiptRequest(" " + key + " ", HASH);
        var cased = new PublicBookingReceiptRequest(key.toLowerCase(java.util.Locale.ROOT), HASH);
        var first = receipts.execute(plain, this::persistBooking);
        var second = receipts.execute(spaced, this::persistBooking);
        var third = receipts.execute(cased, this::persistBooking);
        assertNotEquals(first.reservationId(), second.reservationId());
        assertNotEquals(first.reservationId(), third.reservationId());
        assertEquals(spaced.idempotencyKey(), second.idempotencyKey());
        assertEquals(3, receiptCount());
    }

    @Test
    void unicodeKeyCanUseTheApproved128CharacterBoundary() {
        var request = new PublicBookingReceiptRequest("\uD83D\uDE00".repeat(128), HASH);
        var original = receipts.execute(request, this::persistBooking);
        assertEquals(original, receipts.execute(request, () -> { fail("unicode replay must be exact"); return null; }));
    }

    @Test
    void failedCallbackRollsBackFlushedRowsAndLeavesKeyFreeForAnotherPayload() {
        var request = request();
        assertThrows(IllegalStateException.class, () -> receipts.execute(request, () -> {
            persistBooking();
            entities.flush();
            throw new IllegalStateException("synthetic local failure");
        }));
        assertEquals(0, reservationCount());
        assertEquals(0, stayCount());
        assertEquals(0, receiptCount());
        assertTrue(repository.find(request.idempotencyKey()).isEmpty());
        var retry = new PublicBookingReceiptRequest(request.idempotencyKey(), "2".repeat(64));
        assertDoesNotThrow(() -> receipts.execute(retry, this::persistBooking));
        assertEquals(1, reservationCount());
    }

    @Test
    void exteriorRollbackRevertsBothResultAndReceipt() {
        var request = request();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            receipts.execute(request, this::persistBooking);
            assertTrue(repository.find(request.idempotencyKey()).isPresent());
            status.setRollbackOnly();
        });
        assertTrue(repository.find(request.idempotencyKey()).isEmpty());
        assertEquals(0, reservationCount());
        assertEquals(0, stayCount());
        assertDoesNotThrow(() -> receipts.execute(request, this::persistBooking));
    }

    @Test
    void invalidSnapshotRevertsCallbackAndRejectsGuestOrCardFields() {
        var request = request();
        assertThrows(IllegalArgumentException.class, () -> receipts.execute(request, () -> {
            var result = persistBooking();
            return new PublicBookingReceiptResult(result.reservationId(), result.confirmationCode(), result.paymentReference(),
                    result.responseSnapshot().replace("\"currency\":", "\"bookingGuest\":{},\"currency\":"));
        }));
        assertEquals(0, reservationCount());
        assertEquals(0, receiptCount());
        assertThrows(IllegalArgumentException.class, () -> receipts.execute(request, () -> {
            var result = persistBooking();
            return new PublicBookingReceiptResult(result.reservationId(), result.confirmationCode(), result.paymentReference(),
                    result.responseSnapshot().replace("\"provider\":", "\"cardDetails\":true,\"provider\":"));
        }));
        assertEquals(0, reservationCount());
    }

    @Test
    void snapshotMustBindTheSameReservationCodeAndPaymentReference() {
        var request = request();
        assertThrows(IllegalArgumentException.class, () -> receipts.execute(request, () -> {
            var result = persistBooking();
            return new PublicBookingReceiptResult(UUID.randomUUID(), result.confirmationCode(), result.paymentReference(), result.responseSnapshot());
        }));
        assertThrows(IllegalArgumentException.class, () -> receipts.execute(request, () -> {
            var result = persistBooking();
            return new PublicBookingReceiptResult(result.reservationId(), "OTHER-CODE", result.paymentReference(), result.responseSnapshot());
        }));
        assertEquals(0, reservationCount());
        assertEquals(0, receiptCount());
    }

    @Test
    void missingPersistedReservationPreventsPartialReceipt() {
        var request = request();
        assertThrows(IllegalArgumentException.class, () -> receipts.execute(request,
                () -> result(UUID.randomUUID(), "J1-NOT-FOUND", UUID.randomUUID(), "SIM-J1-MISSING")));
        assertTrue(repository.find(request.idempotencyKey()).isEmpty());
    }

    @Test
    void receiptCompletionRequiresTheMatchingConfirmedGtqReservation() {
        var request = request();
        for (var mismatch : List.of(new String[]{"status", "PENDING"},
                new String[]{"currency", "USD"}, new String[]{"confirmation_code", "OTHER-CODE"})) {
            assertThrows(IllegalArgumentException.class, () -> receipts.execute(request, () -> {
                var result = persistBooking();
                entities.flush();
                jdbc.update("UPDATE reservations SET " + mismatch[0] + "=? WHERE id=?", mismatch[1], result.reservationId());
                return result;
            }));
            assertTrue(repository.find(request.idempotencyKey()).isEmpty());
            assertEquals(0, reservationCount());
            assertEquals(0, stayCount());
        }
        assertDoesNotThrow(() -> receipts.execute(request, this::persistBooking));
    }

    @Test
    void rejectsReadonlyAndIncompatibleExteriorIsolationBeforeCallback() {
        var readonly = new TransactionTemplate(transactions);
        readonly.setReadOnly(true);
        assertThrows(IllegalStateException.class, () -> readonly.execute(status -> receipts.execute(request(),
                () -> { fail("readonly must not run persistence"); return null; })));
        var repeatable = new TransactionTemplate(transactions);
        repeatable.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        assertThrows(IllegalStateException.class, () -> repeatable.execute(status -> receipts.execute(request(),
                () -> { fail("wrong isolation must not run persistence"); return null; })));
        assertEquals(0, receiptCount());
    }

    @Test
    void commitTimeFailureRevertsFlushedBookingAndReceipt() {
        jdbc.execute("CREATE FUNCTION j1_test_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN "
                + "IF NEW.idempotency_key='j1-fail-commit-key' THEN RAISE EXCEPTION 'synthetic deferred receipt failure'; END IF; RETURN NEW; END; $$");
        jdbc.execute("CREATE CONSTRAINT TRIGGER j1_test_commit_failure AFTER INSERT ON public_booking_receipts "
                + "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION j1_test_fail_commit()");
        var request = new PublicBookingReceiptRequest("j1-fail-commit-key", HASH);
        try {
            assertThrows(RuntimeException.class, () -> receipts.execute(request, this::persistBooking));
            assertTrue(repository.find(request.idempotencyKey()).isEmpty());
            assertEquals(0, reservationCount());
            assertEquals(0, stayCount());
        } finally {
            jdbc.execute("DROP TRIGGER j1_test_commit_failure ON public_booking_receipts");
            jdbc.execute("DROP FUNCTION j1_test_fail_commit()");
        }
        assertDoesNotThrow(() -> receipts.execute(request, this::persistBooking));
    }

    @Test
    void simultaneousIdenticalRequestsWaitUntilExteriorCommitAndReplay() throws Exception { concurrent(false, false); }

    @Test
    void simultaneousDifferentPayloadWaitsAndThenConflicts() throws Exception { concurrent(false, true); }

    @Test
    void waitingRequestRunsAfterExteriorRollback() throws Exception { concurrent(true, false); }

    @Test
    void rollbackLeavesKeyFreeEvenForTheWaitingDifferentPayload() throws Exception { concurrent(true, true); }

    private void concurrent(boolean rollbackFirst, boolean changeHash) throws Exception {
        var request = request();
        var inserted = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var pid = new AtomicInteger();
        var calls = new AtomicInteger();
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                var receipt = receipts.execute(request, () -> { calls.incrementAndGet(); return persistBooking(); });
                inserted.countDown();
                await(release);
                if (rollbackFirst) { status.setRollbackOnly(); }
                return receipt;
            }));
            try {
                assertTrue(inserted.await(20, TimeUnit.SECONDS));
                assertEquals(0, receiptCount());
                var second = workers.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                    pid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    var secondRequest = new PublicBookingReceiptRequest(request.idempotencyKey(), changeHash ? "2".repeat(64) : HASH);
                    return receipts.execute(secondRequest, () -> { calls.incrementAndGet(); return persistBooking(); });
                }));
                assertTrue(waitForAdvisoryLock(pid));
                assertFalse(second.isDone());
                release.countDown();
                var original = first.get(20, TimeUnit.SECONDS);
                if (changeHash && !rollbackFirst) {
                    var failure = assertThrows(ExecutionException.class, () -> second.get(20, TimeUnit.SECONDS));
                    assertInstanceOf(PublicBookingIdempotencyConflictException.class, failure.getCause());
                } else {
                    var replay = second.get(20, TimeUnit.SECONDS);
                    if (rollbackFirst) { assertNotEquals(original.reservationId(), replay.reservationId()); }
                    else { assertEquals(original, replay); }
                }
                assertEquals(rollbackFirst ? 2 : 1, calls.get());
                assertEquals(1, receiptCount());
                assertEquals(1, reservationCount());
                assertEquals(1, stayCount());
            } finally { release.countDown(); }
        }
    }

    @Test
    void databaseEnforcesUniqueKeyHashSnapshotAndAppendOnly() throws Exception {
        var request = request();
        var original = receipts.execute(request, this::persistBooking);
        String insert = "INSERT INTO public_booking_receipts(idempotency_key,request_hash,status,reservation_id,confirmation_code,"
                + "payment_reference,response_snapshot,created_at,updated_at) SELECT ?,request_hash,status,reservation_id,confirmation_code,"
                + "payment_reference,response_snapshot,created_at,updated_at FROM public_booking_receipts WHERE idempotency_key=?";
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                rejected(connection, "UPDATE public_booking_receipts SET updated_at=now() WHERE idempotency_key=?", "P0001", request.idempotencyKey());
                rejected(connection, "DELETE FROM public_booking_receipts WHERE idempotency_key=?", "P0001", request.idempotencyKey());
                rejected(connection, insert, "23505", request.idempotencyKey(), request.idempotencyKey());
                rejected(connection, insert.replace("SELECT ?,request_hash,status", "SELECT ?,'bad-hash',status"), "23514", key(), request.idempotencyKey());
                rejected(connection, insert.replace("SELECT ?,request_hash,status", "SELECT ?,request_hash,'FAILED'"), "23514", key(), request.idempotencyKey());
                rejected(connection, insert.replace("payment_reference,response_snapshot,created_at,updated_at FROM", "payment_reference,response_snapshot || '{\"bookingGuest\":{}}'::jsonb,created_at,updated_at FROM"), "23514", key(), request.idempotencyKey());
                String missingParent = insert.replace("SELECT ?,request_hash,status,reservation_id,confirmation_code,payment_reference,response_snapshot,created_at,updated_at FROM",
                        "SELECT ?,request_hash,status,'00000000-0000-0000-0000-000000009999'::uuid,confirmation_code,payment_reference,"
                        + "jsonb_set(response_snapshot,'{reservationId}',to_jsonb('00000000-0000-0000-0000-000000009999'::text)),created_at,updated_at FROM");
                rejected(connection, missingParent, "23503", key(), request.idempotencyKey());
            } finally { connection.rollback(); }
        }
        assertEquals(original, repository.find(request.idempotencyKey()).orElseThrow());
        assertEquals(1, receiptCount());
    }

    private PublicBookingReceiptResult persistBooking() {
        UUID reservationId = UUID.randomUUID();
        UUID stayId = UUID.randomUUID();
        String code = "J1" + reservationId.toString().replace("-", "").substring(0, 12);
        Instant now = Instant.now();
        var reservation = new Reservation(reservationId, property, code, "GTQ", "J1_TEST", now);
        reservation.confirm(now);
        entities.persist(reservation);
        entities.persist(new ReservationStay(stayId, reservation, property, roomType,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 3), now));
        return result(reservationId, code, stayId, "SIM-J1-" + reservationId);
    }

    private PublicBookingReceiptResult result(UUID reservationId, String code, UUID stayId, String reference) {
        String snapshot = """
                {"reservationId":"%s","confirmationCode":"%s","status":"CONFIRMED","currency":"GTQ","totalMinor":130000,
                 "payment":{"provider":"SIMULATED","status":"APPROVED","reference":"%s"},
                 "stays":[{"reservationStayId":"%s","roomTypeId":"%s","roomId":null,"arrival":"2026-11-01","departure":"2026-11-03"}]}
                """.formatted(reservationId, code, reference, stayId, roomType);
        return new PublicBookingReceiptResult(reservationId, code, reference, snapshot);
    }

    private PublicBookingRequest publicRequest(UUID propertyId) {
        return new PublicBookingRequest(propertyId, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 3), "GTQ", 130000L,
                List.of(new PublicBookingRequest.Stay(roomType, "DEMO_STANDARD", 1)),
                new PublicBookingRequest.BookingGuest("Ana", "Lopez", "ana@example.test"), PublicBookingRequest.PaymentMode.SIMULATED_CARD);
    }

    private UUID property() {
        UUID id = UUID.randomUUID();
        UUID organization = jdbc.queryForObject("SELECT id FROM organizations WHERE code='HOTEL_BOUTIQUE'", UUID.class);
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?,'J1 test','America/Guatemala','GTQ','ACTIVE',now(),now())", id, organization, "J1-" + id);
        return id;
    }

    private PublicBookingReceiptRequest request() { return new PublicBookingReceiptRequest(key(), HASH); }
    private String key() { return "j1-" + UUID.randomUUID(); }
    private int receiptCount() { return jdbc.queryForObject("SELECT count(*) FROM public_booking_receipts r JOIN reservations b ON b.id=r.reservation_id WHERE b.property_id=?", Integer.class, property); }
    private int reservationCount() { return jdbc.queryForObject("SELECT count(*) FROM reservations WHERE property_id=?", Integer.class, property); }
    private int stayCount() { return jdbc.queryForObject("SELECT count(*) FROM reservation_stays WHERE property_id=?", Integer.class, property); }

    private boolean waitForAdvisoryLock(AtomicInteger pid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            if (pid.get() != 0 && jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE pid=? AND wait_event_type='Lock' AND wait_event='advisory'", Integer.class, pid.get()) == 1) {
                return true;
            }
            Thread.sleep(20);
        }
        return false;
    }

    private void rejected(Connection connection, String sql, String expectedState, Object... values) throws Exception {
        var savepoint = connection.setSavepoint();
        try (var statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < values.length; i++) { statement.setObject(i + 1, values[i]); }
            assertEquals(expectedState, assertThrows(SQLException.class, statement::executeUpdate).getSQLState());
        } finally { connection.rollback(savepoint); }
    }

    private static void await(CountDownLatch latch) {
        try { if (!latch.await(20, TimeUnit.SECONDS)) { throw new IllegalStateException("test synchronization timeout"); } }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw new IllegalStateException(exception); }
    }
}
