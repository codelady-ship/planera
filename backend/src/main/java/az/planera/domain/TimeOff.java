package az.planera.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

/** Days off, inclusive on both ends. */
@Entity
@Table(name = "time_off")
public class TimeOff extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @Column(name = "starts_on", nullable = false)
    private LocalDate startsOn;

    @Column(name = "ends_on", nullable = false)
    private LocalDate endsOn;

    private String reason;

    protected TimeOff() {}

    public TimeOff(ProviderProfile provider, LocalDate startsOn, LocalDate endsOn, String reason) {
        this.provider = provider;
        this.startsOn = startsOn;
        this.endsOn = endsOn;
        this.reason = reason;
    }

    public ProviderProfile getProvider() { return provider; }
    public LocalDate getStartsOn() { return startsOn; }
    public LocalDate getEndsOn() { return endsOn; }
    public String getReason() { return reason; }

    public boolean covers(LocalDate date) {
        return !date.isBefore(startsOn) && !date.isAfter(endsOn);
    }
}
