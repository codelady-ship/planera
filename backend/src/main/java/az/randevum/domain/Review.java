package az.randevum.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "reviews")
public class Review extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(nullable = false)
    private short rating;

    private String comment;

    protected Review() {}

    public Review(Appointment appointment, int rating, String comment) {
        this.appointment = appointment;
        this.provider = appointment.getProvider();
        this.customer = appointment.getCustomer();
        this.rating = (short) rating;
        this.comment = comment;
    }

    public Appointment getAppointment() { return appointment; }
    public ProviderProfile getProvider() { return provider; }
    public User getCustomer() { return customer; }
    public int getRating() { return rating; }
    public String getComment() { return comment; }
}
