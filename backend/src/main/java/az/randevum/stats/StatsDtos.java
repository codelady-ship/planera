package az.randevum.stats;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class StatsDtos {

    private StatsDtos() {}

    public record DayCount(LocalDate date, long count) {}

    public record ServiceCount(String name, long count) {}

    /** Revenue is in AZN; the cancellation rate is a percentage of this week's appointments. */
    public record StatsView(
            LocalDate today,
            LocalDate weekStart,
            long todayCount,
            long weekCount,
            BigDecimal weekRevenue,
            double cancellationRate,
            List<DayCount> week,
            List<ServiceCount> popularServices) {}
}
