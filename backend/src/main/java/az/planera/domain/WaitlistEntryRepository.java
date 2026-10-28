package az.planera.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WaitlistEntryRepository extends JpaRepository<WaitlistEntry, Long> {

    @EntityGraph(attributePaths = {"provider", "service"})
    List<WaitlistEntry> findByUserIdAndNotifiedAtIsNullOrderByWantedDateAsc(Long userId);

    long countByUserIdAndNotifiedAtIsNull(Long userId);

    boolean existsByUserIdAndServiceIdAndWantedDate(Long userId, Long serviceId, LocalDate wantedDate);

    @EntityGraph(attributePaths = {"user", "provider", "service"})
    List<WaitlistEntry> findByProviderIdAndWantedDateAndNotifiedAtIsNull(Long providerId, LocalDate wantedDate);

    Optional<WaitlistEntry> findByIdAndUserId(Long id, Long userId);
}
