package az.planera.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import az.planera.redis.RateLimiter;
import jakarta.servlet.FilterChain;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** The general limit keys on the user when signed in, else the forwarded address; big bodies are 413 (#81). */
class RequestLimitFilterTest {

    final RateLimiter limiter = mock(RateLimiter.class);
    final RequestLimitFilter filter = new RequestLimitFilter(limiter);

    static String token(String email) {
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"" + email + "\",\"roles\":[\"CUSTOMER\"]}").getBytes(StandardCharsets.UTF_8));
        return "Bearer eyJhbGciOiJIUzI1NiJ9." + payload + ".sig";
    }

    @Test
    void signedInRequestsAreCountedPerUserAnonymousOnesPerForwardedAddress() throws Exception {
        given(limiter.allow(any(), anyInt(), any())).willReturn(true);

        MockHttpServletRequest asUser = new MockHttpServletRequest("GET", "/api/me");
        asUser.addHeader("Authorization", token("Musteri@planera.az"));
        asUser.addHeader("X-Forwarded-For", "203.0.113.9, 10.0.0.1");
        filter.doFilter(asUser, new MockHttpServletResponse(), new MockFilterChain());
        verify(limiter).allow(eq("client:user:musteri@planera.az"), eq(RequestLimitFilter.PER_MINUTE), any());

        MockHttpServletRequest anonymous = new MockHttpServletRequest("GET", "/api/providers");
        anonymous.addHeader("X-Forwarded-For", "203.0.113.9, 10.0.0.1");
        filter.doFilter(anonymous, new MockHttpServletResponse(), new MockFilterChain());
        verify(limiter).allow(eq("client:ip:203.0.113.9"), eq(RequestLimitFilter.PER_MINUTE), any());
    }

    @Test
    void overTheLimitIsA429WithRetryAfterAndTheChainIsNotCalled() throws Exception {
        given(limiter.allow(any(), anyInt(), any())).willReturn(false);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest("GET", "/api/providers"), response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
        assertThat(response.getContentAsString()).contains("\"status\":429");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void bigBodiesAre413AndHealthIsNeverLimited() throws Exception {
        MockHttpServletRequest big = new MockHttpServletRequest("POST", "/api/appointments");
        big.setContent(new byte[(int) RequestLimitFilter.MAX_BODY_BYTES + 1]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(big, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(413);

        assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/api/health"))).isTrue();
        assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/actuator/health"))).isTrue();
        assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/api/providers"))).isFalse();
    }
}
