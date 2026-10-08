package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingReceiptRepository;
import jakarta.persistence.EntityManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** J6 MVC and real HTTP/PostgreSQL services with the production A4 security filters enabled. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PublicBookingHttpIntegrationTests {
    private static final String PATH = "/api/v1/public/bookings";
    private static final String SCHEMA = "public_j6_" + UUID.randomUUID().toString().replace("-", "");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate ARRIVAL = LocalDate.of(2035, 1, 1), DEPARTURE = ARRIVAL.plusDays(2);

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @Autowired MockMvc mvc;
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entities;
    @Autowired PublicBookingReceiptRepository receipts;
    @MockitoSpyBean PaymentGatewayPort payments;
    @MockitoSpyBean ReservationService reservations;
    private UUID property, standard;

    @BeforeEach
    void fixtures() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = UUID.randomUUID();
        standard = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?,'J6 test','America/Guatemala','GTQ','ACTIVE',now(),now())", property, ORGANIZATION, "J6-" + property);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','J6 real STD')", standard, property);
        for (int i = 0; i < 2; i++) {
            jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)", UUID.randomUUID(), property, standard, "J6-" + i);
        }
        clearInvocations(payments, reservations);
    }

    @AfterAll
    void removeOwnedSchema() { jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }

    @Test
    void createdResponseContainsOnlyTheActualPersistedBookingAndAllStays() throws Exception {
        String key = key();
        var response = send(key, request(2), 201);
        var body = body(response);
        assertEquals(Set.of("reservationId", "confirmationCode", "status", "currency", "totalMinor", "payment", "stays"), fields(body));
        assertEquals("CONFIRMED", body.path("status").asText());
        assertEquals("GTQ", body.path("currency").asText());
        assertEquals(260000L, body.path("totalMinor").asLong());
        assertEquals(Set.of("provider", "status", "reference"), fields(body.get("payment")));
        assertEquals("SIMULATED", body.path("payment").path("provider").asText());
        assertEquals("APPROVED", body.path("payment").path("status").asText());
        assertTrue(body.path("payment").path("reference").asText().matches("SIM-[0-9a-f-]{36}"));
        UUID reservation = UUID.fromString(body.path("reservationId").asText());
        assertEquals("CONFIRMED", jdbc.queryForObject("SELECT status FROM reservations WHERE id=?", String.class, reservation));
        assertEquals(body.path("confirmationCode").asText(), jdbc.queryForObject("SELECT confirmation_code FROM reservations WHERE id=?", String.class, reservation));
        assertEquals("WEB_DIRECTA", jdbc.queryForObject("SELECT source_channel FROM reservations WHERE id=?", String.class, reservation));
        assertEquals(1, propertyCount("reservations"));
        assertEquals(1, propertyCount("guest_profiles"));
        assertEquals(2, propertyCount("reservation_stays"));
        assertEquals(2, body.path("stays").size());
        var stayIds = new HashSet<String>();
        for (var stay : body.path("stays")) {
            assertEquals(Set.of("reservationStayId", "roomTypeId", "roomId", "arrival", "departure"), fields(stay));
            assertTrue(stayIds.add(stay.path("reservationStayId").asText()));
            assertTrue(stay.path("roomId").isNull());
            assertEquals(standard.toString(), stay.path("roomTypeId").asText());
            assertEquals(ARRIVAL.toString(), stay.path("arrival").asText());
            assertEquals(DEPARTURE.toString(), stay.path("departure").asText());
            assertEquals(reservation, jdbc.queryForObject("SELECT reservation_id FROM reservation_stays WHERE id=? AND room_id IS NULL "
                    + "AND room_type_id=? AND arrival=? AND departure=?", UUID.class,
                    UUID.fromString(stay.path("reservationStayId").asText()), standard, ARRIVAL, DEPARTURE));
        }
        var receipt = receipts.find(key).orElseThrow();
        assertEquals(reservation, receipt.reservationId());
        assertEquals(body, json.readTree(receipt.responseSnapshot()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM reservation_guests g JOIN reservation_stays s ON s.id=g.reservation_stay_id WHERE s.property_id=?", Integer.class, property));
        assertEquals(0, response.getResponse().getCookies().length);
        verify(payments, times(1)).pay(new PaymentRequest(260000L, "GTQ"));
    }

    @Test
    void realHttpServerPersistsAnonymousBookingReplaysItAndServesTheMatchingSwagger() throws Exception {
        String key = key();
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .header("Idempotency-Key", key).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(request(1)))).build();
        var client = HttpClient.newHttpClient();
        var original = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, original.statusCode());
        assertTrue(original.headers().firstValue("Set-Cookie").isEmpty());
        var originalBody = json.readTree(original.body());
        var before = counts();
        var replay = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, replay.statusCode());
        assertEquals(originalBody, json.readTree(replay.body()));
        assertEquals(before, counts());
        assertEquals(1, propertyCount("reservations"));
        assertEquals(1, propertyCount("reservation_stays"));
        assertEquals(originalBody, json.readTree(receipts.find(key).orElseThrow().responseSnapshot()));
        verify(payments, times(1)).pay(new PaymentRequest(130000L, "GTQ"));
        var swagger = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/v3/api-docs"))
                .timeout(Duration.ofSeconds(20)).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, swagger.statusCode());
        assertEquals("public", json.readTree(swagger.body()).path("paths").path(PATH).path("post").path("x-audience").asText());
    }

    @Test
    void missingKeyIs400BeforeAnyPaymentOrWrite() throws Exception {
        var before = counts();
        var result = mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request(1))))
                .andExpect(status().isBadRequest()).andReturn();
        assertError(result, "INVALID_REQUEST");
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "short", "1234567"})
    void invalidKeyIs400(String key) throws Exception {
        assertNoWrites(key, request(1), 400, "INVALID_REQUEST");
    }

    @Test
    void overlongAndControlCharacterKeysAre400() throws Exception {
        assertNoWrites("a".repeat(129), request(1), 400, "INVALID_REQUEST");
        assertNoWrites("abcdefgh\u0001", request(1), 400, "INVALID_REQUEST");
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "[]", "null", "{}", ""})
    void malformedOrMissingBodyIs400WithoutEchoingInput(String payload) throws Exception {
        var before = counts();
        var result = raw(key(), payload, 400);
        assertError(result, "INVALID_REQUEST");
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @CsvSource({"currency,USD", "paymentMode,REAL_CARD", "propertyId,not-a-uuid", "arrival,2035-02-30",
            "departure,not-a-date", "bookingGuest.email,invalid", "bookingGuest.firstName,''", "bookingGuest.lastName,''"})
    void invalidFieldIs400WithoutPartialWrites(String field, String value) throws Exception {
        var payload = (ObjectNode) json.valueToTree(request(1));
        if (field.startsWith("bookingGuest.")) { ((ObjectNode) payload.get("bookingGuest")).put(field.substring(13), value); }
        else { payload.put(field, value); }
        var before = counts();
        assertError(raw(key(), json.writeValueAsString(payload), 400), "INVALID_REQUEST");
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"propertyId", "arrival", "departure", "currency", "clientTotalMinor", "stays", "bookingGuest", "paymentMode"})
    void missingRequiredFieldIs400(String field) throws Exception {
        var payload = (ObjectNode) json.valueToTree(request(1));
        payload.remove(field);
        var before = counts();
        assertError(raw(key(), json.writeValueAsString(payload), 400), "INVALID_REQUEST");
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"pan", "cvv", "cardToken", "cardholder", "expiry", "billingAddress", "unknown"})
    void cardAndOtherUnapprovedFieldsAreRejectedAtEveryRequestLevel(String field) throws Exception {
        for (String level : List.of("root", "guest", "stay")) {
            var payload = (ObjectNode) json.valueToTree(request(1));
            var target = switch (level) {
                case "guest" -> (ObjectNode) payload.get("bookingGuest");
                case "stay" -> (ObjectNode) payload.get("stays").get(0);
                default -> payload;
            };
            target.put(field, "rejected-synthetic-value");
            var before = counts();
            var result = raw(key(), json.writeValueAsString(payload), 400);
            assertError(result, "INVALID_REQUEST");
            assertFalse(result.getResponse().getContentAsString().contains("rejected-synthetic-value"));
            assertEquals(before, counts());
        }
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1.5", "\"1\"", "2147483648", "null"})
    void invalidQuantityIs400(String value) throws Exception {
        var before = counts();
        String payload = json.writeValueAsString(request(1)).replace("\"quantity\":1", "\"quantity\":" + value);
        assertError(raw(key(), payload, 400), "INVALID_REQUEST");
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"130000.5", "\"130000\"", "9223372036854775808", "null"})
    void nonintegerOrOverflowingTotalIs400(String value) throws Exception {
        var before = counts();
        String payload = json.writeValueAsString(request(1)).replace("\"clientTotalMinor\":130000", "\"clientTotalMinor\":" + value);
        assertError(raw(key(), payload, 400), "INVALID_REQUEST");
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }

    @Test
    void emptyStaysAndEqualOrReversedDatesHaveExact400Codes() throws Exception {
        assertNoWrites(key(), request(List.of(), 0L, ARRIVAL, DEPARTURE), 400, "INVALID_REQUEST");
        assertNoWrites(key(), request(request(1).stays(), 130000L, ARRIVAL, ARRIVAL), 400, "INVALID_DATE_RANGE");
        assertNoWrites(key(), request(request(1).stays(), 130000L, DEPARTURE, ARRIVAL), 400, "INVALID_DATE_RANGE");
    }

    @Test
    void missingAndInactivePropertyHave404() throws Exception {
        var input = request(1);
        assertNoWrites(key(), new PublicBookingRequest(UUID.randomUUID(), ARRIVAL, DEPARTURE, "GTQ", 130000L,
                input.stays(), input.bookingGuest(), input.paymentMode()), 404, "PROPERTY_NOT_FOUND");
        jdbc.update("UPDATE properties SET status='INACTIVE' WHERE id=?", property);
        assertNoWrites(key(), input, 404, "PROPERTY_NOT_FOUND");
    }

    @Test
    void manipulatedPriceIs409BeforePaying() throws Exception {
        assertNoWrites(key(), request(request(1).stays(), 129999L, ARRIVAL, DEPARTURE), 409, "PRICE_CHANGED");
    }

    @Test
    void insufficientInventoryIs409BeforePaying() throws Exception {
        assertNoWrites(key(), request(3), 409, "NO_AVAILABILITY");
    }

    @Test
    void replayIs201WithIdenticalSnapshotAndNoDuplicatePaymentsOrRows() throws Exception {
        String key = key();
        var input = request(2);
        var original = body(send(key, input, 201));
        var before = counts();
        assertEquals(original, body(send(key, input, 201)));
        assertEquals(before, counts());
        verify(payments, times(1)).pay(any());
    }

    @Test
    void replayKeepsOriginalSnapshotAfterPropertyAndPricingBecomeIneligible() throws Exception {
        String key = key();
        var input = request(1);
        var original = body(send(key, input, 201));
        jdbc.update("UPDATE properties SET status='INACTIVE',currency='USD' WHERE id=?", property);
        jdbc.update("UPDATE room_types SET code='UNCONFIGURED' WHERE id=?", standard);
        var before = counts();
        assertEquals(original, body(send(key, input, 201)));
        assertEquals(before, counts());
        verify(payments, times(1)).pay(any());
    }

    @Test
    void backendPricingConfigurationFailureIs500BeforeAnyPaymentOrWrite() throws Exception {
        jdbc.update("UPDATE room_types SET code='UNCONFIGURED' WHERE id=?", standard);
        assertNoWrites(key(), request(1), 500, "BOOKING_FAILED");
    }

    @Test
    void modifiedPayloadWithSameKeyIs409WithoutAnotherPaymentOrWrite() throws Exception {
        String key = key();
        send(key, request(1), 201);
        var before = counts();
        assertError(send(key, request(request(1).stays(), 130001L, ARRIVAL, DEPARTURE), 409), "IDEMPOTENCY_KEY_REUSED");
        assertEquals(before, counts());
        verify(payments, times(1)).pay(any());
    }

    @Test
    void declinedPaymentIs422AndTechnicalPaymentFailureIs500() throws Exception {
        for (var outcome : List.of(PaymentResult.Status.DECLINED, PaymentResult.Status.ERROR)) {
            var before = counts();
            String key = key();
            doReturn(new PaymentResult(outcome, null)).when(payments).pay(any());
            assertError(send(key, request(1), outcome == PaymentResult.Status.DECLINED ? 422 : 500),
                    outcome == PaymentResult.Status.DECLINED ? "PAYMENT_DECLINED" : "BOOKING_FAILED");
            assertEquals(before, counts());
            assertTrue(receipts.find(key).isEmpty());
        }
    }

    @Test
    void latePersistenceFailureIsSanitized500AndRollsBackAllLocalRows() throws Exception {
        var before = counts();
        String key = key();
        doAnswer(call -> {
            call.callRealMethod();
            entities.flush();
            throw new IllegalStateException("synthetic-private-diagnostic");
        }).when(reservations).confirm(any());
        var result = send(key, request(1), 500);
        assertError(result, "BOOKING_FAILED");
        assertFalse(result.getResponse().getContentAsString().contains("synthetic-private-diagnostic"));
        assertEquals(before, counts());
        assertTrue(receipts.find(key).isEmpty());
    }

    @Test
    void simultaneousHttpReplayCreatesOnlyOneCommittedBookingAndPayment() throws Exception {
        String key = key();
        var input = request(1);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> { ready.countDown(); assertTrue(start.await(20, TimeUnit.SECONDS)); return body(send(key, input, 201)); });
            var second = workers.submit(() -> { ready.countDown(); assertTrue(start.await(20, TimeUnit.SECONDS)); return body(send(key, input, 201)); });
            try {
                assertTrue(ready.await(20, TimeUnit.SECONDS));
                start.countDown();
                assertEquals(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            } finally { start.countDown(); }
        }
        assertEquals(1, propertyCount("reservations"));
        assertEquals(1, propertyCount("reservation_stays"));
        assertEquals(1, propertyCount("guest_profiles"));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM public_booking_receipts WHERE idempotency_key=?", Integer.class, key));
        verify(payments, times(1)).pay(any());
    }

    private void assertNoWrites(String key, PublicBookingRequest request, int status, String code) throws Exception {
        var before = counts();
        assertError(send(key, request, status), code);
        assertEquals(before, counts());
        verifyNoInteractions(payments);
    }
    private MvcResult send(String key, PublicBookingRequest input, int status) throws Exception {
        return raw(key, json.writeValueAsString(input), status);
    }
    private MvcResult raw(String key, String payload, int expectedStatus) throws Exception {
        return mvc.perform(post(PATH).header("Idempotency-Key", key).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().is(expectedStatus)).andReturn();
    }
    private JsonNode body(MvcResult result) throws Exception { return json.readTree(result.getResponse().getContentAsString()); }
    private void assertError(MvcResult result, String code) throws Exception {
        assertTrue(MediaType.APPLICATION_PROBLEM_JSON.isCompatibleWith(MediaType.parseMediaType(result.getResponse().getContentType())));
        assertEquals(code, body(result).path("code").asText());
        assertEquals(result.getResponse().getStatus(), body(result).path("status").asInt());
    }
    private int propertyCount(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE property_id=?", Integer.class, property); }
    private Map<String, Integer> counts() {
        var counts = new LinkedHashMap<String, Integer>();
        for (String table : List.of("guest_profiles", "guest_accounts", "reservations", "reservation_stays", "reservation_guests", "reservation_audit_events", "public_booking_receipts", "folios", "folio_movements")) {
            counts.put(table, jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class));
        }
        return counts;
    }
    private Set<String> fields(JsonNode node) {
        var fields = new HashSet<String>();
        node.properties().forEach(entry -> fields.add(entry.getKey()));
        return fields;
    }
    private String key() { return "j6-" + UUID.randomUUID(); }
    private PublicBookingRequest request(int quantity) {
        return request(List.of(new PublicBookingRequest.Stay(standard, "DEMO_STANDARD", quantity)), 130000L * quantity, ARRIVAL, DEPARTURE);
    }
    private PublicBookingRequest request(List<PublicBookingRequest.Stay> stays, long total, LocalDate arrival, LocalDate departure) {
        return new PublicBookingRequest(property, arrival, departure, "GTQ", total, stays,
                new PublicBookingRequest.BookingGuest("Ana", "Lopez", "ana@example.test"), PublicBookingRequest.PaymentMode.SIMULATED_CARD);
    }
}
