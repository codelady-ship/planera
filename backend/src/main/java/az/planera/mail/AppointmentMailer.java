package az.planera.mail;

import az.planera.appointment.AppointmentChanged;
import az.planera.common.MessageKey;
import az.planera.common.Messages;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.reminder.ReminderService;
import java.time.Clock;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * E-mails about an appointment (#43): confirmation when it is booked, a
 * note when it is moved or cancelled, and a reminder the day before. Sent
 * after the booking transaction committed, in the customer's language
 * (#123); templates live in {@code messages*.properties}.
 */
@Component
public class AppointmentMailer {

    private static final Logger log = LoggerFactory.getLogger(AppointmentMailer.class);

    private final AppointmentRepository appointments;
    private final EmailSender sender;
    private final Clock clock;
    private final String siteUrl;

    public AppointmentMailer(
            AppointmentRepository appointments,
            EmailSender sender,
            Clock clock,
            @Value("${planera.mail.site-url:https://planera-az.vercel.app}") String siteUrl) {
        this.appointments = appointments;
        this.sender = sender;
        this.clock = clock;
        this.siteUrl = siteUrl.replaceAll("/$", "");
    }

    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onAppointmentChanged(AppointmentChanged event) {
        String template = switch (event.kind()) {
            case CREATED -> "confirmed";
            case RESCHEDULED -> "rescheduled";
            case CANCELLED -> "cancelled";
            case REMINDER_DUE -> "reminder";
            case STATUS -> null;
        };
        if (template == null) {
            return;
        }
        Appointment a = appointments.findById(event.appointmentId()).orElse(null);
        if (a == null) {
            return;
        }
        try {
            sender.send(compose(a, template));
        } catch (RuntimeException e) {
            log.warn("E-mail for appointment {} ({}) failed: {}", a.getId(), template, e.getMessage());
        }
    }

    /** The subject and text for one template; package-private for the tests. */
    EmailMessage compose(Appointment a, String template) {
        Locale locale = a.getCustomer().getLocale();
        Object[] args = {
            a.getCustomer().getFullName(),
            a.getProvider().getDisplayName(),
            a.getProvider().getTitle(),
            ReminderService.when(a.getStartsAt(), clock, locale),
            a.getService().getName(),
            a.getPrice(),
            a.getProvider().getAddress() == null ? "" : a.getProvider().getAddress(),
            a.getCode(),
            a.getProvider().getCancellationHours(),
            siteUrl,
            a.getProvider().getSlug()
        };
        return new EmailMessage(
                a.getCustomer().getEmail(),
                Messages.get(key("mail." + template + ".subject", args), locale),
                Messages.get(key("mail." + template + ".body", args), locale));
    }

    private static MessageKey key(String code, Object[] args) {
        return Messages.key(code, args);
    }
}
