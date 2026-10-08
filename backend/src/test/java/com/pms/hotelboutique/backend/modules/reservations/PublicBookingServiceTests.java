package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.inventory.application.*;
import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PublicAvailabilityCatalogRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.domain.PublicBookingReceipt;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Currency;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PublicBookingServiceTests {
    private static final UUID PROPERTY = UUID.randomUUID(), TYPE = UUID.randomUUID(), RESERVATION = UUID.randomUUID(), GUEST = UUID.randomUUID();
    private static final LocalDate ARRIVAL = LocalDate.of(2035, 1, 1), DEPARTURE = ARRIVAL.plusDays(2);
    private static final String KEY = "j4-test-key", HASH = "a".repeat(64), REFERENCE = "SIM-" + UUID.randomUUID();
    private PublicBookingValidationService validation;
    private PublicBookingReceiptService receipts;
    private PublicAvailabilityCatalogRepository catalog;
    private InventoryAdmissionPort admission;
    private PaymentGatewayPort payments;
    private PublicBookingMappingService mapping;
    private ReservationBookingService booking;
    private ReservationService reservations;
    private EntityManager entities;
    private ObjectMapper json;
    private PublicBookingService service;
    private RoomType type;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void collaborators() {
        validation = mock(PublicBookingValidationService.class);
        receipts = mock(PublicBookingReceiptService.class);
        catalog = mock(PublicAvailabilityCatalogRepository.class);
        admission = mock(InventoryAdmissionPort.class);
        payments = mock(PaymentGatewayPort.class);
        mapping = mock(PublicBookingMappingService.class);
        booking = mock(ReservationBookingService.class);
        reservations = mock(ReservationService.class);
        entities = mock(EntityManager.class);
        json = spy(new ObjectMapper());
        type = new RoomType(TYPE, PROPERTY, "STD", "Standard", Instant.now());
        service = new PublicBookingServiceImpl(validation, receipts, catalog, new DemoRatePolicy(), admission,
                payments, mapping, booking, reservations, entities, json);
        when(validation.validateAndHash(eq(KEY), any())).thenReturn(HASH);
        when(catalog.findProperty(PROPERTY)).thenReturn(Optional.of(property(Property.Status.ACTIVE, "GTQ")));
        when(catalog.findRoomTypes(PROPERTY)).thenReturn(List.of(type));
        when(receipts.execute(any(), any())).thenAnswer(call -> {
            var input = (PublicBookingReceiptRequest) call.getArgument(0);
            var result = ((Supplier<PublicBookingReceiptResult>) call.getArgument(1)).get();
            Instant now = Instant.now();
            return new PublicBookingReceipt(input.idempotencyKey(), input.requestHash(), PublicBookingReceipt.Status.COMPLETED,
                    result.reservationId(), result.confirmationCode(), result.paymentReference(), result.responseSnapshot(), now, now);
        });
        when(admission.admit(any(), anyList(), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(2)).get());
        when(payments.pay(any())).thenReturn(new PaymentResult(PaymentResult.Status.APPROVED, REFERENCE));
        when(mapping.map(any())).thenAnswer(call -> {
            PublicBookingRequest input = call.getArgument(0);
            var stays = input.stays().stream().flatMap(stay -> java.util.stream.IntStream.range(0, stay.quantity())
                    .mapToObj(ignored -> new CreateBookingCommand.StayBookingCommand(stay.roomTypeId(), null, ARRIVAL, DEPARTURE, List.of()))).toList();
            return new CreateBookingCommand(PROPERTY, new CreateBookingCommand.BookerBooking(GUEST, null), "GTQ", "WEB_DIRECTA", null, null, stays);
        });
        when(booking.createBooking(any())).thenAnswer(call -> {
            CreateBookingCommand command = call.getArgument(0);
            return new BookingView(reservation(Reservation.Status.PENDING), command.stays().stream().map(stay ->
                    new ReservationStayView(UUID.randomUUID(), RESERVATION, PROPERTY, stay.roomTypeId(), null, ARRIVAL, DEPARTURE,
                            ReservationStay.Status.RESERVED, List.of(), Instant.now(), Instant.now())).toList());
        });
        when(reservations.confirm(RESERVATION)).thenReturn(reservation(Reservation.Status.CONFIRMED));
    }

    @Test
    void orchestratesApprovedCollaboratorsInOrderWithTheOfficialTotal() {
        var input = request(1, 130000L, "DEMO_STANDARD");
        var result = service.book(KEY, input);
        assertEquals(RESERVATION, result.reservationId());
        assertEquals("CONFIRMED", result.status());
        assertEquals(130000L, result.totalMinor());
        assertEquals("APPROVED", result.payment().status());
        assertEquals(REFERENCE, result.payment().reference());
        assertEquals(1, result.stays().size());
        var order = inOrder(validation, receipts, catalog, admission, entities, payments, mapping, booking, reservations);
        order.verify(validation).validateAndHash(KEY, input);
        order.verify(receipts).execute(eq(new PublicBookingReceiptRequest(KEY, HASH)), any());
        order.verify(catalog).findProperty(PROPERTY);
        order.verify(catalog).findRoomTypes(PROPERTY);
        order.verify(admission).admit(eq(PROPERTY), eq(List.of(new InventoryDemand(TYPE, new StayDateRange(ARRIVAL, DEPARTURE), 1))), any());
        order.verify(entities).refresh(type);
        order.verify(payments).pay(new PaymentRequest(130000L, "GTQ"));
        order.verify(mapping).map(input);
        order.verify(booking).createBooking(any());
        order.verify(reservations).confirm(RESERVATION);
    }

    @ParameterizedTest
    @ValueSource(longs = {0, -1, 129999, 130001})
    void priceChangedAlwaysPrecedesAdmissionAndPayment(long price) {
        failure(request(1, price, "DEMO_STANDARD"), PublicBookingException.Code.PRICE_CHANGED);
        verifyNoInteractions(admission, payments, mapping, booking, reservations);
    }

    @Test
    void refreshUnderInventoryLockDetectsAConcurrentPriceChangeBeforePayment() {
        doAnswer(call -> { type.rename("DLX", "Deluxe", Instant.now()); return null; }).when(entities).refresh(type);
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.PRICE_CHANGED);
        verifyNoInteractions(payments, mapping, booking, reservations);
    }

    @Test
    void summedDuplicateDemandUsesTheSameRatePolicyWithoutDroppingQuantity() {
        var base = request(1, 390000L, "DEMO_STANDARD");
        var input = new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", base.clientTotalMinor(),
                List.of(new PublicBookingRequest.Stay(TYPE, "DEMO_STANDARD", 2), new PublicBookingRequest.Stay(TYPE, "DEMO_STANDARD", 1)),
                base.bookingGuest(), base.paymentMode());
        assertEquals(3, service.book(KEY, input).stays().size());
        verify(payments).pay(new PaymentRequest(390000L, "GTQ"));
        verify(entities, times(1)).refresh(type);
    }

    @Test
    void noAvailabilityNeverRunsThePaymentOrPersistenceCallback() {
        doThrow(new InventoryExhaustedException()).when(admission).admit(any(), anyList(), any());
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.NO_AVAILABILITY);
        verifyNoInteractions(payments, mapping, booking, reservations);
    }

    @Test
    void declinedPaymentNeverMapsCreatesOrConfirmsABooking() {
        when(payments.pay(any())).thenReturn(new PaymentResult(PaymentResult.Status.DECLINED, null));
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.PAYMENT_DECLINED);
        verifyNoInteractions(mapping, booking, reservations);
    }

    @Test
    void gatewayErrorHasTheApprovedTechnicalCodeWithoutConfirmation() {
        when(payments.pay(any())).thenReturn(new PaymentResult(PaymentResult.Status.ERROR, null));
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.BOOKING_FAILED);
        verifyNoInteractions(mapping, booking, reservations);
    }

    @Test
    void originalReceiptReplayBypassesAllLiveBookingDependencies() {
        var original = service.book(KEY, request(1, 130000L, "DEMO_STANDARD"));
        Instant now = Instant.now();
        var receipt = new PublicBookingReceipt(KEY, HASH, PublicBookingReceipt.Status.COMPLETED, RESERVATION,
                original.confirmationCode(), REFERENCE, json.writeValueAsString(original), now, now);
        doReturn(receipt).when(receipts).execute(any(), any());
        clearInvocations(catalog, admission, entities, payments, mapping, booking, reservations);
        assertEquals(original, service.book(KEY, request(1, 130000L, "DEMO_STANDARD")));
        verifyNoInteractions(catalog, admission, entities, payments, mapping, booking, reservations);
    }

    @Test
    void conflictingKeyRetainsTheJ1ErrorAndDoesNotRepeatEffects() {
        doThrow(new PublicBookingIdempotencyConflictException()).when(receipts).execute(any(), any());
        assertThrows(PublicBookingIdempotencyConflictException.class, () -> service.book(KEY, request(1, 130000L, "DEMO_STANDARD")));
        verifyNoInteractions(catalog, admission, payments, mapping, booking, reservations);
    }

    @Test
    void invalidJ3RequestNeverObtainsAReceipt() {
        when(validation.validateAndHash(any(), any())).thenThrow(new PublicBookingValidationException(PublicBookingValidationException.Code.INVALID_REQUEST));
        assertThrows(PublicBookingValidationException.class, () -> service.book(KEY, request(1, 130000L, "DEMO_STANDARD")));
        verifyNoInteractions(receipts, catalog, admission, payments, mapping, booking, reservations);
    }

    @Test
    void inactiveAndMissingPropertyHaveTheSameApprovedError() {
        for (var property : List.of(Optional.of(property(Property.Status.INACTIVE, "GTQ")), Optional.<Property>empty())) {
            when(catalog.findProperty(PROPERTY)).thenReturn(property);
            var error = assertThrows(PublicBookingValidationException.class, () -> service.book(KEY, request(1, 130000L, "DEMO_STANDARD")));
            assertEquals(PublicBookingValidationException.Code.PROPERTY_NOT_FOUND, error.code());
        }
        verifyNoInteractions(admission, payments, mapping, booking, reservations);
    }

    @Test
    void invalidDemoPlanIsRejectedWithoutUsingClientPricing() {
        var error = assertThrows(PublicBookingValidationException.class, () -> service.book(KEY, request(1, 130000L, "DEMO_SUITE")));
        assertEquals(PublicBookingValidationException.Code.INVALID_REQUEST, error.code());
        verifyNoInteractions(admission, payments, mapping, booking, reservations);
    }

    @Test
    void missingRealTypeIsRejectedWithoutPayment() {
        when(catalog.findRoomTypes(PROPERTY)).thenReturn(List.of());
        assertThrows(PublicBookingValidationException.class, () -> service.book(KEY, request(1, 130000L, "DEMO_STANDARD")));
        verifyNoInteractions(payments, booking, reservations);
    }

    @Test
    void configurationAndUnexpectedErrorsExposeOnlyBookingFailed() {
        when(catalog.findProperty(PROPERTY)).thenReturn(Optional.of(property(Property.Status.ACTIVE, "USD")));
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.BOOKING_FAILED);
        when(catalog.findProperty(PROPERTY)).thenThrow(new IllegalStateException("synthetic internal detail"));
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.BOOKING_FAILED);
        verifyNoInteractions(payments, booking, reservations);
    }

    @Test
    void confirmationFailureAndUnrepresentableSnapshotCannotCompleteAReceipt() {
        when(reservations.confirm(RESERVATION)).thenReturn(reservation(Reservation.Status.PENDING));
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.BOOKING_FAILED);
        when(reservations.confirm(RESERVATION)).thenReturn(reservation(Reservation.Status.CONFIRMED));
        doThrow(new IllegalStateException("synthetic serialization failure")).when(json).writeValueAsString(any(PublicBookingView.class));
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.BOOKING_FAILED);
    }

    @Test
    void partialPersistedDemandIsRejectedBeforeConfirmation() {
        doReturn(new BookingView(reservation(Reservation.Status.PENDING), List.of())).when(booking).createBooking(any());
        failure(request(1, 130000L, "DEMO_STANDARD"), PublicBookingException.Code.BOOKING_FAILED);
        verifyNoInteractions(reservations);
    }

    private void failure(PublicBookingRequest request, PublicBookingException.Code code) {
        var error = assertThrows(PublicBookingException.class, () -> service.book(KEY, request));
        assertEquals(code, error.code());
        assertEquals(code.name(), error.getMessage());
    }
    private Property property(Property.Status status, String currency) {
        return new Property(PROPERTY, UUID.randomUUID(), "J4", "J4 unit", "America/Guatemala", Currency.getInstance(currency), status, Instant.now());
    }
    private ReservationView reservation(Reservation.Status status) {
        return new ReservationView(RESERVATION, PROPERTY, GUEST, "J4-CODE", status, "GTQ", "WEB_DIRECTA", null, null, null, null, Instant.now(), Instant.now());
    }
    private PublicBookingRequest request(int quantity, long total, String plan) {
        return new PublicBookingRequest(PROPERTY, ARRIVAL, DEPARTURE, "GTQ", total, List.of(new PublicBookingRequest.Stay(TYPE, plan, quantity)),
                new PublicBookingRequest.BookingGuest("Ana", "Lopez", "ana@example.test"), PublicBookingRequest.PaymentMode.SIMULATED_CARD);
    }
}
