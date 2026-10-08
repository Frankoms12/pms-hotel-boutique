package com.pms.hotelboutique.backend.modules.securityauth.api;
import io.swagger.v3.oas.annotations.media.Schema;
import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import jakarta.validation.constraints.*;
import java.util.Locale;
public record StaffLoginRequest(
    @NotBlank @Email(regexp=PasswordLoginValidator.EMAIL_PATTERN) @Size(max=50) @Schema(format="email", maxLength=50) String email,
    @NotBlank @Size(max=50) @Schema(accessMode=Schema.AccessMode.WRITE_ONLY, format="password", description="Máximo 72 bytes UTF-8 y 50 caracteres; sin trim, normalización ni truncamiento.", maxLength=50) String password) {
    public StaffLoginRequest { if (email != null) email = email.trim().toLowerCase(Locale.ROOT); }
    @Override public String toString() { return "StaffLoginRequest[credentials redacted]"; }
}
