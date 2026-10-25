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

    @Query(value = "select nextval('appointment_code_seq')", nativeQuery = true)
    long nextCodeNumber();

    @Query("""
            select a from Appointment a join fetch a.provider join fetch a.service
            where a.customer.id = :customerId
              and a.status in (az.randevum.domain.AppointmentStatus.PENDING, az.randevum.domain.AppointmentStatus.CONFIRMED)
              and a.endsAt > :now
            order by a.startsAt""")
    List<Appointment> findUpcoming(Long customerId, Instant now);

    @Query("""
            select a from Appointment a join fetch a.provider join fetch a.service
            where a.customer.id = :customerId
              and (a.status in (az.randevum.domain.AppointmentStatus.COMPLETED, az.randevum.domain.AppointmentStatus.NO_SHOW)
                   or (a.status in (az.randevum.domain.AppointmentStatus.PENDING, az.randevum.domain.AppointmentStatus.CONFIRMED)
                       and a.endsAt <= :now))
            order by a.startsAt desc""")
    List<Appointment> findPast(Long customerId, Instant now);

    @Query("""
            select a from Appointment a join fetch a.provider join fetch a.service
            where a.customer.id = :customerId and a.status = az.randevum.domain.AppointmentStatus.CANCELLED
            order by a.startsAt desc""")
    List<Appointment> findCancelled(Long customerId);

    /** A provider's appointments in [from, to), every status, for the provider panel (#26). */
    @Query("""
            select a from Appointment a join fetch a.customer join fetch a.service join fetch a.provider
            where a.provider.id = :providerId and a.startsAt < :to and a.endsAt > :from
            order by a.startsAt""")
    List<Appointment> findForProvider(Long providerId, Instant from, Instant to);
}
