package az.randevum.config;

import az.randevum.redis.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Cost guard in front of every API call (#81): a general per-client limit
 * and a body size cap. Endpoint-specific limits (login, bookings) stay in
 * the services. The client is the signed-in user when the request carries
 * a JWT, otherwise the first X-Forwarded-For address (the site's gateway
 * forwards the browser's address; Render adds its own after it).
 */
public class RequestLimitFilter extends OncePerRequestFilter {

    static final int PER_MINUTE = 120;
    static final long MAX_BODY_BYTES = 64 * 1024;

    private static final Pattern SUBJECT = Pattern.compile("\"sub\"\\s*:\\s*\"([^\"]+)\"");

    private final RateLimiter limiter;

    public RequestLimitFilter(RateLimiter limiter) {
        this.limiter = limiter;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/") || path.equals("/api/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > MAX_BODY_BYTES) {
            problem(response, HttpStatus.PAYLOAD_TOO_LARGE, "Sorğu həddindən artıq böyükdür", null);
            return;
        }
        if (!limiter.allow("client:" + clientKey(request), PER_MINUTE, Duration.ofMinutes(1))) {
            problem(response, HttpStatus.TOO_MANY_REQUESTS, "Çox sayda sorğu. Bir dəqiqə sonra yenidən cəhd edin.", Duration.ofMinutes(1));
            return;
        }
        chain.doFilter(request, response);
    }

    /** "user:<email>" from the bearer token's subject (unverified here: a forged subject only limits itself), else "ip:<address>". */
    static String clientKey(HttpServletRequest request) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.startsWith("Bearer ")) {
            String[] parts = auth.substring(7).split("\\.");
            if (parts.length == 3) {
                try {
                    String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                    Matcher m = SUBJECT.matcher(payload);
                    if (m.find()) {
                        return "user:" + m.group(1).toLowerCase();
                    }
                } catch (IllegalArgumentException ignored) {
                    // Not a JWT: fall through to the address.
                }
            }
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        String address = forwarded != null && !forwarded.isBlank()
                ? forwarded.split(",")[0].strip()
                : request.getRemoteAddr();
        return "ip:" + address;
    }

    private static void problem(HttpServletResponse response, HttpStatus status, String detail, Duration retryAfter)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        if (retryAfter != null) {
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter.toSeconds()));
        }
        response.getWriter().write("{\"status\":" + status.value() + ",\"title\":\"" + status.getReasonPhrase()
                + "\",\"detail\":\"" + detail.replace("\"", "'") + "\"}");
    }
}
