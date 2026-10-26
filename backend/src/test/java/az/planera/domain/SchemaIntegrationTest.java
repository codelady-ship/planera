package az.planera.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.planera.TestcontainersConfiguration;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Runs the Flyway schema against a real PostgreSQL (ddl-auto=validate checks the
 * entity mapping) and proves the double-booking constraint (#9). Skipped without
 * Docker; CI and Codespaces run it.
 */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class SchemaIntegrationTest {

    private static final Instant TEN = Instant.parse("2026-11-02T06:00:00Z"); // 10:00 Baku

    @Autowired CategoryRepository categories;
    @Autowired UserRepository users;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;
    @Autowired AvailabilityRuleRepository rules;
    @Autowired AppointmentRepository appointments;

    private ProviderProfile provider;
    private ServiceOffering haircut;
    private User customer;

    @BeforeEach
    void setUp() {
        Category beauty = categories.save(new Category("test-beauty", "Gözəllik"));
        provider = providers.save(new ProviderProfile(beauty, "test-barber", "Test Bərbər", "Bərbər", "Bakı"));
        haircut = services.save(new ServiceOffering(provider, "Saç kəsimi", new BigDecimal("15.00"), 30));
        customer = users.save(new User("test-customer@planera.az", "Test Müştəri", UserRole.CUSTOMER));
    }

    @Test
    void mapsEveryEntityOntoTheMigratedSchema() {
        rules.save(new AvailabilityRule(provider, DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(13, 0)));
        Appointment saved = appointments.saveAndFlush(book("RV-T-1", TEN, 30));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getPrice()).isEqualByComparingTo("15.00");
        assertThat(rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(provider.getId()))
                .singleElement()
                .extracting(AvailabilityRule::getDayOfWeek)
                .isEqualTo(DayOfWeek.MONDAY);
    }

    @Test
    void rejectsOverlappingActiveAppointments() {
        appointments.saveAndFlush(book("RV-T-1", TEN, 30));

        assertThatThrownBy(() -> appointments.saveAndFlush(book("RV-T-2", TEN.plusSeconds(15 * 60), 30)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("appointments_no_overlap");
    }

    @Test
    void allowsBackToBackAppointments() {
        appointments.saveAndFlush(book("RV-T-1", TEN, 30));
        appointments.saveAndFlush(book("RV-T-2", TEN.plusSeconds(30 * 60), 30));

        assertThat(appointments.findActiveOverlapping(provider.getId(), TEN, TEN.plusSeconds(3600))).hasSize(2);
    }

    @Test
    void cancelledAppointmentFreesItsSlot() {
        Appointment first = appointments.saveAndFlush(book("RV-T-1", TEN, 30));
        first.cancel(Instant.now(), "test");
        appointments.saveAndFlush(first);

        appointments.saveAndFlush(book("RV-T-2", TEN, 30));
        assertThat(appointments.findActiveOverlapping(provider.getId(), TEN, TEN.plusSeconds(1800)))
                .extracting(Appointment::getCode)
                .containsExactly("RV-T-2");
    }

    private Appointment book(String code, Instant start, int minutes) {
        return new Appointment(code, provider, customer, haircut, start, start.plusSeconds(minutes * 60L));
    }
}
