package az.planera.reminder;

import az.planera.appointment.AppointmentChanged;
import az.planera.common.Messages;
import az.planera.config.TimeConfig;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.PersonalReminder;
import az.planera.domain.Reminder;
import az.planera.domain.ReminderRepository;
import az.planera.push.PushMessage;
import az.planera.push.PushService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Plans push reminders for appointments and sends the due ones (#56).
 * Planning happens in the booking transaction (via {@link AppointmentChanged});
 * {@link ReminderJob} calls {@link #sendDue()} every minute. A reminder is
 * marked sent in the same transaction that locked it, so it goes out once
 * even with several API instances. Texts come from {@code messages*.properties}
 * in the user's saved language (#123).
 */
@Service
public class ReminderService {

    /** Offsets a user may choose (#57): a day, an hour, a quarter, and the start itself. */
    public static final List<Integer> ALLOWED_OFFSETS = List.of(1440, 60, 15, 0);
    /** The day-before reminder also goes by e-mail (#43), whether or not the push at that offset was chosen. */
    static final int EMAIL_OFFSET = 1440;
    static final int BATCH = 100;

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final ReminderRepository reminders;
    private final AppointmentRepository appointments;
    private final PushService push;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public ReminderService(
            ReminderRepository reminders,
            AppointmentRepository appointments,
            PushService push,
            ApplicationEventPublisher events,
            Clock clock) {
        this.reminders = reminders;
        this.appointments = appointments;
        this.push = push;
        this.events = events;
        this.clock = clock;
    }

    /**
     * Re-plans from scratch: an active appointment gets its future reminders
     * at the customer's chosen offsets, any other loses them.
     */
    @EventListener
    @Transactional
    public void onAppointmentChanged(AppointmentChanged event) {
        if (event.kind() == AppointmentChanged.Kind.REMINDER_DUE) {
            // Published by sendDue() itself while it holds the due row: nothing to re-plan.
            return;
        }
        reminders.deleteByAppointmentId(event.appointmentId());
        Appointment a = appointments.findById(event.appointmentId()).orElse(null);
        if (a == null || !a.getStatus().isActive()) {
            return;
        }
        Instant now = clock.instant();
        List<Integer> offsets = a.getCustomer().getReminderOffsets();
        if (!offsets.isEmpty() && !offsets.contains(EMAIL_OFFSET)) {
            offsets = new java.util.ArrayList<>(offsets);
            offsets.addFirst(EMAIL_OFFSET);
        }
        for (int offset : offsets) {
            Instant due = a.getStartsAt().minus(Duration.ofMinutes(offset));
            if (due.isAfter(now)) {
                reminders.save(new Reminder(a, offset, due));
            }
        }
    }

    /** Re-plans a personal note (#59): future offsets while it is active, nothing otherwise. */
    @Transactional
    public void planPersonal(PersonalReminder note) {
        reminders.deleteByPersonalReminderId(note.getId());
        if (note.getStatus() != PersonalReminder.Status.ACTIVE) {
            return;
        }
        Instant now = clock.instant();
        for (int offset : note.getReminderOffsets()) {
            Instant due = note.getStartsAt().minus(Duration.ofMinutes(offset));
            if (due.isAfter(now)) {
                reminders.save(new Reminder(note, offset, due));
            }
        }
    }

    /** Sends every due reminder once; returns how many were sent to a customer. */
    @Transactional
    public int sendDue() {
        Instant now = clock.instant();
        int sent = 0;
        for (Reminder reminder : reminders.lockDue(now, BATCH)) {
            Appointment a = reminder.getAppointment();
            PersonalReminder note = reminder.getPersonalReminder();
            if (a != null && a.getStatus().isActive()) {
                Locale locale = a.getCustomer().getLocale();
                boolean emailOnly = reminder.getOffsetMinutes() == EMAIL_OFFSET
                        && !a.getCustomer().getReminderOffsets().contains(EMAIL_OFFSET);
                if (reminder.getOffsetMinutes() == EMAIL_OFFSET) {
                    events.publishEvent(new AppointmentChanged(a.getId(), AppointmentChanged.Kind.REMINDER_DUE));
                }
                if (!emailOnly) {
                    PushMessage message = new PushMessage(
                            Messages.get("reminder.title", locale),
                            body(a.getStartsAt(), a.getProvider().getDisplayName(), a.getService().getName(), clock, locale),
                            "/account",
                            "appointment-" + a.getId());
                    int delivered = push.sendToUser(a.getCustomer().getId(), message);
                    log.info("Reminder {} for appointment {} sent to {} device(s)", reminder.getId(), a.getId(), delivered);
                }
                sent++;
            } else if (note != null && note.getStatus() == PersonalReminder.Status.ACTIVE) {
                Locale locale = note.getUser().getLocale();
                PushMessage message = new PushMessage(
                        Messages.get("reminder.noteTitle", locale),
                        noteBody(note.getStartsAt(), note.getTitle(), clock, locale),
                        "/account",
                        "note-" + note.getId());
                int delivered = push.sendToUser(note.getUser().getId(), message);
                log.info("Reminder {} for note {} sent to {} device(s)", reminder.getId(), note.getId(), delivered);
                sent++;
            }
            reminder.markSent(now);
        }
        return sent;
    }

    /**
     * The alarm sentence (#62), the same in the push and when read aloud:
     * "Sizin bu gün saat 15:00-da Elvin Məmmədov ilə randevunuz var: Saç kəsimi".
     */
    static String body(Instant startsAt, String providerName, String serviceName, Clock clock) {
        return body(startsAt, providerName, serviceName, clock, Messages.DEFAULT);
    }

    static String body(Instant startsAt, String providerName, String serviceName, Clock clock, Locale locale) {
        return Messages.get(
                Messages.key("reminder.body", when(startsAt, clock, locale), providerName, serviceName), locale);
    }

    /** "Sizin bu gün saat 15:00-da qeydiniz var: həkimə getmək" (#59, #62). */
    static String noteBody(Instant startsAt, String title, Clock clock) {
        return noteBody(startsAt, title, clock, Messages.DEFAULT);
    }

    static String noteBody(Instant startsAt, String title, Clock clock, Locale locale) {
        return Messages.get(Messages.key("reminder.noteBody", when(startsAt, clock, locale), title), locale);
    }

    /** "bu gün saat 15:00-da", "sabah saat 09:30-da" or "30 oktyabr saat 18:00-da", in Baku time. */
    public static String when(Instant startsAt, Clock clock, Locale locale) {
        ZonedDateTime start = startsAt.atZone(TimeConfig.BAKU);
        LocalDate today = LocalDate.now(clock.withZone(TimeConfig.BAKU));
        LocalDate day = start.toLocalDate();
        String time = HH_MM.format(start);
        if (day.equals(today)) {
            return Messages.get(Messages.key("reminder.today", time), locale);
        }
        if (day.equals(today.plusDays(1))) {
            return Messages.get(Messages.key("reminder.tomorrow", time), locale);
        }
        String month = Messages.get("month." + day.getMonthValue(), locale);
        return Messages.get(Messages.key("reminder.onDate", day.getDayOfMonth(), month, time), locale);
    }
}
