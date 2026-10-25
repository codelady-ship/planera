package az.randevum.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TimeOffRepository extends JpaRepository<TimeOff, Long> {

    List<TimeOff> findByProviderIdOrderByStartsOnAsc(Long providerId);

    Optional<TimeOff> findByIdAndProviderId(Long id, Long providerId);

    @Query("""
            select t from TimeOff t
            where t.provider.id = :providerId and t.startsOn <= :to and t.endsOn >= :from
            order by t.startsOn""")
    List<TimeOff> findOverlapping(Long providerId, LocalDate from, LocalDate to);
}
