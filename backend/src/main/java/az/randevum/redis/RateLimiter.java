package az.randevum.redis;

import java.time.Duration;
import org.springframework.stereotype.Component;

/**
 * Fixed-window counter (#77, #81): at most {@code limit} hits per key and
 * window. Fails open, so a Redis outage never blocks users.
 */
@Component
public class RateLimiter {

    private final RedisSupport redis;

    public RateLimiter(RedisSupport redis) {
        this.redis = redis;
    }

    public boolean allow(String key, int limit, Duration window) {
        String redisKey = "rate:" + key;
        long count = redis.call(r -> {
            Long hits = r.opsForValue().increment(redisKey);
            if (hits != null && hits == 1) {
                r.expire(redisKey, window);
            }
            return hits;
        }, 0L);
        return count <= limit;
    }
}
