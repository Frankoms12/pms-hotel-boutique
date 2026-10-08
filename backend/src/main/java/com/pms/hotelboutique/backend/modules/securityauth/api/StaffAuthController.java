package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffTokenPair;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
@RequestMapping("/api/v1/staff-auth")
@Tag(name = "Staff authentication", description = "Internal endpoints consumed only by the Next.js BFF.")
public class StaffAuthController {
    private static final String REFRESH_COOKIE = "pms_staff_refresh";
    private final StaffAuthService staffAuthService;
    private final StaffAuthorizationService authorizationService;

    public StaffAuthController(StaffAuthService staffAuthService, StaffAuthorizationService authorizationService) {
        this.staffAuthService = staffAuthService;
        this.authorizationService = authorizationService;
    }

    @PostMapping("/sessions")
    @ApiResponse(responseCode = "201", description = "Sesión Staff creada; tokens solo para BFF.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = StaffAuthResponse.class)))
    @ApiResponse(responseCode = "400", description = "JSON o credenciales de entrada inválidos; error 400 sanitizado sin datos rechazados.", content = @Content)
    @ApiResponse(responseCode = "401", description = "Credenciales/identidad/autorización Staff inválidas; error genérico. Filtro o redispatch a /error protegido pueden responder 401 sin cuerpo de aplicación.", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @Operation(summary = "Iniciar sesión", deprecated = true, description = "Alias compatible; preferir POST /api/v1/staff-auth/login. BFF-only; conserva tokens solo en cookies HttpOnly.")
    public ResponseEntity<StaffAuthResponse> login(@Valid @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true, content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = StaffLoginRequest.class))) @RequestBody StaffLoginRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(staffAuthService.login(request.email(), request.password())));
    }

    @PostMapping("/login")
    @ApiResponse(responseCode = "201", description = "Sesión Staff creada; tokens solo para BFF.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = StaffAuthResponse.class)))
    @ApiResponse(responseCode = "400", description = "JSON o credenciales de entrada inválidos; error 400 sanitizado sin datos rechazados.", content = @Content)
    @ApiResponse(responseCode = "401", description = "Credenciales/identidad/autorización Staff inválidas; error genérico. Filtro o redispatch a /error protegido pueden responder 401 sin cuerpo de aplicación.", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @Operation(summary = "Iniciar sesión", description = "BFF-only; conserva tokens solo en cookies HttpOnly.")
    public ResponseEntity<StaffAuthResponse> loginExplicit(@Valid @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true, content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = StaffLoginRequest.class))) @RequestBody StaffLoginRequest request) {
        return login(request);
    }

    @PostMapping("/refresh")
    @SecurityRequirement(name = "staffRefreshCookie")
    @ApiResponse(responseCode = "200", description = "Tokens Staff rotados; BFF reemplaza cookies HttpOnly.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = StaffAuthResponse.class)))
    @ApiResponse(responseCode = "401", description = "Cookie ausente o refresh/sesión Staff inválidos.", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @Operation(summary = "Renovar sesión", description = "BFF-only. The BFF forwards its HttpOnly refresh cookie and replaces it with the response value.")
    public StaffAuthResponse refresh(@CookieValue(name = REFRESH_COOKIE, required = false) @Schema(hidden = true) String refreshToken) {
        return toResponse(staffAuthService.refresh(refreshToken));
    }

    @GetMapping("/session")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(responseCode = "200", description = "Identidad y autorización C2 vigentes; no devuelve tokens.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = StaffSessionResponse.class)))
    @ApiResponse(responseCode = "401", description = "JWT/sesión Staff inválidos; el filtro puede responder sin cuerpo de aplicación.", content = @Content)
    @Operation(summary = "Usuario actual", deprecated = true, description = "Alias compatible; preferir GET /api/v1/staff-auth/me. BFF-only; permisos y propiedades autorizadas recalculados, sin tokens.")
    public StaffSessionResponse session(@Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        StaffPrincipal active = staffAuthService.getActivePrincipal(principal);
        var snapshot = authorizationService.resolve(active.staffUserId());
        var memberships = snapshot.properties().stream().map(property -> new StaffSessionResponse.PropertyMembershipResponse(
                property.propertyId(), property.propertyCode(), property.propertyName(), property.timezone(), property.currency())).toList();
        return new StaffSessionResponse(active.staffUserId(), active.sessionId(), active.username(), active.roleCode(),
                snapshot.permissions(), memberships);
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(responseCode = "200", description = "Identidad y autorización C2 vigentes; no devuelve tokens.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = StaffSessionResponse.class)))
    @ApiResponse(responseCode = "401", description = "JWT/sesión Staff inválidos; el filtro puede responder sin cuerpo de aplicación.", content = @Content)
    @Operation(summary = "Usuario actual", description = "BFF-only; permisos y propiedades autorizadas recalculados, sin tokens.")
    public StaffSessionResponse me(@Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        return session(principal);
    }

    @DeleteMapping("/session")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(responseCode = "204", description = "Sesión y refresh Staff revocados; sin cuerpo.", content = @Content)
    @ApiResponse(responseCode = "401", description = "JWT/sesión Staff inválidos. Guest no habilita Staff.", content = @Content)
    @Operation(summary = "Cerrar sesión", deprecated = true, description = "Alias compatible; preferir POST /api/v1/staff-auth/logout. BFF-only; revoca solo la sesión Staff actual.")
    public ResponseEntity<Void> logout(@Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        staffAuthService.logout(principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(responseCode = "204", description = "Sesión y refresh Staff revocados; sin cuerpo.", content = @Content)
    @ApiResponse(responseCode = "401", description = "JWT/sesión Staff inválidos. Guest no habilita Staff.", content = @Content)
    @Operation(summary = "Cerrar sesión", description = "BFF-only; revoca solo la sesión Staff actual.")
    public ResponseEntity<Void> logoutExplicit(@Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        return logout(principal);
    }

    private StaffAuthResponse toResponse(StaffTokenPair tokens) {
        return new StaffAuthResponse(tokens.accessToken(), tokens.refreshToken(), tokens.accessTokenExpiresInSeconds());
    }
}
