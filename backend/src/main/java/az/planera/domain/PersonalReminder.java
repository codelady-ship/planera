package az.planera.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Collection;
import java.util.List;

/** A personal note with an alarm at a chosen time (#59): the user's own diary entry. */
@Entity
@Table(name = "personal_reminders")
public class PersonalReminder extends BaseEntity {

    /** Typed, or dictated and turned into text in the browser (#61). */
    public enum Source { MANUAL, VOICE }

    public enum Status { ACTIVE, DONE, CANCELLED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 2000)
    private String note;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    /** Minutes before the start, e.g. "60,0"; see {@link Offsets}. */
    @Column(name = "reminder_offsets", nullable = false)
    private String reminderOffsets = "0";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source = Source.MANUAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.ACTIVE;

    protected PersonalReminder() {}

    public PersonalReminder(
            User user, String title, String note, Instant startsAt, Collection<Integer> offsets, Source source) {
        this.user = user;
        this.title = title;
        this.note = note;
        this.startsAt = startsAt;
        this.reminderOffsets = Offsets.join(offsets);
        this.source = source == null ? Source.MANUAL : source;
    }

    public User getUser() { return user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getStartsAt() { return startsAt; }
    public void setStartsAt(Instant startsAt) { this.startsAt = startsAt; }
    public List<Integer> getReminderOffsets() { return Offsets.parse(reminderOffsets); }
    public void setReminderOffsets(Collection<Integer> offsets) { this.reminderOffsets = Offsets.join(offsets); }
    public Source getSource() { return source; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}
