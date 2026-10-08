package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingMappingRepository;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException.Code.*;

@Service
@Transactional(readOnly = true)
public class PublicBookingMappingServiceImpl implements PublicBookingMappingService {
    private final Validator validator;
    private final PublicBookingMappingRepository mapping;

    public PublicBookingMappingServiceImpl(Validator validator, PublicBookingMappingRepository mapping) {
        this.validator = validator;
        this.mapping = mapping;
    }

    @Override
    public CreateBookingCommand map(PublicBookingRequest request) {
        if (request == null || !validator.validate(request).isEmpty()) {
            throw new PublicBookingValidationException(INVALID_REQUEST);
        }
        if (!request.arrival().isBefore(request.departure())) {
            throw new PublicBookingValidationException(INVALID_DATE_RANGE);
        }
        // A Java List represents its size as int. Detect an unrepresentable sum
        // before expansion; this introduces no business limit on room quantities.
        try {
            int units = 0;
            for (var stay : request.stays()) { units = Math.addExact(units, stay.quantity()); }
        } catch (ArithmeticException exception) {
            throw new PublicBookingValidationException(INVALID_REQUEST);
        }
        var checkedTypes = new HashSet<UUID>();
        for (var stay : request.stays()) {
            if (checkedTypes.add(stay.roomTypeId())
                    && !mapping.roomTypeExists(request.propertyId(), stay.roomTypeId())) {
                throw new PublicBookingValidationException(INVALID_REQUEST);
            }
        }
        var guest = request.bookingGuest();
        var booker = mapping.findReusableProfile(request.propertyId(), guest)
                .map(id -> new CreateBookingCommand.BookerBooking(id, null))
                .orElseGet(() -> new CreateBookingCommand.BookerBooking(null,
                        new CreateGuestProfileCommand(null, request.propertyId(), guest.firstName(),
                                guest.lastName(), guest.email(), null, null, null, null)));
        var stays = new ArrayList<CreateBookingCommand.StayBookingCommand>();
        for (var stay : request.stays()) {
            for (int unit = 0; unit < stay.quantity(); unit++) {
                stays.add(new CreateBookingCommand.StayBookingCommand(stay.roomTypeId(), null,
                        request.arrival(), request.departure(), List.of()));
            }
        }
        // Preserve entry order and duplicates; do not normalize Guest data or
        // invent occupants. The legacy profile writer's trim is separately approved.
        return new CreateBookingCommand(request.propertyId(), booker, request.currency(),
                "WEB_DIRECTA", null, null, List.copyOf(stays));
    }
}
