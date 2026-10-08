package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityService;
import com.pms.hotelboutique.backend.modules.inventory.application.PublicAvailabilityQuery;
import com.pms.hotelboutique.backend.modules.inventory.application.PublicAvailabilityService;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingReceiptRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real J3/J1/J2/J5/pricing/admission/persistence, with spies only for controlled failures. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PublicBookingServiceIntegrationTests {
    private static final String SCHEMA = "public_j4_" + UUID.randomUUID().toString().replace("-", "");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate ARRIVAL = LocalDate.of(2035, 1, 1), DEPARTURE = ARRIVAL.plusDays(2);

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @Autowired PublicBookingService service;
    @Autowired PublicBookingReceiptRepository receipts;
    @Autowired PublicAvailabilityService availability;
    @Autowired AvailabilityService stock;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entities;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean PaymentGatewayPort payments;
    @MockitoSpyBean ReservationService reservations;
    @MockitoSpyBean ObjectMapper json;
    private UUID property, standard, deluxe, suite;

    @BeforeEach
    void realCatalog() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = property("ACTIVE", "GTQ");
        standard = type(property, "STD");
        deluxe = type(property, "DLX");
        suite = type(property, "SUITE");
        clearInvocations(payments, reservations, json);
    }

    @AfterAll
    void removeOwnedSchema() { jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }

    @Test
    void happyPathPersistsOneConfirmedReservationAndTheApprovedSnapshot() {
        String key = key();
        var result = service.book(key, request(1));
        assertPersisted(result, 1);
        assertEquals(130000L, result.totalMinor());
        assertEquals(1, ats(standard));
        verify(payments, times(1)).pay(new PaymentRequest(130000L, "GTQ"));
        var receipt = receipts.find(key).orElseThrow();
        assertEquals(result, json.readValue(receipt.responseSnapshot(), PublicBookingView.class));
        assertEquals(result.payment().reference(), receipt.paymentReference());
        var root = json.readTree(receipt.responseSnapshot());
        assertEquals(Set.of("reservationId", "confirmationCode", "status", "currency", "totalMinor", "payment", "stays"), fields(root));
        assertEquals(Set.of("provider", "status", "reference"), fields(root.get("payment")));
        assertEquals(Set.of("reservationStayId", "roomTypeId", "roomId", "arrival", "departure"), fields(root.get("stays").get(0)));
        assertTrue(root.get("stays").get(0).get("roomId").isNull());
        assertEquals(ARRIVAL.toString(), root.get("stays").get(0).get("arrival").asText());
        assertThrows(UnsupportedOperationException.class, () -> result.stays().clear());
    }

    @Test
    void availabilityAndBookingUseExactlyTheSameTotalForEveryCategoryAndQuantity() {
        var offers = availability.search(new PublicAvailabilityQuery(property, ARRIVAL, DEPARTURE, 2)).offers();
        long total = offers.stream().mapToLong(offer -> offer.totalMinor() * 2).sum();
        var stays = offers.stream().map(offer -> new PublicBookingRequest.Stay(offer.roomTypeId(), offer.ratePlanId(), 2)).toList();
        var result = service.book(key(), request(stays, total, "Ana"));
        assertEquals(1080000L, total);
        assertEquals(total, result.totalMinor());
        assertPersisted(result, 6);
        verify(payments, times(1)).pay(new PaymentRequest(total, "GTQ"));
        assertTrue(availability.search(new PublicAvailabilityQuery(property, ARRIVAL, DEPARTURE, 1)).offers().isEmpty());
    }

    @Test
    void duplicateStayEntriesAreSummedForPriceAndPersistedExactlyOnceEach() {
        var result = service.book(key(), request(List.of(stay(standard, "DEMO_STANDARD", 1), stay(standard, "DEMO_STANDARD", 1)), 260000L, "Ana"));
        assertPersisted(result, 2);
        verify(payments, times(1)).pay(new PaymentRequest(260000L, "GTQ"));
        assertEquals(0, ats(standard));
    }

    @ParameterizedTest
    @ValueSource(longs = {0, -1, 129999, 130001})
    void changedOrManipulatedPriceNeverReachesPaymentOrLeavesWrites(long total) {
        var before = counts();
        failure(key(), request(List.of(stay(standard, "DEMO_STANDARD", 1)), total, "Ana"), PublicBookingException.Code.PRICE_CHANGED);
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @Test
    void sameKeyReplayAlsoHandlesReorderedStaysWithoutRepeatingPaymentOrWrites() {
        String key = key();
        var input = request(List.of(stay(standard, "DEMO_STANDARD", 1), stay(deluxe, "DEMO_DELUXE", 1)), 300000L, "Ana");
        var original = service.book(key, input);
        var before = counts();
        var reordered = request(input.stays().reversed(), input.clientTotalMinor(), "Ana");
        assertEquals(original, service.book(key, reordered));
        assertEquals(before, counts());
        verify(payments, times(1)).pay(any());
    }

    @Test
    void replayReturnsOriginalAfterCancellationInactivePropertyAndChangedCatalog() {
        String key = key();
        var input = request(1);
        var original = service.book(key, input);
        reservations.cancel(original.reservationId());
        jdbc.update("UPDATE properties SET status='INACTIVE',currency='USD' WHERE id=?", property);
        jdbc.update("UPDATE room_types SET code='UNCONFIGURED' WHERE id=?", standard);
        var before = counts();
        assertEquals(original, service.book(key, input));
        assertEquals(before, counts());
        assertEquals("CANCELLED", jdbc.queryForObject("SELECT status FROM reservations WHERE id=?", String.class, original.reservationId()));
        verify(payments, times(1)).pay(any());
    }

    @Test
    void reusedKeyWithChangedPayloadConflictsBeforeAnyNewEffect() {
        String key = key();
        service.book(key, request(1));
        var before = counts();
        assertThrows(PublicBookingIdempotencyConflictException.class,
                () -> service.book(key, request(request(1).stays(), 130000L, "Otra")));
        assertEquals(before, counts());
        verify(payments, times(1)).pay(any());
    }

    @Test
    void declinedAndTechnicalErrorLeaveKeyFreeWithoutPartialBooking() {
        for (var outcome : List.of(PaymentResult.Status.DECLINED, PaymentResult.Status.ERROR)) {
            String key = key();
            var before = counts();
            doReturn(new PaymentResult(outcome, null)).when(payments).pay(any());
            failure(key, request(1), outcome == PaymentResult.Status.DECLINED
                    ? PublicBookingException.Code.PAYMENT_DECLINED : PublicBookingException.Code.BOOKING_FAILED);
            assertEquals(before, counts());
            assertTrue(receipts.find(key).isEmpty());
        }
        doCallRealMethod().when(payments).pay(any());
        assertPersisted(service.book(key(), request(1)), 1);
    }

    @Test
    void insufficientCombinedDemandAndHugeQuantityAreRejectedBeforePayment() {
        var before = counts();
        failure(key(), request(List.of(stay(standard, "DEMO_STANDARD", 2), stay(standard, "DEMO_STANDARD", 1)), 390000L, "Ana"), PublicBookingException.Code.NO_AVAILABILITY);
        failure(key(), request(Integer.MAX_VALUE), PublicBookingException.Code.NO_AVAILABILITY);
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @Test
    void consumedInventoryDoesNotAllowAnotherBookingOrPayment() {
        service.book(key(), request(2));
        var before = counts();
        failure(key(), request(1), PublicBookingException.Code.NO_AVAILABILITY);
        assertEquals(before, counts());
        verify(payments, times(1)).pay(any());
    }

    @Test
    void inactiveAndMissingPropertyFailWithoutReceiptOrPayment() {
        var before = counts();
        jdbc.update("UPDATE properties SET status='INACTIVE' WHERE id=?", property);
        var inactive = assertThrows(PublicBookingValidationException.class, () -> service.book(key(), request(1)));
        var old = property;
        property = UUID.randomUUID();
        try {
            var missing = assertThrows(PublicBookingValidationException.class, () -> service.book(key(), request(1)));
            assertEquals(inactive.code(), missing.code());
            assertEquals(PublicBookingValidationException.Code.PROPERTY_NOT_FOUND, inactive.code());
        } finally { property = old; }
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @Test
    void invalidKeyPayloadRoomTypeAndPlanNeverReachPayment() {
        var before = counts();
        assertThrows(PublicBookingValidationException.class, () -> service.book(null, request(1)));
        assertThrows(PublicBookingValidationException.class, () -> service.book(key(), request(0)));
        UUID foreign = type(property("ACTIVE", "GTQ"), "STD");
        for (var type : List.of(foreign, UUID.randomUUID())) {
            var error = assertThrows(PublicBookingValidationException.class,
                    () -> service.book(key(), request(List.of(stay(type, "DEMO_STANDARD", 1)), 130000L, "Ana")));
            assertEquals(PublicBookingValidationException.Code.INVALID_REQUEST, error.code());
        }
        assertThrows(PublicBookingValidationException.class,
                () -> service.book(key(), request(List.of(stay(standard, "DEMO_SUITE", 1)), 130000L, "Ana")));
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @Test
    void wrongCurrencyOrMissingDemoConfigurationIsTechnicalFailureWithoutPayment() {
        var before = counts();
        jdbc.update("UPDATE properties SET currency='USD' WHERE id=?", property);
        failure(key(), request(1), PublicBookingException.Code.BOOKING_FAILED);
        jdbc.update("UPDATE properties SET currency='GTQ' WHERE id=?", property);
        jdbc.update("UPDATE room_types SET code='UNCONFIGURED' WHERE id=?", standard);
        failure(key(), request(1), PublicBookingException.Code.BOOKING_FAILED);
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @Test
    void lateConfirmationFailureRollsBackEvenFlushedConfirmedRows() {
        var before = counts();
        doAnswer(call -> { call.callRealMethod(); entities.flush(); throw new IllegalStateException("synthetic late failure"); })
                .when(reservations).confirm(any());
        failure(key(), request(1), PublicBookingException.Code.BOOKING_FAILED);
        assertEquals(before, counts());
        assertEquals(2, ats(standard));
    }

    @Test
    void serializationFailureRollsBackAllLocalWritesBeforeReceiptCompletion() {
        var before = counts();
        doAnswer(call -> { entities.flush(); throw new IllegalStateException("synthetic serialization failure"); })
                .when(json).writeValueAsString(any(PublicBookingView.class));
        failure(key(), request(1), PublicBookingException.Code.BOOKING_FAILED);
        assertEquals(before, counts());
        assertEquals(2, ats(standard));
    }

    @Test
    void commitFailureIsTranslatedAndRollbackAllowsAnotherPayloadOnTheSameKey() {
        String key = key();
        var before = counts();
        jdbc.execute("CREATE FUNCTION j4_test_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN "
                + "IF NEW.idempotency_key='" + key + "' THEN RAISE EXCEPTION 'synthetic deferred failure'; END IF; RETURN NEW; END; $$");
        jdbc.execute("CREATE CONSTRAINT TRIGGER j4_test_commit_failure AFTER INSERT ON public_booking_receipts "
                + "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION j4_test_fail_commit()");
        try {
            failure(key, request(1), PublicBookingException.Code.BOOKING_FAILED);
            assertEquals(before, counts());
            assertTrue(receipts.find(key).isEmpty());
        } finally {
            jdbc.execute("DROP TRIGGER j4_test_commit_failure ON public_booking_receipts");
            jdbc.execute("DROP FUNCTION j4_test_fail_commit()");
        }
        var result = service.book(key, request(request(1).stays(), 130000L, "Otra"));
        assertPersisted(result, 1);
        verify(payments, times(2)).pay(any());
    }

    @Test
    void exteriorRollbackRevertsReceiptAndBookingAndRestoresInventory() {
        var before = counts();
        String key = key();
        transaction().executeWithoutResult(status -> {
            assertPersisted(service.book(key, request(2)), 2);
            status.setRollbackOnly();
        });
        assertEquals(before, counts());
        assertTrue(receipts.find(key).isEmpty());
        assertEquals(2, ats(standard));
    }

    @Test
    void simulatedPaymentRunsInsideTheWritableAdmissionTransactionWithoutChangingIt() {
        doAnswer(call -> {
            assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
            assertFalse(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            assertEquals("read committed", jdbc.queryForObject("SHOW transaction_isolation", String.class));
            long transaction = jdbc.queryForObject("SELECT txid_current()", Long.class);
            int connection = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
            var result = call.callRealMethod();
            assertEquals(transaction, jdbc.queryForObject("SELECT txid_current()", Long.class));
            assertEquals(connection, jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
            return result;
        }).when(payments).pay(any());
        assertPersisted(service.book(key(), request(1)), 1);
    }

    @Test
    void concurrentIdenticalKeyWaitsThenReplaysWithoutAnotherPayment() throws Exception { concurrent(false, false, false); }
    @Test
    void concurrentChangedPayloadWaitsThenConflictsWithoutAnotherPayment() throws Exception { concurrent(false, true, false); }
    @Test
    void concurrentRetryAfterRollbackCreatesOnlyTheSecondCommittedBooking() throws Exception { concurrent(true, false, false); }
    @Test
    void concurrentChangedPayloadCanUseTheKeyAfterRollback() throws Exception { concurrent(true, true, false); }
    @Test
    void differentKeysCompeteForLastCapacityAndOnlyOnePays() throws Exception { concurrent(false, false, true); }

    private void concurrent(boolean rollback, boolean changed, boolean differentKeys) throws Exception {
        String firstKey = key(), secondKey = differentKeys ? key() : firstKey;
        var firstInput = request(differentKeys ? 2 : 1);
        var secondInput = changed ? request(firstInput.stays(), firstInput.clientTotalMinor(), "Otra") : firstInput;
        var prepared = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var pid = new AtomicInteger();
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> transaction().execute(status -> {
                var result = service.book(firstKey, firstInput);
                prepared.countDown();
                await(release);
                if (rollback) { status.setRollbackOnly(); }
                return result;
            }));
            try {
                assertTrue(prepared.await(20, TimeUnit.SECONDS));
                assertEquals(0, propertyCount("reservations"));
                var second = workers.submit(() -> transaction().execute(status -> {
                    pid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    return service.book(secondKey, secondInput);
                }));
                assertTrue(waitForLock(pid, differentKeys));
                assertFalse(second.isDone());
                release.countDown();
                var original = first.get(20, TimeUnit.SECONDS);
                if (differentKeys || (changed && !rollback)) {
                    var error = assertThrows(ExecutionException.class, () -> second.get(20, TimeUnit.SECONDS));
                    if (differentKeys) {
                        assertEquals(PublicBookingException.Code.NO_AVAILABILITY,
                                assertInstanceOf(PublicBookingException.class, error.getCause()).code());
                    } else { assertInstanceOf(PublicBookingIdempotencyConflictException.class, error.getCause()); }
                } else {
                    var replay = second.get(20, TimeUnit.SECONDS);
                    if (rollback) { assertNotEquals(original.reservationId(), replay.reservationId()); }
                    else { assertEquals(original, replay); }
                }
            } finally { release.countDown(); }
        }
        assertEquals(1, propertyCount("reservations"));
        assertEquals(differentKeys ? 2 : 1, propertyCount("reservation_stays"));
        assertEquals(1, propertyCount("guest_profiles"));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM public_booking_receipts r JOIN reservations b ON b.id=r.reservation_id WHERE b.property_id=?", Integer.class, property));
        verify(payments, times(rollback ? 2 : 1)).pay(any());
    }

    private boolean waitForLock(AtomicInteger pid, boolean stockLock) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            if (pid.get() != 0 && Boolean.TRUE.equals(jdbc.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid=? AND wait_event_type='Lock' AND (? OR wait_event='advisory'))",
                    Boolean.class, pid.get(), stockLock))) { return true; }
            Thread.sleep(20);
        }
        return false;
    }
    private static void await(CountDownLatch latch) {
        try { if (!latch.await(20, TimeUnit.SECONDS)) { throw new IllegalStateException("test synchronization timeout"); } }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new IllegalStateException(error); }
    }
    private void failure(String key, PublicBookingRequest request, PublicBookingException.Code expected) {
        var error = assertThrows(PublicBookingException.class, () -> service.book(key, request));
        assertEquals(expected, error.code());
        assertEquals(expected.name(), error.getMessage());
    }
    private void assertPersisted(PublicBookingView view, int quantity) {
        assertEquals("CONFIRMED", view.status());
        assertEquals("GTQ", view.currency());
        assertEquals("SIMULATED", view.payment().provider());
        assertEquals("APPROVED", view.payment().status());
        assertTrue(view.payment().reference().matches("SIM-[0-9a-f-]{36}"));
        assertEquals(1, propertyCount("reservations"));
        assertEquals(quantity, propertyCount("reservation_stays"));
        assertEquals(1, propertyCount("guest_profiles"));
        assertEquals(quantity, view.stays().size());
        assertEquals(quantity, view.stays().stream().map(PublicBookingView.StayView::reservationStayId).distinct().count());
        assertEquals("CONFIRMED", jdbc.queryForObject("SELECT status FROM reservations WHERE id=?", String.class, view.reservationId()));
        assertEquals(quantity, jdbc.queryForObject("SELECT count(*) FROM reservation_stays WHERE reservation_id=? AND room_id IS NULL", Integer.class, view.reservationId()));
        assertEquals(0, scopedCount("SELECT count(*) FROM reservation_guests g JOIN reservation_stays s ON s.id=g.reservation_stay_id WHERE s.property_id=?"));
        assertEquals(0, scopedCount("SELECT count(*) FROM guest_profiles WHERE property_id=? AND guest_account_id IS NOT NULL"));
        assertEquals("WEB_DIRECTA", jdbc.queryForObject("SELECT source_channel FROM reservations WHERE id=?", String.class, view.reservationId()));
        assertEquals(view.confirmationCode(), jdbc.queryForObject("SELECT confirmation_code FROM reservations WHERE id=?", String.class, view.reservationId()));
        view.stays().forEach(stay -> { assertNull(stay.roomId()); assertEquals(ARRIVAL, stay.arrival()); assertEquals(DEPARTURE, stay.departure()); });
    }
    private Set<String> fields(JsonNode node) {
        var names = new HashSet<String>();
        node.properties().forEach(field -> names.add(field.getKey()));
        return names;
    }
    private UUID property(String status, String currency) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'J4 test','America/Guatemala',?,?,now(),now())", id, ORGANIZATION, "J4-" + id, currency, status);
        return id;
    }
    private UUID type(UUID owner, String code) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,?)", id, owner, code, "J4 " + code);
        for (int room = 1; room <= 2; room++) {
            jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)", UUID.randomUUID(), owner, id, code + "-" + room);
        }
        return id;
    }
    private int ats(UUID type) { return stock.calculateATS(property, type, new StayDateRange(ARRIVAL, DEPARTURE)); }
    private int propertyCount(String table) { return scopedCount("SELECT count(*) FROM " + table + " WHERE property_id=?"); }
    private int scopedCount(String query) { return jdbc.queryForObject(query, Integer.class, property); }
    private Map<String, Integer> counts() {
        var counts = new LinkedHashMap<String, Integer>();
        for (String table : List.of("guest_profiles", "guest_accounts", "reservations", "reservation_stays", "reservation_guests", "reservation_audit_events", "public_booking_receipts", "folios", "folio_movements")) {
            counts.put(table, jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class));
        }
        return counts;
    }
    private TransactionTemplate transaction() {
        var tx = new TransactionTemplate(transactions);
        tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        return tx;
    }
    private String key() { return "j4-" + UUID.randomUUID(); }
    private PublicBookingRequest.Stay stay(UUID type, String plan, int units) { return new PublicBookingRequest.Stay(type, plan, units); }
    private PublicBookingRequest request(int units) { return request(List.of(stay(standard, "DEMO_STANDARD", units)), 130000L * units, "Ana"); }
    private PublicBookingRequest request(List<PublicBookingRequest.Stay> stays, long total, String firstName) {
        return new PublicBookingRequest(property, ARRIVAL, DEPARTURE, "GTQ", total, stays,
                new PublicBookingRequest.BookingGuest(firstName, "Lopez", "ana@example.test"), PublicBookingRequest.PaymentMode.SIMULATED_CARD);
    }
}
