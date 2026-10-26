package az.planera.domain;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    List<Reminder> findByAppointmentIdOrderByOffsetMinutesDesc(Long appointmentId);

    List<Reminder> findByPersonalReminderIdOrderByOffsetMinutesDesc(Long personalReminderId);

    @Modifying(flushAutomatically = true)
    @Query("delete from Reminder r where r.personalReminder.id = :personalReminderId")
    int deleteByPersonalReminderId(Long personalReminderId);

    /**
     * No {@code clearAutomatically}: this runs inside the booking transaction
     * (via the AppointmentChanged event) and clearing the persistence context
     * there would detach the appointment the caller is still mapping.
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from Reminder r where r.appointment.id = :appointmentId")
    int deleteByAppointmentId(Long appointmentId);

    /**
     * Due, unsent reminders, locked for this transaction. Rows another
     * instance is already sending are skipped, not waited for.
     */
    @Query(
            value = """
                    select * from reminders
                    where sent_at is null and due_at <= :now
                    order by due_at
                    limit :limit
                    for update skip locked""",
            nativeQuery = true)
    List<Reminder> lockDue(Instant now, int limit);
}
