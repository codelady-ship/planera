package az.planera.domain;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    /** Newest first, with the provider and its category for the summary cards. */
    @EntityGraph(attributePaths = {"provider", "provider.category"})
    List<Favorite> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndProviderId(Long userId, Long providerId);

    long deleteByUserIdAndProviderId(Long userId, Long providerId);
}
