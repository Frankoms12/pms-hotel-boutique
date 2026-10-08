package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.UUID;

/**
 * BD3 scope-aware reads (Fase 7, contract C2).
 *
 * Every operation requires an explicit {@link AuthorizedPropertyScope}
 * resolved by BD1's PropertyScopeResolver; there is no global fallback.
 * Repositories receive the authorized ids in their SQL predicates.
 */
public interface ReservationQueryService {

    List<ReservationView> listReservations(AuthorizedPropertyScope scope);

    ReservationView getReservation(AuthorizedPropertyScope scope, UUID reservationId);

    ResponsibleGuestView getResponsibleGuest(AuthorizedPropertyScope scope, UUID reservationId);

    List<ReservationStayView> listStays(AuthorizedPropertyScope scope, UUID reservationId);

    List<FolioView> listFolios(AuthorizedPropertyScope scope);

    FolioView getFolio(AuthorizedPropertyScope scope, UUID folioId);
}
