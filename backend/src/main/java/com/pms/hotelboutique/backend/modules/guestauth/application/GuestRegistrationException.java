package com.pms.hotelboutique.backend.modules.guestauth.application;

public class GuestRegistrationException extends RuntimeException {
    private final int status;
    public GuestRegistrationException(int status) { super("Guest registration could not be completed"); this.status=status; }
    public int status() { return status; }
}
