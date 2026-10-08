package com.pms.hotelboutique.backend.modules.guestauth.api;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestAuthenticationException; import org.springframework.http.*; import org.springframework.web.bind.annotation.*;
@RestControllerAdvice public class GuestAuthExceptionHandler { @ExceptionHandler(GuestAuthenticationException.class) ProblemDetail unauthorized(){ProblemDetail p=ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);p.setTitle("Invalid credentials");return p;} }
