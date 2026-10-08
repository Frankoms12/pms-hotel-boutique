package com.pms.hotelboutique.backend.modules.guestauth.application;
public interface GuestAuthService {
 GuestTokenPair createVerifiedSession(java.util.UUID accountId);
 boolean acceptsCredentials(String email,String password);
 GuestTokenPair login(String email,String password);
 String startGoogleAuthorization();
 GuestTokenPair exchangeGoogleAuthorization(String code,String state);
 GuestTokenPair refresh(String rawRefreshToken);
 GuestPrincipal getActivePrincipal(GuestPrincipal principal);
 void logout(GuestPrincipal principal);
}
