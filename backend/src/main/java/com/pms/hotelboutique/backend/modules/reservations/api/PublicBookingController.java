package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingService;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Public booking", description = "Public reservations with authoritative demo GTQ pricing and simulated payment")
public class PublicBookingController {
    private final PublicBookingService bookings;

    public PublicBookingController(PublicBookingService bookings) { this.bookings = bookings; }

    @PostMapping(value = "/api/v1/public/bookings", consumes = "application/json", produces = "application/json")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements
    @Operation(operationId = "publicBooking", summary = "Create or replay a public booking", security = {},
            extensions = @Extension(properties = @ExtensionProperty(name = "x-audience", value = "public")),
            description = "Requires Idempotency-Key and SIMULATED_CARD; card data and unknown fields are rejected. "
                    + "New bookings require an ACTIVE property and the official GTQ total. "
                    + "Both creation and replay return 201. Replay returns the original persisted snapshot "
                    + "without another payment, reservation or stay; another payload with the same key is 409.")
    @ApiResponse(responseCode = "201", description = "Persisted CONFIRMED booking, or its original idempotent replay",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = PublicBookingView.class)))
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST or INVALID_DATE_RANGE; includes a missing or invalid Idempotency-Key",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "PROPERTY_NOT_FOUND: missing or inactive property for a new booking",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "NO_AVAILABILITY, PRICE_CHANGED or IDEMPOTENCY_KEY_REUSED",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "422", description = "PAYMENT_DECLINED: simulated payment was rejected",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "BOOKING_FAILED: technical failure; no partial local booking writes",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PublicBookingView book(
            @Parameter(required = true, description = "Opaque key: 8 to 128 Unicode code points, nonblank and without control characters; preserved verbatim",
                    schema = @Schema(type = "string", minLength = 8, maxLength = 128))
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody PublicBookingRequest request) {
        return bookings.book(idempotencyKey, request);
    }
}
