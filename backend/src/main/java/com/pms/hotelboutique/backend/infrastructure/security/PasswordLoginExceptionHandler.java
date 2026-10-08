package com.pms.hotelboutique.backend.infrastructure.security;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** The BCrypt byte boundary never reveals whether an identity exists. */
@RestControllerAdvice
public class PasswordLoginExceptionHandler {
    @ExceptionHandler(PasswordLoginValidator.PasswordByteLimitException.class)
    public ProblemDetail invalidCredentials() {
        var detail = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        detail.setTitle("Invalid credentials");
        return detail;
    }
}
