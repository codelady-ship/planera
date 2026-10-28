package az.planera.mail;

/** One plain-text e-mail (#43). */
public record EmailMessage(String to, String subject, String text) {}
