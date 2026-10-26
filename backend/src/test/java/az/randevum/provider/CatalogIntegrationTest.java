package az.randevum.provider;

import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.TestcontainersConfiguration;
import az.randevum.category.CategoryDtos.CategoryView;
import az.randevum.category.CategoryService;
import az.randevum.domain.ProviderProfileRepository;
import az.randevum.provider.ProviderDtos.ProviderDetail;
import az.randevum.provider.ProviderDtos.ProviderSummary;
import az.randevum.provider.ProviderDtos.ServiceRequest;
import az.randevum.provider.ProviderDtos.ServiceView;
import java.math.BigDecimal;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Catalog queries against the demo data in a real PostgreSQL (#13, #14, #15). */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, ProviderService.class, az.randevum.review.ReviewService.class, ServiceOfferingService.class, CategoryService.class})
@ActiveProfiles("dev")
class CatalogIntegrationTest {

    @Autowired ProviderService providers;
    @Autowired ServiceOfferingService services;
    @Autowired CategoryService categories;
    @Autowired ProviderProfileRepository profiles;

    private static ProviderSearch search(String category, String city, String q, String maxPrice, String sort) {
        return new ProviderSearch(
                category, city, q, null, maxPrice == null ? null : new BigDecimal(maxPrice), null, sort, null, null);
    }

    @Test
    void categoriesCountActiveProviders() {
        assertThat(categories.list())
                .filteredOn(c -> c.slug().equals("konsultasiya"))
                .singleElement()
                .extracting(CategoryView::providerCount)
                .isEqualTo(2L);
    }

    @Test
    void defaultSearchIsSortedByRating() {
        var page = providers.search(search(null, null, null, null, null));
        assertThat(page.totalElements()).isEqualTo(8);
        assertThat(page.content()).extracting(ProviderSummary::rating).isSortedAccordingTo((a, b) -> b.compareTo(a));
    }

    @Test
    void filtersByCategoryAndCity() {
        assertThat(providers.search(search("saglamliq", "Gəncə", null, null, null)).content())
                .extracting(ProviderSummary::slug)
                .containsExactly("dr-tural-quliyev");
    }

    @Test
    void textSearchMatchesServiceNames() {
        assertThat(providers.search(search(null, null, "ielts", null, null)).content())
                .extracting(ProviderSummary::slug)
                .containsExactly("nigar-english");
    }

    @Test
    void priceFilterAndSortUsePriceFrom() {
        var cheap = providers.search(search(null, null, null, "20", "price")).content();
        assertThat(cheap).extracting(ProviderSummary::priceFrom).allMatch(p -> p.compareTo(new BigDecimal("20")) <= 0);
        assertThat(cheap).extracting(ProviderSummary::priceFrom).isSorted();
        assertThat(cheap.getFirst().slug()).isEqualTo("elvin-barber");
    }

    @Test
    void detailHasServicesScheduleAndInitials() {
        ProviderDetail detail = providers.detail("dr-leyla-hesenova");
        assertThat(detail.summary().initials()).isEqualTo("LH");
        assertThat(detail.services()).extracting(ServiceView::name).first().isEqualTo("Müayinə");
        assertThat(detail.schedule()).hasSize(7);
        assertThat(detail.schedule().get(0).intervals()).hasSize(2); // Monday with lunch break
        assertThat(detail.schedule().get(0).intervals().getFirst().start()).isEqualTo(LocalTime.of(9, 0)); // no time zone shift
        assertThat(detail.schedule().get(6).intervals()).isEmpty(); // Sunday off
    }

    @Test
    void serviceChangesKeepPriceFromInSync() {
        Long barber = profiles.findBySlugAndActiveTrue("elvin-barber").orElseThrow().getId();

        ServiceView kids = services.create(barber, new ServiceRequest("Uşaq saç kəsimi", null, new BigDecimal("8.00"), 20, null));
        assertThat(providers.detail("elvin-barber").summary().priceFrom()).isEqualByComparingTo("8.00");

        services.delete(barber, kids.id());
        assertThat(providers.detail("elvin-barber").summary().priceFrom()).isEqualByComparingTo("10.00");
        assertThat(providers.services("elvin-barber")).extracting(ServiceView::id).doesNotContain(kids.id());
    }
}
