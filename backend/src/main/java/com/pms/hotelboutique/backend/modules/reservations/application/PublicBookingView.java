package com.pms.hotelboutique.backend.modules.reservations.application;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** The approved response snapshot, with no Guest, scope or card metadata. */
@JsonInclude(JsonInclude.Include.ALWAYS)
@Schema(name = "PublicBookingResponse", requiredProperties = {"reservationId", "confirmationCode", "status", "currency", "totalMinor", "payment", "stays"})
public record PublicBookingView(UUID reservationId, String confirmationCode,
        @Schema(allowableValues = "CONFIRMED") String status,
        @Schema(allowableValues = "GTQ") String currency, long totalMinor, PaymentView payment, List<StayView> stays) {
    public PublicBookingView {
        Objects.requireNonNull(reservationId, "reservation identity is required");
        if (confirmationCode == null || confirmationCode.isBlank()
                || !"CONFIRMED".equals(status) || !"GTQ".equals(currency)) {
            throw new IllegalArgumentException("a confirmed GTQ booking is required");
        }
        Objects.requireNonNull(payment, "simulated payment is required");
        stays = List.copyOf(stays);
        if (stays.isEmpty()) { throw new IllegalArgumentException("persisted stays are required"); }
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @Schema(name = "PublicBookingPaymentResponse", requiredProperties = {"provider", "status", "reference"})
    public record PaymentView(@Schema(allowableValues = "SIMULATED") String provider,
            @Schema(allowableValues = "APPROVED") String status, String reference) {
        public PaymentView {
            if (!"SIMULATED".equals(provider) || !"APPROVED".equals(status)
                    || reference == null || reference.isBlank()) {
                throw new IllegalArgumentException("approved simulated payment is required");
            }
        }
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @Schema(name = "PublicBookingStayResponse", requiredProperties = {"reservationStayId", "roomTypeId", "roomId", "arrival", "departure"})
    public record StayView(UUID reservationStayId, UUID roomTypeId,
            @Schema(types = {"string", "null"}, format = "uuid", description = "Always null in this phase; no physical room assigned") UUID roomId,
            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd") LocalDate arrival,
            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd") LocalDate departure) {
        public StayView {
            Objects.requireNonNull(reservationStayId, "persisted stay identity is required");
            Objects.requireNonNull(roomTypeId, "real room type identity is required");
            if (roomId != null || arrival == null || departure == null || !arrival.isBefore(departure)) {
                throw new IllegalArgumentException("unassigned stay with valid dates is required");
            }
        }
    }
}
