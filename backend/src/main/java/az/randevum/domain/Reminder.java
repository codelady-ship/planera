package az.randevum.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A planned reminder, {@code offsetMinutes} before the start of either an
 * appointment (#56) or a personal note (#59); exactly one of the two is set.
 */
@Entity
@Table(name = "reminders")
public class Reminder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "personal_reminder_id")
    private PersonalReminder personalReminder;

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

    public Reminder(PersonalReminder personalReminder, int offsetMinutes, Instant dueAt) {
        this.personalReminder = personalReminder;
        this.offsetMinutes = offsetMinutes;
        this.dueAt = dueAt;
    }

    public Appointment getAppointment() { return appointment; }
    public PersonalReminder getPersonalReminder() { return personalReminder; }
    public int getOffsetMinutes() { return offsetMinutes; }
    public Instant getDueAt() { return dueAt; }
    public Instant getSentAt() { return sentAt; }

    public void markSent(Instant at) {
        this.sentAt = at;
    }
}
