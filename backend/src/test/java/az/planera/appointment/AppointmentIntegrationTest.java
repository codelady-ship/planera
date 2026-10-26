package az.planera.appointment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.planera.TestcontainersConfiguration;
import az.planera.appointment.AppointmentDtos.Actor;
import az.planera.appointment.AppointmentDtos.AppointmentView;
import az.planera.appointment.AppointmentDtos.CreateRequest;
import az.planera.appointment.AppointmentDtos.Scope;
import az.planera.common.BusinessRuleException;
import az.planera.common.SlotTakenException;
import az.planera.config.TimeConfig;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.AppointmentStatus;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.ServiceOfferingRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.UserRole;
import az.planera.redis.RateLimiter;
import az.planera.redis.RedisLock;
import az.planera.redis.RedisSupport;
import az.planera.redis.SlotCache;
import az.planera.slot.SlotService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Booking rules against a real PostgreSQL with committed transactions, so the
 * overlap constraint really races (#21, #22, #23). "Now" is Monday 26 Oct
 * 2026, 10:10 in Baku; the barber's cancellation window is 2 hours.
 */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
    TestcontainersConfiguration.class,
    AppointmentService.class,
    SlotService.class,
    SlotCache.class,
    RedisLock.class,
    RateLimiter.class,
    RedisSupport.class,
    AppointmentIntegrationTest.FixedClock.class
})
@ActiveProfiles("dev")
class AppointmentIntegrationTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    static final LocalDate TUESDAY = MONDAY.plusDays(1);
    static final Actor CUSTOMER = new Actor("musteri@planera.az", false);
    static final Actor ADMIN = new Actor("admin@planera.az", true);
    static final Actor STRANGER = new Actor("yad@planera.az", false);

    @TestConfiguration
    static class FixedClock {
        @Bean
        Clock clock() {
            return Clock.fixed(ZonedDateTime.of(MONDAY, LocalTime.of(10, 10), TimeConfig.BAKU).toInstant(), TimeConfig.BAKU);
        }
    }

    @Autowired AppointmentService service;
    @Autowired SlotService slots;
    @Autowired AppointmentRepository appointments;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;
    @Autowired UserRepository users;

    Long haircutId;

    @BeforeEach
    void setUp() {
        Long barberId = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow().getId();
        haircutId = services.findByProviderIdAndActiveTrueOrderByPriceAsc(barberId).stream()
                .filter(s -> s.getName().equals("Saç kəsimi"))
                .findFirst()
                .orElseThrow()
                .getId();
        if (!users.existsByEmailIgnoreCase(STRANGER.email())) {
            users.save(new User(STRANGER.email(), "Yad Müştəri", UserRole.CUSTOMER));
        }
    }

    @AfterEach
    void cleanUp() {
        appointments.deleteAll();
    }

    private AppointmentView book(LocalDate date, String time) {
        return service.create(CUSTOMER, new CreateRequest(haircutId, date, LocalTime.parse(time), null));
    }

    private List<String> free(LocalDate date) {
        return slots.slots("elvin-barber", haircutId, date).slots();
    }

    @Test
    void bookingGetsACodeAndTakesTheSlot() {
        AppointmentView booked = book(TUESDAY, "10:00");

        assertThat(booked.code()).matches("RV-2026-\\d{6}");
        assertThat(booked.status()).isEqualTo(AppointmentStatus.CONFIRMED);
        assertThat(booked.price()).isEqualByComparingTo("15.00");
        assertThat(booked.time()).isEqualTo("10:00");
        assertThat(free(TUESDAY)).doesNotContain("09:45", "10:00", "10:15").contains("09:30", "10:30");
    }

    @Test
    void takenSlotIsRejectedWithAlternatives() {
        book(TUESDAY, "09:00");

        assertThatThrownBy(() -> book(TUESDAY, "09:00"))
                .isInstanceOfSatisfying(SlotTakenException.class, e -> assertThat(e.getAlternatives())
                        .isNotEmpty()
                        .doesNotContain("09:00")
                        .startsWith("09:30"));
    }

    @Test
    void ofTwoParallelBookingsOnlyOneSucceeds() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> attempt = () -> {
            start.await();
            try {
                book(TUESDAY, "11:00");
                return true;
            } catch (SlotTakenException e) {
                return false;
            }
        };
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                results.add(pool.submit(attempt));
            }
            start.countDown();
            int succeeded = 0;
            for (Future<Boolean> r : results) {
                succeeded += r.get() ? 1 : 0;
            }
            assertThat(succeeded).isEqualTo(1);
            assertThat(appointments.count()).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void customerCannotCancelInsideTheWindowButAdminCan() {
        AppointmentView soon = book(MONDAY, "11:00"); // 50 minutes from now

        assertThat(soon.cancellable()).isFalse();
        assertThatThrownBy(() -> service.cancel(CUSTOMER, soon.id(), null)).isInstanceOf(BusinessRuleException.class);

        assertThat(service.cancel(ADMIN, soon.id(), "Xəstəlik").status()).isEqualTo(AppointmentStatus.CANCELLED);
        assertThat(free(MONDAY)).contains("11:00");
    }

    @Test
    void cancellationFreesTheSlotAndMovesItToCancelled() {
        AppointmentView later = book(TUESDAY, "15:00");
        assertThat(later.cancellable()).isTrue();
        assertThat(service.mine(CUSTOMER, Scope.UPCOMING)).extracting(AppointmentView::id).containsExactly(later.id());

        service.cancel(CUSTOMER, later.id(), "Plan dəyişdi");

        assertThat(free(TUESDAY)).contains("15:00");
        assertThat(service.mine(CUSTOMER, Scope.UPCOMING)).isEmpty();
        assertThat(service.mine(CUSTOMER, Scope.CANCELLED)).extracting(AppointmentView::id).containsExactly(later.id());
        assertThatThrownBy(() -> service.cancel(CUSTOMER, later.id(), null)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void rescheduleMayOverlapItsOwnOldTimeAndReleasesIt() {
        AppointmentView booked = book(TUESDAY, "10:00");

        AppointmentView moved = service.reschedule(CUSTOMER, booked.id(), TUESDAY, LocalTime.of(10, 15));

        assertThat(moved.time()).isEqualTo("10:15");
        assertThat(moved.code()).isEqualTo(booked.code());
        assertThat(free(TUESDAY)).contains("09:45").doesNotContain("10:15");

        book(TUESDAY, "14:00");
        assertThatThrownBy(() -> service.reschedule(CUSTOMER, booked.id(), TUESDAY, LocalTime.of(14, 0)))
                .isInstanceOf(SlotTakenException.class);
    }

    @Test
    void othersAppointmentsAreForbidden() {
        AppointmentView booked = book(TUESDAY, "12:00");

        assertThatThrownBy(() -> service.get(STRANGER, booked.id())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.cancel(STRANGER, booked.id(), null)).isInstanceOf(AccessDeniedException.class);
        assertThat(service.mine(STRANGER, Scope.UPCOMING)).isEmpty();
    }

    @Test
    void providerChangesOnlyItsOwnAppointments() {
        AppointmentView booked = book(TUESDAY, "16:30");
        Long otherProvider = providers.findBySlugAndActiveTrue("leyla-beauty").orElseThrow().getId();

        assertThatThrownBy(() -> service.changeStatus(otherProvider, booked.id(), AppointmentStatus.CANCELLED))
                .isInstanceOf(AccessDeniedException.class);
        Long barber = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow().getId();
        assertThat(service.forProvider(barber, TUESDAY, TUESDAY)).hasSize(1);
        assertThat(service.forProvider(otherProvider, TUESDAY, TUESDAY)).isEmpty();
    }

    @Test
    void statusChangesFollowTheLifecycle() {
        AppointmentView booked = book(TUESDAY, "16:00");

        assertThatThrownBy(() -> service.changeStatus(null, booked.id(), AppointmentStatus.COMPLETED))
                .isInstanceOf(BusinessRuleException.class); // has not started yet
        assertThat(service.changeStatus(null, booked.id(), AppointmentStatus.CANCELLED).status())
                .isEqualTo(AppointmentStatus.CANCELLED);
        assertThatThrownBy(() -> service.changeStatus(null, booked.id(), AppointmentStatus.CONFIRMED))
                .isInstanceOf(BusinessRuleException.class);
    }
}
