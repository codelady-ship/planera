package az.randevum.domain;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PersonalReminderRepository extends JpaRepository<PersonalReminder, Long> {

    /** The user's notes starting in [from, to), oldest first; callers drop the cancelled ones. */
    @Query("""
            select r from PersonalReminder r
            where r.user.id = :userId and r.startsAt >= :from and r.startsAt < :to
            order by r.startsAt""")
    List<PersonalReminder> findInRange(Long userId, Instant from, Instant to);
}
