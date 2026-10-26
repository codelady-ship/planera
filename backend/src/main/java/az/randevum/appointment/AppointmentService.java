package az.randevum.appointment;

import az.randevum.appointment.AppointmentDtos.Actor;
import az.randevum.appointment.AppointmentDtos.AppointmentView;
import az.randevum.appointment.AppointmentDtos.CreateRequest;
import az.randevum.appointment.AppointmentDtos.ProviderAppointmentView;
import az.randevum.appointment.AppointmentDtos.Scope;
import az.randevum.common.BusinessRuleException;
import az.randevum.common.NotFoundException;
import az.randevum.common.SlotTakenException;
import az.randevum.common.TooManyRequestsException;
import az.randevum.config.TimeConfig;
import az.randevum.domain.Appointment;
import az.randevum.domain.AppointmentRepository;
import az.randevum.domain.AppointmentStatus;
import az.randevum.domain.ServiceOffering;
import az.randevum.domain.ServiceOfferingRepository;
import az.randevum.domain.User;
import az.randevum.domain.UserRepository;
import az.randevum.redis.RateLimiter;
import az.randevum.redis.RedisLock;
import az.randevum.redis.SlotCache;
import az.randevum.slot.SlotService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Booking, cancelling, rescheduling and status changes (#21, #22, #23).
 *
 * <p>Double booking is guarded twice: the service checks the slot is free,
 * and the {@code appointments_no_overlap} constraint rejects the loser of a
 * race. Both end as 409 with the nearest free times of that day. Writes run
 * in explicit transactions so that, after a constraint error, the
 * alternatives are read in a fresh one.
 */
@Service
public class AppointmentService {

    /** Per customer: bookings per minute and per day (#81). */
    static final int PER_MINUTE = 10;
    static final int PER_DAY = 20;
    static final int ALTERNATIVES = 6;
    /** Longest range the panel appointment lists return at once. */
    static final int MAX_RANGE_DAYS = 62;

    private static final String OVERLAP_CONSTRAINT = "appointments_no_overlap";
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final AppointmentRepository appointments;
    private final ServiceOfferingRepository services;
    private final UserRepository users;
    private final SlotService slots;
    private final SlotCache cache;
    private final RedisLock locks;
    private final RateLimiter limiter;
    private final TransactionTemplate tx;
    private final TransactionTemplate readOnly;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public AppointmentService(
            AppointmentRepository appointments,
            ServiceOfferingRepository services,
            UserRepository users,
            SlotService slots,
            SlotCache cache,
            RedisLock locks,
            RateLimiter limiter,
            PlatformTransactionManager transactions,
            Clock clock,
            ApplicationEventPublisher events) {
        this.events = events;
        this.appointments = appointments;
        this.services = services;
        this.users = users;
        this.slots = slots;
        this.cache = cache;
        this.locks = locks;
        this.limiter = limiter;
        this.tx = new TransactionTemplate(transactions);
        this.readOnly = new TransactionTemplate(transactions);
        this.readOnly.setReadOnly(true);
        this.clock = clock;
    }

    public AppointmentView create(Actor actor, CreateRequest request) {
        User customer = read(() -> user(actor));
        checkRateLimit(customer.getId());
        Long serviceId = request.serviceId();
        Long providerId = read(() -> services.findById(serviceId)
                .filter(s -> s.isActive() && s.getProvider().isActive())
                .map(s -> s.getProvider().getId())
                .orElseThrow(() -> new NotFoundException("Xidmət tapılmadı: " + serviceId)));
        Instant startsAt = instant(request.date(), request.time());

        try (RedisLock.Held lock = locks.tryLock("slot:" + providerId + ":" + startsAt, Duration.ofSeconds(10))) {
            if (!lock.acquired()) {
                throw taken(serviceId, request.date(), null);
            }
            AppointmentView view = write(serviceId, request.date(), null, () -> {
                if (!slots.freeStarts(serviceId, request.date(), null).contains(request.time())) {
                    throw taken(serviceId, request.date(), null);
                }
                ServiceOffering s = services.getReferenceById(serviceId);
                Appointment a = new Appointment(
                        code(), s.getProvider(), users.getReferenceById(customer.getId()), s,
                        startsAt, startsAt.plus(Duration.ofMinutes(s.getDurationMinutes())));
                a.setCustomerNote(request.note());
                return view(changed(a));
            });
            cache.evictDay(providerId, request.date());
            return view;
        }
    }

    /** Saves and tells listeners in the same transaction that the appointment changed (reminders, #56). */
    private Appointment changed(Appointment a) {
        Appointment saved = appointments.saveAndFlush(a);
        events.publishEvent(new AppointmentChanged(saved.getId()));
        return saved;
    }

    public AppointmentView get(Actor actor, Long id) {
        return read(() -> view(owned(actor, id)));
    }

    public List<AppointmentView> mine(Actor actor, Scope scope) {
        return read(() -> {
            Long customerId = user(actor).getId();
            Instant now = clock.instant();
            List<Appointment> found = switch (scope) {
                case UPCOMING -> appointments.findUpcoming(customerId, now);
                case PAST -> appointments.findPast(customerId, now);
                case CANCELLED -> appointments.findCancelled(customerId);
            };
            return found.stream().map(this::view).toList();
        });
    }

    public AppointmentView cancel(Actor actor, Long id, String reason) {
        AppointmentView view = tx.execute(status -> {
            Appointment a = owned(actor, id);
            requireChangeable(actor, a);
            a.cancel(clock.instant(), reason);
            return view(changed(a));
        });
        cache.evictDay(providerId(id), view.date());
        return view;
    }

    /** Moves the appointment in one transaction: the old time is released as the new one is taken. */
    public AppointmentView reschedule(Actor actor, Long id, LocalDate date, LocalTime time) {
        AppointmentView before = read(() -> {
            Appointment a = owned(actor, id);
            requireChangeable(actor, a);
            return view(a);
        });
        AppointmentView after = write(before.serviceId(), date, id, () -> {
            if (!slots.freeStarts(before.serviceId(), date, id).contains(time)) {
                throw taken(before.serviceId(), date, id);
            }
            Appointment a = appointments.findById(id).orElseThrow();
            Instant startsAt = instant(date, time);
            a.reschedule(startsAt, startsAt.plus(Duration.ofMinutes(a.getService().getDurationMinutes())));
            return view(changed(a));
        });
        Long providerId = providerId(id);
        cache.evictDay(providerId, before.date());
        cache.evictDay(providerId, date);
        return after;
    }

    /**
     * Moves an appointment along its lifecycle. {@code providerId} limits it to
     * that provider's own appointments (403 otherwise); null means admin.
     */
    public AppointmentView changeStatus(Long providerId, Long id, AppointmentStatus next) {
        AppointmentView view = tx.execute(status -> {
            Appointment a = appointments.findById(id)
                    .orElseThrow(() -> new NotFoundException("Randevu tapılmadı: " + id));
            if (providerId != null && !providerId.equals(a.getProvider().getId())) {
                throw new AccessDeniedException("Bu randevu sizə aid deyil");
            }
            if (!a.getStatus().canTransitionTo(next)) {
                throw new BusinessRuleException("Status " + a.getStatus() + " -> " + next + " keçidinə icazə yoxdur");
            }
            boolean finished = next == AppointmentStatus.COMPLETED || next == AppointmentStatus.NO_SHOW;
            if (finished && clock.instant().isBefore(a.getStartsAt())) {
                throw new BusinessRuleException("Randevu hələ başlamayıb");
            }
            if (next == AppointmentStatus.CANCELLED) {
                a.cancel(clock.instant(), null);
            } else {
                a.setStatus(next);
            }
            return view(changed(a));
        });
        cache.evictDay(providerId(id), view.date());
        return view;
    }

    /** A provider's schedule between two dates, inclusive, for the panel. */
    /** Appointments of one provider, or of every provider when {@code providerId} is null (admin). */
    public List<ProviderAppointmentView> forProvider(Long providerId, LocalDate from, LocalDate to) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new BusinessRuleException("Tarix aralığı 0-" + MAX_RANGE_DAYS + " gün olmalıdır");
        }
        Instant start = instant(from, LocalTime.MIDNIGHT);
        Instant end = instant(to.plusDays(1), LocalTime.MIDNIGHT);
        return read(() -> (providerId == null
                        ? appointments.findAllInRange(start, end)
                        : appointments.findForProvider(providerId, start, end))
                .stream()
                .map(a -> new ProviderAppointmentView(view(a), a.getCustomer().getFullName(), a.getCustomer().getPhone()))
                .toList());
    }

    // --- helpers -------------------------------------------------------------

    private void checkRateLimit(Long customerId) {
        LocalDate today = LocalDate.now(clock);
        if (!limiter.allow("appointments:minute:" + customerId, PER_MINUTE, Duration.ofMinutes(1))) {
            throw new TooManyRequestsException("Çox sayda sorğu. Bir dəqiqə sonra yenidən cəhd edin.", Duration.ofMinutes(1));
        }
        if (!limiter.allow("appointments:day:" + customerId + ":" + today, PER_DAY, Duration.ofDays(1))) {
            throw new TooManyRequestsException("Gündəlik randevu limiti dolub.", Duration.ofHours(1));
        }
    }

    /** Runs a booking write; a lost race on the overlap constraint becomes a 409 with alternatives. */
    private AppointmentView write(Long serviceId, LocalDate date, Long ignoreId, Supplier<AppointmentView> work) {
        try {
            return tx.execute(status -> work.get());
        } catch (DataIntegrityViolationException e) {
            String cause = String.valueOf(NestedExceptionUtils.getMostSpecificCause(e).getMessage());
            if (cause.contains(OVERLAP_CONSTRAINT)) {
                throw taken(serviceId, date, ignoreId);
            }
            throw e;
        }
    }

    private SlotTakenException taken(Long serviceId, LocalDate date, Long ignoreId) {
        return new SlotTakenException(alternatives(serviceId, date, ignoreId));
    }

    /** The first free times of that day. */
    private List<String> alternatives(Long serviceId, LocalDate date, Long ignoreId) {
        return read(() -> slots.freeStarts(serviceId, date, ignoreId)).stream()
                .sorted(Comparator.naturalOrder())
                .limit(ALTERNATIVES)
                .map(HH_MM::format)
                .toList();
    }

    /** The customer may change an active appointment only until the provider's cancellation window. */
    private void requireChangeable(Actor actor, Appointment a) {
        if (!a.getStatus().isActive()) {
            throw new BusinessRuleException("Bu randevu artıq aktiv deyil");
        }
        if (!actor.admin() && !beforeDeadline(a)) {
            throw new BusinessRuleException("Randevuya " + a.getProvider().getCancellationHours()
                    + " saatdan az qalıb, dəyişmək və ya ləğv etmək olmur");
        }
    }

    private boolean beforeDeadline(Appointment a) {
        Instant deadline = a.getStartsAt().minus(Duration.ofHours(a.getProvider().getCancellationHours()));
        return clock.instant().isBefore(deadline);
    }

    /** Someone else's appointment is 403 (#26). */
    private Appointment owned(Actor actor, Long id) {
        Appointment a = appointments.findById(id).orElseThrow(() -> new NotFoundException("Randevu tapılmadı: " + id));
        if (!actor.admin() && !a.getCustomer().getEmail().equalsIgnoreCase(actor.email())) {
            throw new AccessDeniedException("Bu randevu sizə aid deyil");
        }
        return a;
    }

    private User user(Actor actor) {
        return users.findByEmailIgnoreCase(actor.email())
                .orElseThrow(() -> new NotFoundException("İstifadəçi tapılmadı"));
    }

    private Long providerId(Long appointmentId) {
        return read(() -> appointments.getReferenceById(appointmentId).getProvider().getId());
    }

    private String code() {
        return "RV-%d-%06d".formatted(LocalDate.now(clock).getYear(), appointments.nextCodeNumber());
    }

    private static Instant instant(LocalDate date, LocalTime time) {
        return ZonedDateTime.of(date, time, TimeConfig.BAKU).toInstant();
    }

    private <T> T read(Supplier<T> work) {
        return readOnly.execute(status -> work.get());
    }

    private AppointmentView view(Appointment a) {
        ZonedDateTime local = a.getStartsAt().atZone(TimeConfig.BAKU);
        return new AppointmentView(
                a.getId(),
                a.getCode(),
                a.getProvider().getSlug(),
                a.getProvider().getDisplayName(),
                a.getService().getId(),
                a.getService().getName(),
                local.toLocalDate(),
                HH_MM.format(local),
                a.getService().getDurationMinutes(),
                a.getStartsAt(),
                a.getEndsAt(),
                a.getStatus(),
                a.getPrice(),
                a.getCustomerNote(),
                a.getStatus().isActive() && beforeDeadline(a));
    }
}
