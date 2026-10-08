package com.pms.hotelboutique.backend.modules.reservations.application;

/** J6 maps this contract code to HTTP 409. No key or payload is included. */
public class PublicBookingIdempotencyConflictException extends RuntimeException {
    public PublicBookingIdempotencyConflictException() { super("IDEMPOTENCY_KEY_REUSED"); }
}
