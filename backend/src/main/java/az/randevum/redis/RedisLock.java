package az.randevum.redis;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * Short distributed lock (#77), e.g. one booking attempt per slot at a time.
 * It only spares the database a doomed insert: the real double-booking guard
 * is the {@code appointments_no_overlap} constraint. Without Redis every
 * lock is granted.
 */
@Component
public class RedisLock {

    /** Deletes the key only if it still holds our token. */
    private static final RedisScript<Long> RELEASE = RedisScript.of(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class);

    private final RedisSupport redis;

    public RedisLock(RedisSupport redis) {
        this.redis = redis;
    }

    public interface Held extends AutoCloseable {
        boolean acquired();

        @Override
        void close();
    }

    public Held tryLock(String name, Duration ttl) {
        String key = "lock:" + name;
        String token = UUID.randomUUID().toString();
        boolean acquired = redis.call(r -> r.opsForValue().setIfAbsent(key, token, ttl), Boolean.TRUE);
        return new Held() {
            @Override
            public boolean acquired() {
                return acquired;
            }

            @Override
            public void close() {
                if (acquired) {
                    redis.run(r -> r.execute(RELEASE, List.of(key), token));
                }
            }
        };
    }
}
