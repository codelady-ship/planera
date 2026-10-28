package az.planera.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/** A customer waiting for a fully booked day of a provider to free up (#45). */
@Entity
@Table(name = "waitlist_entries")
public class WaitlistEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOffering service;

    @Column(name = "wanted_date", nullable = false)
    private LocalDate wantedDate;

    @Column(name = "notified_at")
    private Instant notifiedAt;

    protected WaitlistEntry() {}

    public WaitlistEntry(User user, ServiceOffering service, LocalDate wantedDate) {
        this.user = user;
        this.provider = service.getProvider();
        this.service = service;
        this.wantedDate = wantedDate;
    }

    public User getUser() { return user; }
    public ProviderProfile getProvider() { return provider; }
    public ServiceOffering getService() { return service; }
    public LocalDate getWantedDate() { return wantedDate; }
    public Instant getNotifiedAt() { return notifiedAt; }

    public void markNotified(Instant at) {
        this.notifiedAt = at;
    }
}
