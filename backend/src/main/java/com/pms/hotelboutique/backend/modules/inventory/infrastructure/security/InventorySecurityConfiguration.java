package com.pms.hotelboutique.backend.modules.inventory.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtAuthenticationFilter;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/** Reuses Staff authentication for catalogs, commercial reports and reservation reads. */
@Configuration
public class InventorySecurityConfiguration {
    @Bean
    @Order(1)
    SecurityFilterChain inventorySecurityFilterChain(HttpSecurity http, StaffJwtService jwt,
            StaffAuthService sessions) throws Exception {
        return http
                .securityMatcher("/api/v1/properties", "/api/v1/properties/*",
                        "/api/v1/properties/*/availability", "/api/v1/properties/*/room-types",
                        "/api/v1/properties/*/room-types/*", "/api/v1/properties/*/rooms",
                        "/api/v1/properties/*/rooms/*", "/api/v1/properties/*/rate-plans",
                        "/api/v1/properties/*/rate-plans/*",
                        "/api/v1/reports/on-books/daily", "/api/v1/reservations", "/api/v1/reservations/*")
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> response.setStatus(401))
                        .accessDeniedHandler((request, response, exception) -> response.setStatus(403)))
                .authorizeHttpRequests(requests -> requests.anyRequest().authenticated())
                .addFilterBefore(new InventoryStaffFilter(jwt, sessions), UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    // Not a servlet bean: it runs exclusively inside the selected security chain.
    private static class InventoryStaffFilter extends StaffJwtAuthenticationFilter {
        InventoryStaffFilter(StaffJwtService jwt, StaffAuthService sessions) {
            super(jwt, sessions);
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            return false;
        }
    }
}
