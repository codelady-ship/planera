package az.planera.mail;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

/** Picks the mail transport (#43): Resend when a key is configured, otherwise the log. */
@Configuration
public class MailConfig {

    @Bean
    EmailSender emailSender(
            @Value("${planera.mail.resend-api-key:}") String apiKey,
            @Value("${planera.mail.from:Planera <onboarding@resend.dev>}") String from,
            ObjectMapper json) {
        return apiKey.isBlank() ? new LogEmailSender() : new ResendEmailSender(apiKey, from, json);
    }
}
