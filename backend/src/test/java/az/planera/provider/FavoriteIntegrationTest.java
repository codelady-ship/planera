package az.planera.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.planera.TestcontainersConfiguration;
import az.planera.common.NotFoundException;
import az.planera.domain.FavoriteRepository;
import az.planera.domain.UserRepository;
import az.planera.provider.ProviderDtos.ProviderSummary;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Favourites against the demo data (#46): idempotent add and remove, newest first. */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, FavoriteService.class})
@ActiveProfiles("dev")
class FavoriteIntegrationTest {

    static final String CUSTOMER = "musteri@planera.az";

    @Autowired FavoriteService service;
    @Autowired FavoriteRepository favorites;
    @Autowired UserRepository users;

    @AfterEach
    void cleanUp() {
        users.findByEmailIgnoreCase(CUSTOMER).ifPresent(u -> favorites.findByUserIdOrderByCreatedAtDesc(u.getId())
                .forEach(favorites::delete));
    }

    @Test
    void addTwiceKeepsOneRowAndTheNewestComesFirst() {
        service.add(CUSTOMER, "elvin-barber");
        service.add(CUSTOMER, "elvin-barber");
        service.add(CUSTOMER, "dr-leyla-hesenova");

        assertThat(service.list(CUSTOMER)).extracting(ProviderSummary::slug).containsExactly("dr-leyla-hesenova", "elvin-barber");

        service.remove(CUSTOMER, "elvin-barber");
        service.remove(CUSTOMER, "elvin-barber");
        assertThat(service.list(CUSTOMER)).extracting(ProviderSummary::slug).containsExactly("dr-leyla-hesenova");
    }

    @Test
    void unknownProvidersAreRejected() {
        assertThatThrownBy(() -> service.add(CUSTOMER, "yoxdur")).isInstanceOf(NotFoundException.class);
    }
}
