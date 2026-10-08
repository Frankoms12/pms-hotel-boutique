package com.pms.hotelboutique.backend.modules.securityauth.api;
import com.pms.hotelboutique.backend.modules.securityauth.application.UnifiedAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/auth") @Tag(name="Unified authentication")
public class UnifiedAuthController {
 private final UnifiedAuthService auth;
 public UnifiedAuthController(UnifiedAuthService auth){this.auth=auth;}
 @PostMapping("/sessions")
 @Operation(operationId="unifiedPasswordLogin",summary="Resolver acceso correo y contraseña",description="BFF-only. Valida ambos contextos sin account enumeration; si ambos son válidos exige selección explícita sin crear sesión hasta elegir.",security={})
 @ApiResponse(responseCode="200",description="Dos contextos válidos; selector sin tokens ni sesión.",content=@Content(schema=@Schema(implementation=UnifiedAuthService.Result.class)))
 @ApiResponse(responseCode="201",description="Un contexto seleccionado; tokens solo para BFF.",content=@Content(schema=@Schema(implementation=UnifiedAuthService.Result.class)))
 @ApiResponse(responseCode="400",description="Entrada inválida; error sanitizado sin credenciales.",content=@Content)
 @ApiResponse(responseCode="401",description="Credenciales inválidas; sin revelar identidades.",content=@Content(schema=@Schema(implementation=ProblemDetail.class)))
 public ResponseEntity<UnifiedAuthService.Result> login(@Valid @RequestBody UnifiedLoginRequest request) {
   var result=auth.login(request.email(),request.password(),request.context());
   return ResponseEntity.status(result.context()==null?HttpStatus.OK:HttpStatus.CREATED).body(result);
 }
}
