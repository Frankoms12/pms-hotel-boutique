package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest.BookingGuest;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest.PaymentMode;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest.Stay;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationServiceImpl;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingPropertyRepository;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import static com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException.Code.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicBookingValidationServiceTests {
    private static final UUID PROPERTY = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID ROOM_TYPE = UUID.fromString("00000000-0000-0000-0000-000000000011");
    private static final LocalDate ARRIVAL = LocalDate.of(2026, 11, 1);
    private static final LocalDate DEPARTURE = ARRIVAL.plusDays(2);
    private static final Stay STANDARD = new Stay(ROOM_TYPE, "DEMO_STANDARD", 1);
    private static final Stay DELUXE = new Stay(UUID.fromString("00000000-0000-0000-0000-000000000012"), "DEMO_DELUXE", 1);
    private static final BookingGuest GUEST = new BookingGuest("Ana", "Lopez", "ana@example.test");
    private static ValidatorFactory factory;

    private final PublicBookingPropertyRepository properties = mock(PublicBookingPropertyRepository.class);
    private PublicBookingValidationServiceImpl service;

    @BeforeAll
    static void validatorFactory() { factory = Validation.buildDefaultValidatorFactory(); }

    @AfterAll
    static void closeValidatorFactory() { factory.close(); }

    @BeforeEach
    void setUp() {
        service = new PublicBookingValidationServiceImpl(factory.getValidator(), properties);
        when(properties.existsById(any(UUID.class))).thenReturn(true);
    }

    @Test
    void identicalPayloadHasStableVersionOneHash() {
        // Independently calculated using .NET SHA-256 and the documented byte format.
        String expected = "4eec960c40c78cd430b6454dc015c1f837b0e883ffde5181ec68e11620fe878c";
        assertEquals(expected, hash(valid()));
        assertEquals(expected, hash(request(List.of(STANDARD, DELUXE), GUEST)));
    }

    @Test
    void keyIsExcludedWithoutNormalizingIt() {
        String expected = hash(valid());
        assertEquals(expected, service.validateAndHash(" Key-123 ", valid()));
        assertEquals(expected, service.validateAndHash("different-key", valid()));
    }

    @Test
    void staysOrderDoesNotChangeHashOrMutateTheRequest() {
        var reversed = request(List.of(DELUXE, STANDARD), GUEST);
        assertEquals(hash(valid()), hash(reversed));
        assertEquals(List.of(DELUXE, STANDARD), reversed.stays());
    }

    @Test
    void ordersTiedRoomTypesByRatePlanThenNumericQuantity() {
        var one = new Stay(ROOM_TYPE, "DEMO_STANDARD", 2);
        var two = new Stay(ROOM_TYPE, "DEMO_STANDARD", 10);
        var three = new Stay(ROOM_TYPE, "DEMO_DELUXE", 1);
        assertEquals(hash(request(List.of(one, two, three), GUEST)),
                hash(request(List.of(three, two, one), GUEST)));
    }

    @Test
    void duplicatesArePreservedAndNeverAggregated() {
        var duplicate = request(List.of(STANDARD, STANDARD), GUEST);
        var combined = request(List.of(new Stay(ROOM_TYPE, "DEMO_STANDARD", 2)), GUEST);
        assertNotEquals(hash(duplicate), hash(combined));
        assertNotEquals(hash(duplicate), hash(request(List.of(STANDARD), GUEST)));
    }

    @ParameterizedTest
    @MethodSource("changedRequests")
    void everyRelevantPayloadChangeChangesTheHash(PublicBookingRequest changed) {
        assertNotEquals(hash(valid()), hash(changed));
    }

    static Stream<PublicBookingRequest> changedRequests() {
        return Stream.of(
                new PublicBookingRequest(UUID.randomUUID(), ARRIVAL, DEPARTURE, "GTQ", 300000L, List.of(STANDARD, DELUXE), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL.minusDays(1), DEPARTURE, "GTQ", 300000L, List.of(STANDARD, DELUXE), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE.plusDays(1), "GTQ", 300000L, List.of(STANDARD, DELUXE), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", 300001L, List.of(STANDARD, DELUXE), GUEST, PaymentMode.SIMULATED_CARD),
                request(List.of(new Stay(UUID.randomUUID(), "DEMO_STANDARD", 1), DELUXE), GUEST),
                request(List.of(new Stay(ROOM_TYPE, "DEMO_DELUXE", 1), DELUXE), GUEST),
                request(List.of(new Stay(ROOM_TYPE, "DEMO_STANDARD", 2), DELUXE), GUEST),
                request(List.of(STANDARD, DELUXE, STANDARD), GUEST),
                request(List.of(STANDARD, DELUXE), new BookingGuest("ANA", "Lopez", "ana@example.test")),
                request(List.of(STANDARD, DELUXE), new BookingGuest(" Ana ", "Lopez", "ana@example.test")),
                request(List.of(STANDARD, DELUXE), new BookingGuest("Ana", "LOPEZ", "ana@example.test")),
                request(List.of(STANDARD, DELUXE), new BookingGuest("Ana", "Lopez", "ANA@example.test")),
                request(List.of(STANDARD, DELUXE), new BookingGuest("Ana", "Lopez", "ana2@example.test")));
    }

    @Test
    void guestUnicodeIsNotNormalizedAndFieldBoundariesCannotCollide() {
        assertNotEquals(hash(request(List.of(STANDARD), new BookingGuest("Jos\u00e9", "Lopez", "ana@example.test"))),
                hash(request(List.of(STANDARD), new BookingGuest("Jose\u0301", "Lopez", "ana@example.test"))));
        assertNotEquals(hash(request(List.of(STANDARD), new BookingGuest("A", "BC", "ana@example.test"))),
                hash(request(List.of(STANDARD), new BookingGuest("AB", "C", "ana@example.test"))));
    }

    @Test
    void staysAreDefensivelyCopiedAndImmutable() {
        var input = new ArrayList<>(List.of(STANDARD, DELUXE));
        var request = request(input, GUEST);
        String before = hash(request);
        input.clear();
        assertEquals(before, hash(request));
        assertThrows(UnsupportedOperationException.class, () -> request.stays().clear());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "       ", "1234567", "1234567\n", "1234567\t", "1234567\u007f", "1234567\uD800"})
    void missingOrInvalidKeyIsRejectedBeforeLookingUpProperty(String key) {
        assertEquals(INVALID_REQUEST, assertThrows(PublicBookingValidationException.class,
                () -> service.validateAndHash(key, valid())).code());
        verifyNoInteractions(properties);
    }

    @Test
    void keyBoundariesCountUnicodeCharactersAndRejectOverlongKeys() {
        assertDoesNotThrow(() -> service.validateAndHash("x".repeat(8), valid()));
        assertDoesNotThrow(() -> service.validateAndHash("x".repeat(128), valid()));
        assertDoesNotThrow(() -> service.validateAndHash("\uD83D\uDE00".repeat(8), valid()));
        assertDoesNotThrow(() -> service.validateAndHash("\uD83D\uDE00".repeat(128), valid()));
        assertEquals(INVALID_REQUEST, assertThrows(PublicBookingValidationException.class,
                () -> service.validateAndHash("x".repeat(129), valid())).code());
        assertEquals(INVALID_REQUEST, assertThrows(PublicBookingValidationException.class,
                () -> service.validateAndHash("\uD83D\uDE00".repeat(129), valid())).code());
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void invalidFieldsFailBeforePropertyLookup(PublicBookingRequest request) {
        assertEquals(INVALID_REQUEST, assertThrows(PublicBookingValidationException.class,
                () -> hash(request)).code());
        verifyNoInteractions(properties);
    }

    static Stream<PublicBookingRequest> invalidRequests() {
        return Stream.of(
                null,
                new PublicBookingRequest(null, ARRIVAL, DEPARTURE, "GTQ", 300000L, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, null, DEPARTURE, "GTQ", 300000L, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, null, "GTQ", 300000L, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "USD", 300000L, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "gtq", 300000L, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, " GTQ ", 300000L, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, null, 300000L, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", null, List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD),
                request(null, GUEST), request(List.of(), GUEST), request(Arrays.asList((Stay) null), GUEST),
                request(List.of(new Stay(null, "DEMO_STANDARD", 1)), GUEST),
                request(List.of(new Stay(ROOM_TYPE, null, 1)), GUEST),
                request(List.of(new Stay(ROOM_TYPE, " ", 1)), GUEST),
                request(List.of(new Stay(ROOM_TYPE, "DEMO_STANDARD", null)), GUEST),
                request(List.of(new Stay(ROOM_TYPE, "DEMO_STANDARD", 0)), GUEST),
                request(List.of(new Stay(ROOM_TYPE, "DEMO_STANDARD", -1)), GUEST),
                request(List.of(new Stay(ROOM_TYPE, "invalid\uD800", 1)), GUEST),
                request(List.of(STANDARD), null),
                request(List.of(STANDARD), new BookingGuest(null, "Lopez", "ana@example.test")),
                request(List.of(STANDARD), new BookingGuest(" ", "Lopez", "ana@example.test")),
                request(List.of(STANDARD), new BookingGuest("Ana", " ", "ana@example.test")),
                request(List.of(STANDARD), new BookingGuest("x".repeat(81), "Lopez", "ana@example.test")),
                request(List.of(STANDARD), new BookingGuest("Ana", "x".repeat(81), "ana@example.test")),
                request(List.of(STANDARD), new BookingGuest("Ana", "Lopez", null)),
                request(List.of(STANDARD), new BookingGuest("Ana", "Lopez", " ")),
                request(List.of(STANDARD), new BookingGuest("Ana", "Lopez", "invalid-email")),
                request(List.of(STANDARD), new BookingGuest("Ana\uD800", "Lopez", "ana@example.test")),
                new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", 300000L, List.of(STANDARD), GUEST, null));
    }

    @Test
    void equalAndReversedDatesReturnTheContractDateError() {
        for (LocalDate departure : List.of(ARRIVAL, ARRIVAL.minusDays(1))) {
            var request = new PublicBookingRequest(PROPERTY, ARRIVAL, departure, "GTQ", 300000L,
                    List.of(STANDARD), GUEST, PaymentMode.SIMULATED_CARD);
            assertEquals(INVALID_DATE_RANGE, assertThrows(PublicBookingValidationException.class, () -> hash(request)).code());
        }
        verifyNoInteractions(properties);
    }

    @Test
    void missingRealPropertyReturnsOnlyTheContractCode() {
        when(properties.existsById(PROPERTY)).thenReturn(false);
        var error = assertThrows(PublicBookingValidationException.class, () -> hash(valid()));
        assertEquals(PROPERTY_NOT_FOUND, error.code());
        assertEquals("PROPERTY_NOT_FOUND", error.getMessage());
        verify(properties).existsById(PROPERTY);
    }

    @Test
    void clientTotalIsHashedExactlyWithoutCalculatingOrRoundingAPrice() {
        var request = new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", Long.MAX_VALUE,
                List.of(STANDARD, DELUXE), GUEST, PaymentMode.SIMULATED_CARD);
        assertNotEquals(hash(valid()), hash(request));
        assertEquals(Long.MAX_VALUE, request.clientTotalMinor());
    }

    private String hash(PublicBookingRequest request) { return service.validateAndHash("j3-request-123", request); }

    private static PublicBookingRequest valid() { return request(List.of(STANDARD, DELUXE), GUEST); }

    private static PublicBookingRequest request(List<Stay> stays, BookingGuest guest) {
        return new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", 300000L, stays, guest, PaymentMode.SIMULATED_CARD);
    }
}
