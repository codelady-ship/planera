package az.randevum.stats;

import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.domain.AppointmentStatus;
import az.randevum.stats.StatsCalculator.Row;
import az.randevum.stats.StatsDtos.ServiceCount;
import az.randevum.stats.StatsDtos.StatsView;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class StatsCalculatorTest {

    /** Wednesday; the week is 2026-10-26 .. 2026-11-01. */
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 28);

    private static Row row(String date, AppointmentStatus status, int price, String service) {
        return new Row(LocalDate.parse(date), status, BigDecimal.valueOf(price), service);
    }

    @Test
    void rangeCoversTheWeekAndThePopularWindow() {
        assertThat(StatsCalculator.from(TODAY)).isEqualTo(LocalDate.of(2026, 9, 29));
        assertThat(StatsCalculator.to(TODAY)).isEqualTo(LocalDate.of(2026, 11, 1));
    }

    @Test
    void countsRevenueAndCancellationRateSkipCancelledAndNoShow() {
        List<Row> rows = List.of(
                row("2026-10-28", AppointmentStatus.CONFIRMED, 20, "Saç kəsimi"),
                row("2026-10-28", AppointmentStatus.CANCELLED, 20, "Saç kəsimi"),
                row("2026-10-27", AppointmentStatus.COMPLETED, 15, "Saqqal"),
                row("2026-10-26", AppointmentStatus.NO_SHOW, 15, "Saqqal"),
                row("2026-10-30", AppointmentStatus.PENDING, 30, "Kompleks"),
                // Last week: popular services only.
                row("2026-10-20", AppointmentStatus.COMPLETED, 20, "Saç kəsimi"));

        StatsView stats = StatsCalculator.calculate(rows, TODAY);

        assertThat(stats.weekStart()).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(stats.todayCount()).isEqualTo(1);
        assertThat(stats.weekCount()).isEqualTo(3);
        assertThat(stats.weekRevenue()).isEqualByComparingTo("65");
        assertThat(stats.cancellationRate()).isEqualTo(20.0);
        assertThat(stats.week()).hasSize(7);
        assertThat(stats.week().get(2).count()).isEqualTo(1);
        // Future bookings are not "popular" yet; ties sort by name.
        assertThat(stats.popularServices())
                .containsExactly(new ServiceCount("Saç kəsimi", 2), new ServiceCount("Saqqal", 1));
    }

    @Test
    void emptyWeekHasZeroRate() {
        StatsView stats = StatsCalculator.calculate(List.of(), TODAY);

        assertThat(stats.cancellationRate()).isZero();
        assertThat(stats.weekRevenue()).isEqualByComparingTo("0");
        assertThat(stats.popularServices()).isEmpty();
    }
}
