package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationGuestRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional(readOnly = true)
public class ReservationQueryServiceImpl implements ReservationQueryService {

    private final ReservationRepository reservations;
    private final ReservationStayRepository stays;
    private final ReservationGuestRepository occupants;
    private final FolioRepository folios;

    public ReservationQueryServiceImpl(ReservationRepository reservations,
            ReservationStayRepository stays, ReservationGuestRepository occupants,
            FolioRepository folios) {
        this.reservations = reservations;
        this.stays = stays;
        this.occupants = occupants;
        this.folios = folios;
    }

    @Override
    public List<ReservationView> listReservations(AuthorizedPropertyScope scope) {
        return reservations.findByPropertyIdIn(authorizedIds(scope)).stream()
                .map(ReservationView::from).toList();
    }

    @Override
    public ReservationView getReservation(AuthorizedPropertyScope scope, UUID reservationId) {
        return ReservationView.from(scopedReservation(scope, reservationId));
    }

    @Override
    public ResponsibleGuestView getResponsibleGuest(AuthorizedPropertyScope scope, UUID reservationId) {
        var guest = scopedReservation(scope, reservationId).getBookingGuest();
        return guest == null ? null : new ResponsibleGuestView(guest.getId(), guest.getFirstName(), guest.getLastName());
    }

    @Override
    public List<ReservationStayView> listStays(AuthorizedPropertyScope scope, UUID reservationId) {
        Reservation reservation = scopedReservation(scope, reservationId);
        return stays.findByReservation_IdAndPropertyIdIn(reservation.getId(), authorizedIds(scope)).stream()
                .map(this::stayView).toList();
    }

    @Override
    public List<FolioView> listFolios(AuthorizedPropertyScope scope) {
        return folios.findByPropertyIdIn(authorizedIds(scope)).stream()
                .map(FolioView::from).toList();
    }

    @Override
    public FolioView getFolio(AuthorizedPropertyScope scope, UUID folioId) {
        if (folioId == null) {
            throw new ReservationQueryException("folio id is required");
        }
        Folio folio = folios.findByIdAndPropertyIdIn(folioId, authorizedIds(scope))
                .orElseThrow(() -> new ReservationQueryException("folio not found"));
        return FolioView.from(folio);
    }

    private Reservation scopedReservation(AuthorizedPropertyScope scope, UUID reservationId) {
        if (reservationId == null) {
            throw new ReservationQueryException("reservation id is required");
        }
        authorizedIds(scope);
        return reservations.findByIdInScope(scope, reservationId)
                .orElseThrow(() -> new ReservationQueryException("reservation not found"));
    }

    private ReservationStayView stayView(ReservationStay stay) {
        return ReservationStayView.from(stay, occupants.findByStay_Id(stay.getId()));
    }

    private static java.util.Set<UUID> authorizedIds(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new ReservationQueryException("an explicit property scope is required");
        }
        return scope.propertyIds();
    }
}
