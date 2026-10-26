package az.planera.config;

import az.planera.redis.RateLimiter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/** Registers {@link RequestLimitFilter} ahead of security, for the whole API (#81). */
@Configuration
public class RequestLimitConfig {

    @Bean
    FilterRegistrationBean<RequestLimitFilter> requestLimitFilter(RateLimiter limiter) {
        FilterRegistrationBean<RequestLimitFilter> registration =
                new FilterRegistrationBean<>(new RequestLimitFilter(limiter));
        registration.addUrlPatterns("/api/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return registration;
    }
}
