package az.planera.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import az.planera.common.BusinessRuleException;
import az.planera.config.JwtConfig;
import az.planera.config.SecurityConfig;
import az.planera.push.PushDtos.DeliveryView;
import az.planera.push.PushDtos.SubscriptionView;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(PushController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class PushControllerTest {

    private static final String SUBSCRIPTION =
            "{\"endpoint\":\"https://push.example/abc\",\"keys\":{\"p256dh\":\"p\",\"auth\":\"a\"},\"device\":\"Android Chrome\"}";

    @Autowired MockMvcTester mvc;

    @MockitoBean PushService push;

    @Test
    void everythingRequiresAuthentication() {
        assertThat(mvc.get().uri("/api/push/public-key")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(mvc.post().uri("/api/me/push-subscriptions").contentType(MediaType.APPLICATION_JSON).content(SUBSCRIPTION))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void publicKeyIsServed() {
        given(push.publicKey()).willReturn("BAbc");

        assertThat(mvc.get().uri("/api/push/public-key"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.publicKey")
                .isEqualTo("BAbc");
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void subscribingIsA201ForTheSignedInUser() {
        given(push.subscribe(eq("musteri@planera.az"), argThat(r -> r.endpoint().equals("https://push.example/abc")
                        && r.keys().p256dh().equals("p") && r.device().equals("Android Chrome"))))
                .willReturn(new SubscriptionView(1L, "Android Chrome", Instant.parse("2026-10-26T10:00:00Z")));

        assertThat(mvc.post().uri("/api/me/push-subscriptions").contentType(MediaType.APPLICATION_JSON).content(SUBSCRIPTION))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .extractingPath("$.device")
                .isEqualTo("Android Chrome");
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void missingKeysAreA400WithFieldErrors() {
        assertThat(mvc.post().uri("/api/me/push-subscriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endpoint\":\"https://push.example/abc\"}"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors.keys")
                .isNotNull();
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void unsubscribingIsA204() {
        assertThat(mvc.delete().uri("/api/me/push-subscriptions").param("endpoint", "https://push.example/abc"))
                .hasStatus(HttpStatus.NO_CONTENT);

        verify(push).unsubscribe("musteri@planera.az", "https://push.example/abc");
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void testNotificationReportsDeliveriesOr422WithoutDevices() {
        given(push.sendTest("musteri@planera.az")).willReturn(new DeliveryView(2));
        assertThat(mvc.post().uri("/api/me/push-subscriptions/test"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.delivered")
                .isEqualTo(2);

        given(push.sendTest(any())).willThrow(new BusinessRuleException("Bu hesabda bildiriş abunəliyi yoxdur"));
        assertThat(mvc.post().uri("/api/me/push-subscriptions/test")).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT);
    }
}
