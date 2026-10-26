package az.planera.provider;

import az.planera.domain.ProviderProfile;
import az.planera.domain.ServiceOffering;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * Catalog filters from GET /api/providers. Every field is optional; blank
 * strings count as absent so the search form can submit empty inputs.
 */
public record ProviderSearch(
        String category,
        String city,
        String q,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        BigDecimal minRating,
        String sort,
        Integer page,
        Integer size) {

    static final int MAX_PAGE_SIZE = 50;

    Specification<ProviderProfile> toSpecification() {
        return (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            where.add(cb.isTrue(root.get("active")));
            if (present(category)) {
                where.add(cb.equal(root.join("category").get("slug"), category));
            }
            if (present(city)) {
                where.add(cb.equal(cb.lower(root.get("city")), city.toLowerCase(Locale.ROOT)));
            }
            if (minPrice != null) {
                where.add(cb.greaterThanOrEqualTo(root.get("priceFrom"), minPrice));
            }
            if (maxPrice != null) {
                where.add(cb.lessThanOrEqualTo(root.get("priceFrom"), maxPrice));
            }
            if (minRating != null) {
                where.add(cb.greaterThanOrEqualTo(root.get("ratingAvg"), minRating));
            }
            if (present(q)) {
                String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                Subquery<Long> service = query.subquery(Long.class);
                var s = service.from(ServiceOffering.class);
                service.select(s.get("id")).where(
                        cb.equal(s.get("provider"), root),
                        cb.isTrue(s.get("active")),
                        cb.like(cb.lower(s.get("name")), like));
                where.add(cb.or(
                        cb.like(cb.lower(root.get("displayName")), like),
                        cb.like(cb.lower(root.get("title")), like),
                        cb.exists(service)));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
    }

    Pageable toPageable() {
        int p = page == null || page < 0 ? 0 : page;
        int s = size == null || size < 1 ? 12 : Math.min(size, MAX_PAGE_SIZE);
        Sort order = "price".equals(sort)
                ? Sort.by(Sort.Order.asc("priceFrom").nullsLast(), Sort.Order.desc("ratingAvg"))
                : Sort.by(Sort.Order.desc("ratingAvg"), Sort.Order.desc("ratingCount"));
        return PageRequest.of(p, s, order.and(Sort.by("id")));
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }
}
