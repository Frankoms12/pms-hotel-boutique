package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingException;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingIdempotencyConflictException;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.web.firewall.RequestRejectedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Controller-local protocol mapping; never returns keys, guest data or exception causes. */
@RestControllerAdvice(assignableTypes = PublicBookingController.class)
public class PublicBookingExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(PublicBookingValidationException.class)
    ProblemDetail invalidBooking(PublicBookingValidationException exception) {
        return problem(exception.code() == PublicBookingValidationException.Code.PROPERTY_NOT_FOUND
                ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST, exception.code().name());
    }

    @ExceptionHandler(PublicBookingIdempotencyConflictException.class)
    ProblemDetail reusedKey(PublicBookingIdempotencyConflictException exception) {
        return problem(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED");
    }

    @ExceptionHandler(PublicBookingException.class)
    ProblemDetail bookingFailure(PublicBookingException exception) {
        HttpStatus status = switch (exception.code()) {
            case PRICE_CHANGED, NO_AVAILABILITY -> HttpStatus.CONFLICT;
            case PAYMENT_DECLINED -> HttpStatus.UNPROCESSABLE_ENTITY;
            case BOOKING_FAILED -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
        return problem(status, exception.code().name());
    }

    @ExceptionHandler(RequestRejectedException.class)
    ProblemDetail rejectedBookingRequest(RequestRejectedException exception) {
        return problem(HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }

    @ExceptionHandler(RuntimeException.class)
    ProblemDetail unexpectedFailure(RuntimeException exception) {
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "BOOKING_FAILED");
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return invalidRequest(headers);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return invalidRequest(headers);
    }

    @Override
    protected ResponseEntity<Object> handleServletRequestBindingException(ServletRequestBindingException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return invalidRequest(headers);
    }

    private ResponseEntity<Object> invalidRequest(HttpHeaders headers) {
        return new ResponseEntity<>(problem(HttpStatus.BAD_REQUEST, "INVALID_REQUEST"), headers, HttpStatus.BAD_REQUEST);
    }

    private ProblemDetail problem(HttpStatus status, String code) {
        var problem = ProblemDetail.forStatusAndDetail(status, code);
        problem.setProperty("code", code);
        return problem;
    }
}
