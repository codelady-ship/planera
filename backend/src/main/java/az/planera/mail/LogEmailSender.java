package az.planera.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Without a mail provider the message goes to the log, so local runs and CI show what would be sent (#43). */
public class LogEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LogEmailSender.class);

    @Override
    public boolean send(EmailMessage message) {
        log.info("E-mail (not sent, no RESEND_API_KEY) to {}: {}\n{}", message.to(), message.subject(), message.text());
        return true;
    }
}
