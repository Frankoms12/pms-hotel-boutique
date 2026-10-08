package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.inventory.application.DemoRatePolicy;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryAdmissionPort;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryDemand;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryExhaustedException;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PublicAvailabilityCatalogRepository;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import static com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingException.Code.*;
import static com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException.Code.INVALID_REQUEST;
import static com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException.Code.PROPERTY_NOT_FOUND;

/** J1 owns the writable READ_COMMITTED transaction, including commit-time failures. */
@Service
public class PublicBookingServiceImpl implements PublicBookingService {
    private final PublicBookingValidationService validation;
    private final PublicBookingReceiptService receipts;
    private final PublicAvailabilityCatalogRepository catalog;
    private final DemoRatePolicy rates;
    private final InventoryAdmissionPort admission;
    private final PaymentGatewayPort payments;
    private final PublicBookingMappingService mapping;
    private final ReservationBookingService booking;
    private final ReservationService reservations;
    private final EntityManager entities;
    private final ObjectMapper json;

    public PublicBookingServiceImpl(PublicBookingValidationService validation, PublicBookingReceiptService receipts,
            PublicAvailabilityCatalogRepository catalog, DemoRatePolicy rates, InventoryAdmissionPort admission,
            PaymentGatewayPort payments, PublicBookingMappingService mapping, ReservationBookingService booking,
            ReservationService reservations, EntityManager entities, ObjectMapper json) {
        this.validation = validation;
        this.receipts = receipts;
        this.catalog = catalog;
        this.rates = rates;
        this.admission = admission;
        this.payments = payments;
        this.mapping = mapping;
        this.booking = booking;
        this.reservations = reservations;
        this.entities = entities;
        this.json = json;
    }

    @Override
    public PublicBookingView book(String idempotencyKey, PublicBookingRequest request) {
        try {
            String hash = validation.validateAndHash(idempotencyKey, request);
            var receipt = receipts.execute(new PublicBookingReceiptRequest(idempotencyKey, hash),
                    () -> create(request));
            // Replays use only this immutable snapshot: no live pricing, payment or booking.
            return json.readValue(receipt.responseSnapshot(), PublicBookingView.class);
        } catch (PublicBookingValidationException | PublicBookingIdempotencyConflictException | PublicBookingException exception) {
            throw exception;
        } catch (InventoryExhaustedException exception) {
            throw new PublicBookingException(NO_AVAILABILITY, exception);
        } catch (ReservationBookingException exception) {
            throw new PublicBookingException(exception.getCause() instanceof InventoryExhaustedException
                    ? NO_AVAILABILITY : BOOKING_FAILED, exception);
        } catch (RuntimeException exception) {
            // Keep causes for internal diagnosis, never their messages in the public code.
            throw new PublicBookingException(BOOKING_FAILED, exception);
        }
    }

