package az.planera.personal;

import az.planera.common.BusinessRuleException;
import az.planera.common.NotFoundException;
import az.planera.common.TooManyRequestsException;
import az.planera.config.TimeConfig;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.PersonalReminder;
import az.planera.domain.PersonalReminderRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.personal.PersonalReminderDtos.AgendaItem;
import az.planera.personal.PersonalReminderDtos.CreateRequest;
import az.planera.personal.PersonalReminderDtos.ReminderView;
import az.planera.personal.PersonalReminderDtos.UpdateRequest;
import az.planera.redis.RateLimiter;
import az.planera.reminder.ReminderService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Personal notes with alarms (#59) and the agenda that merges them with the
 * user's appointments. Only the owner reads or changes a note; every change
 * re-plans its reminders.
 */
@Service
@Transactional
public class PersonalReminderService {

    static final int MAX_RANGE_DAYS = 62;
    static final int DEFAULT_RANGE_DAYS = 30;
    static final List<Integer> DEFAULT_OFFSETS = List.of(0);

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    /** Notes a user may create per day (#81). */
    static final int NOTES_PER_DAY = 50;

    private final PersonalReminderRepository notes;
    private final AppointmentRepository appointments;
    private final UserRepository users;
    private final ReminderService reminders;
    private final RateLimiter limiter;
    private final Clock clock;

    public PersonalReminderService(
            PersonalReminderRepository notes,
            AppointmentRepository appointments,
            UserRepository users,
            ReminderService reminders,
            RateLimiter limiter,
            Clock clock) {
        this.notes = notes;
        this.appointments = appointments;
        this.users = users;
        this.reminders = reminders;
        this.limiter = limiter;
        this.clock = clock;
    }

    public ReminderView create(String email, CreateRequest request) {
        if (!limiter.allow("notes:day:" + email.toLowerCase() + ":" + LocalDate.now(clock), NOTES_PER_DAY, Duration.ofDays(1))) {
            throw new TooManyRequestsException("Gündəlik qeyd limiti dolub.", Duration.ofHours(1));
        }
        Instant startsAt = instant(request.date(), request.time());
        if (!startsAt.isAfter(clock.instant())) {
            throw new BusinessRuleException("Keçmiş vaxta qeyd yazmaq olmaz");
        }
        List<Integer> offsets = request.reminderOffsets() == null ? DEFAULT_OFFSETS : request.reminderOffsets();
        checkOffsets(offsets);
        PersonalReminder note = notes.save(new PersonalReminder(
                user(email), request.title().strip(), clean(request.note()), startsAt, offsets, request.source()));
        reminders.planPersonal(note);
        return view(note);
    }

    @Transactional(readOnly = true)
    public ReminderView get(String email, Long id) {
        return view(owned(email, id));
    }

    @Transactional(readOnly = true)
    public List<ReminderView> list(String email, LocalDate from, LocalDate to) {
        Range range = range(from, to);
        return notes.findInRange(user(email).getId(), range.from(), range.to()).stream()
                .filter(PersonalReminderService::shown)
                .map(PersonalReminderService::view)
                .toList();
    }

    public ReminderView update(String email, Long id, UpdateRequest request) {
        PersonalReminder note = owned(email, id);
        if (request.title() != null) {
            note.setTitle(request.title().strip());
        }
        if (request.note() != null) {
            note.setNote(clean(request.note()));
        }
        if (request.date() != null || request.time() != null) {
            ZonedDateTime current = note.getStartsAt().atZone(TimeConfig.BAKU);
            LocalDate date = request.date() != null ? request.date() : current.toLocalDate();
            LocalTime time = request.time() != null ? request.time() : current.toLocalTime();
            note.setStartsAt(instant(date, time));
        }
        if (request.reminderOffsets() != null) {
            checkOffsets(request.reminderOffsets());
            note.setReminderOffsets(request.reminderOffsets());
        }
        if (request.status() != null) {
            note.setStatus(request.status());
        }
        reminders.planPersonal(note);
        return view(note);
    }

    public void delete(String email, Long id) {
        notes.delete(owned(email, id));
    }

    /** Appointments and notes of the user in [from, to], by time. */
    @Transactional(readOnly = true)
    public List<AgendaItem> agenda(String email, LocalDate from, LocalDate to) {
        Range range = range(from, to);
        Long userId = user(email).getId();
        List<AgendaItem> items = new ArrayList<>();
        for (Appointment a : appointments.findForCustomerInRange(userId, range.from(), range.to())) {
            ZonedDateTime local = a.getStartsAt().atZone(TimeConfig.BAKU);
            items.add(new AgendaItem(
                    AgendaItem.APPOINTMENT,
                    a.getId(),
                    a.getStartsAt(),
                    local.toLocalDate(),
                    HH_MM.format(local),
                    a.getProvider().getDisplayName(),
                    a.getService().getName(),
                    a.getStatus().name()));
        }
        for (PersonalReminder n : notes.findInRange(userId, range.from(), range.to())) {
            if (!shown(n)) {
                continue;
            }
            ZonedDateTime local = n.getStartsAt().atZone(TimeConfig.BAKU);
            items.add(new AgendaItem(
                    AgendaItem.NOTE,
                    n.getId(),
                    n.getStartsAt(),
                    local.toLocalDate(),
                    HH_MM.format(local),
                    n.getTitle(),
                    n.getNote(),
                    n.getStatus().name()));
        }
        items.sort(Comparator.comparing(AgendaItem::startsAt).thenComparing(AgendaItem::type));
        return items;
    }

    private PersonalReminder owned(String email, Long id) {
        PersonalReminder note = notes.findById(id).orElseThrow(() -> new NotFoundException("Qeyd tapılmadı: " + id));
        if (!note.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Bu qeyd sizə aid deyil");
        }
        return note;
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("İstifadəçi tapılmadı"));
    }

    private record Range(Instant from, Instant to) {}

    /** [from, to] inclusive dates in Baku; defaults to today and the next month; at most 62 days. */
    private Range range(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(clock.withZone(TimeConfig.BAKU));
        LocalDate end = to != null ? to : start.plusDays(DEFAULT_RANGE_DAYS);
        if (end.isBefore(start) || ChronoUnit.DAYS.between(start, end) > MAX_RANGE_DAYS) {
            throw new BusinessRuleException("Tarix aralığı 0-" + MAX_RANGE_DAYS + " gün olmalıdır");
        }
        return new Range(instant(start, LocalTime.MIDNIGHT), instant(end.plusDays(1), LocalTime.MIDNIGHT));
    }

    /** Cancelled notes stay in the table for the undo window of the UI (#68) but are not listed. */
    private static boolean shown(PersonalReminder n) {
        return n.getStatus() != PersonalReminder.Status.CANCELLED;
    }

    private static void checkOffsets(List<Integer> offsets) {
        for (Integer offset : offsets) {
            if (offset == null || !ReminderService.ALLOWED_OFFSETS.contains(offset)) {
                throw new BusinessRuleException("Xatırlatma vaxtı yalnız 1 gün, 1 saat, 15 dəqiqə və ya qeyd saatı ola bilər");
            }
        }
    }

    private static String clean(String text) {
        if (text == null) {
            return null;
        }
        String stripped = text.strip();
        return stripped.isEmpty() ? null : stripped;
    }

    private static Instant instant(LocalDate date, LocalTime time) {
        return ZonedDateTime.of(date, time, TimeConfig.BAKU).toInstant();
    }

    static ReminderView view(PersonalReminder n) {
        ZonedDateTime local = n.getStartsAt().atZone(TimeConfig.BAKU);
        return new ReminderView(
                n.getId(),
                n.getTitle(),
                n.getNote(),
                local.toLocalDate(),
                HH_MM.format(local),
                n.getStartsAt(),
                n.getReminderOffsets(),
                n.getSource(),
                n.getStatus());
    }
}
