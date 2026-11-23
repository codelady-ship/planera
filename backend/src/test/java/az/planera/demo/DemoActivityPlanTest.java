package az.planera.demo;

import static org.assertj.core.api.Assertions.assertThat;

import az.planera.demo.DemoActivityPlan.Offer;
import az.planera.demo.DemoActivityPlan.Planned;
import az.planera.domain.AppointmentStatus;
import az.planera.stats.StatsCalculator;
import az.planera.stats.StatsCalculator.Row;
import az.planera.stats.StatsDtos.StatsView;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class DemoActivityPlanTest {

    /** Wednesday; the statistics read 2026-09-29 .. 2026-11-01. */
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 28);

    private static final Set<AppointmentStatus> OUTCOMES =
            Set.of(AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW);
    private static final Set<AppointmentStatus> AHEAD =
            Set.of(AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING, AppointmentStatus.CANCELLED);

    private static final Map<String, Integer> MINUTES = DemoActivityPlan.PROVIDERS.stream()
            .flatMap(List::stream)
            .collect(Collectors.toMap(o -> o.providerSlug() + "/" + o.serviceName(), Offer::minutes));

    @Test
    void coversExactlyTheDaysTheStatisticsReadExceptSundays() {
        List<Planned> plan = DemoActivityPlan.around(TODAY);

        Set<LocalDate> days = plan.stream().map(Planned::date).collect(Collectors.toSet());
        assertThat(days).allSatisfy(d -> {
            assertThat(d).isBetween(StatsCalculator.from(TODAY), StatsCalculator.to(TODAY));
            assertThat(d.getDayOfWeek()).isNotEqualTo(DayOfWeek.SUNDAY);
        });
        // Every Monday-Saturday of the window has appointments.
        long workdays = StatsCalculator.from(TODAY).datesUntil(StatsCalculator.to(TODAY).plusDays(1))
                .filter(d -> d.getDayOfWeek() != DayOfWeek.SUNDAY)
                .count();
        assertThat(days).hasSize((int) workdays);
    }

    @Test
    void aDayIsTheSameWhateverTodayIsOnlyItsStatusMovesOn() {
        LocalDate day = LocalDate.of(2026, 10, 30);
        List<Planned> ahead = DemoActivityPlan.day(day, TODAY);
        List<Planned> later = DemoActivityPlan.day(day, day.plusDays(10));

        assertThat(later).extracting(Planned::code, Planned::start, Planned::providerSlug, Planned::serviceName,
                        Planned::customerEmail, Planned::outcome)
                .isEqualTo(ahead.stream()
                        .map(a -> org.assertj.core.groups.Tuple.tuple(a.code(), a.start(), a.providerSlug(),
                                a.serviceName(), a.customerEmail(), a.outcome()))
                        .toList());
        assertThat(ahead).allSatisfy(a -> assertThat(a.status()).isIn(AHEAD));
        assertThat(later).allSatisfy(a -> assertThat(a.status()).isEqualTo(a.outcome()));
        // A cancellation is known ahead.
        assertThat(ahead).allSatisfy(a -> {
            if (a.outcome() == AppointmentStatus.CANCELLED) assertThat(a.status()).isEqualTo(AppointmentStatus.CANCELLED);
        });
    }

    @Test
    void pastDaysCarryTheirOutcomeTodayAndLaterAreStillOpen() {
        for (Planned a : DemoActivityPlan.around(TODAY)) {
            assertThat(a.outcome()).isIn(OUTCOMES);
            if (a.date().isBefore(TODAY)) {
                assertThat(a.status()).isEqualTo(a.outcome());
            } else {
                assertThat(a.status()).isIn(AHEAD);
            }
        }
    }

    @Test
    void neverCollidesWithItselfAndStaysInsideWorkingHours() {
        List<Planned> plan = DemoActivityPlan.around(TODAY);

        Set<String> codes = new HashSet<>();
        Set<String> providerDays = new HashSet<>();
        for (Planned a : plan) {
            assertThat(codes.add(a.code())).as("unique code %s", a.code()).isTrue();
            assertThat(a.code()).startsWith(DemoActivityPlan.CODE_PREFIX).hasSizeLessThanOrEqualTo(20);
            assertThat(providerDays.add(a.providerSlug() + a.date())).as("one per provider and day").isTrue();

            int minutes = MINUTES.get(a.providerSlug() + "/" + a.serviceName());
            LocalTime end = a.start().plusMinutes(minutes);
            if (a.date().getDayOfWeek() == DayOfWeek.SATURDAY) {
                assertThat(a.start()).isAfterOrEqualTo(LocalTime.of(10, 0));
                assertThat(end).isBeforeOrEqualTo(LocalTime.of(15, 0));
            } else {
                boolean morning = !a.start().isBefore(LocalTime.of(9, 0)) && !end.isAfter(LocalTime.of(13, 0));
                boolean afternoon = !a.start().isBefore(LocalTime.of(14, 0)) && !end.isAfter(LocalTime.of(18, 0));
                assertThat(morning || afternoon).as("%s %s-%s", a.date(), a.start(), end).isTrue();
            }
        }
    }

    @Test
    void theDashboardIsNeverEmpty() {
        // Any day of the week, also Sunday (nothing booked that day) and Monday (a fresh week).
        for (LocalDate today = TODAY; today.isBefore(TODAY.plusDays(7)); today = today.plusDays(1)) {
            List<Row> rows = DemoActivityPlan.around(today).stream()
                    .map(a -> new Row(a.date(), a.status(), BigDecimal.TEN, a.serviceName()))
                    .toList();
            StatsView stats = StatsCalculator.calculate(rows, today);
            assertThat(stats.weekCount()).as("week of %s", today).isPositive();
            assertThat(stats.weekRevenue()).isPositive();
            assertThat(stats.popularServices()).isNotEmpty();
            if (today.getDayOfWeek() != DayOfWeek.SUNDAY) {
                assertThat(stats.todayCount()).as("today %s", today).isPositive();
            }
        }
    }

    @Test
    void usesOnlyProvidersServicesAndCustomersOfTheSeed() throws IOException {
        String seed;
        try (InputStream in = getClass().getResourceAsStream("/db/seed/R__demo_data.sql")) {
            seed = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        for (Offer offer : DemoActivityPlan.PROVIDERS.stream().flatMap(List::stream).toList()) {
            assertThat(seed).contains("('" + offer.providerSlug() + "',");
            assertThat(seed).containsPattern("\\('" + offer.providerSlug() + "',\\s+'"
                    + java.util.regex.Pattern.quote(offer.serviceName()) + "',.*\\s" + offer.minutes() + "\\)");
        }
        assertThat(seed).contains("'musteri@planera.az'");
        Map<String, String> extra = DemoActivitySeeder.EXTRA_CUSTOMERS;
        assertThat(DemoActivityPlan.CUSTOMERS).allSatisfy(email ->
                assertThat(email.equals("musteri@planera.az") || extra.containsKey(email)).isTrue());
        // No extra customer can pick up the public demo password: the seed only sets it on @planera.az.
        assertThat(extra.keySet()).allSatisfy(email -> assertThat(email).doesNotEndWith("@planera.az"));
        assertThat(DemoActivityPlan.CUSTOMERS.stream().collect(Collectors.toMap(Function.identity(), e -> 1)))
                .hasSize(DemoActivityPlan.CUSTOMERS.size());
    }
}
