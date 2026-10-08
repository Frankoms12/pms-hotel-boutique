package com.pms.hotelboutique.backend.infrastructure.security;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PublicBookingPreJ6SecurityHttpIntegrationTests {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;

    @Test
    void anonymousPostReturnsTheJ6InvalidRequestOnTheRealServer() throws Exception {
        var response = send("POST", "/api/v1/public/bookings");
        assertEquals(400, response.statusCode());
        assertEquals("INVALID_REQUEST", json.readTree(response.body()).path("code").asText());
        assertTrue(response.headers().firstValue("Set-Cookie").isEmpty());
    }

    @Test
    void realServerStillProtectsOtherMethodsStaffAndDirectErrorRequests() throws Exception {
        for (String path : List.of("/api/v1/public/bookings", "/api/v1/properties", "/api/v1/public/other", "/error")) {
            assertEquals(401, send("GET", path).statusCode(), path);
        }
        assertEquals(401, send("POST", "/error").statusCode());
        assertEquals(401, send("POST", "/api/v1/properties").statusCode());
    }

    private HttpResponse<String> send(String method, String path) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json")
                .method(method, method.equals("POST") ? HttpRequest.BodyPublishers.ofString("{}") : HttpRequest.BodyPublishers.noBody())
                .build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }
}
