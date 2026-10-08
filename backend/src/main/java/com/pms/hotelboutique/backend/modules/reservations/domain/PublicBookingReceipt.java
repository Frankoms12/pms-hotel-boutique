package com.pms.hotelboutique.backend.modules.reservations.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Immutable completed result, independent of the Reservation's later mutable lifecycle. */
public record PublicBookingReceipt(String idempotencyKey, String requestHash, Status status,
        UUID reservationId, String confirmationCode, String paymentReference,
        String responseSnapshot, Instant createdAt, Instant updatedAt) {
    public enum Status { COMPLETED }

    public PublicBookingReceipt {
        Objects.requireNonNull(idempotencyKey);
        Objects.requireNonNull(requestHash);
        Objects.requireNonNull(status);
        Objects.requireNonNull(reservationId);
        Objects.requireNonNull(confirmationCode);
        Objects.requireNonNull(paymentReference);
        Objects.requireNonNull(responseSnapshot);
        Objects.requireNonNull(createdAt);
        if (!createdAt.equals(updatedAt)) {
            throw new IllegalArgumentException("a completed receipt's timestamps are immutable");
        }
    }
}