    private PublicBookingReceiptResult create(PublicBookingRequest request) {
        var property = catalog.findProperty(request.propertyId())
                .orElseThrow(() -> new PublicBookingValidationException(PROPERTY_NOT_FOUND));
        if (property.getStatus() != Property.Status.ACTIVE) {
            throw new PublicBookingValidationException(PROPERTY_NOT_FOUND);
        }
        if (!rates.currency().equals(property.getCurrency())) { throw new PublicBookingException(BOOKING_FAILED); }
        var types = new HashMap<UUID, RoomType>();
        catalog.findRoomTypes(request.propertyId()).forEach(type -> types.put(type.getId(), type));
        requireClientPrice(request, total(request, types));
        requireRatePlans(request, types);
        var demand = demand(request);
        return admission.admit(request.propertyId(), demand, () -> {
            // Admission locks the real RoomType rows. Refresh prices after waiting for
            // those locks, so a concurrent code change cannot charge a stale demo price.
            var refreshed = new HashSet<UUID>();
            for (var stay : request.stays()) {
                if (refreshed.add(stay.roomTypeId())) { entities.refresh(types.get(stay.roomTypeId())); }
            }
            long total = total(request, types);
            requireClientPrice(request, total);
            requireRatePlans(request, types);
            var payment = payments.pay(new PaymentRequest(total, request.currency()));
            if (payment.status() == PaymentResult.Status.DECLINED) { throw new PublicBookingException(PAYMENT_DECLINED); }
            if (!payment.isApproved()) { throw new PublicBookingException(BOOKING_FAILED); }
            var created = booking.createBooking(mapping.map(request));
            requirePersistedDemand(request, created);
            var confirmed = reservations.confirm(created.reservation().id());
            if (!confirmed.id().equals(created.reservation().id()) || confirmed.status() != Reservation.Status.CONFIRMED) {
                throw new PublicBookingException(BOOKING_FAILED);
            }
            var response = new PublicBookingView(confirmed.id(), confirmed.confirmationCode(), confirmed.status().name(),
                    confirmed.currency(), total, new PublicBookingView.PaymentView(payment.provider(), payment.status().name(), payment.reference()),
                    created.stays().stream().map(stay -> new PublicBookingView.StayView(stay.id(), stay.roomTypeId(),
                            stay.roomId(), stay.arrival(), stay.departure())).toList());
            String snapshot = json.writeValueAsString(response);
            // Check decoding while rollback still covers every local write.
            if (!response.equals(json.readValue(snapshot, PublicBookingView.class))) { throw new PublicBookingException(BOOKING_FAILED); }
            return new PublicBookingReceiptResult(response.reservationId(), response.confirmationCode(), payment.reference(), snapshot);
        });
    }

    private long total(PublicBookingRequest request, Map<UUID, RoomType> types) {
        long total = 0;
        for (var stay : request.stays()) {
            RoomType type = types.get(stay.roomTypeId());
            if (type == null || !request.propertyId().equals(type.getPropertyId())) {
                throw new PublicBookingValidationException(INVALID_REQUEST);
            }
            long perRoom = rates.totalFor(type, request.arrival(), request.departure()).minorUnits().value();
            total = Math.addExact(total, Math.multiplyExact(perRoom, stay.quantity().longValue()));
        }
        return total;
    }

    private void requireRatePlans(PublicBookingRequest request, Map<UUID, RoomType> types) {
        for (var stay : request.stays()) {
            if (!rates.ratePlanCodeFor(types.get(stay.roomTypeId())).equals(stay.ratePlanId())) {
                throw new PublicBookingValidationException(INVALID_REQUEST);
            }
        }
    }

    private static void requireClientPrice(PublicBookingRequest request, long total) {
        if (request.clientTotalMinor() != total) { throw new PublicBookingException(PRICE_CHANGED); }
    }

    private static List<InventoryDemand> demand(PublicBookingRequest request) {
        var demand = new ArrayList<InventoryDemand>();
        int units = 0;
        try {
            for (var stay : request.stays()) {
                units = Math.addExact(units, stay.quantity());
                demand.add(new InventoryDemand(stay.roomTypeId(), new StayDateRange(request.arrival(), request.departure()), stay.quantity()));
            }
        } catch (ArithmeticException exception) { throw new PublicBookingValidationException(INVALID_REQUEST); }
        return List.copyOf(demand);
    }

    private static void requirePersistedDemand(PublicBookingRequest request, BookingView created) {
        var expected = new HashMap<UUID, Integer>();
        request.stays().forEach(stay -> expected.merge(stay.roomTypeId(), stay.quantity(), Math::addExact));
        var actual = new HashMap<UUID, Integer>();
        if (!request.propertyId().equals(created.reservation().propertyId()) || created.reservation().bookingGuestId() == null) {
            throw new PublicBookingException(BOOKING_FAILED);
        }
        for (var stay : created.stays()) {
            if (!created.reservation().id().equals(stay.reservationId()) || !request.propertyId().equals(stay.propertyId())
                    || stay.roomId() != null || !request.arrival().equals(stay.arrival()) || !request.departure().equals(stay.departure())) {
                throw new PublicBookingException(BOOKING_FAILED);
            }
            actual.merge(stay.roomTypeId(), 1, Math::addExact);
        }
        if (!expected.equals(actual) || created.stays().stream().map(ReservationStayView::id).distinct().count() != created.stays().size()) {
            throw new PublicBookingException(BOOKING_FAILED);
        }
    }
}
