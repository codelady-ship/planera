package az.randevum.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** A planned reminder for one appointment, {@code offsetMinutes} before its start (#56). */
@Entity
@Table(name = "reminders")
public class Reminder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @Column(name = "offset_minutes", nullable = false)
    private int offsetMinutes;

    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    protected Reminder() {}

    public Reminder(Appointment appointment, int offsetMinutes, Instant dueAt) {
        this.appointment = appointment;
        this.offsetMinutes = offsetMinutes;
        this.dueAt = dueAt;
    }

    public Appointment getAppointment() { return appointment; }
    public int getOffsetMinutes() { return offsetMinutes; }
    public Instant getDueAt() { return dueAt; }
    public Instant getSentAt() { return sentAt; }

    public void markSent(Instant at) {
        this.sentAt = at;
    }
}
