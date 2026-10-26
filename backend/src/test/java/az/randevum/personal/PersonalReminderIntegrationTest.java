package az.randevum.personal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.randevum.TestcontainersConfiguration;
import az.randevum.common.BusinessRuleException;
import az.randevum.config.TimeConfig;
import az.randevum.domain.Appointment;
import az.randevum.domain.AppointmentRepository;
import az.randevum.domain.PersonalReminder.Source;
import az.randevum.domain.PersonalReminder.Status;
import az.randevum.domain.PersonalReminderRepository;
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
import az.randevum.personal.PersonalReminderDtos.AgendaItem;
import az.randevum.personal.PersonalReminderDtos.CreateRequest;
import az.randevum.personal.PersonalReminderDtos.ReminderView;
import az.randevum.personal.PersonalReminderDtos.UpdateRequest;
import az.randevum.push.PushMessage;
import az.randevum.push.PushSender;
import az.randevum.push.PushService;
import az.randevum.push.VapidKeys;
import az.randevum.redis.RateLimiter;
import az.randevum.redis.RedisSupport;
import az.randevum.reminder.ReminderService;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Personal notes on PostgreSQL (#59): owner-only access, reminders planned
 * and re-planned, sent once when due, and the agenda merged with the
 * appointments. "Now" starts Monday 26 Oct 2026, 10:10 Baku.
 */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
    TestcontainersConfiguration.class,
    PersonalReminderService.class,
    ReminderService.class,
    PushService.class,
    VapidKeys.class,
    RateLimiter.class,
    RedisSupport.class,
    PersonalReminderIntegrationTest.Beans.class
})
@ActiveProfiles("dev")
class PersonalReminderIntegrationTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    static final String CUSTOMER = "musteri@randevum.az";

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

    @Autowired PersonalReminderService service;
    @Autowired ReminderService reminderService;
    @Autowired PersonalReminderRepository notes;
    @Autowired ReminderRepository reminders;
    @Autowired AppointmentRepository appointments;
    @Autowired PushSubscriptionRepository subscriptions;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;
    @Autowired UserRepository users;

    User customer;

    @BeforeEach
    void setUp() {
        CLOCK.now = baku(MONDAY, LocalTime.of(10, 10));
        SENT.clear();
        customer = users.findByEmailIgnoreCase(CUSTOMER).orElseThrow();
        subscriptions.save(new PushSubscription(customer, "https://push.example/test-phone", "p", "a", "Test"));
    }

    @AfterEach
    void cleanUp() {
        reminders.deleteAll();
        notes.deleteAll();
        appointments.deleteAll();
        subscriptions.deleteAll();
    }

    private ReminderView create(LocalTime time, List<Integer> offsets) {
        return service.create(CUSTOMER, new CreateRequest("Həkimə getmək", " Kardioloq, 3-cü mərtəbə ", MONDAY, time, offsets, Source.VOICE));
    }

    private List<Integer> planned(Long id) {
        return reminders.findByPersonalReminderIdOrderByOffsetMinutesDesc(id).stream()
                .map(Reminder::getOffsetMinutes)
                .toList();
    }

    @Test
    void aNoteIsStoredInBakuTimeWithItsFutureReminders() {
        ReminderView view = create(LocalTime.of(15, 0), List.of(0, 60, 1440));

        assertThat(view.date()).isEqualTo(MONDAY);
        assertThat(view.time()).isEqualTo("15:00");
        assertThat(view.note()).isEqualTo("Kardioloq, 3-cü mərtəbə");
        assertThat(view.source()).isEqualTo(Source.VOICE);
        assertThat(view.reminderOffsets()).containsExactly(1440, 60, 0);
        // A day ahead is already past for a note later today.
        assertThat(planned(view.id())).containsExactly(60, 0);

        assertThatThrownBy(() -> create(LocalTime.of(9, 0), null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Keçmiş");
    }

    @Test
    void editingMovesTheRemindersAndFinishingDropsThem() {
        ReminderView view = create(LocalTime.of(15, 0), null);
        assertThat(planned(view.id())).containsExactly(0);

        ReminderView moved = service.update(CUSTOMER, view.id(), new UpdateRequest(null, null, null, LocalTime.of(17, 30), List.of(15, 0), null));
        assertThat(moved.time()).isEqualTo("17:30");
        assertThat(reminders.findByPersonalReminderIdOrderByOffsetMinutesDesc(view.id()))
                .extracting(Reminder::getDueAt)
                .containsExactly(baku(MONDAY, LocalTime.of(17, 15)), baku(MONDAY, LocalTime.of(17, 30)));

        service.update(CUSTOMER, view.id(), new UpdateRequest(null, null, null, null, null, Status.DONE));
        assertThat(planned(view.id())).isEmpty();
    }

    @Test
    void onlyTheOwnerReadsChangesOrDeletes() {
        ReminderView view = create(LocalTime.of(15, 0), null);

        assertThatThrownBy(() -> service.get("admin@randevum.az", view.id())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.delete("admin@randevum.az", view.id())).isInstanceOf(AccessDeniedException.class);

        service.delete(CUSTOMER, view.id());
        assertThat(notes.findById(view.id())).isEmpty();
        assertThat(planned(view.id())).isEmpty();
    }

    @Test
    void aDueNoteReminderIsSentOnceWithItsText() {
        ReminderView view = create(LocalTime.of(15, 0), List.of(0));

        CLOCK.now = baku(MONDAY, LocalTime.of(15, 0));
        assertThat(reminderService.sendDue()).isEqualTo(1);
        assertThat(reminderService.sendDue()).isZero();
        assertThat(SENT).hasSize(1);
        assertThat(SENT.getFirst().title()).isEqualTo("Qeyd xatırlatması");
        assertThat(SENT.getFirst().body()).isEqualTo("Sizin bu gün saat 15:00-da qeydiniz var: Həkimə getmək");
        assertThat(SENT.getFirst().tag()).isEqualTo("note-" + view.id());
    }

    @Test
    void theAgendaMergesAppointmentsAndNotesByTime() {
        ProviderProfile barber = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow();
        ServiceOffering haircut = services.findByProviderIdAndActiveTrueOrderByPriceAsc(barber.getId()).getFirst();
        Instant start = baku(MONDAY, LocalTime.of(12, 0));
        appointments.save(new Appointment("RV-T-AG", barber, customer, haircut, start, start.plus(Duration.ofMinutes(30))));
        create(LocalTime.of(11, 0), null);
        create(LocalTime.of(15, 0), null);

        List<AgendaItem> agenda = service.agenda(CUSTOMER, MONDAY, MONDAY);

        assertThat(agenda).extracting(AgendaItem::time).containsExactly("11:00", "12:00", "15:00");
        assertThat(agenda.get(1).type()).isEqualTo(AgendaItem.APPOINTMENT);
        assertThat(agenda.get(1).title()).isEqualTo("Elvin Məmmədov");
        assertThat(agenda.get(1).subtitle()).isEqualTo(haircut.getName());
        assertThat(agenda.get(0).type()).isEqualTo(AgendaItem.NOTE);

        assertThatThrownBy(() -> service.agenda(CUSTOMER, MONDAY, MONDAY.plusDays(90)))
                .isInstanceOf(BusinessRuleException.class);
    }
}
