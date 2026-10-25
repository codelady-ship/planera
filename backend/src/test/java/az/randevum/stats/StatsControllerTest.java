package az.randevum.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import az.randevum.config.JwtConfig;
import az.randevum.config.SecurityConfig;
import az.randevum.stats.StatsDtos.StatsView;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(StatsController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class StatsControllerTest {

    @Autowired MockMvcTester mvc;

    @MockitoBean StatsService stats;

    @Test
    void statsNeedAnAdmin() {
        assertThat(mvc.get().uri("/api/admin/stats")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(roles = "PROVIDER")
    void providersAreForbidden() {
        assertThat(mvc.get().uri("/api/admin/stats")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminReadsPlatformStats() {
        LocalDate today = LocalDate.of(2026, 10, 28);
        given(stats.stats(null))
                .willReturn(new StatsView(today, today.minusDays(2), 2, 9, new BigDecimal("180.00"), 10.0, List.of(), List.of()));

        assertThat(mvc.get().uri("/api/admin/stats"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.weekRevenue")
                .isEqualTo(180.0);
    }
}
