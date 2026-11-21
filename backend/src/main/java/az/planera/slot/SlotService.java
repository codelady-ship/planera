package az.planera.slot;

import az.planera.config.DemoSafe;
import az.planera.common.Messages;
import az.planera.common.NotFoundException;
import az.planera.config.TimeConfig;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.AvailabilityRule;
import az.planera.domain.AvailabilityRuleRepository;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.ServiceOffering;
import az.planera.domain.ServiceOfferingRepository;
import az.planera.domain.TimeOff;
import az.planera.domain.TimeOffRepository;
import az.planera.redis.SlotCache;
import az.planera.slot.SlotCalculator.Busy;
import az.planera.slot.SlotCalculator.Window;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Free start times of a provider's service (#18, #19). Each request loads the
 * rules, days off and active appointments of the whole range with one query
 * each, then computes in memory. The day view is cached in Redis for 60
 * seconds (#77); booking checks always compute fresh.
 */
@Service
@Transactional(readOnly = true)
public class SlotService {

    /** Bookings open this many days ahead; later dates have no slots. */
    public static final int HORIZON_DAYS = 90;

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final ProviderProfileRepository providers;
    private final ServiceOfferingRepository services;
    private final AvailabilityRuleRepository rules;
    private final TimeOffRepository timeOff;
    private final AppointmentRepository appointments;
    private final SlotCache cache;
    private final Clock clock;

    public SlotService(
            ProviderProfileRepository providers,
            ServiceOfferingRepository services,
            AvailabilityRuleRepository rules,
            TimeOffRepository timeOff,
            AppointmentRepository appointments,
            SlotCache cache,
            Clock clock) {
        this.providers = providers;
        this.services = services;
        this.rules = rules;
        this.timeOff = timeOff;
        this.appointments = appointments;
        this.cache = cache;
        this.clock = clock;
    }

    @DemoSafe("Free times only.")
    public record SlotsView(LocalDate date, Long serviceId, int durationMinutes, List<String> slots) {}

    @DemoSafe("Free dates only.")
    public record AvailableDatesView(YearMonth month, Long serviceId, List<LocalDate> dates) {}

    public SlotsView slots(String slug, Long serviceId, LocalDate date) {
        ServiceOffering service = activeService(slug, serviceId);
        Long providerId = service.getProvider().getId();
        List<String> slots = cache.get(providerId, serviceId, date).orElseGet(() -> {
            List<String> fresh = freeStarts(service, date, date, null).getOrDefault(date).stream()
                    .map(HH_MM::format)
                    .toList();
            cache.put(providerId, serviceId, date, fresh);
            return fresh;
        });
        return new SlotsView(date, serviceId, service.getDurationMinutes(), slots);
    }

    public AvailableDatesView availableDates(String slug, Long serviceId, YearMonth month) {
        ServiceOffering service = activeService(slug, serviceId);
        DayRange range = freeStarts(service, month.atDay(1), month.atEndOfMonth(), null);
        List<LocalDate> dates = range.days().stream().filter(d -> !d.starts().isEmpty()).map(DayStarts::date).toList();
        return new AvailableDatesView(month, serviceId, dates);
    }

    /**
     * Free starts of one day for booking checks. {@code ignoreAppointmentId}
     * leaves an appointment out of the busy ranges, so a reschedule may move
     * within its own current time.
     */
    public List<LocalTime> freeStarts(Long serviceId, LocalDate date, Long ignoreAppointmentId) {
        ServiceOffering service = services.findById(serviceId)
                .orElseThrow(() -> new NotFoundException(Messages.key("service.notFound", serviceId)));
        return freeStarts(service, date, date, ignoreAppointmentId).getOrDefault(date);
    }

    private DayRange freeStarts(ServiceOffering service, LocalDate from, LocalDate to, Long ignoreAppointmentId) {
        ProviderProfile provider = service.getProvider();
        LocalDate today = LocalDate.now(clock);
        LocalDate first = from.isBefore(today) ? today : from;
        LocalDate last = to.isAfter(today.plusDays(HORIZON_DAYS)) ? today.plusDays(HORIZON_DAYS) : to;
        if (first.isAfter(last)) {
            return new DayRange(List.of());
        }

        List<AvailabilityRule> weekly = rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(provider.getId());
        List<TimeOff> daysOff = timeOff.findOverlapping(provider.getId(), first, last);
        List<Busy> busy = appointments
                .findActiveOverlapping(provider.getId(), startOf(first), startOf(last.plusDays(1)))
                .stream()
                .filter(a -> !Objects.equals(a.getId(), ignoreAppointmentId))
                .map(SlotService::busy)
                .toList();
        Instant now = clock.instant();

        List<DayStarts> days = new ArrayList<>();
        for (LocalDate d = first; !d.isAfter(last); d = d.plusDays(1)) {
            days.add(new DayStarts(d, dayStarts(
                    d, weekly, daysOff, busy, service.getDurationMinutes(), provider.getSlotStepMinutes(), now)));
        }
        return new DayRange(days);
    }

    /** Free starts of one day from preloaded weekly rules, days off and busy ranges. */
    private static List<LocalTime> dayStarts(
            LocalDate day,
            List<AvailabilityRule> weekly,
            List<TimeOff> daysOff,
            List<Busy> busy,
            int durationMinutes,
            int stepMinutes,
            Instant now) {
        boolean off = daysOff.stream().anyMatch(t -> t.covers(day));
        List<Window> windows = off
                ? List.of()
                : weekly.stream()
                        .filter(r -> r.getDayOfWeek() == day.getDayOfWeek())
                        .map(r -> new Window(r.getStartTime(), r.getEndTime()))
                        .toList();
        return SlotCalculator.freeStarts(day, windows, durationMinutes, stepMinutes, busy, now, TimeConfig.BAKU);
    }

    /**
     * The earliest free start of a provider within {@code lookaheadDays} (today included), for the
     * catalog's "next free time" badge (#19). Uses the provider's shortest active service: any start
     * that fits a longer service also fits the shortest one, so this is the earliest bookable time.
     * Rules, days off and appointments are loaded once; days are computed until the first free one.
     */
    public Optional<LocalDateTime> nextFreeStart(ProviderProfile provider, int lookaheadDays) {
        Optional<Integer> duration = services.findByProviderIdAndActiveTrueOrderByPriceAsc(provider.getId()).stream()
                .map(ServiceOffering::getDurationMinutes)
                .min(Integer::compare);
        if (duration.isEmpty()) {
            return Optional.empty();
        }
        LocalDate today = LocalDate.now(clock);
        LocalDate last = today.plusDays(Math.min(Math.max(lookaheadDays, 1), HORIZON_DAYS) - 1L);
        List<AvailabilityRule> weekly = rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(provider.getId());
        if (weekly.isEmpty()) {
            return Optional.empty();
        }
        List<TimeOff> daysOff = timeOff.findOverlapping(provider.getId(), today, last);
        List<Busy> busy = appointments
                .findActiveOverlapping(provider.getId(), startOf(today), startOf(last.plusDays(1)))
                .stream()
                .map(SlotService::busy)
                .toList();
        Instant now = clock.instant();
        for (LocalDate d = today; !d.isAfter(last); d = d.plusDays(1)) {
            List<LocalTime> starts = dayStarts(d, weekly, daysOff, busy, duration.get(), provider.getSlotStepMinutes(), now);
            if (!starts.isEmpty()) {
                return Optional.of(d.atTime(starts.getFirst()));
            }
        }
        return Optional.empty();
    }

    /** The active service, which must belong to the active provider {@code slug}. */
    public ServiceOffering activeService(String slug, Long serviceId) {
        ProviderProfile provider = providers.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException(Messages.key("provider.notFound", slug)));
        return services.findByIdAndProviderId(serviceId, provider.getId())
                .filter(ServiceOffering::isActive)
                .orElseThrow(() -> new NotFoundException(Messages.key("service.notFound", serviceId)));
    }

    private static Instant startOf(LocalDate date) {
        return date.atStartOfDay(TimeConfig.BAKU).toInstant();
    }

    private static Busy busy(Appointment a) {
        return new Busy(a.getStartsAt(), a.getEndsAt());
    }

    private record DayStarts(LocalDate date, List<LocalTime> starts) {}

    private record DayRange(List<DayStarts> days) {
        List<LocalTime> getOrDefault(LocalDate date) {
            return days.stream().filter(d -> d.date().equals(date)).findFirst().map(DayStarts::starts).orElse(List.of());
        }
    }
}
