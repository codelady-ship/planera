package az.planera.category;

import az.planera.category.CategoryDtos.CategoryRequest;
import az.planera.category.CategoryDtos.CategoryView;
import az.planera.common.ConflictException;
import az.planera.common.NotFoundException;
import az.planera.domain.Category;
import az.planera.domain.CategoryRepository;
import az.planera.domain.ProviderProfileRepository;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categories;
    private final ProviderProfileRepository providers;

    public CategoryService(CategoryRepository categories, ProviderProfileRepository providers) {
        this.categories = categories;
        this.providers = providers;
    }

    public List<CategoryView> list() {
        Map<Long, Long> counts = providers.countActiveByCategory();
        return categories.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(c -> view(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public CategoryView create(CategoryRequest request) {
        if (categories.existsBySlug(request.slug())) {
            throw new ConflictException("Bu slug artıq istifadə olunur: " + request.slug());
        }
        Category category = new Category(request.slug(), request.name());
        apply(category, request);
        return view(categories.save(category), 0);
    }

    @Transactional
    public CategoryView update(String slug, CategoryRequest request) {
        Category category = get(slug);
        if (!slug.equals(request.slug()) && categories.existsBySlug(request.slug())) {
            throw new ConflictException("Bu slug artıq istifadə olunur: " + request.slug());
        }
        category.setSlug(request.slug());
        apply(category, request);
        return view(category, providers.countByCategoryIdAndActiveTrue(category.getId()));
    }

    @Transactional
    public void delete(String slug) {
        Category category = get(slug);
        if (providers.countByCategoryIdAndActiveTrue(category.getId()) > 0) {
            throw new ConflictException("Kateqoriyada aktiv mütəxəssislər var, əvvəlcə onları köçürün");
        }
        categories.delete(category);
    }

    private Category get(String slug) {
        return categories.findBySlug(slug).orElseThrow(() -> new NotFoundException("Kateqoriya tapılmadı: " + slug));
    }

    private static void apply(Category category, CategoryRequest request) {
        category.setName(request.name());
        category.setDescription(request.description());
        category.setSortOrder(request.sortOrder());
    }

    private static CategoryView view(Category c, long providerCount) {
        return new CategoryView(c.getSlug(), c.getName(), c.getDescription(), providerCount);
    }
}
