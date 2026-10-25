package az.randevum.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityRuleRepository extends JpaRepository<AvailabilityRule, Long> {

    List<AvailabilityRule> findByProviderIdOrderByDayOfWeekAscStartTimeAsc(Long providerId);
}
