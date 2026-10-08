package com.pms.hotelboutique.backend.infrastructure.security;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigurationIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void exposesOnlyFoundationEndpoints() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/not-configured"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymousBookingPostReachesTheJ6ControllerAndRequiresItsIdempotencyHeader() throws Exception {
        var result = mockMvc.perform(post("/api/v1/public/bookings")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST")).andReturn();
        assertInstanceOf(MissingRequestHeaderException.class, result.getResolvedException());
    }

    @Test
    void bookingPostInternalErrorDispatchRetainsItsMvcStatus() throws Exception {
        mockMvc.perform(get("/error").with(request -> {
            request.setDispatcherType(DispatcherType.ERROR);
            request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/public/bookings");
            request.setAttribute(RequestDispatcher.ERROR_METHOD, "POST");
            request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 404);
            return request;
        })).andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/properties", "/api/v1/staff-auth/session", "/api/v1/public/other"})
    void internalErrorDispatchCannotOpenStaffOrOtherRoutes(String originalPath) throws Exception {
        mockMvc.perform(get("/error").with(request -> {
            request.setDispatcherType(DispatcherType.ERROR);
            request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, originalPath);
            request.setAttribute(RequestDispatcher.ERROR_METHOD, "POST");
            request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 404);
            return request;
        })).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PUT", "DELETE"})
    void bookingErrorPermissionAlsoRequiresTheOriginalPostMethod(String method) throws Exception {
        mockMvc.perform(get("/error").with(request -> {
            request.setDispatcherType(DispatcherType.ERROR);
            request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/public/bookings");
            request.setAttribute(RequestDispatcher.ERROR_METHOD, method);
            request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 404);
            return request;
        })).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"})
    void bookingMethodsOtherThanPostRemainProtected(String method) throws Exception {
        mockMvc.perform(request(HttpMethod.valueOf(method), "/api/v1/public/bookings"))
            .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/public/bookings/extra", "/api/v1/public/bookings-extra",
            "/api/v1/public/booking", "/api/v1/public/other", "/api/v1/public/availability", "/error"})
    void anonymousPostPermissionDoesNotExpandToOtherPaths(String path) throws Exception {
        mockMvc.perform(post(path)).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "POST", "PUT", "PATCH", "DELETE"})
    void staffRoutesKeepAuthenticationForEveryWriteAndReadMethod(String method) throws Exception {
        String property = "/api/v1/properties/00000000-0000-4000-8000-000000000001";
        for (String path : java.util.List.of("/api/v1/properties", property, property + "/rooms",
                property + "/room-types", property + "/rate-plans", property + "/availability",
                "/api/v1/reports/on-books/daily",
                "/api/v1/staff-auth/session", "/api/v1/staff-auth/logout")) {
            mockMvc.perform(request(HttpMethod.valueOf(method), path))
                .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void explicitLoginNeedsCredentialsAndMeLogoutRequireTheirOwnBearer() throws Exception {
        mockMvc.perform(post("/api/v1/staff-auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"\",\"password\":\"\"}")).andExpect(status().isBadRequest());
        for (String prefix : java.util.List.of("/api/v1/staff-auth", "/api/v1/guest-auth")) {
            mockMvc.perform(get(prefix + "/me")).andExpect(status().isUnauthorized());
            mockMvc.perform(post(prefix + "/logout")).andExpect(status().isUnauthorized());
        }
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs/swagger-config")).andExpect(status().isOk());
    }
}
