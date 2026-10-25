package az.randevum.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ProviderProfileRepository
        extends JpaRepository<ProviderProfile, Long>, JpaSpecificationExecutor<ProviderProfile> {

    @EntityGraph(attributePaths = "category")
    Optional<ProviderProfile> findBySlugAndActiveTrue(String slug);

    Optional<ProviderProfile> findByUserId(Long userId);

    Optional<ProviderProfile> findByUserEmailIgnoreCase(String email);

    boolean existsBySlug(String slug);

    long countByCategoryIdAndActiveTrue(Long categoryId);

    /** Catalog search; the category is fetched with the page to avoid N+1 selects. */
    @Override
    @EntityGraph(attributePaths = "category")
    Page<ProviderProfile> findAll(Specification<ProviderProfile> spec, Pageable pageable);

    @Query("select p.category.id, count(p) from ProviderProfile p where p.active = true group by p.category.id")
    List<Object[]> countActiveByCategoryRows();

    default Map<Long, Long> countActiveByCategory() {
        return countActiveByCategoryRows().stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));
    }
}
