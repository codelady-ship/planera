package az.randevum.reminder;

import az.randevum.appointment.AppointmentChanged;
import az.randevum.config.TimeConfig;
import az.randevum.domain.Appointment;
import az.randevum.domain.AppointmentRepository;
import az.randevum.domain.PersonalReminder;
import az.randevum.domain.Reminder;
import az.randevum.domain.ReminderRepository;
import az.randevum.push.PushMessage;
import az.randevum.push.PushService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Plans push reminders for appointments and sends the due ones (#56).
 * Planning happens in the booking transaction (via {@link AppointmentChanged});
 * {@link ReminderJob} calls {@link #sendDue()} every minute. A reminder is
 * marked sent in the same transaction that locked it, so it goes out once
 * even with several API instances.
 */
@Service
public class ReminderService {

    /** Offsets a user may choose (#57): a day, an hour, a quarter, and the start itself. */
    public static final List<Integer> ALLOWED_OFFSETS = List.of(1440, 60, 15, 0);
    static final int BATCH = 100;
    static final String TITLE = "Randevu xatırlatması";
    static final String NOTE_TITLE = "Qeyd xatırlatması";

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
    private static final String[] MONTHS = {
        "yanvar", "fevral", "mart", "aprel", "may", "iyun",
        "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"
    };

    private final ReminderRepository reminders;
    private final AppointmentRepository appointments;
    private final PushService push;
    private final Clock clock;

    public ReminderService(
            ReminderRepository reminders, AppointmentRepository appointments, PushService push, Clock clock) {
        this.reminders = reminders;
        this.appointments = appointments;
        this.push = push;
        this.clock = clock;
    }

    /**
     * Re-plans from scratch: an active appointment gets its future reminders
     * at the customer's chosen offsets, any other loses them.
     */
    @EventListener
    @Transactional
    public void onAppointmentChanged(AppointmentChanged event) {
        reminders.deleteByAppointmentId(event.appointmentId());
        Appointment a = appointments.findById(event.appointmentId()).orElse(null);
        if (a == null || !a.getStatus().isActive()) {
            return;
        }
        Instant now = clock.instant();
        for (int offset : a.getCustomer().getReminderOffsets()) {
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
                PushMessage message = new PushMessage(
                        TITLE,
                        body(a.getStartsAt(), a.getProvider().getDisplayName(), a.getService().getName(), clock),
                        "/account",
                        "appointment-" + a.getId());
                int delivered = push.sendToUser(a.getCustomer().getId(), message);
                log.info("Reminder {} for appointment {} sent to {} device(s)", reminder.getId(), a.getId(), delivered);
                sent++;
            } else if (note != null && note.getStatus() == PersonalReminder.Status.ACTIVE) {
                PushMessage message = new PushMessage(
                        NOTE_TITLE, noteBody(note.getStartsAt(), note.getTitle(), clock), "/account", "note-" + note.getId());
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
        return "Sizin " + when(startsAt, clock) + " " + providerName + " ilə randevunuz var: " + serviceName;
    }

    /** "Sizin bu gün saat 15:00-da qeydiniz var: həkimə getmək" (#59, #62). */
    static String noteBody(Instant startsAt, String title, Clock clock) {
        return "Sizin " + when(startsAt, clock) + " qeydiniz var: " + title;
    }

    /** "bu gün saat 15:00-da", "sabah saat 09:30-da" or "30 oktyabr saat 18:00-da", in Baku time. */
    static String when(Instant startsAt, Clock clock) {
        ZonedDateTime start = startsAt.atZone(TimeConfig.BAKU);
        LocalDate today = LocalDate.now(clock.withZone(TimeConfig.BAKU));
        LocalDate day = start.toLocalDate();
        String when = day.equals(today)
                ? "bu gün"
                : day.equals(today.plusDays(1))
                        ? "sabah"
                        : day.getDayOfMonth() + " " + MONTHS[day.getMonthValue() - 1];
        return when + " saat " + HH_MM.format(start) + "-da";
    }
}
