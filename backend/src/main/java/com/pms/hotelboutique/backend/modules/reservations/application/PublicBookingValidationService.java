package com.pms.hotelboutique.backend.modules.reservations.application;

public interface PublicBookingValidationService {
    /** Validates the opaque key, input and real Property, then returns its SHA-256 hash. */
    String validateAndHash(String idempotencyKey, PublicBookingRequest request);
}
