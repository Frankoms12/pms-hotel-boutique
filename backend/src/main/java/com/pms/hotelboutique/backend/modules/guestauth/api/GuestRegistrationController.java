package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestRegistrationService;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/guest-auth/registrations")
@Tag(name="Guest registration",description="BFF-only. No usable account or session before verified email; no account/reservation enumeration.")
@ApiResponse(responseCode="400",description="Invalid JSON, format or length; sensitive values omitted.",content=@Content)
@ApiResponse(responseCode="403",description="Invalid or missing continuation binding.",content=@Content)
@ApiResponse(responseCode="429",description="Per-email cooldown or delivery/attempt quota; independent of account existence.",content=@Content)
@ApiResponse(responseCode="503",description="Registration infrastructure unavailable; never invalid credentials.",content=@Content)
public class GuestRegistrationController {
    public static final String BINDING_HEADER="X-Guest-Registration-Binding";
    private final GuestRegistrationService registrations;
    public GuestRegistrationController(GuestRegistrationService registrations){this.registrations=registrations;}
    @PostMapping
    @SecurityRequirements
    @Operation(summary="Request Guest email registration",description="Email trim/lowercase; password unchanged. 202 is generic for new, existing, disabled or pending accounts and does not guarantee delivery. Existing accounts receive only a non-verifiable opaque continuation: no OTP, delivery, identity changes or email. Request quotas and cooldown remain generic. Binding is supplied only by BFF, never returned to JavaScript.")
    @ApiResponse(responseCode="202",description="Opaque request ID; no identity or reservation data.",content=@Content(mediaType="application/json",schema=@Schema(implementation=RegistrationAccepted.class)))
    public ResponseEntity<RegistrationAccepted> register(@Valid @RequestBody RegistrationRequest request,
        @Parameter(description="Server-generated continuation secret. Never log or expose to Browser.",schema=@Schema(minLength=64,maxLength=64,writeOnly=true)) @RequestHeader(name=BINDING_HEADER,required=false) String binding){
        return ResponseEntity.accepted().body(new RegistrationAccepted(registrations.register(request.email(),request.password(),binding)));
    }
    @PostMapping("/verify")
    @SecurityRequirement(name="guestRegistrationBinding")
    @Operation(summary="Verify Guest email and create session",description="Atomically creates verified account, credential, email proof, compatible append-only history links and Guest session. No client IDs select candidates. Does not merge existing identities.")
    @ApiResponse(responseCode="201",description="Guest tokens exclusively for BFF cookie application.",content=@Content(mediaType="application/json",schema=@Schema(implementation=GuestAuthResponse.class)))
    @ApiResponse(responseCode="422",description="Invalid, expired, exhausted or consumed OTP; generic.",content=@Content)
    public ResponseEntity<GuestAuthResponse> verify(@Valid @RequestBody RegistrationVerifyRequest request,
        @Parameter(hidden=true) @RequestHeader(name=BINDING_HEADER,required=false) String binding){
        var pair=registrations.verify(request.requestId(),request.otp(),binding);
        return ResponseEntity.status(201).body(new GuestAuthResponse(pair.accessToken(),pair.refreshToken(),pair.accessTokenExpiresInSeconds()));
    }
    @PostMapping("/resend")
    @SecurityRequirement(name="guestRegistrationBinding")
    @Operation(summary="Resend Guest email verification",description="New OTP invalidates previous generation. Ten-minute OTP, five attempts preserved across resends, 60-second cooldown, 3 requests/email/hour and 10/email/day. Non-verifiable continuations never send email. requestId alone never authorizes.")
    @ApiResponse(responseCode="202",description="Generic acceptance; no delivery or account information.",content=@Content)
    @ApiResponse(responseCode="422",description="Expired, consumed or blocked continuation; generic.",content=@Content)
    public ResponseEntity<Void> resend(@Valid @RequestBody RegistrationResendRequest request,
        @Parameter(hidden=true) @RequestHeader(name=BINDING_HEADER,required=false) String binding){
        registrations.resend(request.requestId(),binding);return ResponseEntity.accepted().build();
    }
    @Schema(additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record RegistrationRequest(
        @NotBlank @Email(regexp=PasswordLoginValidator.EMAIL_PATTERN) @Size(max=50) @Schema(format="email",maxLength=50) String email,
        @NotBlank @Size(min=8,max=50) @Schema(format="password", description="Máximo 72 bytes UTF-8 y 50 caracteres; sin trim, normalización ni truncamiento.",minLength=8,maxLength=50,accessMode=Schema.AccessMode.WRITE_ONLY) String password){
        public RegistrationRequest {if(email!=null)email=email.trim().toLowerCase(Locale.ROOT);}
        @JsonAnySetter public void reject(String key,Object value){throw new IllegalArgumentException("Unknown registration field");}
        @Override public String toString(){return "RegistrationRequest[redacted]";}
    }
    public record RegistrationAccepted(@Schema(requiredMode=Schema.RequiredMode.REQUIRED,format="uuid") UUID requestId){ }
    @Schema(additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record RegistrationVerifyRequest(@NotNull UUID requestId,
        @NotBlank @Pattern(regexp="[0-9]{8}") @Schema(pattern="^[0-9]{8}$",minLength=8,maxLength=8,accessMode=Schema.AccessMode.WRITE_ONLY) String otp){
        @JsonAnySetter public void reject(String key,Object value){throw new IllegalArgumentException("Unknown registration field");}
        @Override public String toString(){return "RegistrationVerifyRequest[redacted]";}
    }
    @Schema(additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record RegistrationResendRequest(@NotNull UUID requestId){
        @JsonAnySetter public void reject(String key,Object value){throw new IllegalArgumentException("Unknown registration field");}
    }
}
