package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;
public interface EmailSender {
    void sendReservationLinkOtp(String recipientEmail,String otp);
    default void sendGuestRegistrationOtp(String recipientEmail,String otp) { sendReservationLinkOtp(recipientEmail,otp); }
}
