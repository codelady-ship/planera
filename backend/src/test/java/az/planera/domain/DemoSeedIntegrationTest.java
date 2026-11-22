package az.planera.domain;

import static org.assertj.core.api.Assertions.assertThat;

import az.planera.TestcontainersConfiguration;
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
    @Autowired UserRepository users;

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

        // Public read-only demo admin for the portfolio (password is public: demo1234).
        User demo = users.findByEmailIgnoreCase("demo@planera.az").orElseThrow();
        assertThat(demo.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(demo.isDemo()).isTrue();
        // The admin in the README is public too: still an admin, but read-only.
        User readmeAdmin = users.findByEmailIgnoreCase("admin@planera.az").orElseThrow();
        assertThat(readmeAdmin.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(readmeAdmin.isDemo()).isTrue();
        // No writable admin comes from the repository; the other demo logins are not touched.
        assertThat(users.findAll().stream().filter(u -> u.getRole() == UserRole.ADMIN && !u.isDemo())).isEmpty();
        assertThat(users.findByEmailIgnoreCase("musteri@planera.az").orElseThrow().isDemo()).isFalse();
        assertThat(users.findByEmailIgnoreCase("elvin-barber@planera.az").orElseThrow().isDemo()).isFalse();
    }
}
