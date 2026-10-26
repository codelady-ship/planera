package az.planera.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    List<PushSubscription> findByUserIdOrderByCreatedAtAsc(Long userId);

    Optional<PushSubscription> findByEndpoint(String endpoint);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from PushSubscription s where s.user.id = :userId and s.endpoint = :endpoint")
    int deleteByUserIdAndEndpoint(Long userId, String endpoint);
}
