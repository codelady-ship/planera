package az.planera.waitlist;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import az.planera.common.BusinessRuleException;
import az.planera.config.JwtConfig;
import az.planera.config.SecurityConfig;
import az.planera.waitlist.WaitlistDtos.WaitlistView;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(WaitlistController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class WaitlistControllerTest {

    static final WaitlistView VIEW =
            new WaitlistView(5L, "elvin-barber", "Elvin Məmmədov", 1L, "Saç kəsimi", LocalDate.of(2026, 10, 30));

    @Autowired MockMvcTester mvc;

    @MockitoBean WaitlistService waitlist;

    @Test
    void theWaitlistNeedsASession() {
        assertThat(mvc.get().uri("/api/me/waitlist")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void joiningListingAndLeaving() {
        given(waitlist.join(eq("musteri@planera.az"), argThat(r -> r.slug().equals("elvin-barber")
                        && r.serviceId() == 1L && r.date().equals(LocalDate.of(2026, 10, 30)))))
                .willReturn(VIEW);
        given(waitlist.mine("musteri@planera.az")).willReturn(List.of(VIEW));

        assertThat(mvc.post().uri("/api/me/waitlist")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"elvin-barber\",\"serviceId\":1,\"date\":\"2026-10-30\"}"))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .extractingPath("$.providerName")
                .isEqualTo("Elvin Məmmədov");
        assertThat(mvc.get().uri("/api/me/waitlist"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[0].date")
                .isEqualTo("2026-10-30");
        assertThat(mvc.delete().uri("/api/me/waitlist/5")).hasStatus(HttpStatus.NO_CONTENT);
        Mockito.verify(waitlist).leave("musteri@planera.az", 5L);
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void aDayWithFreeTimeIsA422AndAMissingFieldA400() {
        given(waitlist.join(eq("musteri@planera.az"), argThat(r -> r != null)))
                .willThrow(new BusinessRuleException("Bu gündə hələ boş saat var"));

        assertThat(mvc.post().uri("/api/me/waitlist")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"elvin-barber\",\"serviceId\":1,\"date\":\"2026-10-30\"}"))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT);
        assertThat(mvc.post().uri("/api/me/waitlist")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"elvin-barber\"}"))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }
}
