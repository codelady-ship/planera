package az.randevum.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    Optional<Appointment> findByCode(String code);

    /** Active appointments of a provider that overlap [from, to). */
    @Query("""
            select a from Appointment a
            where a.provider.id = :providerId
              and a.status in (az.randevum.domain.AppointmentStatus.PENDING, az.randevum.domain.AppointmentStatus.CONFIRMED)
              and a.startsAt < :to and a.endsAt > :from
            order by a.startsAt""")
    List<Appointment> findActiveOverlapping(Long providerId, Instant from, Instant to);
}
