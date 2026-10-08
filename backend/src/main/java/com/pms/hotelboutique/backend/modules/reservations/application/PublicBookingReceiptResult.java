package com.pms.hotelboutique.backend.modules.reservations.application;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Server-created result: approved response JSON only, never the booking request. */
public record PublicBookingReceiptResult(UUID reservationId, String confirmationCode,
        String paymentReference, String responseSnapshot) {
    public PublicBookingReceiptResult {
        if (reservationId == null || confirmationCode == null || confirmationCode.isBlank()
                || confirmationCode.length() > 16
                || paymentReference == null || paymentReference.isBlank()
                || responseSnapshot == null || responseSnapshot.isBlank()
                || !StandardCharsets.UTF_8.newEncoder().canEncode(confirmationCode)
                || !StandardCharsets.UTF_8.newEncoder().canEncode(paymentReference)) {
            throw new IllegalArgumentException("a persisted reservation identity and response snapshot are required");
        }
    }
}
