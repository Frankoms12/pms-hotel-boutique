package com.pms.hotelboutique.backend.infrastructure.openapi;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.Map;
import java.util.List;
import java.util.HashSet;
import org.springframework.core.annotation.AnnotatedElementUtils;
import tools.jackson.databind.JsonNode;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractIntegrationTests {
    // Add only exclusions justified in docs/39_BACKEND_OPENAPI_BASELINE.md.
    private static final Map<String, String> DOCUMENTED_EXCLUSIONS = Map.of();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping mappings;

    @Test
    void generatedPathsAndMethodsMatchRealApplicationMappings() throws Exception {
        String raw = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var doc = json.readTree(raw);
        Set<String> expected = new TreeSet<>();
        mappings.getHandlerMethods().forEach((mapping, handler) -> {
            if (!handler.getBeanType().getPackageName().startsWith("com.pms.hotelboutique.backend.modules")
                    || !AnnotatedElementUtils.hasAnnotation(handler.getBeanType(), RestController.class)) return;
            for (String path : mapping.getPatternValues()) {
                for (var method : mapping.getMethodsCondition().getMethods()) expected.add(method.name() + " " + path);
            }
        });
        Set<String> actual = new TreeSet<>();
        doc.path("paths").properties().forEach(entry -> entry.getValue().properties().forEach(operation -> {
            if (Set.of("get", "post", "put", "patch", "delete", "head", "options", "trace").contains(operation.getKey())) {
                actual.add(operation.getKey().toUpperCase() + " " + entry.getKey());
            }
        }));
        Files.createDirectories(Path.of("target"));
        Files.writeString(Path.of("target/openapi-generated.json"), raw);
        Files.write(Path.of("target/openapi-application-mappings.txt"), expected);
        DOCUMENTED_EXCLUSIONS.values().forEach(reason -> assertFalse(reason.isBlank()));
        assertTrue(expected.containsAll(DOCUMENTED_EXCLUSIONS.keySet()));
        expected.removeAll(DOCUMENTED_EXCLUSIONS.keySet());
        assertEquals(expected, actual);
        Set<String> expectedPaths = new HashSet<>();
        expected.forEach(mapping -> expectedPaths.add(mapping.substring(mapping.indexOf(' ') + 1)));
        assertEquals(expectedPaths.size(), doc.path("paths").size());
        Files.writeString(Path.of("target/openapi-inventory-counts.txt"),
                "operations=" + actual.size() + " paths=" + doc.path("paths").size()
                + " schemas=" + doc.path("components").path("schemas").size()
                + " tags=" + doc.path("tags").size());
    }
    @Test
    void verifiedRegistrationHasExactSchemasAndBffBinding() throws Exception {
        var doc=document();var schemas=doc.path("components").path("schemas");
        var request=schemas.path("RegistrationRequest");
        assertEquals(Set.of("email","password"),strings(request.path("required")));
        assertEquals(50,request.path("properties").path("email").path("maxLength").asInt());
        var password=request.path("properties").path("password");assertEquals(8,password.path("minLength").asInt());assertEquals(50,password.path("maxLength").asInt());assertTrue(password.path("writeOnly").asBoolean());
        assertTrue(password.path("description").asText().contains("72 bytes UTF-8"));
        assertFalse(request.path("additionalProperties").asBoolean());
        var verify=operation(doc,"/api/v1/guest-auth/registrations/verify","post");assertSuccessSchema(verify,"201","GuestAuthResponse");
        assertTrue(verify.path("security").get(0).has("guestRegistrationBinding"));
        assertTrue(schemas.path("RegistrationVerifyRequest").path("properties").path("otp").path("writeOnly").asBoolean());
        var register=operation(doc,"/api/v1/guest-auth/registrations","post");assertSuccessSchema(register,"202","RegistrationAccepted");
        assertEquals(Set.of("requestId"),strings(schemas.path("RegistrationAccepted").path("required")));
    }

    @Test
    void guestAccountSummaryDocumentsOwnIdentityAndOptionalRealDataOnly() throws Exception {
        var doc = document();
        var op = operation(doc, "/api/v1/guest-auth/account/summary", "get");
        assertEquals("Resumen de mi cuenta", op.path("summary").asText());
        assertTrue(op.path("parameters").isMissingNode() || op.path("parameters").isEmpty());
        assertFalse(op.has("requestBody"));
        assertEquals("internal-bff", op.path("x-audience").asText());
        assertTrue(op.path("security").get(0).has("guestBearerAuth"));
        assertSuccessSchema(op, "200", "GuestAccountSummaryResponse");
        assertTrue(op.path("responses").has("401"));
        assertFalse(op.path("responses").has("404"));
        assertTrue(op.path("responses").path("200").path("headers").has("Cache-Control"));
        var schema = doc.path("components").path("schemas").path("GuestAccountSummaryResponse");
        var fields = new HashSet<String>();
        schema.path("properties").properties().forEach(p -> fields.add(p.getKey()));
        assertEquals(Set.of("guestAccountId", "email", "active", "profiles", "linkedReservationsCount", "upcomingStay"), fields);
        assertEquals("array", schema.path("properties").path("profiles").path("type").asText());
        assertTrue(schema.path("properties").has("upcomingStay"));
        var nullableStay = schema.path("properties").path("upcomingStay");
        assertFalse(nullableStay.has("$ref"));
        assertEquals(2, nullableStay.path("anyOf").size());
        assertEquals("#/components/schemas/UpcomingStay", nullableStay.path("anyOf").get(0).path("$ref").asText());
        assertEquals("null", nullableStay.path("anyOf").get(1).path("type").asText());
        var profile = doc.path("components").path("schemas").path("Profile");
        assertTrue(profile.path("properties").path("preferredLanguage").path("type").toString().contains("null"));
    }

    @Test
    void securitySchemesAndEveryOperationAudienceMatchTheActualTransport() throws Exception {
        var doc = document();
        var schemes = doc.path("components").path("securitySchemes");
        for (String name : List.of("bearerAuth", "guestBearerAuth")) {
            assertEquals("http", schemes.path(name).path("type").asText());
            assertEquals("bearer", schemes.path(name).path("scheme").asText());
            assertEquals("JWT", schemes.path(name).path("bearerFormat").asText());
        }
        for (var entry : Map.of("staffRefreshCookie", "pms_staff_refresh", "guestRefreshCookie", "pms_guest_refresh").entrySet()) {
            assertEquals("apiKey", schemes.path(entry.getKey()).path("type").asText());
            assertEquals("cookie", schemes.path(entry.getKey()).path("in").asText());
            assertEquals(entry.getValue(), schemes.path(entry.getKey()).path("name").asText());
        }
        doc.path("paths").properties().forEach(path -> path.getValue().properties().forEach(method -> {
            String route = path.getKey();
            var op = method.getValue();
            boolean staffAuth = (route.startsWith("/api/v1/staff-auth/") || route.startsWith("/api/v1/auth/"));
            boolean guestAuth = route.startsWith("/api/v1/guest-auth/");
            boolean publicAvailability = route.equals("/api/v1/public/availability") && method.getKey().equals("get");
            boolean publicBooking = route.equals("/api/v1/public/bookings") && method.getKey().equals("post");
            assertEquals(publicAvailability || publicBooking ? "public" : staffAuth || guestAuth ? "internal-bff" : "staff", op.path("x-audience").asText());
            boolean anonymous = route.endsWith("/google/start") || route.endsWith("/google/exchange")
                    || route.equals("/api/v1/auth/sessions") || route.equals("/api/v1/guest-auth/sessions") || route.equals("/api/v1/staff-auth/sessions") || route.equals("/api/v1/staff-auth/login") || route.equals("/api/v1/guest-auth/registrations") || publicAvailability || publicBooking;
            if (anonymous) assertTrue(op.path("security").isMissingNode() || op.path("security").isEmpty());
            else {
                String scheme = route.endsWith("/refresh") ? (staffAuth ? "staffRefreshCookie" : "guestRefreshCookie")
                        : route.startsWith("/api/v1/guest-auth/registrations/") ? "guestRegistrationBinding" : guestAuth ? "guestBearerAuth" : "bearerAuth";
                assertEquals(1, op.path("security").size());
                assertTrue(op.path("security").get(0).has(scheme), route + " " + method.getKey());
            }
            assertFalse(route.startsWith("/actuator") || route.equals("/error"));
        }));
    }

    @Test
    void publicAvailabilityDocumentsExactAnonymousContractAndSwaggerLoads() throws Exception {
        var doc = document();
        var op = operation(doc, "/api/v1/public/availability", "get");
        assertEquals("publicAvailability", op.path("operationId").asText());
        assertEquals("availability", operation(doc, "/api/v1/properties/{propertyId}/availability", "get")
                .path("operationId").asText());
        assertEquals("public", op.path("x-audience").asText());
        assertTrue(op.path("security").isArray());
        assertEquals(0, op.path("security").size());
        assertFalse(op.has("requestBody"));
        assertEquals(Set.of("propertyId", "arrival", "departure", "rooms"), parameterNames(op));
        for (var parameter : op.path("parameters")) {
            assertEquals("query", parameter.path("in").asText());
            assertTrue(parameter.path("required").asBoolean());
        }
        assertEquals("uuid", parameter(op, "propertyId").path("schema").path("format").asText());
        for (String date : List.of("arrival", "departure")) {
            assertEquals("date", parameter(op, date).path("schema").path("format").asText());
        }
        assertEquals("integer", parameter(op, "rooms").path("schema").path("type").asText());
        assertEquals(1, parameter(op, "rooms").path("schema").path("minimum").asInt());
        assertCodes(op, "200", "400", "404", "500");
        assertSuccessSchema(op, "200", "PublicAvailabilityResponse");
        for (String code : List.of("400", "404", "500")) {
            assertEquals("#/components/schemas/ProblemDetail", op.path("responses").path(code)
                    .path("content").path("application/problem+json").path("schema").path("$ref").asText());
        }
        var schemas = doc.path("components").path("schemas");
        var expected = Map.of("PublicAvailabilityResponse", Set.of("propertyId", "arrival", "departure", "currency", "offers"),
                "PublicAvailabilityOfferResponse", Set.of("roomTypeId", "roomTypeCode", "roomTypeName", "ratePlanId",
                        "ratePlanCode", "availableUnits", "nightlyRateMinor", "totalMinor"));
        expected.forEach((name, fields) -> {
            var schema = schemas.path(name);
            Set<String> actual = new HashSet<>();
            schema.path("properties").properties().forEach(field -> actual.add(field.getKey()));
            assertEquals(fields, actual);
            assertEquals(fields, strings(schema.path("required")));
        });
        assertEquals("#/components/schemas/PublicAvailabilityOfferResponse", schemas.path("PublicAvailabilityResponse")
                .path("properties").path("offers").path("items").path("$ref").asText());
        assertEquals(Set.of("GTQ"), strings(schemas.path("PublicAvailabilityResponse").path("properties").path("currency").path("enum")));
        for (String amount : List.of("nightlyRateMinor", "totalMinor")) {
            var schema = schemas.path("PublicAvailabilityOfferResponse").path("properties").path(amount);
            assertEquals("integer", schema.path("type").asText());
            assertEquals("int64", schema.path("format").asText());
        }
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
        mvc.perform(get("/v3/api-docs/swagger-config")).andExpect(status().isOk());
    }

    @Test
    void explicitAuthAliasesPreserveContractAndDeprecateOnlyHistoricalOperations() throws Exception {
        var doc = document();
        Set<String> deprecated = new TreeSet<>();
        Set<String> ids = new HashSet<>();
        doc.path("paths").properties().forEach(path -> path.getValue().properties().forEach(method -> {
            var op = method.getValue();
            if (op.path("deprecated").asBoolean()) deprecated.add(method.getKey() + " " + path.getKey());
            assertFalse(op.path("operationId").asText().isBlank());
            assertTrue(ids.add(op.path("operationId").asText()), "duplicate operationId");
        }));
        assertEquals(Set.of("post /api/v1/staff-auth/sessions", "get /api/v1/staff-auth/session",
                "delete /api/v1/staff-auth/session", "get /api/v1/guest-auth/session", "delete /api/v1/guest-auth/session"), deprecated);
        for (String prefix : List.of("/api/v1/staff-auth", "/api/v1/guest-auth")) {
            for (var alias : List.of(List.of("/session", "get", "/me", "get", "Usuario actual"),
                    List.of("/session", "delete", "/logout", "post", "Cerrar sesión"))) {
                assertAlias(doc, prefix, alias);
            }
            var me = operation(doc, prefix + "/me", "get");
            assertCodes(me, "200", "401");
            assertSuccessSchema(me, "200", prefix.endsWith("staff-auth") ? "StaffSessionResponse" : "GuestSessionResponse");
            assertCodes(operation(doc, prefix + "/logout", "post"), "204", "401");
            assertEquals("Renovar sesión", operation(doc, prefix + "/refresh", "post").path("summary").asText());
            assertFalse(doc.path("paths").path(prefix + "/logout").has("delete"));
            assertFalse(doc.path("paths").path(prefix + "/session").has("post"));
        }
        assertAlias(doc, "/api/v1/staff-auth", List.of("/sessions", "post", "/login", "post", "Iniciar sesión"));
        assertCodes(operation(doc, "/api/v1/staff-auth/login", "post"), "201", "400", "401");
        assertSuccessSchema(operation(doc, "/api/v1/staff-auth/login", "post"), "201", "StaffAuthResponse");
        assertTrue(operation(doc, "/api/v1/guest-auth/google/start", "post").path("summary").asText().startsWith("Iniciar sesión con Google"));
        assertTrue(operation(doc, "/api/v1/guest-auth/google/exchange", "post").path("summary").asText().startsWith("Iniciar sesión con Google"));
        assertFalse(doc.path("paths").has("/api/v1/guest-auth/login"));
    }

    private void assertAlias(JsonNode doc, String prefix, List<String> alias) {
        var legacy = operation(doc, prefix + alias.get(0), alias.get(1));
        var current = operation(doc, prefix + alias.get(2), alias.get(3));
        assertTrue(legacy.path("deprecated").asBoolean());
        assertFalse(current.path("deprecated").asBoolean());
        assertTrue(legacy.path("description").asText().contains(alias.get(3).toUpperCase() + " " + prefix + alias.get(2)));
        assertEquals(alias.get(4), legacy.path("summary").asText());
        assertEquals(alias.get(4), current.path("summary").asText());
        for (String field : List.of("responses", "requestBody", "parameters", "security", "x-audience")) {
            assertEquals(legacy.path(field), current.path(field), prefix + " " + alias.get(2) + " " + field);
        }
    }

    @Test
    void successAndContractualErrorsHaveCorrectCodesAndBodies() throws Exception {
        var doc = document();
        for (String prefix : List.of("/api/v1/staff-auth", "/api/v1/guest-auth")) {
            String create = prefix.endsWith("staff-auth") ? prefix + "/sessions" : prefix + "/google/exchange";
            assertCodes(operation(doc, create, "post"), "201", "400", "401");
            assertSuccessSchema(operation(doc, create, "post"), "201",
                    prefix.endsWith("staff-auth") ? "StaffAuthResponse" : "GuestAuthResponse");
            assertCodes(operation(doc, prefix + "/refresh", "post"), "200", "401");
            assertCodes(operation(doc, prefix + "/session", "get"), "200", "401");
            var logout = operation(doc, prefix + "/session", "delete");
            assertCodes(logout, "204", "401");
            assertTrue(logout.path("responses").path("204").path("content").isMissingNode()
                    || logout.path("responses").path("204").path("content").isEmpty());
        }
        var issue = operation(doc, "/api/v1/guest-auth/reservation-links/challenges", "post");
        assertCodes(issue, "202", "400", "401");
        assertSuccessSchema(issue, "202", "ChallengeResponse");
        var verify = operation(doc, "/api/v1/guest-auth/reservation-links/verify", "post");
        assertCodes(verify, "204", "400", "401", "422");
        assertEquals("#/components/schemas/ProblemDetail",
                verify.path("responses").path("422").path("content").path("application/problem+json").path("schema").path("$ref").asText());
        var report = operation(doc, "/api/v1/reports/on-books/daily", "get");
        assertCodes(report, "200", "400", "401", "403");
        assertSuccessSchema(report, "200", "DailyOnBooksResponse");
        assertTrue(report.path("responses").path("200").path("headers").has("Cache-Control"));
        assertCodes(operation(doc, "/api/v1/properties/{propertyId}/availability", "get"), "200", "400", "401", "403", "404");
        for (var entry : Map.of("/api/v1/properties", "PropertyView",
                "/api/v1/properties/{propertyId}/room-types", "RoomTypeView",
                "/api/v1/properties/{propertyId}/rooms", "RoomView",
                "/api/v1/properties/{propertyId}/rate-plans", "RatePlanView").entrySet()) {
            var create = operation(doc, entry.getKey(), "post");
            assertSuccessSchema(create, "201", entry.getValue());
            for (String code : List.of("400", "401", "403", "409")) assertTrue(create.path("responses").has(code));
            assertTrue(create.path("responses").path("200").isMissingNode());
            assertEquals("uri-reference", create.path("responses").path("201").path("headers").path("Location").path("schema").path("format").asText());
            var list = operation(doc, entry.getKey(), "get");
            assertEquals("#/components/schemas/" + entry.getValue(),
                    list.path("responses").path("200").path("content").path("application/json").path("schema").path("items").path("$ref").asText());
        }
    }

    @Test
    void pathQueryParametersAndJsonBodiesAreExplicitWithoutServerPrincipals() throws Exception {
        var doc = document();
        doc.path("paths").properties().forEach(path -> path.getValue().properties().forEach(method -> {
            var op = method.getValue();
            assertFalse(op.path("summary").asText().isBlank());
            var names = new HashSet<String>();
            for (var parameter : op.path("parameters")) {
                String name = parameter.path("name").asText();
                assertTrue(names.add(parameter.path("in").asText() + ":" + name), "duplicate parameter");
                assertFalse(Set.of("principal", "staffUserId", "sessionId", "username", "roleCode").contains(name), name);
                if (parameter.path("in").asText().equals("path")) {
                    assertTrue(parameter.path("required").asBoolean());
                    assertEquals("uuid", parameter.path("schema").path("format").asText());
                    assertTrue(path.getKey().contains("{" + name + "}"));
                }
            }
            if (op.has("requestBody")) {
                assertTrue(op.path("requestBody").path("required").asBoolean());
                assertTrue(op.path("requestBody").path("content").has("application/json"));
            }
        }));
        var report = operation(doc, "/api/v1/reports/on-books/daily", "get");
        assertEquals(Set.of("from", "to", "propertyId", "scope"), parameterNames(report));
        for (String name : List.of("from", "to")) {
            var parameter = parameter(report, name);
            assertTrue(parameter.path("required").asBoolean());
            assertEquals("date", parameter.path("schema").path("format").asText());
        }
        assertEquals("uuid", parameter(report, "propertyId").path("schema").path("format").asText());
        assertEquals("ALL_PROPERTIES", parameter(report, "scope").path("schema").path("enum").get(0).asText());
        assertTrue(report.path("description").asText().contains("366"));
        assertTrue(report.path("description").asText().contains("50000"));
        assertFalse(parameterNames(report).contains("cursor"));
        var available = operation(doc, "/api/v1/properties/{propertyId}/availability", "get");
        assertEquals(Set.of("propertyId", "roomTypeId", "arrival", "departure"), parameterNames(available));
        assertEquals("date", parameter(available, "arrival").path("schema").path("format").asText());
        assertEquals("date", parameter(available, "departure").path("schema").path("format").asText());
    }

    @Test
    void universalLoginDocumentsEmailPasswordsAndAnonymousBffTransport() throws Exception {
        var doc = document();
        for (String name : List.of("StaffLoginRequest", "GuestLoginRequest", "UnifiedLoginRequest")) {
            var schema = doc.path("components").path("schemas").path(name);
            assertEquals(Set.of("email", "password"), strings(schema.path("required")));
            assertFalse(schema.path("properties").has("username"));
            assertEquals("email", schema.path("properties").path("email").path("format").asText());
            assertEquals(50, schema.path("properties").path("email").path("maxLength").asInt());
            assertTrue(schema.path("properties").path("password").path("writeOnly").asBoolean());
            assertEquals(50, schema.path("properties").path("password").path("maxLength").asInt());
            assertEquals("password", schema.path("properties").path("password").path("format").asText());
            assertEquals(1, schema.path("properties").path("password").path("minLength").asInt());
        }
        for (String route : List.of("/api/v1/auth/sessions", "/api/v1/guest-auth/sessions", "/api/v1/staff-auth/sessions")) {
            var op = operation(doc, route, "post");
            assertEquals("internal-bff", op.path("x-audience").asText());
            assertTrue(op.path("security").isArray());
            assertEquals(0, op.path("security").size());
            for (String status : List.of("201", "400", "401")) assertTrue(op.path("responses").has(status));
        }
        assertEquals("guestPasswordLogin", operation(doc,"/api/v1/guest-auth/sessions","post").path("operationId").asText());
        assertEquals("unifiedPasswordLogin", operation(doc,"/api/v1/auth/sessions","post").path("operationId").asText());
        assertTrue(operation(doc,"/api/v1/auth/sessions","post").path("responses").has("200"));
    }

    @Test
    void dtoValidationNullabilityAndPrivacyAreFaithfulToWireContracts() throws Exception {
        var doc = document();
        var schemas = doc.path("components").path("schemas");
        assertFalse(schemas.has("StaffPrincipal") || schemas.has("GuestPrincipal") || schemas.has("StaffUser"));
        var login = schemas.path("StaffLoginRequest");
        assertEquals(Set.of("email", "password"), strings(login.path("required")));
        var password = login.path("properties").path("password");
        assertTrue(password.path("writeOnly").asBoolean());
        assertEquals("password", password.path("format").asText());
        assertEquals(50, password.path("maxLength").asInt());
        assertEquals(1, password.path("minLength").asInt());
        for (String name : List.of("StaffAuthResponse", "GuestAuthResponse")) {
            var tokens = schemas.path(name);
            assertEquals(Set.of("accessToken", "refreshToken", "accessTokenExpiresInSeconds"), strings(tokens.path("required")));
            for (String field : List.of("accessToken", "refreshToken")) assertNoExamples(tokens.path("properties").path(field));
        }
        for (String name : List.of("PatchPropertyRequest", "PatchRoomTypeRequest", "PatchRatePlanRequest")) {
            var patch = schemas.path(name);
            assertFalse(patch.path("additionalProperties").asBoolean(true));
            assertEquals(1, patch.path("minProperties").asInt());
            assertTrue(patch.path("required").isMissingNode() || patch.path("required").isEmpty());
            assertEquals("[\\s\\S]*\\S[\\s\\S]*", patch.path("properties").path("code").path("pattern").asText());
            assertEquals("string", patch.path("properties").path("code").path("type").asText());
        }
        var night = schemas.path("Night");
        assertEquals(Set.of("number", "null"), strings(night.path("properties").path("onBooksPercent").path("type")));
        assertTrue(night.path("properties").path("onBooksPercent").path("maximum").isMissingNode());
        assertEquals(Set.of("string", "null"), strings(night.path("properties").path("unavailableReason").path("type")));
        var reasons = night.path("properties").path("unavailableReason").path("enum");
        assertTrue(strings(reasons).contains("NO_AVAILABLE_ROOMS"));
        boolean acceptsNull = false;
        for (var reason : reasons) acceptsNull |= reason.isNull();
        assertTrue(acceptsNull, "nullable enum must also accept JSON null");
        assertEquals(50000, schemas.path("DailyOnBooksResponse").path("properties").path("rows").path("maxItems").asInt());
        assertEquals("string", schemas.path("CatalogPriceRequest").path("properties").path("amount").path("type").asText());
        var otp = schemas.path("VerifyRequest").path("properties").path("otp");
        assertEquals("[0-9]{8}", otp.path("pattern").asText());
        assertTrue(otp.path("writeOnly").asBoolean());
        assertNoExamples(otp);
        assertNoExamples(password);
        assertNoExamples(schemas.path("GoogleExchangeRequest").path("properties").path("code"));
        assertNoExamples(schemas.path("GoogleExchangeRequest").path("properties").path("state"));
        assertNoExamples(schemas.path("GuestSessionResponse").path("properties").path("email"));
    }

    @Test
    void catalogCrudSchemasErrorsAndScopeRemainDocumented() throws Exception {
        var doc = document();
        var schemas = doc.path("components").path("schemas");
        for (String catalog : List.of("Property", "RoomType", "Room", "RatePlan")) {
            String collection = switch (catalog) {
                case "Property" -> "/api/v1/properties";
                case "RoomType" -> "/api/v1/properties/{propertyId}/room-types";
                case "Room" -> "/api/v1/properties/{propertyId}/rooms";
                default -> "/api/v1/properties/{propertyId}/rate-plans";
            };
            String id = Character.toLowerCase(catalog.charAt(0)) + catalog.substring(1) + "Id";
            String detail = collection + "/{" + id + "}";
            assertCodes(operation(doc, detail, "get"), "200", "400", "401", "403", "404");
            var patch = operation(doc, detail, "patch");
            assertCodes(patch, "200", "400", "401", "403", "404", "409");
            assertSuccessSchema(patch, "200", catalog + "View");
            assertTrue(patch.path("description").asText().contains("COMMERCIAL_MANAGE"));
            for (String prefix : List.of("Create", "Patch")) {
                String request = prefix + catalog + "Request";
                var op = prefix.equals("Create") ? operation(doc, collection, "post") : patch;
                assertEquals("#/components/schemas/" + request,
                        op.path("requestBody").path("content").path("application/json").path("schema").path("$ref").asText());
                assertFalse(schemas.path(request).path("additionalProperties").asBoolean(true));
            }
            var view = schemas.path(catalog + "View");
            var fields = new TreeSet<String>();
            view.path("properties").properties().forEach(entry -> fields.add(entry.getKey()));
            assertEquals(fields, strings(view.path("required")), catalog + " output fields");
            assertTrue(doc.path("paths").path(detail).path("delete").isMissingNode());
        }
        assertTrue(operation(doc, "/api/v1/properties", "get").path("description").asText().contains("MULTI_PROPERTY_READ"));
        var available = operation(doc, "/api/v1/properties/{propertyId}/availability", "get").path("description").asText();
        assertTrue(available.contains("RESERVATION_MANAGE") && available.contains("COMMERCIAL_MANAGE"));
    }

    @Test
    void allLocalSchemaReferencesResolve() throws Exception {
        var doc = document();
        checkReferences(doc, doc);
    }

    @Test
    void schemaAnnotationsDoNotAlterHttpAuthenticationOrValidation() throws Exception {
        mvc.perform(post("/api/v1/staff-auth/sessions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"\",\"password\":\"\"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/staff-auth/refresh")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/guest-auth/refresh")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/staff-auth/session")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/guest-auth/session")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/reports/on-books/daily")).andExpect(status().isUnauthorized());
    }

    @Test
    void staffReservationsDocumentReadOnlyScopeAndNullableRealData() throws Exception {
        var doc = document();
        for (String route : List.of("/api/v1/reservations", "/api/v1/reservations/{reservationId}")) {
            var op = operation(doc, route, "get");
            assertEquals("staff", op.path("x-audience").asText());
            assertTrue(op.path("security").get(0).has("bearerAuth"));
            assertTrue(op.path("description").asText().contains("RESERVATION_MANAGE"));
            assertTrue(parameter(op, "propertyId").path("required").asBoolean());
            assertEquals("uuid", parameter(op, "propertyId").path("schema").path("format").asText());
            for (String code : List.of("200", "400", "401", "403")) assertTrue(op.path("responses").has(code));
            assertTrue(op.path("responses").path("200").path("headers").has("Cache-Control"));
            assertFalse(doc.path("paths").path(route).has("post"));
        }
        assertSuccessSchema(operation(doc, "/api/v1/reservations/{reservationId}", "get"), "200", "StaffReservation");
        assertTrue(operation(doc, "/api/v1/reservations/{reservationId}", "get").path("responses").has("404"));
        var schemas = doc.path("components").path("schemas");
        assertEquals(Set.of("reservationId", "propertyId", "confirmationCode", "status", "source", "sourceReference", "currency", "createdAt", "responsibleGuest", "stays"), strings(schemas.path("StaffReservation").path("required")));
        for (var entry : Map.of("StaffReservation", "responsibleGuest", "StaffStay", "room").entrySet()) {
            var nullable = schemas.path(entry.getKey()).path("properties").path(entry.getValue());
            assertEquals(2, nullable.path("anyOf").size());
            assertEquals("null", nullable.path("anyOf").get(1).path("type").asText());
        }
        assertEquals(Set.of("string", "null"), strings(schemas.path("StaffReservation").path("properties").path("source").path("type")));
        assertEquals("date", schemas.path("StaffStay").path("properties").path("arrival").path("format").asText());
        assertEquals(Set.of("profileId", "firstName", "lastName"), strings(schemas.path("ResponsibleGuestView").path("required")));
    }

    private JsonNode document() throws Exception {
        return json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode operation(JsonNode doc, String path, String method) {
        var result = doc.path("paths").path(path).path(method);
        assertFalse(result.isMissingNode(), method + " " + path);
        return result;
    }

    private void assertCodes(JsonNode op, String... codes) {
        var actual = new TreeSet<String>();
        op.path("responses").properties().forEach(entry -> actual.add(entry.getKey()));
        assertEquals(Set.of(codes), actual);
    }

    private void assertSuccessSchema(JsonNode op, String code, String name) {
        assertEquals("#/components/schemas/" + name,
                op.path("responses").path(code).path("content").path("application/json").path("schema").path("$ref").asText());
    }

    private Set<String> strings(JsonNode array) {
        var result = new TreeSet<String>();
        for (var value : array) if (!value.isNull()) result.add(value.asText());
        return result;
    }

    private Set<String> parameterNames(JsonNode op) {
        var result = new TreeSet<String>();
        for (var parameter : op.path("parameters")) result.add(parameter.path("name").asText());
        return result;
    }

    private JsonNode parameter(JsonNode op, String name) {
        for (var parameter : op.path("parameters")) if (parameter.path("name").asText().equals(name)) return parameter;
        fail("parameter missing: " + name);
        return null;
    }

    private void assertNoExamples(JsonNode schema) {
        for (String name : List.of("example", "examples", "default")) assertFalse(schema.has(name), name);
    }

    private void checkReferences(JsonNode node, JsonNode root) {
        if (node.isObject()) {
            if (node.has("$ref")) {
                String reference = node.path("$ref").asText();
                assertTrue(reference.startsWith("#/components/schemas/"), reference);
                assertFalse(root.at(reference.substring(1)).isMissingNode(), reference);
            }
            node.properties().forEach(entry -> checkReferences(entry.getValue(), root));
        } else if (node.isArray()) for (var value : node) checkReferences(value, root);
    }

}
