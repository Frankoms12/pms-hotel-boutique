package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationService;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import static com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException.Code.*;
import static org.junit.jupiter.api.Assertions.*;

/** Real PostgreSQL lookup and application JSON mapping; transaction-local fixtures only. */
@SpringBootTest
@Transactional
class PublicBookingValidationIntegrationTests {
    private static final String JSON = """
            {"propertyId":"%s","arrival":"2026-11-01","departure":"2026-11-03",
             "currency":"GTQ","clientTotalMinor":130000,
             "stays":[{"roomTypeId":"00000000-0000-0000-0000-000000000011",
                       "ratePlanId":"DEMO_STANDARD","quantity":1}],
             "bookingGuest":{"firstName":"Ana","lastName":"Lopez","email":"ana@example.test"},
             "paymentMode":"SIMULATED_CARD"}
            """;

    private final UUID property = UUID.nameUUIDFromBytes("public-j3-property".getBytes(StandardCharsets.UTF_8));
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PublicBookingValidationService service;

    @BeforeEach
    void propertyFixture() {
        UUID organization = jdbc.queryForObject("SELECT id FROM organizations WHERE code='HOTEL_BOUTIQUE'", UUID.class);
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,'J3-PUBLIC','J3 test Property','America/Guatemala','GTQ','ACTIVE',now(),now())", property, organization);
    }

    @Test
    void validatesRealPropertyAndHashesWithoutWritingBookingProfileStayOrReceipt() {
        var before = writeCounts();
        var request = read(JSON.formatted(property));
        String hash = service.validateAndHash("j3-request-123", request);
        assertTrue(hash.matches("[0-9a-f]{64}"));
        assertEquals(hash, service.validateAndHash("j3-another-key", request));
        assertEquals(before, writeCounts());
    }

    @Test
    void unknownRequestedPropertyCannotBeSatisfiedByAnotherExistingProperty() {
        var before = writeCounts();
        var request = read(JSON.formatted(UUID.nameUUIDFromBytes("j3-missing".getBytes(StandardCharsets.UTF_8))));
        assertEquals(PROPERTY_NOT_FOUND, assertThrows(PublicBookingValidationException.class,
                () -> service.validateAndHash("j3-request-123", request)).code());
        assertEquals(before, writeCounts());
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-02-30", "2026-13-01", "2026-11-01T00:00:00", "20261101", "not-a-date"})
    void rejectsInvalidCalendarDatesAndNonIsoFormsDuringJsonMapping(String arrival) {
        String input = JSON.formatted(property).replace("2026-11-01", arrival);
        assertThrows(JacksonException.class, () -> read(input));
    }

    @Test
    void acceptsAnActualLeapDayWithoutNormalizingIt() {
        var request = read(JSON.formatted(property).replace("2026-11-01", "2028-02-29").replace("2026-11-03", "2028-03-01"));
        assertEquals(LocalDate.of(2028, 2, 29), request.arrival());
        assertTrue(service.validateAndHash("j3-request-123", request).matches("[0-9a-f]{64}"));
    }

    @Test
    void jsonUuidCaseAndFieldOrderDoNotChangeTheLogicalPayloadHash() {
        var request = read(JSON.formatted(property));
        String reordered = """
                {"paymentMode":"SIMULATED_CARD","bookingGuest":{"email":"ana@example.test","lastName":"Lopez","firstName":"Ana"},
                 "stays":[{"quantity":1,"ratePlanId":"DEMO_STANDARD","roomTypeId":"00000000-0000-0000-0000-000000000011"}],
                 "clientTotalMinor":130000,"currency":"GTQ","departure":"2026-11-03","arrival":"2026-11-01","propertyId":"%s"}
                """.formatted(property.toString().toUpperCase(Locale.ROOT));
        assertEquals(service.validateAndHash("j3-request-123", request),
                service.validateAndHash("j3-request-123", read(reordered)));
        assertEquals(request, read(json.writeValueAsString(request)));
    }

    @Test
    void onlyTheApprovedSimulatedPaymentModeCanBeDecoded() {
        assertThrows(JacksonException.class,
                () -> read(JSON.formatted(property).replace("SIMULATED_CARD", "REAL_CARD")));
    }

    @Test
    void fractionalQuantitiesCannotBeTruncatedIntoAValidInteger() {
        assertThrows(JacksonException.class,
                () -> read(JSON.formatted(property).replace("\"quantity\":1", "\"quantity\":1.5")));
    }

    @Test
    void fractionalMinorUnitsCannotBeRoundedIntoTheClientTotal() {
        assertThrows(JacksonException.class,
                () -> read(JSON.formatted(property).replace("\"clientTotalMinor\":130000", "\"clientTotalMinor\":130000.5")));
    }

    @Test
    void equivalentExactNumericRepresentationsKeepTheLogicalPayloadHash() {
        var original = read(JSON.formatted(property));
        var equivalent = read(JSON.formatted(property).replace("\"quantity\":1", "\"quantity\":1.0")
                .replace("\"clientTotalMinor\":130000", "\"clientTotalMinor\":130000.0"));
        assertEquals(original, equivalent);
        assertEquals(service.validateAndHash("j3-request-123", original), service.validateAndHash("j3-request-123", equivalent));
    }

    @Test
    void numericStringsAndIntegerOverflowsAreRejectedWithoutCoercion() {
        String input = JSON.formatted(property);
        assertThrows(JacksonException.class, () -> read(input.replace("\"quantity\":1", "\"quantity\":\"1\"")));
        assertThrows(JacksonException.class, () -> read(input.replace("\"clientTotalMinor\":130000", "\"clientTotalMinor\":\"130000\"")));
        assertThrows(JacksonException.class, () -> read(input.replace("\"quantity\":1", "\"quantity\":2147483648")));
        assertThrows(JacksonException.class, () -> read(input.replace("\"clientTotalMinor\":130000", "\"clientTotalMinor\":9223372036854775808")));
    }

    @Test
    void unknownRootStayAndGuestFieldsAreRejected() {
        String input = JSON.formatted(property);
        assertThrows(JacksonException.class, () -> read(input.replace("\"currency\":", "\"cardDetails\":true,\"currency\":")));
        assertThrows(JacksonException.class, () -> read(input.replace("\"quantity\":", "\"unexpected\":true,\"quantity\":")));
        assertThrows(JacksonException.class, () -> read(input.replace("\"email\":", "\"unexpected\":true,\"email\":")));
    }

    private PublicBookingRequest read(String input) { return json.readValue(input, PublicBookingRequest.class); }

    private List<Long> writeCounts() {
        return List.of("reservations", "reservation_stays", "guest_profiles", "reservation_audit_events", "local_operation_receipts")
                .stream().map(table -> jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class)).toList();
    }
}
