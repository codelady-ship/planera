package az.randevum.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, Long>, JpaSpecificationExecutor<ProviderProfile> {

    @EntityGraph(attributePaths = "category")
    Optional<ProviderProfile> findBySlugAndActiveTrue(String slug);

    Optional<ProviderProfile> findByUserId(Long userId);

    boolean existsBySlug(String slug);

    long countByCategoryIdAndActiveTrue(Long categoryId);
}
