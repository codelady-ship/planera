package az.planera.push;

import static org.assertj.core.api.Assertions.assertThat;

import az.planera.domain.PushSubscription;
import az.planera.domain.User;
import az.planera.domain.UserRole;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Failures of the push service never throw, they become statuses (#55). */
class WebPushSenderTest {

    // Any valid P-256 point works as a browser key here; the test never reaches a push service.
    static final String P256DH = VapidKeysTest.PUBLIC;
    static final String AUTH = "AAAAAAAAAAAAAAAAAAAAAA";

    final User user = new User("musteri@planera.az", "Aynur Qasımova", UserRole.CUSTOMER);
    final WebPushSender sender =
            new WebPushSender(new VapidKeys("", "", "mailto:test@planera.az"), JsonMapper.builder().build());

    @Test
    void anUnreachablePushServiceIsReportedAsUnreachable() {
        PushSubscription subscription = new PushSubscription(user, "https://127.0.0.1:1/push/abc", P256DH, AUTH, null);

        assertThat(sender.send(subscription, PushMessage.of("Planera", "Salam", "/account")))
                .isEqualTo(WebPushSender.UNREACHABLE);
    }

    @Test
    void unusableBrowserKeysCountAsGone() {
        PushSubscription subscription = new PushSubscription(user, "https://127.0.0.1:1/push/abc", "bm90LWEta2V5", AUTH, null);

        assertThat(sender.send(subscription, PushMessage.of("Planera", "Salam", "/account")))
                .isEqualTo(WebPushSender.GONE);
    }
}
