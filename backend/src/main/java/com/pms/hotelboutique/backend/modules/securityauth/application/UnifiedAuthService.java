package com.pms.hotelboutique.backend.modules.securityauth.application;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestAuthService;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class UnifiedAuthService {
 private final StaffAuthService staff;
 private final GuestAuthService guest;
 public UnifiedAuthService(StaffAuthService staff,GuestAuthService guest){this.staff=staff;this.guest=guest;}
 @Transactional
 public Result login(String email,String password,String selected) {
   List<String> contexts=new ArrayList<>();
   // Both checks execute before revealing a context. Neither creates a session.
   boolean staffValid=staff.acceptsCredentials(email,password);
   boolean guestValid=guest.acceptsCredentials(email,password);
   if(staffValid)contexts.add("STAFF");
   if(guestValid)contexts.add("GUEST");
   if(contexts.isEmpty() || selected!=null && !contexts.contains(selected))throw new StaffAuthenticationException();
   if(selected==null && contexts.size()==2)return new Result(null,List.copyOf(contexts),null,null,null);
   String context=selected==null?contexts.getFirst():selected;
   if(context.equals("STAFF")) {var pair=staff.login(email,password);return new Result(context,List.of(),pair.accessToken(),pair.refreshToken(),pair.accessTokenExpiresInSeconds());}
   var pair=guest.login(email,password);return new Result(context,List.of(),pair.accessToken(),pair.refreshToken(),pair.accessTokenExpiresInSeconds());
 }
 @Schema(description="Transporte privado BFF; selector sin tokens ni sesión. Nunca devolver tokens al Browser.")
 @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
 public record Result(String context,List<String> contexts,String accessToken,String refreshToken,Long accessTokenExpiresInSeconds) { }
}
