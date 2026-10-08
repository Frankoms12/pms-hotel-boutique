package com.pms.hotelboutique.backend.infrastructure.openapi;

import com.pms.hotelboutique.backend.modules.inventory.api.PublicAvailabilityController;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springdoc.core.customizers.OpenApiCustomizer;
import io.swagger.v3.oas.models.media.Schema;
import java.util.List;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI pmsHotelOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("PMS Hotel Boutique API")
                .version("v1")
                .description("Contratos Backend aprobados de integración Staff, BFF Guest/Staff y disponibilidad pública. "
                    + "Las operaciones x-audience=internal-bff son para transporte privado BFF→Backend; "
                    + "no exponen tokens a JavaScript. Actuator es infraestructura y queda fuera de esta API."))
            .schemaRequirement("bearerAuth", new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Access JWT Staff; sesión activa y permisos/property scope C2 recalculados."))
            .schemaRequirement("guestBearerAuth", new SecurityScheme()
                .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                .description("Access JWT Guest de C3; no habilita APIs Staff."))
            .schemaRequirement("staffRefreshCookie", new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("pms_staff_refresh")
                .description("Refresh opaco Staff reenviado por BFF; no JSON. El BFF reemplaza sus cookies HttpOnly."))
            .schemaRequirement("guestRegistrationBinding",new SecurityScheme().type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-Guest-Registration-Binding").description("BFF-only continuation; independent of JWT/refresh. Never exposed to Browser."))
            .schemaRequirement("guestRefreshCookie", new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("pms_guest_refresh")
                .description("Refresh opaco Guest reenviado por BFF; independiente de Staff."));
    }
    @Bean
    OpenApiCustomizer guestAccountSummaryNullability() {
        return api -> {
            Schema<?> summary = api.getComponents().getSchemas().get("GuestAccountSummaryResponse");
            if (summary == null) return;
            var properties = summary.getProperties();
            // OpenAPI 3.1: object reference OR null, not a reference intersected with type:null.
            String description = properties.get("upcomingStay").getDescription();
            properties.put("upcomingStay", new Schema<>().description(description).anyOf(List.of(
                    new Schema<>().$ref("#/components/schemas/UpcomingStay"),
                    new Schema<>().types(Set.of("null")))));
        };
    }

    @Bean
    OpenApiCustomizer staffReservationNullability() {
        return api -> {
            var schemas = api.getComponents().getSchemas();
            for (String name : List.of("StaffReservation", "StaffStay", "StaffRoomType", "StaffRoom", "ResponsibleGuestView")) {
                var schema = schemas.get(name);
                if (schema != null) schema.setRequired(new java.util.ArrayList<>(schema.getProperties().keySet()));
            }
            for (var field : java.util.Map.of("StaffReservation", "responsibleGuest", "StaffStay", "room").entrySet()) {
                var schema = schemas.get(field.getKey());
                if (schema == null) continue;
                Schema<?> previous = (Schema<?>) schema.getProperties().get(field.getValue());
                String reference = field.getValue().equals("room") ? "StaffRoom" : "ResponsibleGuestView";
                schema.getProperties().put(field.getValue(), new Schema<>().description(previous.getDescription()).anyOf(List.of(
                        new Schema<>().$ref("#/components/schemas/" + reference), new Schema<>().types(Set.of("null")))));
            }
        };
    }

    @Bean
    OperationCustomizer applicationAudience() {
        return (operation, handler) -> {
            String packageName = handler.getBeanType().getPackageName();
            if (packageName.contains(".modules.securityauth.") || packageName.contains(".modules.guestauth.")) {
                operation.addExtension("x-audience", "internal-bff");
                String method = handler.getMethod().getName();
                if (method.equals("login") || method.equals("loginExplicit") || method.equals("start") || method.equals("exchange")) operation.setSecurity(List.of());
            } else if (handler.getBeanType().equals(PublicAvailabilityController.class)) {
                operation.addExtension("x-audience", "public");
                operation.setSecurity(List.of());
            } else if (packageName.contains(".modules.inventory.") || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.reservations.api.StaffReservationController.class)) {
                operation.addExtension("x-audience", "staff");
            }
            return operation;
        };
    }
}
