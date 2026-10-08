package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SmtpEmailTests {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(SmtpEmailConfiguration.class, ResendEmailSender.class);

    private ApplicationContextRunner smtp() {
        return runner.withPropertyValues("pms.email.provider=smtp", "pms.smtp.host=smtp.gmail.com",
                "pms.smtp.port=587", "pms.smtp.username=synthetic@example.test",
                "pms.smtp.app-password=synthetic-app-password", "pms.smtp.from=synthetic@example.test");
    }

    @Test void defaultAndExplicitResendRemainTheOnlyProvider() {
        for (var context : new ApplicationContextRunner[]{runner, runner.withPropertyValues("pms.email.provider=resend")}) {
            context.run(app -> {
                assertThat(app).hasSingleBean(EmailSender.class).hasBean("resendEmailSender");
                assertThat(app).doesNotHaveBean(JavaMailSender.class);
                assertInstanceOf(ResendEmailSender.class, app.getBean(EmailSender.class));
            });
        }
    }

    @Test void selectsOnlySmtpAndRequiresTlsWithBoundedTimeoutsWithoutConnecting() {
        smtp().run(app -> {
            assertThat(app).hasSingleBean(EmailSender.class).hasSingleBean(JavaMailSender.class);
            assertThat(app).doesNotHaveBean(ResendEmailSender.class);
            assertInstanceOf(SmtpEmailSender.class, app.getBean(EmailSender.class));
            var sender = (JavaMailSenderImpl) app.getBean(JavaMailSender.class);
            assertEquals("smtp.gmail.com", sender.getHost()); assertEquals(587, sender.getPort());
            assertEquals("UTF-8", sender.getDefaultEncoding());
            var settings = sender.getJavaMailProperties();
            for (var name : new String[]{"mail.smtp.auth", "mail.smtp.starttls.enable", "mail.smtp.starttls.required", "mail.smtp.ssl.checkserveridentity"}) assertEquals("true", settings.getProperty(name));
            assertEquals("5000", settings.getProperty("mail.smtp.connectiontimeout"));
            assertEquals("10000", settings.getProperty("mail.smtp.timeout"));
            assertEquals("10000", settings.getProperty("mail.smtp.writetimeout"));
            assertEquals("false", settings.getProperty("mail.debug"));
        });
    }

    @ParameterizedTest @ValueSource(strings={"host", "port", "username", "app-password", "from"})
    void missingSmtpConfigurationFailsAtStartupWithoutValues(String field) {
        smtp().withPropertyValues("pms.smtp." + field + "= ").run(app -> {
            assertThat(app).hasFailed();
            assertThat(app.getStartupFailure()).hasRootCauseInstanceOf(IllegalStateException.class);
            assertThat(app.getStartupFailure()).hasStackTraceContaining("is required when PMS_EMAIL_PROVIDER=smtp");
            assertThat(app.getStartupFailure()).hasStackTraceContaining("PMS_SMTP_");
            assertThat(app.getStartupFailure().toString()).doesNotContain("synthetic-app-password");
        });
    }

    @ParameterizedTest @ValueSource(strings={"0", "65536", "not-a-port"})
    void invalidPortFailsWithoutQuotingTheValue(String port) {
        smtp().withPropertyValues("pms.smtp.port=" + port).run(app -> {
            assertThat(app).hasFailed();
            assertThat(app.getStartupFailure()).hasRootCauseMessage("PMS_SMTP_PORT must be a valid port");
        });
    }

    @Test void bothOtpMessagesUseTheExistingBoundaryAndUtf8WithMockedTransport() throws Exception {
        var transport = mock(JavaMailSender.class);
        var registration = new MimeMessage(Session.getInstance(new Properties()));
        var reservation = new MimeMessage(Session.getInstance(new Properties()));
        when(transport.createMimeMessage()).thenReturn(registration, reservation);
        var sender = new SmtpEmailSender(transport, "sender@example.test");
        sender.sendGuestRegistrationOtp("recipient@example.test", "12345678");
        sender.sendReservationLinkOtp("recipient@example.test", "87654321");
        verify(transport).send(registration); verify(transport).send(reservation);
        assertEquals("sender@example.test", registration.getFrom()[0].toString());
        assertEquals("recipient@example.test", registration.getAllRecipients()[0].toString());
        assertEquals("Verifica tu correo", registration.getSubject());
        assertTrue(registration.getContent().toString().contains("12345678"));
        assertEquals("Código de verificación", reservation.getSubject());
        assertTrue(reservation.getContent().toString().contains("87654321"));
        registration.saveChanges();
        assertTrue(registration.getContentType().toLowerCase().contains("utf-8"));
    }

    @Test void deliveryFailuresExposeOnlyAGenericMessageWithoutProviderCause() {
        var transport = mock(JavaMailSender.class);
        when(transport.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("sensitive-provider-details")).when(transport).send(any(MimeMessage.class));
        var sender = new SmtpEmailSender(transport, "sender@example.test");
        var failure = assertThrows(IllegalStateException.class, () -> sender.sendGuestRegistrationOtp("recipient@example.test", "12345678"));
        assertEquals("SMTP email delivery failed", failure.getMessage()); assertNull(failure.getCause());
    }
}
