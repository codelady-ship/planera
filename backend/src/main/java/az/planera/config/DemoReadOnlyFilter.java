package az.planera.config;

import az.planera.common.Messages;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Public demo accounts (portfolio admin demo) are read-only: a bearer token
 * with {@code demo: true} may read whatever its role allows, but every
 * write is refused with 403 and a message the panel shows to the visitor.
 * Real accounts never carry the claim, so nothing changes for them.
 */
public class DemoReadOnlyFilter extends OncePerRequestFilter {

    /** JWT claim set by AuthService for users with {@code users.demo = true}. */
    public static final String CLAIM = "demo";

    private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    /** True when the request is authenticated with a demo account's token. */
    public static boolean isDemo(Authentication authentication) {
        return authentication instanceof JwtAuthenticationToken jwt
                && Boolean.TRUE.equals(jwt.getToken().getClaimAsBoolean(CLAIM));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (READ_METHODS.contains(request.getMethod())
                || !isDemo(SecurityContextHolder.getContext().getAuthentication())) {
            chain.doFilter(request, response);
            return;
        }
        String detail = Messages.get("demo.readOnly", Messages.locale(request.getHeader("Accept-Language")));
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"status\":403,\"title\":\"Forbidden\",\"detail\":\"" + json(detail) + "\"}");
    }

    private static String json(String text) {
        return text.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
