package com.pms.hotelboutique.backend.modules.reservations.application;

public interface PublicBookingService {
    PublicBookingView book(String idempotencyKey, PublicBookingRequest request);
}
