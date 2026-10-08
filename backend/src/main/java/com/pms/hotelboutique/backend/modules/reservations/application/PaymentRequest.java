package com.pms.hotelboutique.backend.modules.reservations.application;

/** Exact server-calculated minor units; pricing and amount policy belong to the caller. */
public record PaymentRequest(long amountMinor, String currency) {
    public PaymentRequest {
        if (!"GTQ".equals(currency)) {
            throw new IllegalArgumentException("simulated booking payment requires GTQ");
        }
    }
}
