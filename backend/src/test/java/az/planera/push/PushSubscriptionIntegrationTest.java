package az.planera.push;

import static org.assertj.core.api.Assertions.assertThat;

import az.planera.TestcontainersConfiguration;
import az.planera.domain.PushSubscriptionRepository;
import az.planera.push.PushDtos.Keys;
import az.planera.push.PushDtos.SubscribeRequest;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Subscriptions per device against PostgreSQL: one row per endpoint, moved between users, dropped when gone (#55). */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
    TestcontainersConfiguration.class,
    PushService.class,
    VapidKeys.class,
    PushSubscriptionIntegrationTest.Beans.class
})
@ActiveProfiles("dev")
class PushSubscriptionIntegrationTest {

    static final AtomicInteger STATUS = new AtomicInteger(201);

    @TestConfiguration
    static class Beans {
        @Bean
        PushSender pushSender() {
            return (subscription, message) -> STATUS.get();
        }
    }

    static final String CUSTOMER = "musteri@planera.az";
    static final String PROVIDER = "elvin-barber@planera.az";

    @Autowired PushService push;
    @Autowired PushSubscriptionRepository subscriptions;

    static SubscribeRequest phone(String p256dh) {
        return new SubscribeRequest("https://push.example/phone", new Keys(p256dh, "auth"), "Android Chrome");
    }

    @Test
    void theSameEndpointSubscribedAgainUpdatesTheRow() {
        push.subscribe(CUSTOMER, phone("first"));
        push.subscribe(CUSTOMER, phone("second"));

        assertThat(push.list(CUSTOMER)).hasSize(1);
        assertThat(subscriptions.findByEndpoint("https://push.example/phone")).get()
                .extracting("p256dh")
                .isEqualTo("second");
    }

    @Test
    void anEndpointBelongsToWhoeverSignedInLastOnThatBrowser() {
        push.subscribe(CUSTOMER, phone("k"));
        push.subscribe(PROVIDER, phone("k"));

        assertThat(push.list(CUSTOMER)).isEmpty();
        assertThat(push.list(PROVIDER)).hasSize(1);
    }

    @Test
    void goneSubscriptionsDisappearAndUnsubscribeIsIdempotent() {
        push.subscribe(CUSTOMER, phone("k"));
        STATUS.set(410);
        try {
            assertThat(push.sendTest(CUSTOMER).delivered()).isZero();
        } finally {
            STATUS.set(201);
        }
        assertThat(push.list(CUSTOMER)).isEmpty();

        push.subscribe(CUSTOMER, phone("k"));
        assertThat(push.sendTest(CUSTOMER).delivered()).isEqualTo(1);

        push.unsubscribe(CUSTOMER, "https://push.example/phone");
        push.unsubscribe(CUSTOMER, "https://push.example/phone");
        assertThat(push.list(CUSTOMER)).isEmpty();
    }
}
