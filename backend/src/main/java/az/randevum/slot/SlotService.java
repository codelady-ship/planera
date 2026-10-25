package az.randevum.slot;

import az.randevum.common.NotFoundException;
import az.randevum.config.TimeConfig;
import az.randevum.domain.Appointment;
import az.randevum.domain.AppointmentRepository;
import az.randevum.domain.AvailabilityRule;
import az.randevum.domain.AvailabilityRuleRepository;
import az.randevum.domain.ProviderProfile;
import az.randevum.domain.ProviderProfileRepository;
import az.randevum.domain.ServiceOffering;
import az.randevum.domain.ServiceOfferingRepository;
import az.randevum.domain.TimeOff;
import az.randevum.domain.TimeOffRepository;
import az.randevum.redis.SlotCache;
import az.randevum.slot.SlotCalculator.Busy;
import az.randevum.slot.SlotCalculator.Window;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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

    public record SlotsView(LocalDate date, Long serviceId, int durationMinutes, List<String> slots) {}

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
    public List<LocalTime> freeStarts(ServiceOffering service, LocalDate date, Long ignoreAppointmentId) {
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
            LocalDate day = d;
            boolean off = daysOff.stream().anyMatch(t -> t.covers(day));
            List<Window> windows = off
                    ? List.of()
                    : weekly.stream()
                            .filter(r -> r.getDayOfWeek() == day.getDayOfWeek())
                            .map(r -> new Window(r.getStartTime(), r.getEndTime()))
                            .toList();
            days.add(new DayStarts(day, SlotCalculator.freeStarts(
                    day, windows, service.getDurationMinutes(), provider.getSlotStepMinutes(), busy, now, TimeConfig.BAKU)));
        }
        return new DayRange(days);
    }

    /** The active service, which must belong to the active provider {@code slug}. */
    public ServiceOffering activeService(String slug, Long serviceId) {
        ProviderProfile provider = providers.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException("Mütəxəssis tapılmadı: " + slug));
        return services.findByIdAndProviderId(serviceId, provider.getId())
                .filter(ServiceOffering::isActive)
                .orElseThrow(() -> new NotFoundException("Xidmət tapılmadı: " + serviceId));
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
