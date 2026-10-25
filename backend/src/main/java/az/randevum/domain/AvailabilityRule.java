package az.randevum.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.DayOfWeek;
import java.time.LocalTime;

/** One weekly working interval; a break is the gap between two intervals of the same day. */
@Entity
@Table(name = "availability_rules")
public class AvailabilityRule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    /** ISO day number, 1 = Monday ... 7 = Sunday. */
    @Column(name = "day_of_week", nullable = false)
    private short dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    protected AvailabilityRule() {}

    public AvailabilityRule(ProviderProfile provider, DayOfWeek day, LocalTime startTime, LocalTime endTime) {
        this.provider = provider;
        this.dayOfWeek = (short) day.getValue();
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public ProviderProfile getProvider() { return provider; }
    public DayOfWeek getDayOfWeek() { return DayOfWeek.of(dayOfWeek); }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
}
