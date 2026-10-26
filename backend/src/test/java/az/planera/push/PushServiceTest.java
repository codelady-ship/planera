package az.planera.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import az.planera.common.BusinessRuleException;
import az.planera.domain.PushSubscription;
import az.planera.domain.PushSubscriptionRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.UserRole;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Delivery bookkeeping: gone subscriptions are dropped, the rest are counted (#55). */
class PushServiceTest {

    final PushSubscriptionRepository subscriptions = mock(PushSubscriptionRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final PushSender sender = mock(PushSender.class);
    final PushService service =
            new PushService(subscriptions, users, sender, new VapidKeys("", "", "mailto:test@planera.az"));

    final User user = new User("musteri@planera.az", "Aynur Qasımova", UserRole.CUSTOMER);
    final PushSubscription phone = new PushSubscription(user, "https://push.example/phone", "p", "a", "Android Chrome");
    final PushSubscription laptop = new PushSubscription(user, "https://push.example/laptop", "p", "a", "Windows Edge");
    final PushMessage message = PushMessage.of("Planera", "Salam", "/account");

    @Test
    void goneSubscriptionsAreDeletedAndNotCounted() {
        given(subscriptions.findByUserIdOrderByCreatedAtAsc(any())).willReturn(List.of(phone, laptop));
        given(sender.send(phone, message)).willReturn(410);
        given(sender.send(laptop, message)).willReturn(201);

        assertThat(service.sendToUser(7L, message)).isEqualTo(1);

        verify(subscriptions).delete(phone);
        verify(subscriptions, never()).delete(laptop);
    }

    @Test
    void anUnreachablePushServiceKeepsTheSubscription() {
        given(subscriptions.findByUserIdOrderByCreatedAtAsc(any())).willReturn(List.of(phone));
        given(sender.send(phone, message)).willReturn(0);

        assertThat(service.sendToUser(7L, message)).isZero();

        verify(subscriptions, never()).delete(any(PushSubscription.class));
    }

    @Test
    void aNewDeviceBeyondTheQuotaIsRefused() {
        given(users.findByEmailIgnoreCase("musteri@planera.az")).willReturn(Optional.of(user));
        given(subscriptions.findByEndpoint(any())).willReturn(Optional.empty());
        given(subscriptions.findByUserIdOrderByCreatedAtAsc(any()))
                .willReturn(java.util.Collections.nCopies(PushService.MAX_DEVICES, phone));

        assertThatThrownBy(() -> service.subscribe("musteri@planera.az",
                        new az.planera.push.PushDtos.SubscribeRequest(
                                "https://push.example/new", new az.planera.push.PushDtos.Keys("p", "a"), null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cihaz");
    }

    @Test
    void testMessageNeedsAtLeastOneDevice() {
        given(users.findByEmailIgnoreCase("musteri@planera.az")).willReturn(Optional.of(user));
        given(subscriptions.findByUserIdOrderByCreatedAtAsc(any())).willReturn(List.of());

        assertThatThrownBy(() -> service.sendTest("musteri@planera.az"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("abunəliyi yoxdur");
    }
}
