package com.pms.hotelboutique.backend.modules.securityauth.application;

public interface StaffAuthService {
    StaffTokenPair login(String email, String password);
    boolean acceptsCredentials(String email, String password);
    StaffTokenPair refresh(String rawRefreshToken);
    StaffPrincipal getActivePrincipal(StaffPrincipal principal);
    void logout(StaffPrincipal principal);
}
