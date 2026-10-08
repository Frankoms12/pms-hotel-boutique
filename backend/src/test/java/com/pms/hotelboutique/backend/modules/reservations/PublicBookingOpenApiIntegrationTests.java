package com.pms.hotelboutique.backend.modules.reservations;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** J6 public contract through the actual A4 security chain and global OpenAPI document. */
@SpringBootTest
@AutoConfigureMockMvc
class PublicBookingOpenApiIntegrationTests {
    private static final String PATH = "/api/v1/public/bookings";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void localBookingOperationDocumentsApprovedStatusesKeyAndPublicAudience() throws Exception {
        var doc = document();
        var path = doc.path("paths").path(PATH);
        assertEquals(Set.of("post"), fields(path));
        var operation = path.path("post");
        assertEquals("publicBooking", operation.path("operationId").asText());
        assertEquals("public", operation.path("x-audience").asText());
        assertTrue(operation.path("security").isMissingNode() || operation.path("security").isEmpty());
        assertEquals(Set.of("201", "400", "404", "409", "422", "500"), fields(operation.path("responses")));
        assertTrue(operation.path("responses").path("201").path("description").asText().contains("replay"));
        assertFalse(operation.path("responses").has("200"));
        assertFalse(operation.path("responses").has("503"));
        assertEquals(1, operation.path("parameters").size());
        var key = operation.path("parameters").get(0);
        assertEquals("Idempotency-Key", key.path("name").asText());
        assertEquals("header", key.path("in").asText());
        assertTrue(key.path("required").asBoolean());
        assertEquals(8, key.path("schema").path("minLength").asInt());
        assertEquals(128, key.path("schema").path("maxLength").asInt());
        assertTrue(operation.path("requestBody").path("required").asBoolean());
        assertEquals(Set.of("application/json"), fields(operation.path("requestBody").path("content")));
        assertEquals("#/components/schemas/PublicBookingRequest", operation.path("requestBody").path("content")
                .path("application/json").path("schema").path("$ref").asText());
        assertEquals("#/components/schemas/PublicBookingResponse", operation.path("responses").path("201")
                .path("content").path("application/json").path("schema").path("$ref").asText());
        for (String code : List.of("400", "404", "409", "422", "500")) {
            assertTrue(operation.path("responses").path(code).path("content").has("application/problem+json"));
        }
    }

    @Test
    void requestSchemasContainOnlyTheApprovedFieldsAndRejectAdditionalProperties() throws Exception {
        var doc = document();
        var request = schema(doc, "PublicBookingRequest");
        var expected = Set.of("propertyId", "arrival", "departure", "currency", "clientTotalMinor", "stays", "bookingGuest", "paymentMode");
        assertEquals(expected, fields(request.path("properties")));
        assertEquals(expected, values(request.path("required")));
        assertTrue(request.has("additionalProperties"));
        assertFalse(request.path("additionalProperties").asBoolean());
        var properties = request.path("properties");
        assertEquals("uuid", properties.path("propertyId").path("format").asText());
        assertEquals("date", properties.path("arrival").path("format").asText());
        assertEquals("date", properties.path("departure").path("format").asText());
        assertEquals("int64", properties.path("clientTotalMinor").path("format").asText());
        assertEquals(Set.of("SIMULATED_CARD"), values(properties.path("paymentMode").path("enum")));
        assertEquals(1, properties.path("stays").path("minItems").asInt());
        var stay = schema(doc, "PublicBookingStayRequest");
        assertEquals(Set.of("roomTypeId", "ratePlanId", "quantity"), fields(stay.path("properties")));
        assertFalse(stay.path("additionalProperties").asBoolean());
        var quantity = stay.path("properties").path("quantity");
        assertEquals("integer", quantity.path("type").asText());
        // OpenAPI 3.1 may express positive integers as > 0 or >= 1.
        if (quantity.path("exclusiveMinimum").isNumber()) {
            assertEquals(0, quantity.path("exclusiveMinimum").asInt());
        } else {
            assertEquals(1, quantity.path("minimum").asInt());
        }
        var guest = schema(doc, "PublicBookingGuestRequest");
        assertEquals(Set.of("firstName", "lastName", "email"), fields(guest.path("properties")));
        assertFalse(guest.path("additionalProperties").asBoolean());
        assertEquals(80, guest.path("properties").path("firstName").path("maxLength").asInt());
        assertEquals(80, guest.path("properties").path("lastName").path("maxLength").asInt());
        assertEquals(320, guest.path("properties").path("email").path("maxLength").asInt());
    }

    @Test
    void responseSchemasDescribePersistedIdentityApprovedSimulationAndExplicitNullRoom() throws Exception {
        var doc = document();
        var response = schema(doc, "PublicBookingResponse");
        var expected = Set.of("reservationId", "confirmationCode", "status", "currency", "totalMinor", "payment", "stays");
        assertEquals(expected, fields(response.path("properties")));
        assertEquals(expected, values(response.path("required")));
        assertEquals("uuid", response.path("properties").path("reservationId").path("format").asText());
        assertEquals("int64", response.path("properties").path("totalMinor").path("format").asText());
        var payment = schema(doc, "PublicBookingPaymentResponse");
        assertEquals(Set.of("provider", "status", "reference"), fields(payment.path("properties")));
        assertEquals(Set.of("SIMULATED"), values(payment.path("properties").path("provider").path("enum")));
        assertEquals(Set.of("APPROVED"), values(payment.path("properties").path("status").path("enum")));
        var stay = schema(doc, "PublicBookingStayResponse");
        var stayFields = Set.of("reservationStayId", "roomTypeId", "roomId", "arrival", "departure");
        assertEquals(stayFields, fields(stay.path("properties")));
        assertEquals(stayFields, values(stay.path("required")));
        assertEquals(Set.of("string", "null"), values(stay.path("properties").path("roomId").path("type")));
        assertEquals("date", stay.path("properties").path("arrival").path("format").asText());
        assertEquals("date", stay.path("properties").path("departure").path("format").asText());
    }

    @Test
    void anonymousBookingReachesTheControllerAndNoOtherPublicRouteWasOpened() throws Exception {
        mvc.perform(post(PATH).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        mvc.perform(put(PATH)).andExpect(status().isUnauthorized());
        mvc.perform(delete(PATH)).andExpect(status().isUnauthorized());
        mvc.perform(post(PATH + "/other")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/public/other")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/properties")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/staff-auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void swaggerLoadsAndBookingAddsExactlyOnePublicOperation() throws Exception {
        var doc = document();
        var publicOperations = new HashSet<String>();
        doc.path("paths").properties().forEach(path -> path.getValue().properties().forEach(method -> {
            if ("public".equals(method.getValue().path("x-audience").asText())) {
                publicOperations.add(method.getKey() + " " + path.getKey());
            }
        }));
        assertEquals(Set.of("get /api/v1/public/availability", "post " + PATH), publicOperations);
        mvc.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection());
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }

    private JsonNode document() throws Exception {
        return json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    private JsonNode schema(JsonNode document, String name) {
        var schema = document.path("components").path("schemas").path(name);
        assertFalse(schema.isMissingNode(), name);
        return schema;
    }
    private Set<String> fields(JsonNode node) {
        var fields = new HashSet<String>();
        node.properties().forEach(entry -> fields.add(entry.getKey()));
        return fields;
    }
    private Set<String> values(JsonNode array) {
        var values = new HashSet<String>();
        array.forEach(value -> values.add(value.asText()));
        return values;
    }
}
