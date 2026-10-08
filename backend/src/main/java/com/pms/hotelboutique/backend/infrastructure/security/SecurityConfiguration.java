package com.pms.hotelboutique.backend.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtAuthenticationFilter;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtAuthenticationFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, StaffJwtAuthenticationFilter staffJwtAuthenticationFilter, GuestJwtAuthenticationFilter guestJwtAuthenticationFilter)
            throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(
                (request, response, exception) -> response.sendError(401)))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health", "/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/public/availability").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/sessions", "/api/v1/guest-auth/sessions", "/api/v1/staff-auth/sessions", "/api/v1/staff-auth/login", "/api/v1/staff-auth/refresh", "/api/v1/guest-auth/google/start", "/api/v1/guest-auth/google/exchange", "/api/v1/guest-auth/refresh", "/api/v1/guest-auth/registrations", "/api/v1/guest-auth/registrations/verify", "/api/v1/guest-auth/registrations/resend").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/public/bookings").permitAll()
                // Servlet error dispatch changes the method to GET; use its trusted
                // original method/URI to preserve only the public POST status.
                // Neither direct /error requests nor Staff-origin errors are public.
                .requestMatchers(request -> request.getDispatcherType() == DispatcherType.ERROR
                        && "POST".equals(request.getAttribute(RequestDispatcher.ERROR_METHOD))
                        && "/api/v1/public/bookings".equals(request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI)))
                    .permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(staffJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(guestJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
