package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityService;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** J5 output persisted through unchanged booking/admission services in PostgreSQL. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PublicBookingMappingIntegrationTests {
    private static final String SCHEMA = "public_j5_" + UUID.randomUUID().toString().replace("-", "");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate ARRIVAL = LocalDate.of(2035, 1, 1);
    private static final LocalDate DEPARTURE = ARRIVAL.plusDays(2);
    private static final PublicBookingRequest.BookingGuest GUEST = new PublicBookingRequest.BookingGuest("Ana", "Lopez", "ana@example.test");

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @Autowired PublicBookingMappingService mapping;
    @Autowired PublicBookingValidationService validation;
    @Autowired ReservationBookingService booking;
    @Autowired GuestProfileService profiles;
    @Autowired AvailabilityService availability;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entities;
    @Autowired PlatformTransactionManager transactions;
    private UUID property;
    private UUID standard;
    private UUID deluxe;
    private UUID suite;

    @BeforeEach
    void realPropertyAndRoomTypes() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = property();
        standard = type(property, "STD");
        deluxe = type(property, "DLX");
        suite = type(property, "SUITE");
    }

    @AfterAll
    void removeOwnedSchema() { jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }

    @ParameterizedTest
    @ValueSource(ints = {1, 3})
    void persistsExactlyQuantityStaysAndOneNewResponsibleProfile(int quantity) {
        var created = create(request(List.of(stay(standard, quantity)), GUEST));
        assertBooking(created, Map.of(standard, quantity));
        assertEquals(1, propertyCount("guest_profiles"));
        var profile = profiles.get(created.reservation().bookingGuestId());
        assertEquals(property, profile.propertyId());
        assertEquals(GUEST.firstName(), profile.firstName());
        assertEquals(GUEST.lastName(), profile.lastName());
        assertEquals(GUEST.email(), profile.email());
        assertNull(profile.guestAccountId());
        assertNull(profile.phone());
        assertNull(profile.documentType());
        assertNull(profile.documentNumber());
        assertNull(profile.preferredLanguage());
        assertEquals(5 - quantity, ats(standard));
    }

    @Test
    void multipleCategoriesAndDuplicateEntriesPersistUnderOneReservation() {
        var input = request(List.of(stay(standard, 2), stay(deluxe, 2), stay(suite, 1), stay(standard, 1)), GUEST);
        var created = create(input);
        assertBooking(created, Map.of(standard, 3, deluxe, 2, suite, 1));
        assertEquals(1, propertyCount("guest_profiles"));
        assertEquals(2, ats(standard));
        assertEquals(3, ats(deluxe));
        assertEquals(4, ats(suite));
    }

    @Test
    void reusesUniqueActiveAnonymousProfileWithoutUpdatingItsContactOrHistory() {
        UUID id = profile(property, GUEST, "ACTIVE", null);
        jdbc.update("UPDATE guest_profiles SET phone='synthetic-phone',document_type='TEST',document_number='J5',preferred_language='es' WHERE id=?", id);
        var before = row(id);
        var created = create(request(List.of(stay(standard, 2)), GUEST));
        assertEquals(id, created.reservation().bookingGuestId());
        assertEquals(1, propertyCount("guest_profiles"));
        assertEquals(before, row(id));
        assertBooking(created, Map.of(standard, 2));
    }

    @Test
    void ambiguousExactMatchesCreateANewProfileAndLeaveEveryCandidateUntouched() {
        var ids = List.of(profile(property, GUEST, "ACTIVE", null), profile(property, GUEST, "ACTIVE", null),
                profile(property, GUEST, "ACTIVE", null));
        var before = ids.stream().collect(Collectors.toMap(Function.identity(), this::row));
        var created = create(request(List.of(stay(standard, 1)), GUEST));
        assertFalse(ids.contains(created.reservation().bookingGuestId()));
        assertEquals(4, propertyCount("guest_profiles"));
        ids.forEach(id -> assertEquals(before.get(id), row(id)));
        assertBooking(created, Map.of(standard, 1));
    }

    @ParameterizedTest
    @ValueSource(strings = {"INACTIVE", "ACCOUNT_LINKED", "OTHER_PROPERTY", "NO_PROPERTY"})
    void excludedProfileNeverBecomesThePublicResponsibleGuest(String kind) {
        UUID account = "ACCOUNT_LINKED".equals(kind) ? account() : null;
        UUID ownerProperty = switch (kind) {
            case "OTHER_PROPERTY" -> property();
            case "NO_PROPERTY" -> null;
            default -> property;
        };
        UUID id = profile(ownerProperty, GUEST, "INACTIVE".equals(kind) ? "INACTIVE" : "ACTIVE", account);
        var before = row(id);
        int accounts = count("guest_accounts");
        var created = create(request(List.of(stay(standard, 1)), GUEST));
        assertNotEquals(id, created.reservation().bookingGuestId());
        assertNull(profiles.get(created.reservation().bookingGuestId()).guestAccountId());
        assertEquals(property, profiles.get(created.reservation().bookingGuestId()).propertyId());
        assertEquals(before, row(id));
        assertEquals(accounts, count("guest_accounts"));
        assertBooking(created, Map.of(standard, 1));
    }

    @Test
    void excludedMatchesDoNotMakeTheSingleEligibleCandidateAmbiguous() {
        UUID eligible = profile(property, GUEST, "ACTIVE", null);
        profile(property, GUEST, "INACTIVE", null);
        profile(property, GUEST, "ACTIVE", account());
        profile(property(), GUEST, "ACTIVE", null);
        profile(null, GUEST, "ACTIVE", null);
        var command = mapping.map(request(List.of(stay(standard, 1)), GUEST));
        assertEquals(eligible, command.booker().profileId());
        assertNull(command.booker().newProfile());
    }

    @ParameterizedTest
    @ValueSource(strings = {"FIRST_CASE", "LAST_CASE", "EMAIL_CASE", "SPACES"})
    void exactLookupDoesNotNormalizeCaseOrWhitespace(String change) {
        UUID original = profile(property, GUEST, "ACTIVE", null);
        var guest = switch (change) {
            case "FIRST_CASE" -> new PublicBookingRequest.BookingGuest("ana", "Lopez", GUEST.email());
            case "LAST_CASE" -> new PublicBookingRequest.BookingGuest("Ana", "LOPEZ", GUEST.email());
            case "EMAIL_CASE" -> new PublicBookingRequest.BookingGuest("Ana", "Lopez", "Ana@example.test");
            default -> new PublicBookingRequest.BookingGuest(" Ana ", " Lopez ", GUEST.email());
        };
        var before = row(original);
        var input = request(List.of(stay(standard, 1)), guest);
        String hash = validation.validateAndHash("j5-exact-key", input);
        var command = mapping.map(input);
        assertNull(command.booker().profileId());
        assertEquals(guest.firstName(), command.booker().newProfile().firstName());
        assertEquals(guest.lastName(), command.booker().newProfile().lastName());
        var created = booking.createBooking(command);
        assertNotEquals(original, created.reservation().bookingGuestId());
        assertEquals(2, propertyCount("guest_profiles"));
        assertEquals(before, row(original));
        assertEquals(guest.firstName().trim(), profiles.get(created.reservation().bookingGuestId()).firstName());
        assertEquals(guest.lastName().trim(), profiles.get(created.reservation().bookingGuestId()).lastName());
        assertEquals(guest.email(), profiles.get(created.reservation().bookingGuestId()).email());
        assertEquals(hash, validation.validateAndHash("j5-exact-key", input));
        assertBooking(created, Map.of(standard, 1));
    }

    @Test
    void exactLookupDoesNotNormalizeUnicodeComposition() {
        var composed = new PublicBookingRequest.BookingGuest("Jos\u00e9", "Lopez", GUEST.email());
        var decomposed = new PublicBookingRequest.BookingGuest("Jose\u0301", "Lopez", GUEST.email());
        UUID original = profile(property, composed, "ACTIVE", null);
        var created = create(request(List.of(stay(standard, 1)), decomposed));
        assertNotEquals(original, created.reservation().bookingGuestId());
        assertEquals(decomposed.firstName(), profiles.get(created.reservation().bookingGuestId()).firstName());
        assertEquals(2, propertyCount("guest_profiles"));
    }

    @Test
    void sameEmailWithDifferentNamesDoesNotOverwriteOrReuseAnotherPerson() {
        UUID other = profile(property, new PublicBookingRequest.BookingGuest("Otra", "Persona", GUEST.email()), "ACTIVE", null);
        var before = row(other);
        var created = create(request(List.of(stay(standard, 1)), GUEST));
        assertNotEquals(other, created.reservation().bookingGuestId());
        assertEquals(before, row(other));
        assertEquals(2, propertyCount("guest_profiles"));
    }

    @Test
    void preparingSeveralCommandsHasNoPersistentEffects() {
        var before = counts();
        var input = request(List.of(stay(standard, 3), stay(deluxe, 2)), GUEST);
        assertNotNull(mapping.map(input));
        assertNotNull(mapping.map(input));
        assertEquals(before, counts());
        assertEquals(5, ats(standard));
        assertEquals(5, ats(deluxe));
    }

    @ParameterizedTest
    @ValueSource(strings = {"MISSING", "OTHER_PROPERTY"})
    void nonRealOrForeignRoomTypeIsRejectedWithoutPartialWrites(String kind) {
        UUID wrong = "MISSING".equals(kind) ? UUID.randomUUID() : type(property(), "FOREIGN");
        var before = counts();
        var error = assertThrows(PublicBookingValidationException.class,
                () -> mapping.map(request(List.of(stay(standard, 1), stay(wrong, 1)), GUEST)));
        assertEquals(PublicBookingValidationException.Code.INVALID_REQUEST, error.code());
        assertEquals("INVALID_REQUEST", error.getMessage());
        assertEquals(before, counts());
    }

    @Test
    void outerRollbackRestoresNewResponsibleProfileReservationStaysAndAudit() {
        var before = counts();
        var transaction = new TransactionTemplate(transactions);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transaction.executeWithoutResult(status -> {
            var created = create(request(List.of(stay(standard, 3), stay(deluxe, 2)), GUEST));
            // Observe the pending JPA inserts through JDBC in this same transaction
            // before rolling them back; production booking code remains unchanged.
            entities.flush();
            assertBooking(created, Map.of(standard, 3, deluxe, 2));
            assertEquals(1, propertyCount("guest_profiles"));
            status.setRollbackOnly();
        });
        assertEquals(before, counts());
        assertEquals(5, ats(standard));
        assertEquals(5, ats(deluxe));
    }

    @Test
    void quantityExceedingInventoryLeavesNoResponsibleProfileOrPartialBooking() {
        var before = counts();
        assertThrows(ReservationBookingException.class,
                () -> create(request(List.of(stay(standard, 6)), GUEST)));
        assertEquals(before, counts());
        assertEquals(5, ats(standard));
    }

    private BookingView create(PublicBookingRequest request) {
        validation.validateAndHash("j5-valid-key", request);
        return booking.createBooking(mapping.map(request));
    }
    private void assertBooking(BookingView created, Map<UUID, Integer> quantities) {
        int total = quantities.values().stream().mapToInt(Integer::intValue).sum();
        UUID id = created.reservation().id();
        assertEquals(1, propertyCount("reservations"));
        assertEquals(total, propertyCount("reservation_stays"));
        assertEquals(total, created.stays().size());
        assertEquals(total, created.stays().stream().map(ReservationStayView::id).distinct().count());
        assertEquals("WEB_DIRECTA", created.reservation().sourceChannel());
        assertNull(created.reservation().sourceReference());
        assertNull(created.reservation().notes());
        assertNotNull(created.reservation().bookingGuestId());
        assertEquals(quantities, created.stays().stream().collect(Collectors.groupingBy(
                ReservationStayView::roomTypeId, Collectors.summingInt(ignored -> 1))));
        for (var stay : created.stays()) {
            assertEquals(id, stay.reservationId());
            assertEquals(property, stay.propertyId());
            assertNull(stay.roomId());
            assertEquals(ARRIVAL, stay.arrival());
            assertEquals(DEPARTURE, stay.departure());
            assertTrue(stay.occupants().isEmpty());
        }
        assertEquals(total, jdbc.queryForObject("SELECT count(*) FROM reservation_stays WHERE reservation_id=? AND property_id=? AND room_id IS NULL",
                Integer.class, id, property));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM reservation_guests g JOIN reservation_stays s ON s.id=g.reservation_stay_id WHERE s.reservation_id=?", Integer.class, id));
    }
    private UUID property() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?,'J5 integration','America/Guatemala','GTQ','ACTIVE',now(),now())", id, ORGANIZATION, "P-" + id);
        return id;
    }
    private UUID type(UUID propertyId, String code) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,?)", id, propertyId, code, "J5 " + code);
        for (int room = 1; room <= 5; room++) {
            jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)", UUID.randomUUID(), propertyId, id, code + "-" + room);
        }
        return id;
    }
    private UUID profile(UUID propertyId, PublicBookingRequest.BookingGuest guest, String status, UUID account) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO guest_profiles(id,property_id,guest_account_id,first_name,last_name,email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,now(),now())",
                id, propertyId, account, guest.firstName(), guest.lastName(), guest.email(), status);
        return id;
    }
    private UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES (?,?,now(),'ACTIVE',now(),now())", id, "j5-" + id + "@example.test");
        return id;
    }
    private Map<String, Object> row(UUID id) { return jdbc.queryForMap("SELECT * FROM guest_profiles WHERE id=?", id); }
    private int count(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class); }
    private int propertyCount(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE property_id=?", Integer.class, property); }
    private Map<String, Integer> counts() {
        var counts = new LinkedHashMap<String, Integer>();
        for (String table : List.of("guest_profiles", "guest_accounts", "reservations", "reservation_stays", "reservation_guests",
                "reservation_audit_events", "public_booking_receipts", "folios", "folio_movements")) { counts.put(table, count(table)); }
        return counts;
    }
    private int ats(UUID type) { return availability.calculateATS(property, type, new StayDateRange(ARRIVAL, DEPARTURE)); }
    private PublicBookingRequest.Stay stay(UUID type, int quantity) { return new PublicBookingRequest.Stay(type, "DEMO_STANDARD", quantity); }
    private PublicBookingRequest request(List<PublicBookingRequest.Stay> stays, PublicBookingRequest.BookingGuest guest) {
        return new PublicBookingRequest(property, ARRIVAL, DEPARTURE, "GTQ", 130000L,
                stays, guest, PublicBookingRequest.PaymentMode.SIMULATED_CARD);
    }
}
