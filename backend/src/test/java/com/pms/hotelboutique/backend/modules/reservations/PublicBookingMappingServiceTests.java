package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingMappingRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingPropertyRepository;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PublicBookingMappingServiceTests {
    private static final UUID PROPERTY = UUID.randomUUID();
    private static final UUID STANDARD = UUID.randomUUID();
    private static final UUID DELUXE = UUID.randomUUID();
    private static final UUID SUITE = UUID.randomUUID();
    private static final LocalDate ARRIVAL = LocalDate.of(2035, 1, 1);
    private static final LocalDate DEPARTURE = ARRIVAL.plusDays(2);
    private static final PublicBookingRequest.BookingGuest GUEST = new PublicBookingRequest.BookingGuest("Ana", "Lopez", "ana@example.test");
    private static ValidatorFactory validation;
    private PublicBookingMappingRepository repository;
    private PublicBookingMappingServiceImpl mapping;

    @BeforeAll
    static void validator() { validation = Validation.buildDefaultValidatorFactory(); }
    @AfterAll
    static void closeValidator() { validation.close(); }

    @BeforeEach
    void mapper() {
        repository = mock(PublicBookingMappingRepository.class);
        when(repository.roomTypeExists(eq(PROPERTY), any(UUID.class))).thenReturn(true);
        when(repository.findReusableProfile(eq(PROPERTY), any())).thenReturn(Optional.empty());
        mapping = new PublicBookingMappingServiceImpl(validation.getValidator(), repository);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 3})
    void quantityExpandsToExactlyThatNumberOfUnassignedStays(int quantity) {
        var command = mapping.map(request(List.of(stay(STANDARD, quantity)), GUEST));
        assertEquals(quantity, command.stays().size());
        for (var stay : command.stays()) {
            assertEquals(STANDARD, stay.roomTypeId());
            assertEquals(ARRIVAL, stay.arrival());
            assertEquals(DEPARTURE, stay.departure());
            assertNull(stay.roomId());
            assertTrue(stay.occupants().isEmpty());
        }
        assertThrows(UnsupportedOperationException.class, () -> command.stays().clear());
    }

    @Test
    void createsOnlyTheResponsibleProfileInlineWithApprovedChannelMetadata() {
        var command = mapping.map(request(List.of(stay(STANDARD, 3)), GUEST));
        assertEquals(PROPERTY, command.propertyId());
        assertEquals("GTQ", command.currency());
        assertEquals("WEB_DIRECTA", command.sourceChannel());
        assertNull(command.sourceReference());
        assertNull(command.notes());
        assertNull(command.booker().profileId());
        var profile = command.booker().newProfile();
        assertNull(profile.guestAccountId());
        assertEquals(PROPERTY, profile.propertyId());
        assertEquals(GUEST.firstName(), profile.firstName());
        assertEquals(GUEST.lastName(), profile.lastName());
        assertEquals(GUEST.email(), profile.email());
        assertNull(profile.phone());
        assertNull(profile.documentType());
        assertNull(profile.documentNumber());
        assertNull(profile.preferredLanguage());
    }

    @Test
    void reusesTheUniqueCandidateWithoutCreatingOrUpdatingAProfile() {
        UUID profile = UUID.randomUUID();
        when(repository.findReusableProfile(PROPERTY, GUEST)).thenReturn(Optional.of(profile));
        var command = mapping.map(request(List.of(stay(STANDARD, 2)), GUEST));
        assertEquals(profile, command.booker().profileId());
        assertNull(command.booker().newProfile());
        verify(repository).findReusableProfile(PROPERTY, GUEST);
        verify(repository).roomTypeExists(PROPERTY, STANDARD);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void preservesDuplicateEntriesAndOrderAcrossSeveralRealRoomTypes() {
        var input = List.of(stay(STANDARD, 2), stay(DELUXE, 1), stay(SUITE, 3), stay(STANDARD, 1));
        var command = mapping.map(request(input, GUEST));
        assertEquals(List.of(STANDARD, STANDARD, DELUXE, SUITE, SUITE, SUITE, STANDARD),
                command.stays().stream().map(CreateBookingCommand.StayBookingCommand::roomTypeId).toList());
        verify(repository, times(1)).roomTypeExists(PROPERTY, STANDARD);
        verify(repository, times(1)).roomTypeExists(PROPERTY, DELUXE);
        verify(repository, times(1)).roomTypeExists(PROPERTY, SUITE);
        assertEquals(input, request(input, GUEST).stays());
    }

    @Test
    void preservesRawGuestValuesAndTheJ3HashThroughMapping() {
        var guest = new PublicBookingRequest.BookingGuest(" Ana ", " Lopez ", "Ana@example.test");
        var request = request(List.of(stay(DELUXE, 2), stay(STANDARD, 1)), guest);
        var properties = mock(PublicBookingPropertyRepository.class);
        when(properties.existsById(PROPERTY)).thenReturn(true);
        var hash = new PublicBookingValidationServiceImpl(validation.getValidator(), properties);
        String before = hash.validateAndHash("j5-hash-key", request);
        var command = mapping.map(request);
        verify(repository).findReusableProfile(PROPERTY, guest);
        assertEquals(guest.firstName(), command.booker().newProfile().firstName());
        assertEquals(guest.lastName(), command.booker().newProfile().lastName());
        assertEquals(guest.email(), command.booker().newProfile().email());
        assertEquals(before, hash.validateAndHash("j5-hash-key", request));
        assertEquals(guest, request.bookingGuest());
    }

    @Test
    void mappingDoesNotInventPricingFieldsInTheExistingReservationModel() {
        var request = request(List.of(stay(STANDARD, 1)), GUEST);
        var changed = new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", 999L,
                List.of(new PublicBookingRequest.Stay(STANDARD, "OTHER_PLAN_FOR_CALLER_VALIDATION", 1)),
                GUEST, PublicBookingRequest.PaymentMode.SIMULATED_CARD);
        assertEquals(mapping.map(request), mapping.map(changed));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(ints = {0, -1})
    void invalidQuantityFailsBeforeLookupOrExpansion(Integer quantity) {
        invalid(request(List.of(new PublicBookingRequest.Stay(STANDARD, "DEMO_STANDARD", quantity)), GUEST),
                PublicBookingValidationException.Code.INVALID_REQUEST);
        verifyNoInteractions(repository);
    }

    @Test
    void unrepresentableListSizeFailsWithoutAllocatingOrQuerying() {
        invalid(request(List.of(stay(STANDARD, Integer.MAX_VALUE), stay(DELUXE, 1)), GUEST),
                PublicBookingValidationException.Code.INVALID_REQUEST);
        verifyNoInteractions(repository);
    }

    @Test
    void invalidDateRangeFailsBeforeLookup() {
        var request = new PublicBookingRequest(PROPERTY, DEPARTURE, ARRIVAL, "GTQ", 130000L,
                List.of(stay(STANDARD, 1)), GUEST, PublicBookingRequest.PaymentMode.SIMULATED_CARD);
        invalid(request, PublicBookingValidationException.Code.INVALID_DATE_RANGE);
        verifyNoInteractions(repository);
    }

    @Test
    void missingRequestOrGuestFailsBeforeLookup() {
        invalid(null, PublicBookingValidationException.Code.INVALID_REQUEST);
        invalid(request(List.of(stay(STANDARD, 1)), null), PublicBookingValidationException.Code.INVALID_REQUEST);
        verifyNoInteractions(repository);
    }

    @Test
    void unknownOrForeignRoomTypeFailsWithoutResolvingTheResponsibleProfile() {
        when(repository.roomTypeExists(PROPERTY, DELUXE)).thenReturn(false);
        invalid(request(List.of(stay(STANDARD, 1), stay(DELUXE, 1)), GUEST),
                PublicBookingValidationException.Code.INVALID_REQUEST);
        verify(repository, never()).findReusableProfile(any(), any());
    }

    private void invalid(PublicBookingRequest request, PublicBookingValidationException.Code expected) {
        var error = assertThrows(PublicBookingValidationException.class, () -> mapping.map(request));
        assertEquals(expected, error.code());
        assertEquals(expected.name(), error.getMessage());
    }
    private static PublicBookingRequest.Stay stay(UUID type, int quantity) {
        return new PublicBookingRequest.Stay(type, "DEMO_STANDARD", quantity);
    }
    private static PublicBookingRequest request(List<PublicBookingRequest.Stay> stays, PublicBookingRequest.BookingGuest guest) {
        return new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", 130000L,
                stays, guest, PublicBookingRequest.PaymentMode.SIMULATED_CARD);
    }
}
