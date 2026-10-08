package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomTypeRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.swagger.v3.oas.annotations.media.Schema;

/** Read-only Staff adapter over BD3 queries. Authorization precedes every domain read. */
@Service
@Transactional(readOnly = true)
public class StaffReservationReadService {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final ReservationQueryService queries;
    private final RoomTypeRepository roomTypes;
    private final RoomRepository rooms;

    public StaffReservationReadService(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, ReservationQueryService queries,
            RoomTypeRepository roomTypes, RoomRepository rooms) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.queries = queries;
        this.roomTypes = roomTypes;
        this.rooms = rooms;
    }

    public List<StaffReservation> list(StaffPrincipal principal, UUID propertyId) {
        var scope = authorize(principal, propertyId);
        return queries.listReservations(scope).stream()
                .sorted(Comparator.comparing(ReservationView::createdAt).reversed()
                        .thenComparing(r -> r.id().toString()))
                .map(r -> project(scope, r)).toList();
    }

    public StaffReservation detail(StaffPrincipal principal, UUID propertyId, UUID reservationId) {
        var scope = authorize(principal, propertyId);
        return project(scope, queries.getReservation(scope, reservationId));
    }

    private AuthorizedPropertyScope authorize(StaffPrincipal principal, UUID propertyId) {
        if (principal == null) throw new StaffAuthenticationException();
        var snapshot = authorization.resolve(sessions.getActivePrincipal(principal).staffUserId());
        if (!snapshot.hasPermission("RESERVATION_MANAGE")) throw new AccessDeniedException("Reservation access denied");
        return scopes.resolveProperty(snapshot, propertyId);
    }

    private StaffReservation project(AuthorizedPropertyScope scope, ReservationView reservation) {
        var stays = queries.listStays(scope, reservation.id()).stream()
                .sorted(Comparator.comparing(ReservationStayView::arrival).thenComparing(s -> s.id().toString()))
                .map(s -> {
                    var type = roomTypes.findByIdInScope(scope, s.roomTypeId())
                            .orElseThrow(() -> new IllegalStateException("Missing scoped room type"));
                    var room = s.roomId() == null ? null : rooms.findByIdInScope(scope, s.roomId())
                            .orElseThrow(() -> new IllegalStateException("Missing scoped room"));
                    return new StaffStay(s.id(), s.arrival(), s.departure(), s.status().name(),
                            new StaffRoomType(type.getId(), type.getCode(), type.getName()),
                            room == null ? null : new StaffRoom(room.getId(), room.getCode()));
                }).toList();
        return new StaffReservation(reservation.id(), reservation.propertyId(), reservation.confirmationCode(),
                reservation.status().name(), reservation.sourceChannel(), reservation.sourceReference(),
                reservation.currency(), reservation.createdAt(),
                queries.getResponsibleGuest(scope, reservation.id()), stays);
    }

    public record StaffReservation(UUID reservationId, UUID propertyId, String confirmationCode,
            @Schema(allowableValues = {"PENDING", "CONFIRMED", "CANCELLED"}) String status,
            @Schema(types = {"string", "null"}) String source,
            @Schema(types = {"string", "null"}) String sourceReference,
            String currency, Instant createdAt,
            @Schema(nullable = true, description = "Responsible GuestProfile only, never inferred occupants") ResponsibleGuestView responsibleGuest,
            @Schema(description = "Persisted stays; may be empty for historical reservation headers") List<StaffStay> stays) { }
    public record StaffStay(UUID stayId, LocalDate arrival, LocalDate departure,
            @Schema(allowableValues = {"RESERVED", "IN_HOUSE", "CHECKED_OUT", "CANCELLED", "NO_SHOW"}) String status,
            StaffRoomType roomType, @Schema(nullable = true, description = "Null when no physical room is assigned") StaffRoom room) { }
    public record StaffRoomType(UUID roomTypeId, String code, String name) { }
    public record StaffRoom(UUID roomId, String code) { }
}
