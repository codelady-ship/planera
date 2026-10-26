package az.randevum.health;

import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.config.JwtConfig;
import az.randevum.config.SecurityConfig;
import az.randevum.config.TimeConfig;
import java.time.Clock;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(HealthController.class)
@Import({SecurityConfig.class, JwtConfig.class, HealthControllerTest.FixedClock.class})
class HealthControllerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void apiDocumentationNeedsNoToken() {
        // springdoc is not part of this slice, so the paths answer 404, never 401 (#51).
        for (String path : new String[] {"/v3/api-docs", "/swagger-ui.html"}) {
            assertThat(mvc.get().uri(path)).satisfies(result ->
                    assertThat(result.getResponse().getStatus()).isNotEqualTo(HttpStatus.UNAUTHORIZED.value()));
        }
    }

    @Test
    void healthIsPublicAndReportsUp() {
        assertThat(mvc.get().uri("/api/health"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("UP");
    }

    @Test
    void healthUsesBakuTime() {
        assertThat(mvc.get().uri("/api/health"))
                .bodyJson()
                .extractingPath("$.time")
                .isEqualTo("2026-10-25T16:00:00+04:00");
    }

    @Test
    void otherEndpointsRequireAuthentication() {
        assertThat(mvc.get().uri("/api/appointments")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void crossOriginCallsAreRefusedByDefault() {
        assertThat(mvc.get().uri("/api/health").header("Origin", "https://evil.example"))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(mvc.options()
                        .uri("/api/health")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    @TestConfiguration
    static class FixedClock {
        @Bean
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-10-25T12:00:00Z"), TimeConfig.BAKU);
        }
    }
}
