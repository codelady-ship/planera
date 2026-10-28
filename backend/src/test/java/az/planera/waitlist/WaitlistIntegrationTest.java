package az.planera.waitlist;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.planera.TestcontainersConfiguration;
import az.planera.common.BusinessRuleException;
import az.planera.config.TimeConfig;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.PushSubscription;
import az.planera.domain.PushSubscriptionRepository;
import az.planera.domain.ServiceOffering;
import az.planera.domain.ServiceOfferingRepository;
import az.planera.domain.TimeOff;
import az.planera.domain.TimeOffRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.UserRole;
import az.planera.domain.WaitlistEntry;
import az.planera.domain.WaitlistEntryRepository;
import az.planera.mail.EmailMessage;
import az.planera.mail.EmailSender;
import az.planera.push.PushMessage;
import az.planera.push.PushSender;
import az.planera.push.PushService;
import az.planera.push.VapidKeys;
import az.planera.redis.RedisSupport;
import az.planera.redis.SlotCache;
import az.planera.slot.SlotService;
import az.planera.waitlist.WaitlistDtos.JoinRequest;
import az.planera.waitlist.WaitlistDtos.WaitlistView;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
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

/** The waitlist against the demo data (#45): only full days, one entry per day, a cancellation tells the waiting. */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
    TestcontainersConfiguration.class,
    WaitlistService.class,
    SlotService.class,
    SlotCache.class,
    RedisSupport.class,
    PushService.class,
    VapidKeys.class,
    WaitlistIntegrationTest.Beans.class
})
@ActiveProfiles("dev")
class WaitlistIntegrationTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    static final LocalDate TUESDAY = MONDAY.plusDays(1);
    static final String CUSTOMER = "musteri@planera.az";
    static final String WAITING = "gozleyen@planera.az";
    static final List<EmailMessage> MAILS = new CopyOnWriteArrayList<>();
    static final List<PushMessage> PUSHES = new CopyOnWriteArrayList<>();

    @TestConfiguration
    static class Beans {
        @Bean
        Clock clock() {
            return Clock.fixed(ZonedDateTime.of(MONDAY, LocalTime.of(10, 10), TimeConfig.BAKU).toInstant(), TimeConfig.BAKU);
        }

        @Bean
        EmailSender emailSender() {
            return MAILS::add;
        }

        @Bean
        PushSender pushSender() {
            return (subscription, message) -> {
                PUSHES.add(message);
                return 201;
            };
        }
    }

    @Autowired WaitlistService service;
    @Autowired WaitlistEntryRepository entries;
    @Autowired AppointmentRepository appointments;
    @Autowired PushSubscriptionRepository subscriptions;
    @Autowired TimeOffRepository timeOff;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;
    @Autowired UserRepository users;

    ProviderProfile barber;
    ServiceOffering haircut;
    User customer;
    User waiting;

    @BeforeEach
    void setUp() {
        MAILS.clear();
        PUSHES.clear();
        barber = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow();
        haircut = services.findByProviderIdAndActiveTrueOrderByPriceAsc(barber.getId()).getFirst();
        customer = users.findByEmailIgnoreCase(CUSTOMER).orElseThrow();
        waiting = users.findByEmailIgnoreCase(WAITING)
                .orElseGet(() -> users.save(new User(WAITING, "Gözləyən Müştəri", UserRole.CUSTOMER)));
    }

    @AfterEach
    void cleanUp() {
        entries.deleteAll();
        appointments.deleteAll();
        subscriptions.deleteAll();
        timeOff.deleteAll();
    }

    @Test
    void onlyAFullDayCanBeJoinedAndJoiningIsIdempotent() {
        JoinRequest tuesday = new JoinRequest("elvin-barber", haircut.getId(), TUESDAY);
        assertThatThrownBy(() -> service.join(CUSTOMER, tuesday)).isInstanceOf(BusinessRuleException.class);

        timeOff.save(new TimeOff(barber, TUESDAY, TUESDAY, "test"));
        WaitlistView first = service.join(CUSTOMER, tuesday);
        WaitlistView again = service.join(CUSTOMER, tuesday);
        assertThat(again.id()).isEqualTo(first.id());
        assertThat(service.mine(CUSTOMER)).extracting(WaitlistView::serviceName).containsExactly(haircut.getName());

        assertThatThrownBy(() -> service.join(CUSTOMER, new JoinRequest("elvin-barber", haircut.getId(), MONDAY.minusDays(1))))
                .isInstanceOf(BusinessRuleException.class);

        service.leave(CUSTOMER, first.id());
        assertThat(service.mine(CUSTOMER)).isEmpty();
    }

    @Test
    void aCancellationTellsEveryoneWaitingForThatDayOnce() {
        subscriptions.save(new PushSubscription(waiting, "https://push.example/waiting", "p", "a", "Test"));
        entries.save(new WaitlistEntry(waiting, haircut, TUESDAY));
        // The customer who cancels also waits that day and must not be told about their own slot.
        entries.save(new WaitlistEntry(customer, haircut, TUESDAY));

        Instant startsAt = ZonedDateTime.of(TUESDAY, LocalTime.of(15, 0), TimeConfig.BAKU).toInstant();
        Appointment a = appointments.save(new Appointment(
                "RV-WL-1", barber, customer, haircut, startsAt, startsAt.plus(Duration.ofMinutes(30))));
        a.cancel(Instant.now(), null);
        appointments.save(a);

        assertThat(service.notifyWaiting(a)).isEqualTo(1);
        assertThat(MAILS).singleElement().satisfies(m -> {
            assertThat(m.to()).isEqualTo(WAITING);
            assertThat(m.subject()).contains("Elvin Məmmədov");
            assertThat(m.text()).contains("/book/elvin-barber?service=" + haircut.getId() + "&date=" + TUESDAY);
        });
        assertThat(PUSHES).singleElement().extracting(PushMessage::url)
                .isEqualTo("/book/elvin-barber?service=" + haircut.getId() + "&date=" + TUESDAY);
        assertThat(service.mine(WAITING)).isEmpty();

        assertThat(service.notifyWaiting(a)).isZero();
    }
}
