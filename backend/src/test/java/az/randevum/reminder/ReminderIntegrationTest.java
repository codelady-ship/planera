package az.randevum.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.TestcontainersConfiguration;
import az.randevum.appointment.AppointmentChanged;
import az.randevum.config.TimeConfig;
import az.randevum.domain.Appointment;
import az.randevum.domain.AppointmentRepository;
import az.randevum.domain.ProviderProfile;
import az.randevum.domain.ProviderProfileRepository;
import az.randevum.domain.PushSubscription;
import az.randevum.domain.PushSubscriptionRepository;
import az.randevum.domain.Reminder;
import az.randevum.domain.ReminderRepository;
import az.randevum.domain.ServiceOffering;
import az.randevum.domain.ServiceOfferingRepository;
import az.randevum.domain.User;
import az.randevum.domain.UserRepository;
import az.randevum.push.PushMessage;
import az.randevum.push.PushSender;
import az.randevum.push.PushService;
import az.randevum.push.VapidKeys;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Reminders against PostgreSQL with committed transactions (#56): planned
 * for the future only, sent exactly once when due, dropped on cancel. The
 * clock starts Monday 26 Oct 2026, 10:10 Baku and is moved by the tests.
 */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
    TestcontainersConfiguration.class,
    ReminderService.class,
    NotificationSettingsService.class,
    PushService.class,
    VapidKeys.class,
    ReminderIntegrationTest.Beans.class
})
@ActiveProfiles("dev")
class ReminderIntegrationTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);

    /** A clock the test can move forward. */
    static class MovableClock extends Clock {
        volatile Instant now = baku(MONDAY, LocalTime.of(10, 10));

        @Override public ZoneId getZone() { return TimeConfig.BAKU; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    static final MovableClock CLOCK = new MovableClock();
    static final List<PushMessage> SENT = new CopyOnWriteArrayList<>();

    @TestConfiguration
    static class Beans {
        @Bean
        Clock clock() {
            return CLOCK;
        }

        @Bean
        PushSender pushSender() {
            return (subscription, message) -> {
                SENT.add(message);
                return 201;
            };
        }
    }

    static Instant baku(LocalDate date, LocalTime time) {
        return ZonedDateTime.of(date, time, TimeConfig.BAKU).toInstant();
    }

    @Autowired ReminderService service;
    @Autowired NotificationSettingsService settings;
    @Autowired ReminderRepository reminders;
    @Autowired AppointmentRepository appointments;
    @Autowired PushSubscriptionRepository subscriptions;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;
    @Autowired UserRepository users;

    User customer;
    ProviderProfile barber;
    ServiceOffering haircut;

    @BeforeEach
    void setUp() {
        CLOCK.now = baku(MONDAY, LocalTime.of(10, 10));
        SENT.clear();
        customer = users.findByEmailIgnoreCase("musteri@randevum.az").orElseThrow();
        barber = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow();
        haircut = services.findByProviderIdAndActiveTrueOrderByPriceAsc(barber.getId()).getFirst();
        subscriptions.save(new PushSubscription(customer, "https://push.example/test-phone", "p", "a", "Test"));
    }

    @AfterEach
    void cleanUp() {
        reminders.deleteAll();
        appointments.deleteAll();
        subscriptions.deleteAll();
        settings.update(customer.getEmail(), List.of(60, 15, 0));
    }

    private Appointment book(LocalTime start) {
        Instant startsAt = baku(MONDAY, start);
        Appointment a = appointments.save(new Appointment(
                "RV-T-" + start.toSecondOfDay(), barber, customer, haircut, startsAt, startsAt.plus(Duration.ofMinutes(30))));
        service.onAppointmentChanged(new AppointmentChanged(a.getId()));
        return a;
    }

    private List<Integer> plannedOffsets(Appointment a) {
        return reminders.findByAppointmentIdOrderByOffsetMinutesDesc(a.getId()).stream()
                .map(Reminder::getOffsetMinutes)
                .toList();
    }

    @Test
    void onlyFutureRemindersArePlanned() {
        assertThat(plannedOffsets(book(LocalTime.of(15, 0)))).containsExactly(60, 15, 0);
        // Booked 20 minutes ahead: the one-hour reminder is already in the past.
        assertThat(plannedOffsets(book(LocalTime.of(10, 30)))).containsExactly(15, 0);
    }

    @Test
    void aDueReminderIsSentExactlyOnce() {
        Appointment a = book(LocalTime.of(15, 0));

        assertThat(service.sendDue()).isZero();

        CLOCK.now = baku(MONDAY, LocalTime.of(14, 0));
        assertThat(service.sendDue()).isEqualTo(1);
        assertThat(service.sendDue()).isZero();
        assertThat(SENT).hasSize(1);
        assertThat(SENT.getFirst().body())
                .isEqualTo("Sizin bu gün saat 15:00-da Elvin Məmmədov ilə randevunuz var: " + haircut.getName());
        assertThat(SENT.getFirst().tag()).isEqualTo("appointment-" + a.getId());

        CLOCK.now = baku(MONDAY, LocalTime.of(15, 1));
        assertThat(service.sendDue()).isEqualTo(2);
        assertThat(SENT).hasSize(3);
        assertThat(reminders.findByAppointmentIdOrderByOffsetMinutesDesc(a.getId()))
                .allSatisfy(r -> assertThat(r.getSentAt()).isNotNull());
    }

    @Test
    void changingTheSettingsReplansUpcomingAppointments() {
        Appointment a = book(LocalTime.of(15, 0));
        assertThat(settings.get(customer.getEmail()).reminderOffsets()).containsExactly(60, 15, 0);

        // A day ahead is already in the past for today's booking; only the start remains.
        assertThat(settings.update(customer.getEmail(), List.of(0, 1440)).reminderOffsets()).containsExactly(1440, 0);
        assertThat(plannedOffsets(a)).containsExactly(0);

        assertThat(settings.update(customer.getEmail(), List.of()).reminderOffsets()).isEmpty();
        assertThat(plannedOffsets(a)).isEmpty();
    }

    @Test
    void cancellingRemovesTheReminders() {
        Appointment a = book(LocalTime.of(15, 0));
        a.cancel(CLOCK.instant(), null);
        appointments.save(a);

        service.onAppointmentChanged(new AppointmentChanged(a.getId()));

        assertThat(plannedOffsets(a)).isEmpty();
        CLOCK.now = baku(MONDAY, LocalTime.of(15, 1));
        assertThat(service.sendDue()).isZero();
        assertThat(SENT).isEmpty();
    }

    @Test
    void movingTheAppointmentReplansFromTheNewTime() {
        Appointment a = book(LocalTime.of(15, 0));
        Instant later = baku(MONDAY, LocalTime.of(17, 0));
        a.reschedule(later, later.plus(Duration.ofMinutes(30)));
        appointments.save(a);

        service.onAppointmentChanged(new AppointmentChanged(a.getId()));

        assertThat(reminders.findByAppointmentIdOrderByOffsetMinutesDesc(a.getId()))
                .extracting(Reminder::getDueAt)
                .containsExactly(later.minus(Duration.ofHours(1)), later.minus(Duration.ofMinutes(15)), later);
    }
}
