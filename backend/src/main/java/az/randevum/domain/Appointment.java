package az.randevum.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "appointments")
public class Appointment extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOffering service;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status = AppointmentStatus.CONFIRMED;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "customer_note")
    private String customerNote;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancel_reason")
    private String cancelReason;

    protected Appointment() {}

    public Appointment(
            String code, ProviderProfile provider, User customer, ServiceOffering service, Instant startsAt, Instant endsAt) {
        this.code = code;
        this.provider = provider;
        this.customer = customer;
        this.service = service;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.price = service.getPrice();
    }

    public String getCode() { return code; }
    public ProviderProfile getProvider() { return provider; }
    public User getCustomer() { return customer; }
    public ServiceOffering getService() { return service; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public AppointmentStatus getStatus() { return status; }
    public void setStatus(AppointmentStatus status) { this.status = status; }
    public BigDecimal getPrice() { return price; }
    public String getCustomerNote() { return customerNote; }
    public void setCustomerNote(String customerNote) { this.customerNote = customerNote; }
    public Instant getCancelledAt() { return cancelledAt; }
    public String getCancelReason() { return cancelReason; }

    public void reschedule(Instant startsAt, Instant endsAt) {
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    public void cancel(Instant at, String reason) {
        this.status = AppointmentStatus.CANCELLED;
        this.cancelledAt = at;
        this.cancelReason = reason;
    }
}
