package com.pms.hotelboutique.backend.modules.securityauth.api;
import com.pms.hotelboutique.backend.modules.guestauth.api.GuestAuthController;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
/** Never serialize or log rejected credential values from binding/validation exceptions. */
@RestControllerAdvice(assignableTypes={StaffAuthController.class,GuestAuthController.class,UnifiedAuthController.class})
public class AuthInputExceptionHandler {
 @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class, com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator.InvalidInputException.class})
 public ResponseEntity<ProblemDetail> invalidInput() {
  var problem=ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);problem.setTitle("Invalid authentication input");
  return ResponseEntity.badRequest().body(problem);
 }
}
