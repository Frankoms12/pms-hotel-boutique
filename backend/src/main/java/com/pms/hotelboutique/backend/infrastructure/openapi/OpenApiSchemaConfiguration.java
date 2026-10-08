package com.pms.hotelboutique.backend.infrastructure.openapi;

import com.pms.hotelboutique.backend.modules.guestauth.api.GoogleExchangeRequest;
import com.pms.hotelboutique.backend.modules.guestauth.api.ReservationLinkController;
import com.pms.hotelboutique.backend.modules.inventory.api.*;
import com.pms.hotelboutique.backend.modules.securityauth.api.StaffLoginRequest;
import io.swagger.v3.oas.models.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.ArrayList;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Documentation only: express existing validation as portable OpenAPI 3.1 schemas. */
@Configuration
public class OpenApiSchemaConfiguration {
    @Bean
    OpenApiCustomizer existingValidationMetadata() {
        return api -> {
            var schemas = api.getComponents().getSchemas();
            for (Class<?> dto : List.of(com.pms.hotelboutique.backend.modules.guestauth.api.GuestLoginRequest.class,
                    com.pms.hotelboutique.backend.modules.securityauth.api.UnifiedLoginRequest.class, StaffLoginRequest.class, GoogleExchangeRequest.class,
                    ReservationLinkController.ChallengeRequest.class,
                    com.pms.hotelboutique.backend.modules.guestauth.api.GuestRegistrationController.RegistrationRequest.class,
                    com.pms.hotelboutique.backend.modules.guestauth.api.GuestRegistrationController.RegistrationVerifyRequest.class, CreatePropertyRequest.class,
                    CreateRoomTypeRequest.class, CreateRoomRequest.class, PatchRoomRequest.class,
                    CreateRatePlanRequest.class, CatalogPriceRequest.class, PatchPropertyRequest.class,
                    PatchRoomTypeRequest.class, PatchRatePlanRequest.class)) {
                Schema<?> schema = schemas.get(dto.getSimpleName());
                if (schema == null || schema.getProperties() == null) continue;
                for (var field : dto.getDeclaredFields()) {
                    Schema<?> property = schema.getProperties().get(field.getName());
                    if (property == null) continue;
                    // @Size(max=...) defaults min=0; @NotBlank still forbids the empty string.
                    if (field.isAnnotationPresent(NotBlank.class)) {
                        property.setMinLength(Math.max(1, property.getMinLength() == null ? 0 : property.getMinLength()));
                    }
                    var pattern = field.getAnnotation(Pattern.class);
                    if (pattern != null && "(?s).*\\S.*".equals(pattern.regexp())) {
                        // The Java DOTALL prefix is not valid in JSON Schema's ECMA-262 regex.
                        property.setPattern("[\\s\\S]*\\S[\\s\\S]*");
                    }
                }
            }
            Schema<?> night = schemas.get("Night");
            if (night != null && night.getProperties() != null) {
                Schema<?> reason = night.getProperties().get("unavailableReason");
                // OpenAPI 3.1's nullable type does not make an enum accept null by itself.
                if (reason != null && reason.getEnum() != null && !reason.getEnum().contains(null)) {
                    allowNullEnum(reason);
                }
            }
            Schema<?> report = schemas.get("DailyOnBooksResponse");
            if (report != null && report.getProperties() != null && report.getProperties().containsKey("rows")) {
                report.getProperties().get("rows").setMaxItems(50000);
            }
        };
    }

    private static <T> void allowNullEnum(Schema<T> schema) {
        var values = new ArrayList<T>(schema.getEnum());
        values.add(null);
        schema.setEnum(values);
    }
}
