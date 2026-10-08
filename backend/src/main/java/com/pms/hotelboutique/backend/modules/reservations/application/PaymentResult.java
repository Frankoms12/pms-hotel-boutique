package com.pms.hotelboutique.backend.modules.reservations.application;

import java.util.Objects;

/** Only APPROVED succeeds. Failed simulations carry no payment reference. */
public record PaymentResult(Status status, String reference) {
    public enum Status { APPROVED, DECLINED, ERROR }

    public PaymentResult {
        Objects.requireNonNull(status, "payment status is required");
        if (status == Status.APPROVED) {
            if (reference == null || !reference.matches(
                    "SIM-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
                throw new IllegalArgumentException("approved simulation requires a synthetic reference");
            }
        } else if (reference != null) {
            throw new IllegalArgumentException("failed simulation has no payment reference");
        }
    }

    public String provider() { return "SIMULATED"; }

    public boolean isApproved() { return status == Status.APPROVED; }
}
