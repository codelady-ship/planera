package az.planera.redis;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Consumer;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Fail-open access to Redis (#77). PostgreSQL stays the source of truth, so
 * when Redis is missing or down every call returns its fallback instead of
 * failing the request. After an error Redis is skipped for {@link #PAUSE},
 * so an outage costs one timeout, not one per request.
 */
@Component
public class RedisSupport {

    static final Duration PAUSE = Duration.ofSeconds(30);

    private static final Logger log = LoggerFactory.getLogger(RedisSupport.class);

    private final StringRedisTemplate redis;
    private final Clock clock;
    private volatile Instant pausedUntil = Instant.MIN;

    @Autowired
    public RedisSupport(ObjectProvider<StringRedisTemplate> redis) {
        this(redis.getIfAvailable(), Clock.systemUTC());
    }

    RedisSupport(StringRedisTemplate redis, Clock clock) {
        this.redis = redis;
        this.clock = clock;
    }

    public <T> T call(Function<StringRedisTemplate, T> operation, T fallback) {
        if (redis == null || clock.instant().isBefore(pausedUntil)) {
            return fallback;
        }
        try {
            T result = operation.apply(redis);
            return result == null ? fallback : result;
        } catch (RuntimeException e) {
            pausedUntil = clock.instant().plus(PAUSE);
            log.warn("Redis unavailable, continuing without it for {}s: {}", PAUSE.toSeconds(), e.getMessage());
            return fallback;
        }
    }

    public void run(Consumer<StringRedisTemplate> operation) {
        call(r -> {
            operation.accept(r);
            return Boolean.TRUE;
        }, Boolean.FALSE);
    }
}
