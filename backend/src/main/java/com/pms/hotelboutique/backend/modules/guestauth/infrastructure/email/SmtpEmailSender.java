package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;

import jakarta.mail.MessagingException;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

/** SMTP transport behind the existing OTP boundary; no provider exception leaks. */
public final class SmtpEmailSender implements EmailSender {
    private final JavaMailSender sender;
    private final String from;

    public SmtpEmailSender(JavaMailSender sender, String from) {
        this.sender = sender;
        this.from = from;
    }

    @Override
    public void sendReservationLinkOtp(String recipientEmail, String otp) {
        send(recipientEmail, "Código de verificación", "Tu código de verificación es: " + otp);
    }

    @Override
    public void sendGuestRegistrationOtp(String recipientEmail, String otp) {
        send(recipientEmail, "Verifica tu correo", "Tu código para crear tu cuenta Guest es: " + otp
                + ". Expira en 10 minutos. Si no lo solicitaste, ignora este correo.");
    }

    private void send(String recipient, String subject, String text) {
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(text, false);
            sender.send(message);
        } catch (MessagingException | MailException failure) {
            // Delivery status is handled by the caller. Avoid exposing SMTP details,
            // credentials, recipients or OTP through nested provider exceptions.
            throw new IllegalStateException("SMTP email delivery failed");
        }
    }
}
