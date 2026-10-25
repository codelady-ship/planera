package az.randevum.redis;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Slot cache, lock and rate limiter against a real Redis (#77). */
@Testcontainers(disabledWithoutDocker = true)
class RedisIntegrationTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    static LettuceConnectionFactory factory;
    static StringRedisTemplate template;

    SlotCache cache;
    RedisLock lock;
    RateLimiter limiter;

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory(REDIS.getHost(), REDIS.getMappedPort(6379));
        factory.afterPropertiesSet();
        factory.start();
        template = new StringRedisTemplate(factory);
    }

    @AfterAll
    static void disconnect() {
        factory.destroy();
    }

    @BeforeEach
    void setUp() {
        template.execute(c -> {
            c.serverCommands().flushAll();
            return null;
        }, true);
        RedisSupport redis = new RedisSupport(template, Clock.systemUTC());
        cache = new SlotCache(redis);
        lock = new RedisLock(redis);
        limiter = new RateLimiter(redis);
    }

    @Test
    void cachedSlotsExpireAndAreEvictedPerDayAndPerProvider() {
        LocalDate day = LocalDate.of(2026, 10, 27);
        cache.put(1L, 10L, day, List.of("09:00", "09:15"));
        cache.put(1L, 11L, day, List.of());
        cache.put(1L, 10L, day.plusDays(1), List.of("10:00"));
        cache.put(2L, 10L, day, List.of("12:00"));

        assertThat(cache.get(1L, 10L, day)).contains(List.of("09:00", "09:15"));
        assertThat(cache.get(1L, 11L, day)).contains(List.of());
        assertThat(template.getExpire(SlotCache.key(1L, day))).isBetween(1L, SlotCache.TTL.toSeconds());

        cache.evictDay(1L, day);
        assertThat(cache.get(1L, 10L, day)).isEmpty();
        assertThat(cache.get(1L, 10L, day.plusDays(1))).isPresent();

        cache.evictProvider(1L);
        assertThat(cache.get(1L, 10L, day.plusDays(1))).isEmpty();
        assertThat(cache.get(2L, 10L, day)).isPresent();
    }

    @Test
    void lockIsExclusiveUntilReleased() {
        try (RedisLock.Held first = lock.tryLock("slot:1:x", Duration.ofSeconds(5))) {
            assertThat(first.acquired()).isTrue();
            try (RedisLock.Held second = lock.tryLock("slot:1:x", Duration.ofSeconds(5))) {
                assertThat(second.acquired()).isFalse();
            }
        }
        try (RedisLock.Held again = lock.tryLock("slot:1:x", Duration.ofSeconds(5))) {
            assertThat(again.acquired()).isTrue();
        }
    }

    @Test
    void rateLimiterCountsPerKeyAndWindow() {
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.allow("user:1", 3, Duration.ofMinutes(1))).isTrue();
        }
        assertThat(limiter.allow("user:1", 3, Duration.ofMinutes(1))).isFalse();
        assertThat(limiter.allow("user:2", 3, Duration.ofMinutes(1))).isTrue();
    }
}
