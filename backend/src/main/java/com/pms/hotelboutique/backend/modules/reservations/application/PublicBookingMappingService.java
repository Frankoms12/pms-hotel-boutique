package com.pms.hotelboutique.backend.modules.reservations.application;

/**
 * Read-only preparation of one existing booking command, without creating any
 * profile, reservation or stay. The caller first validates with J3 and performs
 * pricing/admission before expanding demand. Persistence belongs to the existing
 * ReservationBookingService in the caller's booking transaction.
 */
public interface PublicBookingMappingService {
    CreateBookingCommand map(PublicBookingRequest request);
}
