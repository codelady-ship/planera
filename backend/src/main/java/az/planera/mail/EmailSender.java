package az.planera.mail;

/** Delivers e-mails (#43): Resend in production, the log everywhere else. Never throws. */
public interface EmailSender {

    /** @return true when the provider accepted the message */
    boolean send(EmailMessage message);
}
