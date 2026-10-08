package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestRegistrationException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes=GuestRegistrationController.class)
public class GuestRegistrationExceptionHandler {
    @ExceptionHandler({org.springframework.web.bind.MethodArgumentNotValidException.class,
        org.springframework.http.converter.HttpMessageNotReadableException.class,
        com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator.InvalidInputException.class})
    public ResponseEntity<ProblemDetail> invalidInput(){var detail=ProblemDetail.forStatus(400);detail.setTitle("Invalid registration input");return ResponseEntity.badRequest().body(detail);}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,org.springframework.transaction.TransactionException.class})
    public ResponseEntity<ProblemDetail> unavailable(){var detail=ProblemDetail.forStatus(503);detail.setTitle("Guest registration unavailable");return ResponseEntity.status(503).body(detail);}
    @ExceptionHandler(GuestRegistrationException.class)
    public ResponseEntity<ProblemDetail> registration(GuestRegistrationException error){
        var detail=ProblemDetail.forStatus(error.status());detail.setTitle("Guest registration could not be completed");
        return ResponseEntity.status(error.status()).header("Cache-Control","no-store").body(detail);
    }
}
