package com.pms.hotelboutique.backend.modules.reservations.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.OptBoolean;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import tools.jackson.databind.annotation.JsonDeserialize;

/** Approved public booking input; J3 validates it without creating a booking. */
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record PublicBookingRequest(
        @NotNull UUID propertyId,
        @NotNull @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd", lenient = OptBoolean.FALSE)
        LocalDate arrival,
        @NotNull @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd", lenient = OptBoolean.FALSE)
        LocalDate departure,
        @NotBlank @Pattern(regexp = "GTQ") String currency,
        @NotNull @JsonDeserialize(using = PublicBookingIntegerDeserializers.ClientTotal.class) Long clientTotalMinor,
        @NotNull @Size(min = 1) List<@NotNull @Valid Stay> stays,
        @NotNull @Valid BookingGuest bookingGuest,
        @NotNull PaymentMode paymentMode) {

    public PublicBookingRequest {
        if (stays != null) {
            // Keep invalid null elements for validation, while preventing later mutation.
            stays = Collections.unmodifiableList(new ArrayList<>(stays));
        }
    }

    public enum PaymentMode { SIMULATED_CARD }

    @Schema(name = "PublicBookingStayRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record Stay(@NotNull UUID roomTypeId, @NotBlank String ratePlanId,
            @NotNull @Positive @JsonDeserialize(using = PublicBookingIntegerDeserializers.Quantity.class) Integer quantity) {
        @JsonAnySetter
        public void rejectUnknown(String field, Object value) {
            throw new IllegalArgumentException("Unknown public booking stay field");
        }
    }

    /** Lengths follow the existing CreateGuestProfileCommand and persistence model. */
    @Schema(name = "PublicBookingGuestRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record BookingGuest(@NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 320) String email) {
        @JsonAnySetter
        public void rejectUnknown(String field, Object value) {
            throw new IllegalArgumentException("Unknown public booking guest field");
        }
    }

    @JsonAnySetter
    public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unknown public booking field");
    }
}
