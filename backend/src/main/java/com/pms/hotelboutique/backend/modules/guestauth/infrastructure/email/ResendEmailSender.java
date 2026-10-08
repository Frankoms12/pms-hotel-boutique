package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.client.RestClient;

/** Infrastructure adapter. It is used only when Reservations enables the OTP flow. */
@Component
@ConditionalOnProperty(name="pms.email.provider", havingValue="resend", matchIfMissing=true)
public class ResendEmailSender implements EmailSender {
    private final String apiKey; private final String from; private final RestClient client = RestClient.create();
    public ResendEmailSender(@Value("${pms.resend.api-key:}") String apiKey, @Value("${pms.resend.from-email:}") String from) { this.apiKey=apiKey; this.from=from; }
    @Override public void sendReservationLinkOtp(String recipientEmail,String otp) { send(recipientEmail,"Código de verificación","Tu código de verificación es: "+otp); }
    @Override public void sendGuestRegistrationOtp(String recipientEmail,String otp) { send(recipientEmail,"Verifica tu correo","Tu código para crear tu cuenta Guest es: "+otp+". Expira en 10 minutos. Si no lo solicitaste, ignora este correo."); }
    private void send(String recipient,String subject,String text) {
        if(apiKey.isBlank() || from.isBlank()) throw new IllegalStateException("Resend deployment configuration is required");
        client.post().uri("https://api.resend.com/emails").contentType(MediaType.APPLICATION_JSON).header("Authorization","Bearer "+apiKey)
            .body(Map.of("from",from,"to",java.util.List.of(recipient),"subject",subject,"text",text)).retrieve().toBodilessEntity();
    }
}
