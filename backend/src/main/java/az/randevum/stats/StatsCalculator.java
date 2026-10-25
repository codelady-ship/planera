package az.randevum.stats;

import az.randevum.domain.AppointmentStatus;
import az.randevum.stats.StatsDtos.DayCount;
import az.randevum.stats.StatsDtos.ServiceCount;
import az.randevum.stats.StatsDtos.StatsView;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Panel statistics (#41) as a pure function over appointment rows, so the
 * rules are unit-tested without a database.
 *
 * <ul>
 *   <li>Counts and revenue skip cancelled and no-show appointments.</li>
 *   <li>The week runs Monday to Sunday around {@code today}.</li>
 *   <li>Popular services look at the last {@value #POPULAR_DAYS} days up to today.</li>
 * </ul>
 */
public final class StatsCalculator {

    static final int POPULAR_DAYS = 30;
    static final int TOP_SERVICES = 5;

    private StatsCalculator() {}

    /** One appointment as the statistics see it; the date is local to Asia/Baku. */
    public record Row(LocalDate date, AppointmentStatus status, BigDecimal price, String serviceName) {
        boolean counts() {
            return status != AppointmentStatus.CANCELLED && status != AppointmentStatus.NO_SHOW;
        }

        boolean within(LocalDate first, LocalDate last) {
            return !date.isBefore(first) && !date.isAfter(last);
        }
    }

    /** The first day the rows must cover. */
    public static LocalDate from(LocalDate today) {
        LocalDate monday = today.with(DayOfWeek.MONDAY);
        LocalDate popular = today.minusDays(POPULAR_DAYS - 1);
        return monday.isBefore(popular) ? monday : popular;
    }

    /** The last day the rows must cover. */
    public static LocalDate to(LocalDate today) {
        return today.with(DayOfWeek.SUNDAY);
    }

    public static StatsView calculate(List<Row> rows, LocalDate today) {
        LocalDate monday = today.with(DayOfWeek.MONDAY);
        LocalDate sunday = monday.plusDays(6);
        List<Row> week = rows.stream().filter(r -> r.within(monday, sunday)).toList();

        long todayCount = rows.stream().filter(r -> r.date().equals(today) && r.counts()).count();
        long weekCount = week.stream().filter(Row::counts).count();
        BigDecimal revenue = week.stream()
                .filter(Row::counts)
                .map(Row::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long cancelled = week.stream().filter(r -> r.status() == AppointmentStatus.CANCELLED).count();
        double cancellationRate = week.isEmpty()
                ? 0
                : BigDecimal.valueOf(cancelled * 100.0 / week.size()).setScale(1, RoundingMode.HALF_UP).doubleValue();

        List<DayCount> days = new ArrayList<>();
        for (LocalDate d = monday; !d.isAfter(sunday); d = d.plusDays(1)) {
            LocalDate day = d;
            days.add(new DayCount(day, week.stream().filter(r -> r.date().equals(day) && r.counts()).count()));
        }

        LocalDate popularFrom = today.minusDays(POPULAR_DAYS - 1);
        Map<String, Long> byService = rows.stream()
                .filter(r -> r.counts() && r.within(popularFrom, today))
                .collect(Collectors.groupingBy(Row::serviceName, LinkedHashMap::new, Collectors.counting()));
        List<ServiceCount> popular = byService.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(TOP_SERVICES)
                .map(e -> new ServiceCount(e.getKey(), e.getValue()))
                .toList();

        return new StatsView(today, monday, todayCount, weekCount, revenue, cancellationRate, days, popular);
    }
}
