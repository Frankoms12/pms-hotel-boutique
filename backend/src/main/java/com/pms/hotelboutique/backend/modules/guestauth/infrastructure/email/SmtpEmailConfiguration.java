package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "pms.email.provider", havingValue = "smtp")
public class SmtpEmailConfiguration {
    @Bean
    JavaMailSender smtpMailSender(
            @Value("${pms.smtp.host:}") String host,
            @Value("${pms.smtp.port:}") String port,
            @Value("${pms.smtp.username:}") String username,
            @Value("${pms.smtp.app-password:}") String password,
            @Value("${pms.smtp.from:}") String from) {
        required(host, "PMS_SMTP_HOST");
        required(port, "PMS_SMTP_PORT");
        required(username, "PMS_SMTP_USERNAME");
        required(password, "PMS_SMTP_APP_PASSWORD");
        required(from, "PMS_SMTP_FROM");
        int portNumber;
        try { portNumber = Integer.parseInt(port); }
        catch (NumberFormatException invalid) { throw new IllegalStateException("PMS_SMTP_PORT must be a valid port"); }
        if (portNumber < 1 || portNumber > 65535) throw new IllegalStateException("PMS_SMTP_PORT must be a valid port");
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(portNumber);
        sender.setUsername(username);
        sender.setPassword(password);
        sender.setDefaultEncoding("UTF-8");
        var properties = sender.getJavaMailProperties();
        properties.setProperty("mail.smtp.auth", "true");
        properties.setProperty("mail.smtp.starttls.enable", "true");
        properties.setProperty("mail.smtp.starttls.required", "true");
        properties.setProperty("mail.smtp.ssl.checkserveridentity", "true");
        properties.setProperty("mail.smtp.connectiontimeout", "5000");
        properties.setProperty("mail.smtp.timeout", "10000");
        properties.setProperty("mail.smtp.writetimeout", "10000");
        properties.setProperty("mail.debug", "false");
        return sender;
    }

    @Bean
    EmailSender smtpEmailSender(JavaMailSender sender, @Value("${pms.smtp.from:}") String from) {
        return new SmtpEmailSender(sender, from);
    }

    private static void required(String value, String variable) {
        if (value.isBlank()) throw new IllegalStateException(variable + " is required when PMS_EMAIL_PROVIDER=smtp");
    }
}
