package az.randevum.domain;

import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/** The dev profile loads the demo catalog (#11): all four platform types are present. */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
class DemoSeedIntegrationTest {

    @Autowired CategoryRepository categories;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;
    @Autowired AvailabilityRuleRepository rules;

    @Test
    void loadsCategoriesProvidersServicesAndSchedules() {
        assertThat(categories.findAllByOrderBySortOrderAscNameAsc())
                .extracting(Category::getSlug)
                .startsWith("gozellik", "saglamliq", "konsultasiya", "tehsil");

        ProviderProfile barber = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow();
        assertThat(barber.getPriceFrom()).isEqualByComparingTo("10.00");
        assertThat(services.findByProviderIdAndActiveTrueOrderByPriceAsc(barber.getId())).hasSize(3);
        assertThat(rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(barber.getId())).hasSize(11);
        assertThat(providers.count()).isEqualTo(8);
    }
}
