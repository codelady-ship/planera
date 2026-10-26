package az.planera.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.planera.TestcontainersConfiguration;
import az.planera.common.BusinessRuleException;
import az.planera.common.ConflictException;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.AppointmentStatus;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.ReviewRepository;
import az.planera.domain.ServiceOffering;
import az.planera.domain.ServiceOfferingRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.review.ReviewDtos.CreateRequest;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;

/** One review per completed appointment, by its customer; the provider's average follows (#44). */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, ReviewService.class})
@ActiveProfiles("dev")
class ReviewIntegrationTest {

    static final String CUSTOMER = "musteri@planera.az";

    @Autowired ReviewService service;
    @Autowired ReviewRepository reviews;
    @Autowired AppointmentRepository appointments;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;
    @Autowired UserRepository users;

    User customer;
    ProviderProfile barber;
    ServiceOffering haircut;
    BigDecimal ratingBefore;
    int countBefore;

    @BeforeEach
    void setUp() {
        customer = users.findByEmailIgnoreCase(CUSTOMER).orElseThrow();
        barber = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow();
        haircut = services.findByProviderIdAndActiveTrueOrderByPriceAsc(barber.getId()).getFirst();
        ratingBefore = barber.getRatingAvg();
        countBefore = barber.getRatingCount();
    }

    @AfterEach
    void cleanUp() {
        reviews.deleteAll();
        appointments.deleteAll();
        ProviderProfile p = providers.findById(barber.getId()).orElseThrow();
        p.setRatingAvg(ratingBefore);
        p.setRatingCount(countBefore);
        providers.save(p);
    }

    private Appointment appointment(AppointmentStatus status) {
        Instant start = Instant.parse("2026-10-20T06:00:00Z");
        Appointment a = new Appointment("RV-T-" + status, barber, customer, haircut, start, start.plus(Duration.ofMinutes(30)));
        a.setStatus(status);
        return appointments.save(a);
    }

    @Test
    void aCompletedAppointmentGetsOneReviewAndTheAverageMoves() {
        Appointment done = appointment(AppointmentStatus.COMPLETED);

        var view = service.create(CUSTOMER, done.getId(), new CreateRequest(3, "  Yaxşı idi  "));

        assertThat(view.rating()).isEqualTo(3);
        assertThat(view.comment()).isEqualTo("Yaxşı idi");
        assertThat(view.customerName()).isEqualTo("Aynur Q.");
        assertThat(service.latest(barber.getId())).hasSize(1);

        ProviderProfile after = providers.findById(barber.getId()).orElseThrow();
        assertThat(after.getRatingCount()).isEqualTo(countBefore + 1);
        BigDecimal expected = ratingBefore.multiply(BigDecimal.valueOf(countBefore))
                .add(BigDecimal.valueOf(3))
                .divide(BigDecimal.valueOf(countBefore + 1), 2, java.math.RoundingMode.HALF_UP);
        assertThat(after.getRatingAvg()).isEqualByComparingTo(expected);

        assertThatThrownBy(() -> service.create(CUSTOMER, done.getId(), new CreateRequest(5, null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void onlyCompletedAppointmentsOfTheCustomerCanBeReviewed() {
        Appointment upcoming = appointment(AppointmentStatus.CONFIRMED);
        assertThatThrownBy(() -> service.create(CUSTOMER, upcoming.getId(), new CreateRequest(5, null)))
                .isInstanceOf(BusinessRuleException.class);

        Appointment done = appointment(AppointmentStatus.COMPLETED);
        assertThatThrownBy(() -> service.create("admin@planera.az", done.getId(), new CreateRequest(5, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void namesAreShortened() {
        assertThat(ReviewService.shortName("Aynur Qasımova")).isEqualTo("Aynur Q.");
        assertThat(ReviewService.shortName("Dr. Leyla Həsənova")).isEqualTo("Dr. H.");
        assertThat(ReviewService.shortName("Aynur")).isEqualTo("Aynur");
    }
}
