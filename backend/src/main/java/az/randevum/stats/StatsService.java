package az.randevum.stats;

import az.randevum.config.TimeConfig;
import az.randevum.domain.Appointment;
import az.randevum.domain.AppointmentRepository;
import az.randevum.stats.StatsCalculator.Row;
import az.randevum.stats.StatsDtos.StatsView;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StatsService {

    private final AppointmentRepository appointments;
    private final Clock clock;

    public StatsService(AppointmentRepository appointments, Clock clock) {
        this.appointments = appointments;
        this.clock = clock;
    }

    /** Statistics of one provider, or of the whole platform when {@code providerId} is null. */
    @Transactional(readOnly = true)
    public StatsView stats(Long providerId) {
        LocalDate today = LocalDate.now(clock);
        Instant from = start(StatsCalculator.from(today));
        Instant to = start(StatsCalculator.to(today).plusDays(1));
        List<Appointment> found = providerId == null
                ? appointments.findAllInRange(from, to)
                : appointments.findForProvider(providerId, from, to);
        List<Row> rows = found.stream()
                .map(a -> new Row(
                        a.getStartsAt().atZone(TimeConfig.BAKU).toLocalDate(),
                        a.getStatus(),
                        a.getPrice(),
                        a.getService().getName()))
                .toList();
        return StatsCalculator.calculate(rows, today);
    }

    private static Instant start(LocalDate date) {
        return date.atStartOfDay(TimeConfig.BAKU).toInstant();
    }
}
