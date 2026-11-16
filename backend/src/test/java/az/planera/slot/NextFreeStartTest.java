package az.planera.slot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Next free time for the catalog card (#19), with repositories mocked and "now" fixed to Monday 26 Oct 2026, 10:05 Baku. */
class NextFreeStartTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);

    final ProviderProfileRepository providers = mock(ProviderProfileRepository.class);
    final ServiceOfferingRepository services = mock(ServiceOfferingRepository.class);
    final AvailabilityRuleRepository rules = mock(AvailabilityRuleRepository.class);
    final TimeOffRepository timeOff = mock(TimeOffRepository.class);
    final AppointmentRepository appointments = mock(AppointmentRepository.class);
    final Clock clock = Clock.fixed(ZonedDateTime.of(MONDAY, LocalTime.of(10, 5), TimeConfig.BAKU).toInstant(), TimeConfig.BAKU);
    final SlotService slots = new SlotService(providers, services, rules, timeOff, appointments, mock(SlotCache.class), clock);

    final ProviderProfile barber = new ProviderProfile(null, "test-barber", "Test Barber", "Bərbər", "Bakı");
    final ServiceOffering shave = new ServiceOffering(barber, "Üz qırxma", new BigDecimal("8.00"), 30);
    final ServiceOffering haircut = new ServiceOffering(barber, "Saç kəsimi", new BigDecimal("15.00"), 60);

    @BeforeEach
    void setUp() {
        barber.setSlotStepMinutes(15);
        // Ordered by price like the repository; the shortest service is not necessarily first.
        when(services.findByProviderIdAndActiveTrueOrderByPriceAsc(any())).thenReturn(List.of(haircut, shave));
        when(rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(any())).thenReturn(List.of(
                new AvailabilityRule(barber, DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(12, 0)),
                new AvailabilityRule(barber, DayOfWeek.WEDNESDAY, LocalTime.of(9, 0), LocalTime.of(13, 0))));
        when(timeOff.findOverlapping(any(), any(), any())).thenReturn(List.of());
        when(appointments.findActiveOverlapping(any(), any(), any())).thenReturn(List.of());
    }

    @Test
    void firstFreeStartTodaySkipsPastAndBusyTimes() {
        // 10:15-10:45 is taken, so with the 30-minute shave 10:15 and 10:30 overlap it and 10:45 is next.
        when(appointments.findActiveOverlapping(any(), any(), any())).thenReturn(List.of(booked(LocalTime.of(10, 15), 30)));
        assertThat(slots.nextFreeStart(barber, 14)).contains(LocalDateTime.of(MONDAY, LocalTime.of(10, 45)));
    }

    @Test
    void dayOffMovesToTheNextWorkingDay() {
        when(timeOff.findOverlapping(any(), any(), any())).thenReturn(List.of(new TimeOff(barber, MONDAY, MONDAY, "Bayram")));
        assertThat(slots.nextFreeStart(barber, 14)).contains(LocalDateTime.of(MONDAY.plusDays(2), LocalTime.of(9, 0)));
    }

    @Test
    void nothingFreeInsideTheLookaheadIsEmpty() {
        when(timeOff.findOverlapping(any(), any(), any())).thenReturn(List.of(new TimeOff(barber, MONDAY, MONDAY.plusDays(30), "Məzuniyyət")));
        assertThat(slots.nextFreeStart(barber, 14)).isEmpty();
    }

    @Test
    void providerWithoutActiveServicesOrRulesHasNoNextSlot() {
        when(services.findByProviderIdAndActiveTrueOrderByPriceAsc(any())).thenReturn(List.of());
        assertThat(slots.nextFreeStart(barber, 14)).isEmpty();

        when(services.findByProviderIdAndActiveTrueOrderByPriceAsc(any())).thenReturn(List.of(shave));
        when(rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(any())).thenReturn(List.of());
        assertThat(slots.nextFreeStart(barber, 14)).isEmpty();
    }

    private Appointment booked(LocalTime start, int minutes) {
        var startsAt = MONDAY.atTime(start).atZone(TimeConfig.BAKU).toInstant();
        return new Appointment("T1", barber, null, shave, startsAt, startsAt.plusSeconds(minutes * 60L));
    }
}
