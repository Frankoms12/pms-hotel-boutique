package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.ReservationQueryException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = StaffReservationController.class)
public class StaffReservationExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(ReservationQueryException.class)
    ProblemDetail missing() { return problem(HttpStatus.NOT_FOUND, "Reservation not found"); }
    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalid() { return problem(HttpStatus.BAD_REQUEST, "Invalid reservation parameters"); }
    @ExceptionHandler(StaffAuthenticationException.class)
    ProblemDetail unauthorized() { return problem(HttpStatus.UNAUTHORIZED, "Staff session required"); }
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail forbidden() { return problem(HttpStatus.FORBIDDEN, "Reservation access denied"); }
    private static ProblemDetail problem(HttpStatus status, String title) {
        var problem = ProblemDetail.forStatus(status);
        problem.setTitle(title);
        return problem;
    }
}
